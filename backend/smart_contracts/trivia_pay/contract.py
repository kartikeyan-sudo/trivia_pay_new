"""
TriviaPay Smart Contract
========================
A payment-escrow contract that holds ALGO funds and allows:
  - deposit()  : anyone can send ALGO into the escrow pool
  - withdraw() : the owner can pull funds out
  - pay()      : the owner can pay a named recipient from the pool
  - balance()  : read-only query of current escrowed ALGO

Deploy with:
    cd backend
    algokit deploy testnet
"""

from algopy import (
    ARC4Contract,
    Account,
    Asset,
    Global,
    GlobalState,
    LocalState,
    Txn,
    UInt64,
    arc4,
    gtxn,
    itxn,
    subroutine,
)


class TriviaPay(ARC4Contract):
    """Simple escrow / payment-pool contract for TriviaPay."""

    # ── Global state ──────────────────────────────────────────────────────────
    owner: GlobalState[Account]        # deployer address
    total_deposited: GlobalState[UInt64]

    # ── Local state (opt-in tracking) ─────────────────────────────────────────
    user_deposited: LocalState[UInt64]

    # ── Lifecycle ─────────────────────────────────────────────────────────────

    @arc4.abimethod(allow_actions=["NoOp"], create="require")
    def create(self) -> None:
        """Bootstrap: called once at deployment."""
        self.owner.value = Txn.sender
        self.total_deposited.value = UInt64(0)

    # ── Public methods ────────────────────────────────────────────────────────

    @arc4.abimethod(allow_actions=["NoOp"])
    def deposit(self, payment: gtxn.PaymentTransaction) -> None:
        """
        Deposit ALGO into the contract escrow.

        Expects a grouped PaymentTransaction sending ALGO to this contract's
        address (Global.current_application_address).
        """
        assert payment.receiver == Global.current_application_address, \
            "Payment must go to this contract's address"
        assert payment.amount > UInt64(0), "Deposit amount must be > 0"

        self.total_deposited.value = (
            self.total_deposited.value + payment.amount
        )

    @arc4.abimethod(allow_actions=["NoOp"])
    def pay(self, recipient: Account, amount: UInt64, note: arc4.String) -> None:
        """
        Pay `amount` microALGO to `recipient` from the escrow pool.
        Only callable by the contract owner.
        """
        assert Txn.sender == self.owner.value, "Only owner can call pay()"
        assert amount > UInt64(0), "Amount must be > 0"
        assert (
            self.total_deposited.value >= amount
        ), "Insufficient escrow balance"

        # Inner transaction: send ALGO to recipient
        itxn.Payment(
            receiver=recipient,
            amount=amount,
            note=note.native,
            fee=UInt64(0),
        ).submit()

        self.total_deposited.value = self.total_deposited.value - amount

    @arc4.abimethod(allow_actions=["NoOp"])
    def withdraw(self, amount: UInt64) -> None:
        """
        Withdraw `amount` microALGO back to the owner.
        Only callable by the contract owner.
        """
        assert Txn.sender == self.owner.value, "Only owner can withdraw"
        assert amount > UInt64(0), "Amount must be > 0"
        assert (
            self.total_deposited.value >= amount
        ), "Insufficient escrow balance"

        itxn.Payment(
            receiver=self.owner.value,
            amount=amount,
            fee=UInt64(0),
        ).submit()

        self.total_deposited.value = self.total_deposited.value - amount

    @arc4.abimethod(allow_actions=["NoOp"], readonly=True)
    def balance(self) -> UInt64:
        """Return the total amount of ALGO currently held in escrow."""
        return self.total_deposited.value

    @arc4.abimethod(allow_actions=["NoOp"], readonly=True)
    def get_owner(self) -> Account:
        """Return the owner address."""
        return self.owner.value
