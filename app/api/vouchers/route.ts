export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const orgId = req.nextUrl.searchParams.get("org_id");
  if (!orgId) return NextResponse.json({ error: "org_id required" }, { status: 400 });

  const db = getServiceClient();
  const { data, error } = await db
    .from("vouchers")
    .select("id, category, value_cents, unit_count, status, alias, claim_token, on_chain_issue_sig, created_at, expires_at")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ vouchers: data });
}
