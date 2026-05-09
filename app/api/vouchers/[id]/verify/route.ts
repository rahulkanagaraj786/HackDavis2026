export const dynamic = "force-dynamic";
export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";
import { timingSafeEqual } from "crypto";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { claim_token } = await req.json();
  if (!claim_token) return NextResponse.json({ valid: false });

  const db = getServiceClient();
  const { data } = await db
    .from("vouchers")
    .select("claim_token")
    .eq("id", params.id)
    .single();

  const valid = !!data &&
    data.claim_token.length === claim_token.length &&
    timingSafeEqual(Buffer.from(data.claim_token), Buffer.from(claim_token));
  return NextResponse.json({ valid });
}
