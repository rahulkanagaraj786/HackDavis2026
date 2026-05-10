#!/usr/bin/env node
/**
 * End-to-end integration test for Relief Ledger.
 * Tests the full issue → redeem → double-redeem flow against the running server.
 * Works in both mock mode (NEXT_PUBLIC_MOCK_CHAIN=true) and real Solana mode.
 *
 * Usage:
 *   node scripts/test-e2e.mjs              # targets http://localhost:3000
 *   node scripts/test-e2e.mjs https://...  # targets deployed URL
 */

const BASE = process.argv[2]?.replace(/\/$/, "") || "http://localhost:3000";

// Seed data IDs — must match supabase/migrations/002_seed_data.sql
const ORG_ID    = "11111111-1111-1111-1111-111111111111"; // Aggie Pantry
const VENDOR_ID = "aaaa0000-aaaa-aaaa-aaaa-aaaaaaaaaaaa"; // Davis Community Meals

let passed = 0;
let failed = 0;

const GREEN  = "\x1b[32m";
const RED    = "\x1b[31m";
const YELLOW = "\x1b[33m";
const RESET  = "\x1b[0m";
const DIM    = "\x1b[2m";

function ok(label, detail = "") {
  console.log(`  ${GREEN}✓${RESET} ${label}${detail ? `  ${DIM}${detail}${RESET}` : ""}`);
  passed++;
}

function fail(label, detail = "") {
  console.log(`  ${RED}✗${RESET} ${label}${detail ? `\n    ${RED}→ ${detail}${RESET}` : ""}`);
  failed++;
}

function section(title) {
  console.log(`\n${YELLOW}${title}${RESET}`);
}

async function req(method, path, body) {
  const opts = { method, headers: { "Content-Type": "application/json" }, cache: "no-store" };
  if (body) opts.body = JSON.stringify(body);
  try {
    const res = await fetch(`${BASE}${path}`, opts);
    const data = await res.json().catch(() => ({}));
    return { status: res.status, data };
  } catch (e) {
    throw new Error(`${method} ${path} — ${e.message}`);
  }
}

async function run() {
  console.log(`\n${"═".repeat(48)}`);
  console.log(` Relief Ledger — E2E Integration Tests`);
  console.log(` Target: ${BASE}`);
  console.log(`${"═".repeat(48)}`);

  // ── 0. Server reachable ──────────────────────────────
  section("0 · Server health");
  const { status: s0, data: impact0 } = await req("GET", "/api/impact");
  if (s0 === 200) ok("API reachable");
  else { fail("API reachable", `got ${s0}`); process.exit(1); }

  const baselineRedeemed = impact0.redeemed ?? 0;
  const baselineTotal    = impact0.total ?? 0;
  ok(`Baseline: ${baselineTotal} total, ${baselineRedeemed} redeemed`);

  // ── 1. Issue ─────────────────────────────────────────
  section("1 · Issue voucher");
  const { status: s1, data: issued } = await req("POST", "/api/vouchers/issue", {
    org_id:     ORG_ID,
    category:   "meals",
    value_cents: 500,
    unit_count:  1,
    expires_at: new Date(Date.now() + 7 * 86_400_000).toISOString(),
  });

  if (s1 !== 200) {
    fail(`POST /api/vouchers/issue → 200`, `got ${s1}: ${JSON.stringify(issued)}`);
    process.exit(1);
  }
  ok("POST /api/vouchers/issue → 200");

  const { voucher_id, claim_token, on_chain_sig, explorer_url } = issued;
  if (voucher_id)   ok(`voucher_id present`, voucher_id.slice(0, 8) + "…");
  else { fail("voucher_id missing"); process.exit(1); }
  if (claim_token)  ok("claim_token present");
  else { fail("claim_token missing"); process.exit(1); }
  if (on_chain_sig) ok("on_chain_sig present", on_chain_sig.slice(0, 20) + "…");
  else              fail("on_chain_sig missing");
  if (explorer_url) ok("explorer_url present");

  // ── 2. Lookup ────────────────────────────────────────
  section("2 · Lookup issued voucher");
  const { status: s2, data: v1 } = await req("GET", `/api/vouchers/${voucher_id}`);
  if (s2 === 200) ok("GET /api/vouchers/:id → 200");
  else            fail("GET /api/vouchers/:id → 200", `got ${s2}`);

  if (v1.status === "issued") ok(`status = "issued"`);
  else                        fail(`status = "issued"`, `got "${v1.status}"`);

  if (v1.value_cents === 500) ok("value_cents = 500");
  else                        fail("value_cents = 500", `got ${v1.value_cents}`);

  // ── 3. Redeem ────────────────────────────────────────
  section("3 · Redeem voucher");
  process.stdout.write(`    ${DIM}redeeming voucher_id=${voucher_id}${RESET}\n`);
  const { status: s3, data: redeemed } = await req("POST", "/api/redeem", {
    voucher_id,
    claim_token,
    vendor_id: VENDOR_ID,
  });

  if (s3 === 200) ok("POST /api/redeem → 200");
  else { fail("POST /api/redeem → 200", `got ${s3}: ${JSON.stringify(redeemed)}`); process.exit(1); }

  if (redeemed.on_chain_sig) ok("redeem on_chain_sig present", redeemed.on_chain_sig.slice(0, 20) + "…");
  else                       fail("redeem on_chain_sig missing");
  if (redeemed.explorer_url) ok("redeem explorer_url present");
  if (redeemed.value_cents === 500) ok("value_cents = 500 in response");
  else                              fail("value_cents in response", `got ${redeemed.value_cents}`);

  // ── 4. Status after redeem ───────────────────────────
  section("4 · Verify status after redeem");
  // Check immediately (no delay) then poll — helps diagnose write lag vs wrong voucher
  let v2Status = "unknown";
  for (let i = 0; i < 10; i++) {
    if (i > 0) await new Promise(r => setTimeout(r, 500));
    const { status: httpStatus, data: v2 } = await req("GET", `/api/vouchers/${voucher_id}`);
    v2Status = v2.status;
    process.stdout.write(`    ${DIM}[poll ${i}] http=${httpStatus} status="${v2Status}" id=${v2.id?.slice(0,8)}…${RESET}\n`);
    if (v2Status === "redeemed") break;
  }
  if (v2Status === "redeemed") ok(`status = "redeemed"`);
  else                         fail(`status = "redeemed"`, `got "${v2Status}"`);

  // ── 5. Double-redeem rejection ───────────────────────
  section("5 · Double-redeem (must be rejected on-chain)");
  const { status: s5, data: d5 } = await req("POST", "/api/redeem", {
    voucher_id,
    claim_token,
    vendor_id: VENDOR_ID,
  });

  if (s5 === 409) ok("second redeem → 409");
  else            fail("second redeem → 409", `got ${s5}`);

  if (d5.code === "ALREADY_REDEEMED") ok(`error code = "ALREADY_REDEEMED"`);
  else                                fail(`error code = "ALREADY_REDEEMED"`, `got "${d5.code}"`);

  // ── 6. Impact stats updated ──────────────────────────
  section("6 · Impact stats reflect new redemption");
  const { data: impact1 } = await req("GET", "/api/impact");
  const newRedeemed = impact1.redeemed ?? 0;
  const newTotal    = impact1.total ?? 0;

  if (newTotal > baselineTotal)
    ok(`total went up`, `${baselineTotal} → ${newTotal}`);
  else
    fail("total increased", `still ${newTotal}`);

  if (newRedeemed > baselineRedeemed)
    ok(`redeemed count went up`, `${baselineRedeemed} → ${newRedeemed}`);
  else
    fail("redeemed count increased", `still ${newRedeemed}`);

  const rate = impact1.redemption_rate ?? 0;
  ok(`redemption_rate = ${rate}%`);

  // ── 7. Vendor payout ─────────────────────────────────
  section("7 · Vendor payout updated");
  const { data: vData } = await req("GET", "/api/orgs/vendors");
  const vendor = (vData.vendors || []).find(v => v.id === VENDOR_ID);
  if (vendor) ok(`vendor found: ${vendor.name}`, `payout $${(vendor.pending_payout_cents / 100).toFixed(2)}`);
  else        fail("vendor found in response");

  // ── Summary ──────────────────────────────────────────
  console.log(`\n${"─".repeat(48)}`);
  const all = passed + failed;
  if (failed === 0) {
    console.log(`${GREEN}All ${all} tests passed ✓${RESET}\n`);
  } else {
    console.log(`${GREEN}${passed} passed${RESET}  ${RED}${failed} failed${RESET}  (${all} total)\n`);
    process.exit(1);
  }
}

run().catch(err => {
  console.error(`\n${RED}Test runner error: ${err.message}${RESET}\n`);
  process.exit(1);
});
