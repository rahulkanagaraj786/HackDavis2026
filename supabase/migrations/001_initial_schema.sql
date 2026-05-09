-- Relief Ledger initial schema
-- Run this in Supabase SQL editor or via CLI: supabase db push

create extension if not exists "uuid-ossp";

-- orgs: nonprofits issuing vouchers
create table if not exists orgs (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  logo_url text,
  signer_pubkey text not null,
  created_at timestamptz not null default now()
);

-- vendors: businesses/staff who redeem vouchers
create table if not exists vendors (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  category text not null check (category in ('meals', 'hygiene', 'transit', 'laundry')),
  pending_payout_cents int not null default 0,
  created_at timestamptz not null default now()
);

-- vouchers: full off-chain record (PII never stored here)
create table if not exists vouchers (
  id uuid primary key default uuid_generate_v4(),
  voucher_hash text unique not null,
  org_id uuid not null references orgs(id),
  category text not null check (category in ('meals', 'hygiene', 'transit', 'laundry')),
  value_cents int not null,
  unit_count int not null default 1,
  status text not null default 'issued' check (status in ('issued', 'redeemed', 'expired')),
  claim_token text not null,
  expires_at timestamptz not null,
  redeemed_by_vendor_id uuid references vendors(id),
  redeemed_at timestamptz,
  on_chain_issue_sig text,
  on_chain_redeem_sig text,
  alias text,
  notes text,
  created_at timestamptz not null default now()
);

-- audit_log: append-only event stream
create table if not exists audit_log (
  id uuid primary key default uuid_generate_v4(),
  voucher_id uuid not null references vouchers(id),
  event_type text not null check (event_type in ('issued', 'redeemed', 'print_generated')),
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

-- Row Level Security
-- Vouchers: org admins see only their org's vouchers
-- (For demo we skip actual auth; RLS guards production use)
alter table vouchers enable row level security;
alter table audit_log enable row level security;

-- Public read for orgs and vendors (needed for vendor scan page with no auth)
alter table orgs enable row level security;
alter table vendors enable row level security;

create policy "public read orgs" on orgs for select using (true);
create policy "public read vendors" on vendors for select using (true);

-- Vouchers: server-side service role key bypasses RLS; anon key blocked
create policy "service role only" on vouchers using (false);
create policy "service role only audit" on audit_log using (false);

-- Indexes
create index if not exists vouchers_org_id_idx on vouchers(org_id);
create index if not exists vouchers_status_idx on vouchers(status);
create index if not exists vouchers_claim_token_idx on vouchers(claim_token);
create index if not exists audit_log_voucher_id_idx on audit_log(voucher_id);
