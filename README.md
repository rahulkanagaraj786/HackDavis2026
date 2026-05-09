# Relief Ledger

Relief Ledger is a dignity-first aid voucher platform built for HackDavis 2026. Nonprofits issue anonymous QR vouchers for meals, hygiene, transit, and laundry. Vendors redeem them once. Solana provides a shared source of truth across organizations without putting recipient identity on-chain.

## Stack

- Next.js 14 + TypeScript + Tailwind
- Supabase for app data and seed/demo state
- Solana Devnet for real voucher issuance and redemption
- Mock-chain fallback for demo safety

## Local Setup

1. Install dependencies:

```bash
npm ci
```

2. Copy the example env file and fill in the Supabase values:

```bash
cp .env.local.example .env.local
```

3. Start the app:

```bash
npm run dev
```

## Mock-Chain Mode

Set `NEXT_PUBLIC_MOCK_CHAIN=true` to keep the demo independent from Devnet. The app will return deterministic fake signatures and Explorer-style links while preserving the same UI flow.

## Real Solana Mode

Set `NEXT_PUBLIC_MOCK_CHAIN=false` only after these values are ready:

- `NEXT_PUBLIC_PROGRAM_ID`
- `SOLANA_RPC_URL`
- `SOLANA_BACKEND_SECRET_KEY`

The backend talks to the deployed program directly with raw Solana instructions, so Vercel does not need local Anchor build artifacts or generated IDL files.
`SOLANA_BACKEND_SECRET_KEY` can be either a base58 secret string or the raw JSON array from Solana CLI.

### Important Program ID Rule

These three places must match the same deployed program ID exactly:

- `programs/relief-ledger/src/lib.rs`
- `Anchor.toml`
- `NEXT_PUBLIC_PROGRAM_ID` in `.env.local` or Vercel

The repo currently uses a valid placeholder program ID so the code path is buildable. Before turning on real-chain mode, replace it with your actual deployed Devnet program ID.

You can sync the program ID through the repo with:

```bash
npm run sync:program-id -- <YOUR_DEVNET_PROGRAM_ID>
```

## Deploying the Anchor Program

Run these commands from a machine that has Solana CLI, Anchor, and Rust installed:

```bash
anchor build
anchor deploy --provider.cluster devnet
```

After deploy:

1. Copy the real program ID into `programs/relief-ledger/src/lib.rs`
2. Run `npm run sync:program-id -- <YOUR_DEVNET_PROGRAM_ID>` if you want the repo files updated automatically
3. Set `NEXT_PUBLIC_PROGRAM_ID` in your envs
4. Set `NEXT_PUBLIC_MOCK_CHAIN=false`
5. Redeploy Vercel

## Deploying the Web App

Import the repo into Vercel and set:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_BASE_URL`
- `NEXT_PUBLIC_MOCK_CHAIN`
- `NEXT_PUBLIC_PROGRAM_ID` when using real chain
- `SOLANA_RPC_URL` when using real chain
- `SOLANA_BACKEND_SECRET_KEY` when using real chain

## Demo-Critical Behaviors

- Multi-org voucher issuance
- Printable voucher cards
- Vendor redemption
- Double-redeem rejection
- Impact dashboard updates
