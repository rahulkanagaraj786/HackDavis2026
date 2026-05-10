export const dynamic = "force-dynamic";
export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";
import { redeemVoucherOnChain } from "@/lib/anchor-client";
import type { Voucher } from "@/lib/supabase";
import { timingSafeEqual } from "crypto";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { voucher_id, claim_token, vendor_id } = body;

    if (!voucher_id || !claim_token || !vendor_id) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const db = getServiceClient();

    // Fetch voucher and verify claim token
    const { data, error: fetchError } = await db
      .from("vouchers")
      .select("*")
      .eq("id", voucher_id)
      .single();

    const voucher = data as unknown as Voucher | null;

    if (fetchError || !voucher) {
      return NextResponse.json({ error: "Voucher not found" }, { status: 404 });
    }

    // Constant-time comparison to prevent timing attacks
    const storedToken = Buffer.from(voucher.claim_token);
    const providedToken = Buffer.from(claim_token);
    const tokenMatch =
      storedToken.length === providedToken.length &&
      timingSafeEqual(storedToken, providedToken);
    if (!tokenMatch) {
      return NextResponse.json({ error: "Invalid claim token" }, { status: 403 });
    }

    if (voucher.status === "redeemed") {
      return NextResponse.json(
        { error: "Already redeemed", code: "ALREADY_REDEEMED" },
        { status: 409 }
      );
    }

    if (voucher.status === "expired" || new Date(voucher.expires_at) < new Date()) {
      return NextResponse.json({ error: "Voucher expired" }, { status: 410 });
    }

    // Write redemption on-chain first (source of truth for double-redeem prevention)
    let chainResult;
    try {
      chainResult = await redeemVoucherOnChain({ voucherId: voucher_id, vendorId: vendor_id });
    } catch (chainErr: unknown) {
      if (chainErr instanceof Error && chainErr.message?.includes("AlreadyRedeemed")) {
        return NextResponse.json(
          { error: "Already redeemed (on-chain)", code: "ALREADY_REDEEMED" },
          { status: 409 }
        );
      }
      throw chainErr;
    }

    // Update Supabase
    const now = new Date().toISOString();
    const { data: updatedRows, error: updateError } = await db
      .from("vouchers")
      .update({
        status: "redeemed",
        redeemed_by_vendor_id: vendor_id,
        redeemed_at: now,
        on_chain_redeem_sig: chainResult.signature,
      })
      .eq("id", voucher_id)
      .select("id, status");

    if (updateError) {
      console.error("Voucher status update failed:", updateError);
      throw new Error(`DB update failed: ${updateError.message}`);
    }
    console.log(`[redeem] updated rows:`, JSON.stringify(updatedRows));

    // Increment vendor payout
    await db.rpc("increment_vendor_payout", {
      p_vendor_id: vendor_id,
      p_amount: voucher.value_cents,
    });

    // Audit log
    await db.from("audit_log").insert({
      voucher_id,
      event_type: "redeemed",
      metadata: { vendor_id, on_chain_sig: chainResult.signature },
    });

    return NextResponse.json({
      success: true,
      on_chain_sig: chainResult.signature,
      explorer_url: chainResult.explorerUrl,
      value_cents: voucher.value_cents,
    });
  } catch (err: unknown) {
    console.error("Redeem error:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 });
  }
}
