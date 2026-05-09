export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";
import { explorerUrl } from "@/lib/solana";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const db = getServiceClient();

  const { data: voucher, error } = await db
    .from("vouchers")
    .select("id, org_id, category, value_cents, unit_count, status, expires_at, on_chain_issue_sig, alias, created_at")
    .eq("id", params.id)
    .single();

  if (error || !voucher) {
    return NextResponse.json({ error: "Voucher not found" }, { status: 404 });
  }

  // Never return claim_token in public response
  return NextResponse.json({
    ...voucher,
    explorer_url: voucher.on_chain_issue_sig
      ? explorerUrl(voucher.on_chain_issue_sig)
      : null,
  });
}
