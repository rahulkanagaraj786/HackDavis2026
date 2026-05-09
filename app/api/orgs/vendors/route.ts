export const dynamic = "force-dynamic";
export const revalidate = 0;
import { NextResponse } from "next/server";
import { unstable_noStore as noStore } from "next/cache";
import { getServiceClient } from "@/lib/supabase";

export async function GET() {
  noStore();
  const db = getServiceClient();
  const { data, error } = await db
    .from("vendors")
    .select("id, name, category, pending_payout_cents")
    .order("name");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ vendors: data });
}
