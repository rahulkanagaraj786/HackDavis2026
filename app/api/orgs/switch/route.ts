export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { DEMO_ORGS } from "@/lib/demo-session";

export async function POST(req: NextRequest) {
  const { org_cookie } = await req.json();
  const org = DEMO_ORGS.find((o) => o.cookieValue === org_cookie);
  if (!org) return NextResponse.json({ error: "Unknown org" }, { status: 400 });

  const res = NextResponse.json({ ok: true, org });
  res.cookies.set("demo_org", org_cookie, { path: "/", httpOnly: true, sameSite: "lax" });
  return res;
}
