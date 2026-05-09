export const dynamic = "force-dynamic";
export const revalidate = 0;
/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { unstable_noStore as noStore } from "next/cache";
import { getServiceClient } from "@/lib/supabase";

export async function GET() {
  noStore();
  const db = getServiceClient();

  const [vouchersRes, orgsRes, vendorsRes, auditRes] = await Promise.all([
    db.from("vouchers").select("id, category, value_cents, status, org_id, redeemed_by_vendor_id, redeemed_at, on_chain_redeem_sig, created_at"),
    db.from("orgs").select("id, name"),
    db.from("vendors").select("id, name, pending_payout_cents"),
    db.from("audit_log").select("voucher_id, event_type, created_at, metadata").order("created_at", { ascending: false }).limit(10),
  ]);

  const vouchers: any[] = vouchersRes.data || [];
  const orgs: any[] = orgsRes.data || [];
  const vendors: any[] = vendorsRes.data || [];
  const recentAudit: any[] = auditRes.data || [];

  const issued = vouchers.filter((v) => v.status === "issued").length;
  const redeemed = vouchers.filter((v) => v.status === "redeemed").length;
  const expired = vouchers.filter((v) => v.status === "expired").length;
  const total = vouchers.length;

  const byCategory = ["meals", "hygiene", "transit", "laundry"].map((cat) => ({
    category: cat,
    issued: vouchers.filter((v) => v.category === cat && v.status === "issued").length,
    redeemed: vouchers.filter((v) => v.category === cat && v.status === "redeemed").length,
  }));

  // Cross-org × cross-vendor stat: unique org/vendor combos in redeemed vouchers
  const redeemedVouchers = vouchers.filter((v) => v.status === "redeemed");
  const uniqueOrgs = new Set(redeemedVouchers.map((v) => v.org_id)).size;
  const uniqueVendors = new Set(redeemedVouchers.map((v) => v.redeemed_by_vendor_id)).size;

  const recentRedemptions = recentAudit
    .filter((a) => a.event_type === "redeemed")
    .map((a) => {
      const v = vouchers.find((vv) => vv.id === a.voucher_id);
      const vendor = vendors.find((vv) => vv.id === (a.metadata as Record<string, string>)?.vendor_id);
      const org = orgs.find((o) => o.id === v?.org_id);
      return {
        voucher_id: a.voucher_id,
        category: v?.category,
        value_cents: v?.value_cents,
        org_name: org?.name,
        vendor_name: vendor?.name,
        redeemed_at: a.created_at,
        on_chain_sig: (a.metadata as Record<string, string>)?.on_chain_sig,
        explorer_url: v?.on_chain_redeem_sig
          ? `https://explorer.solana.com/tx/${v.on_chain_redeem_sig}?cluster=devnet`
          : null,
      };
    });

  return NextResponse.json({
    total,
    issued,
    redeemed,
    expired,
    redemption_rate: total > 0 ? Math.round((redeemed / total) * 100) : 0,
    by_category: byCategory,
    cross_org_count: uniqueOrgs,
    cross_vendor_count: uniqueVendors,
    orgs: orgs.length,
    vendors: vendors.length,
    recent_redemptions: recentRedemptions,
  });
}
