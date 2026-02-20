# Trivia Pay

Pera Wallet–based Algorand testnet demo for bill splitting, payments, and analytics. Frontend is React + Vite; smart contract already deployed to testnet.

## Live Contract IDs
- App ID: **755792571**
- Escrow: **ER745AB7H64MC7RO5PEL7YCDQ245JOHVPHN5WHO3FCGPI5Y7GHL5QGAT64**

 ## Smart Contract Integration 
 File Path - backend/smart_contracts/trivia_pay/contract.py

These are wired statically in `frontend/src/config/appConfig.js` and surfaced read-only in the Settings page.

## Quick Start (frontend)
1) `cd frontend`
2) `npm install`
3) `npm run dev`
4) Open the shown localhost URL; connect with Pera Wallet.

## Build
- `npm run build` → output in `frontend/dist`

## Deploy to Vercel (frontend only)
- Root directory: `frontend`
- Build command: `npm run build`
- Output directory: `dist`
- Framework: Vite (auto-detected)

## Backend
- PyTeal/Algokit project in `backend/` used to deploy the above app/escrow to Algorand testnet.
- Latest deploy receipt: `backend/deploy/deployment_pyteal_receipt.json` (App ID 755792571, escrow as above).
- No hosted API required; frontend talks directly to Algonode endpoints.
- Smart Contract Integration File Path - backend/smart_contracts/trivia_pay/contract.py

## Notes
- Wallet integration: Pera Wallet only (Defly removed).
- Network: Testnet (Algonode public endpoints).
- Settings page shows the static App ID and escrow; they are not user-editable.


