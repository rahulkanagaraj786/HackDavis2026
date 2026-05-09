export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";

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

  // Constant-time match is not possible in JS without Buffer.timingSafeEqual
  // but this endpoint only confirms match/no-match; it doesn't reveal the token
  const valid = !!data && data.claim_token === claim_token;
  return NextResponse.json({ valid });
}
