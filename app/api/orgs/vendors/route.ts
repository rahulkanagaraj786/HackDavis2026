export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";

export async function GET() {
  const db = getServiceClient();
  const { data, error } = await db
    .from("vendors")
    .select("id, name, category, pending_payout_cents")
    .order("name");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ vendors: data });
}
