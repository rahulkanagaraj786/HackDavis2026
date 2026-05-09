export const dynamic = "force-dynamic";
export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";
import { issueVoucherOnChain, sha256 } from "@/lib/anchor-client";
import { randomBytes } from "crypto";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { category, value_cents, unit_count, expires_at, alias, org_id } = body;

    if (!category || !value_cents || !org_id) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const validCategories = ["meals", "hygiene", "transit", "laundry"];
    if (!validCategories.includes(category)) {
      return NextResponse.json({ error: "Invalid category" }, { status: 400 });
    }

    const db = getServiceClient();

    // Generate voucher ID and claim token
    const voucherId = crypto.randomUUID();
    const claimToken = randomBytes(24).toString("base64url");
    const voucherHash = sha256(voucherId).toString("hex");

    // Write to Supabase first (optimistic — chain write follows)
    const { data: voucher, error: dbError } = await db
      .from("vouchers")
      .insert({
        id: voucherId,
        voucher_hash: voucherHash,
        org_id,
        category,
        value_cents,
        unit_count: unit_count || 1,
        status: "issued",
        claim_token: claimToken,
        expires_at: expires_at || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        alias: alias || null,
      })
      .select()
      .single();

    if (dbError || !voucher) {
      return NextResponse.json({ error: dbError?.message || "DB error" }, { status: 500 });
    }

    let chainResult;
    try {
      chainResult = await issueVoucherOnChain({
        voucherId,
        orgId: org_id,
        category,
        valueCents: value_cents,
        unitCount: unit_count || 1,
      });
    } catch (chainError) {
      await db.from("vouchers").delete().eq("id", voucherId);
      throw chainError;
    }

    // Update Supabase with on-chain sig
    await db
      .from("vouchers")
      .update({ on_chain_issue_sig: chainResult.signature })
      .eq("id", voucherId);

    // Audit log
    await db.from("audit_log").insert({
      voucher_id: voucherId,
      event_type: "issued",
      metadata: { org_id, category, value_cents, on_chain_sig: chainResult.signature },
    });

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || new URL(req.url).origin;
    const qrUrl = `${baseUrl}/voucher/${voucherId}?t=${claimToken}`;

    return NextResponse.json({
      voucher_id: voucherId,
      claim_token: claimToken,
      qr_url: qrUrl,
      on_chain_sig: chainResult.signature,
      explorer_url: chainResult.explorerUrl,
    });
  } catch (err: unknown) {
    console.error("Issue error:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 });
  }
}
