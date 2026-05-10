import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Lazy initialization — defer client creation until first use so build
// succeeds without env vars present. Env vars are required at runtime.
let _supabase: SupabaseClient | null = null;
let _serviceClient: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!_supabase) {
    _supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }
  return _supabase;
}

export function getServiceClient(): SupabaseClient {
  if (!_serviceClient) {
    _serviceClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        global: {
          // Bypass Next.js 14 fetch Data Cache — without this, Supabase's
          // internal fetch calls get cached and reads return stale rows.
          fetch: (url, options) => fetch(url, { ...options, cache: "no-store" }),
        },
      }
    );
  }
  return _serviceClient;
}

// Convenience alias for client-side use
export const supabase = { get: getSupabase };

export type Org = {
  id: string;
  name: string;
  logo_url: string | null;
  signer_pubkey: string;
  created_at: string;
};

export type Vendor = {
  id: string;
  name: string;
  category: string;
  pending_payout_cents: number;
  created_at: string;
};

export type Voucher = {
  id: string;
  voucher_hash: string;
  org_id: string;
  category: "meals" | "hygiene" | "transit" | "laundry";
  value_cents: number;
  unit_count: number;
  status: "issued" | "redeemed" | "expired";
  claim_token: string;
  expires_at: string;
  redeemed_by_vendor_id: string | null;
  redeemed_at: string | null;
  on_chain_issue_sig: string | null;
  on_chain_redeem_sig: string | null;
  alias: string | null;
  notes: string | null;
  created_at: string;
};

export type AuditLog = {
  id: string;
  voucher_id: string;
  event_type: "issued" | "redeemed" | "print_generated";
  metadata: Record<string, unknown>;
  created_at: string;
};
