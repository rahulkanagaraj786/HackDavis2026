export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export interface Database {
  public: {
    Tables: {
      orgs: {
        Row: {
          id: string;
          name: string;
          logo_url: string | null;
          signer_pubkey: string;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["orgs"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["orgs"]["Row"]>;
      };
      vendors: {
        Row: {
          id: string;
          name: string;
          category: string;
          pending_payout_cents: number;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["vendors"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["vendors"]["Row"]>;
      };
      vouchers: {
        Row: {
          id: string;
          voucher_hash: string;
          org_id: string;
          category: string;
          value_cents: number;
          unit_count: number;
          status: string;
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
        Insert: Partial<Database["public"]["Tables"]["vouchers"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["vouchers"]["Row"]>;
      };
      audit_log: {
        Row: {
          id: string;
          voucher_id: string;
          event_type: string;
          metadata: Json;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["audit_log"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["audit_log"]["Row"]>;
      };
    };
    Views: Record<string, never>;
    Functions: {
      increment_vendor_payout: {
        Args: { p_vendor_id: string; p_amount: number };
        Returns: void;
      };
    };
  };
}
