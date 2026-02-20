"""
deploy.py  –  Deploy TriviaPay to Algorand Testnet
====================================================

Run:
    cd backend
    algokit deploy testnet

OR directly:
    python deploy/deploy.py

After a successful deploy this script prints:

    ✅ Deployed TriviaPay
       APP_ID          : <number>
       ESCROW_ADDRESS  : <address>

Copy those two values into:
    frontend/src/config/appConfig.js
"""

import os
import json
import sys
from pathlib import Path

from dotenv import load_dotenv
from algosdk.v2client import algod, indexer
from algokit_utils import (
    AlgorandClient,
    DeploymentFailedError,
)

# ── Load environment -----------------------------------------------------------
# AlgoKit injects testnet vars automatically; .env.testnet is for local runs
env_file = Path(__file__).parent.parent / ".env.testnet"
if env_file.exists():
    load_dotenv(env_file)

ALGOD_SERVER  = os.getenv("ALGOD_SERVER",  "https://testnet-api.algonode.cloud")
ALGOD_PORT    = os.getenv("ALGOD_PORT",    "")
ALGOD_TOKEN   = os.getenv("ALGOD_TOKEN",   "")
DEPLOYER_MNEMONIC = os.getenv("DEPLOYER_MNEMONIC", "")

if not DEPLOYER_MNEMONIC:
    sys.exit(
        "❌  DEPLOYER_MNEMONIC is not set.\n"
        "    Add it to backend/.env.testnet (never commit that file!).\n"
        "    You can export a mnemonic from PeraWallet → Settings → Show Passphrase."
    )

# ── Build clients -------------------------------------------------------------
from algosdk import mnemonic, account as sdk_account

deployer_private_key = mnemonic.to_private_key(DEPLOYER_MNEMONIC)
deployer_address     = sdk_account.address_from_private_key(deployer_private_key)

algod_client = algod.AlgodClient(
    ALGOD_TOKEN,
    ALGOD_SERVER + (f":{ALGOD_PORT}" if ALGOD_PORT else ""),
)

# ── Compile & deploy ----------------------------------------------------------
# Import the compiled ARC4 contract
sys.path.insert(0, str(Path(__file__).parent.parent))
from smart_contracts.trivia_pay.contract import TriviaPay  # noqa: E402

from algokit_utils.beta.algorand_client import AlgorandClient as BetaClient
from algokit_utils.beta.account_manager import AddressAndSigner
from algosdk.atomic_transaction_composer import AccountTransactionSigner

signer = AccountTransactionSigner(deployer_private_key)

client = BetaClient.from_clients(algod=algod_client)
client.set_default_signer(signer)
client.set_default_sender(deployer_address)

from algokit_utils.beta.app_client import AppClient
from algokit_utils import ApplicationSpecification

# Build the app factory & deploy
app_factory = client.client.app_factory(
    app_spec=TriviaPay,
    default_sender=deployer_address,
    default_signer=signer,
)

deploy_result, app_client = app_factory.deploy(
    on_schema_break="replace",
    on_update="update",
)

app_id       = deploy_result.app_id
escrow_addr  = deploy_result.app_address

# ── Print results -------------------------------------------------------------
print()
print("✅  Deployed TriviaPay")
print(f"   APP_ID          : {app_id}")
print(f"   ESCROW_ADDRESS  : {escrow_addr}")
print()
print("── Copy these into frontend/src/config/appConfig.js ──────────────────")
print(f"   APP_ID: {app_id},")
print(f"   ESCROW_ADDRESS: \"{escrow_addr}\",")
print("──────────────────────────────────────────────────────────────────────")

# ── Also write a deployment receipt ------------------------------------------
receipt = {
    "app_id": app_id,
    "escrow_address": escrow_addr,
    "deployer": deployer_address,
    "network": "testnet",
}
receipt_path = Path(__file__).parent.parent / "deploy" / "deployment_receipt.json"
receipt_path.parent.mkdir(parents=True, exist_ok=True)
receipt_path.write_text(json.dumps(receipt, indent=2))
print(f"📄  Receipt saved to {receipt_path.relative_to(Path.cwd())}")
