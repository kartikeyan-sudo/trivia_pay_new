"""
deploy_pyteal.py - Port of ARC4 TriviaPay contract to PyTeal and deploy

Implements:
 - create: store owner + total_deposited=0
 - deposit: expects a grouped Payment then app call; increments total_deposited
 - pay: owner-only, inner payment to Accounts[1] of amount (Btoi arg)
 - withdraw: owner-only, inner payment to owner of amount

Run:
    python deploy\\deploy_pyteal.py

Reads `DEPLOYER_MNEMONIC` from `backend/.env.testnet`.
"""

import os
import sys
import json
from pathlib import Path

from dotenv import load_dotenv
from pyteal import *
from algosdk import mnemonic
from algosdk.v2client import algod
from algosdk import account as sdk_account
from algosdk import logic
from algosdk.transaction import ApplicationCreateTxn, StateSchema


# Load env
env_file = Path(__file__).parent.parent / ".env.testnet"
if env_file.exists():
    load_dotenv(env_file)

DEPLOYER_MNEMONIC = os.getenv("DEPLOYER_MNEMONIC", "")
ALGOD_SERVER = os.getenv("ALGOD_SERVER", "https://testnet-api.algonode.cloud")
ALGOD_PORT = os.getenv("ALGOD_PORT", "")
ALGOD_TOKEN = os.getenv("ALGOD_TOKEN", "")

if not DEPLOYER_MNEMONIC:
    sys.exit("DEPLOYER_MNEMONIC is not set in backend/.env.testnet")

deployer_sk = mnemonic.to_private_key(DEPLOYER_MNEMONIC)
deployer_addr = sdk_account.address_from_private_key(deployer_sk)

algod_address = ALGOD_SERVER + (f":{ALGOD_PORT}" if ALGOD_PORT else "")
algod_client = algod.AlgodClient(ALGOD_TOKEN, algod_address)


def approval_program():
    owner_key = Bytes("owner")
    total_key = Bytes("total")

    on_create = Seq([
        App.globalPut(owner_key, Txn.sender()),
        App.globalPut(total_key, Int(0)),
        Approve(),
    ])

    # deposit: grouped tx where previous txn is Payment to this app
    deposit = Seq([
        Assert(Global.group_size() >= Int(2)),
        Assert(Gtxn[Txn.group_index() - Int(1)].type_enum() == TxnType.Payment),
        Assert(Gtxn[Txn.group_index() - Int(1)].receiver() == Global.current_application_address()),
        Assert(Gtxn[Txn.group_index() - Int(1)].amount() > Int(0)),
        App.globalPut(total_key, App.globalGet(total_key) + Gtxn[Txn.group_index() - Int(1)].amount()),
        Approve(),
    ])

    # pay: owner-only inner payment to Accounts[1], amount = Btoi(arg1)
    pay = Seq([
        Assert(Txn.sender() == App.globalGet(owner_key)),
        Assert(Txn.application_args.length() >= Int(2)),
        Assert(Txn.accounts.length() >= Int(2)),
        InnerTxnBuilder.Begin(),
        InnerTxnBuilder.SetFields({
            TxnField.type_enum: TxnType.Payment,
            TxnField.receiver: Txn.accounts[1],
            TxnField.amount: Btoi(Txn.application_args[1]),
            TxnField.fee: Int(0),
        }),
        InnerTxnBuilder.Submit(),
        # deduct from stored total
        App.globalPut(total_key, App.globalGet(total_key) - Btoi(Txn.application_args[1])),
        Approve(),
    ])

    # withdraw: owner-only inner payment to owner
    withdraw = Seq([
        Assert(Txn.sender() == App.globalGet(owner_key)),
        Assert(Txn.application_args.length() >= Int(2)),
        InnerTxnBuilder.Begin(),
        InnerTxnBuilder.SetFields({
            TxnField.type_enum: TxnType.Payment,
            TxnField.receiver: App.globalGet(owner_key),
            TxnField.amount: Btoi(Txn.application_args[1]),
            TxnField.fee: Int(0),
        }),
        InnerTxnBuilder.Submit(),
        App.globalPut(total_key, App.globalGet(total_key) - Btoi(Txn.application_args[1])),
        Approve(),
    ])

    handle_noop = Cond(
        [Txn.application_args[0] == Bytes("deposit"), deposit],
        [Txn.application_args[0] == Bytes("pay"), pay],
        [Txn.application_args[0] == Bytes("withdraw"), withdraw],
        [Txn.application_args[0] == Bytes("balance"), Approve()],
        [Txn.application_args[0] == Bytes("get_owner"), Approve()],
    )

    program = Cond(
        [Txn.application_id() == Int(0), on_create],
        [Txn.on_completion() == OnComplete.NoOp, handle_noop],
    )

    return program


def clear_program():
    return Approve()


def compile_teal(pyteal_prog):
    return compileTeal(pyteal_prog, mode=Mode.Application, version=6)


def wait_for_confirmation(client, txid, timeout=20):
    import time
    start = time.time()
    while True:
        try:
            pending = client.pending_transaction_info(txid)
            if pending.get('confirmed-round', 0) > 0:
                return pending
        except Exception:
            pass
        if time.time() - start > timeout:
            raise TimeoutError("Timed out waiting for transaction confirmation")
        time.sleep(1)


def main():
    apr = approval_program()
    cpr = clear_program()

    approval_teal = compile_teal(apr)
    clear_teal = compile_teal(cpr)

    apr_compiled = algod_client.compile(approval_teal)
    clear_compiled = algod_client.compile(clear_teal)

    import base64
    approval_bytes = base64.b64decode(apr_compiled['result'])
    clear_bytes = base64.b64decode(clear_compiled['result'])

    params = algod_client.suggested_params()

    global_schema = StateSchema(num_uints=1, num_byte_slices=1)
    local_schema = StateSchema(num_uints=0, num_byte_slices=0)

    txn = ApplicationCreateTxn(
        sender=deployer_addr,
        sp=params,
        on_complete=0,
        approval_program=approval_bytes,
        clear_program=clear_bytes,
        global_schema=global_schema,
        local_schema=local_schema,
        extra_pages=0,
    )

    signed = txn.sign(deployer_sk)
    txid = algod_client.send_transaction(signed)
    print("sent tx", txid)
    receipt = wait_for_confirmation(algod_client, txid)
    app_id = receipt.get('application-index') or receipt.get('txn', {}).get('txn', {}).get('apid')
    if not app_id:
        print("Deploy failed, receipt:", json.dumps(receipt, indent=2))
        sys.exit(1)

    app_id = int(app_id)
    app_addr = logic.get_application_address(app_id)

    print()
    print("✅ Deployed PyTeal TriviaPay (ARC4-like)")
    print(f"   APP_ID          : {app_id}")
    print(f"   ESCROW_ADDRESS  : {app_addr}")

    receipt_path = Path(__file__).parent.parent / "deploy" / "deployment_pyteal_receipt.json"
    receipt_path.parent.mkdir(parents=True, exist_ok=True)
    receipt_path.write_text(json.dumps({
        "app_id": app_id,
        "escrow_address": app_addr,
        "deployer": deployer_addr,
        "network": "testnet",
    }, indent=2))
    print(f"📄  Receipt saved to {receipt_path.relative_to(Path.cwd())}")


if __name__ == '__main__':
    main()
