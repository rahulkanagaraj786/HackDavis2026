"use client";

import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Vendor = { id: string; name: string; category: string; pending_payout_cents: number };
type VoucherPreview = { id: string; category: string; value_cents: number; unit_count: number; status: string; expires_at: string };
type RedeemResult = { success: boolean; on_chain_sig: string; explorer_url: string; value_cents: number };

const CAT: Record<string, { icon: string; label: string; dark: string; glow: string; pill: string }> = {
  meals:   { icon: "🍽️", label: "Meals",   dark: "from-orange-900/60 to-amber-900/40",  glow: "shadow-orange-900/40",  pill: "bg-orange-500/20 text-orange-300 border-orange-500/30" },
  hygiene: { icon: "🧴", label: "Hygiene", dark: "from-purple-900/60 to-violet-900/40", glow: "shadow-purple-900/40", pill: "bg-purple-500/20 text-purple-300 border-purple-500/30" },
  transit: { icon: "🚌", label: "Transit", dark: "from-sky-900/60 to-blue-900/40",      glow: "shadow-sky-900/40",    pill: "bg-sky-500/20 text-sky-300 border-sky-500/30"          },
  laundry: { icon: "👕", label: "Laundry", dark: "from-teal-900/60 to-emerald-900/40",  glow: "shadow-teal-900/40",   pill: "bg-teal-500/20 text-teal-300 border-teal-500/30"       },
};

type AppState = "idle" | "preview" | "success" | "double_redeem";

export default function VendorPage() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [selectedVendorId, setSelectedVendorId] = useState("");
  const [manualCode, setManualCode] = useState("");
  const [preview, setPreview] = useState<VoucherPreview | null>(null);
  const [voucherId, setVoucherId] = useState<string | null>(null);
  const [claimToken, setClaimToken] = useState<string | null>(null);
  const [redeemResult, setRedeemResult] = useState<RedeemResult | null>(null);
  const [appState, setAppState] = useState<AppState>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [scanning, setScanning] = useState(false);
  const [confirming, setConfirming] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const scannerRef = useRef<any>(null);

  const selectedVendor = vendors.find(v => v.id === selectedVendorId);

  useEffect(() => {
    fetch("/api/orgs/vendors", { cache: "no-store" })
      .then(r => r.json())
      .then(d => {
        const list = d.vendors || [];
        setVendors(list);
        if (list.length > 0) setSelectedVendorId(list[0].id);
      })
      .catch(() => toast.error("Could not load vendors"));
  }, []);

  function reset() {
    setAppState("idle"); setPreview(null);
    setVoucherId(null); setClaimToken(null);
    setRedeemResult(null); setManualCode(""); setErrorMsg("");
  }

  function parseQrUrl(raw: string) {
    try {
      const url = new URL(raw);
      const parts = url.pathname.split("/");
      const id = parts[parts.indexOf("voucher") + 1];
      const token = url.searchParams.get("t");
      if (id && token) return { voucherId: id, token };
    } catch {
      const split = raw.split(":");
      if (split.length === 2) return { voucherId: split[0], token: split[1] };
    }
    return null;
  }

  async function handleQrData(raw: string) {
    const parsed = parseQrUrl(raw.trim());
    if (!parsed) { setErrorMsg("Could not parse QR code."); return; }
    const res = await fetch(`/api/vouchers/${parsed.voucherId}`);
    const data = await res.json();
    if (data.error) { setErrorMsg(data.error); return; }
    setVoucherId(parsed.voucherId);
    setClaimToken(parsed.token);
    setPreview(data);
    setAppState("preview");
  }

  async function startScanner() {
    setScanning(true);
    const { Html5Qrcode } = await import("html5-qrcode");
    const scanner = new Html5Qrcode("qr-reader");
    scannerRef.current = scanner;
    try {
      await scanner.start({ facingMode: "environment" }, { fps: 10, qrbox: 220 },
        (text: string) => { scanner.stop(); setScanning(false); handleQrData(text); },
        undefined);
    } catch { setScanning(false); setErrorMsg("Camera denied. Use manual entry."); }
  }

  async function stopScanner() {
    if (scannerRef.current) { await scannerRef.current.stop().catch(() => {}); scannerRef.current = null; }
    setScanning(false);
  }

  async function confirmRedeem() {
    if (!voucherId || !claimToken || !selectedVendorId) return;
    setConfirming(true);
    setErrorMsg("");
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60_000);
    try {
      const res = await fetch("/api/redeem", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ voucher_id: voucherId, claim_token: claimToken, vendor_id: selectedVendorId }),
        signal: controller.signal,
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.code === "ALREADY_REDEEMED") {
          setAppState("double_redeem");
          toast.error("Already Redeemed", { description: "The blockchain prevented double-spending." });
        } else {
          setErrorMsg(data.error || "Redemption failed");
        }
        return;
      }
      setRedeemResult(data);
      setAppState("success");
      toast.success("Redeemed!", { description: <a href={data.explorer_url} target="_blank" rel="noopener noreferrer" className="underline">View on-chain proof →</a> });
      fetch("/api/orgs/vendors").then(r => r.json()).then(d => setVendors(d.vendors || []));
    } catch (e: unknown) {
      const msg = e instanceof Error && e.name === "AbortError" ? "Timed out — Solana may be slow. Try again." : (e instanceof Error ? e.message : "Network error");
      setErrorMsg(msg);
    } finally {
      clearTimeout(timeout);
      setConfirming(false);
    }
  }

  const cat = preview ? (CAT[preview.category] ?? { icon: "🎟️", label: preview.category, dark: "from-slate-800 to-slate-800", glow: "", pill: "bg-white/10 text-white/60 border-white/10" }) : null;

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">

      {/* Gradient hero header */}
      <div className="gradient-brand px-5 pt-5 pb-7">

        {/* Nav row */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-white/20 backdrop-blur flex items-center justify-center">
              <span className="text-white font-black text-xs">RL</span>
            </div>
            <span className="text-white font-bold">Relief Ledger</span>
            <span className="text-white/30">/</span>
            <span className="text-blue-200 text-sm">Vendor</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-emerald-300 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Solana Devnet
          </div>
        </div>

        {/* Vendor name + switch */}
        <div className="flex items-center justify-between gap-3 mb-4">
          <div>
            <p className="text-blue-200/70 text-xs font-medium uppercase tracking-widest">Active vendor</p>
            <p className="text-white font-black text-2xl mt-1 leading-none">
              {selectedVendor?.name ?? "—"}
            </p>
          </div>
          {vendors.length > 1 && (
            <div className="flex gap-1.5 flex-wrap justify-end">
              {vendors.map(v => (
                <button
                  key={v.id}
                  onClick={() => setSelectedVendorId(v.id)}
                  className={`h-7 px-3 text-xs rounded-full border transition-all font-medium ${
                    selectedVendorId === v.id
                      ? "bg-white/25 border-white/40 text-white"
                      : "bg-white/10 border-white/15 text-white/60 hover:bg-white/15 hover:text-white"
                  }`}>
                  {v.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Payout card */}
        {selectedVendor && (
          <div className="bg-white/10 border border-white/15 rounded-2xl px-5 py-4 flex items-center justify-between">
            <p className="text-blue-200 text-sm font-medium">Pending reimbursement</p>
            <p className="text-white font-black text-3xl tabular-nums leading-none">
              ${(selectedVendor.pending_payout_cents / 100).toFixed(2)}
            </p>
          </div>
        )}
      </div>

      {/* Main area */}
      <div className="flex-1 px-4 py-5 flex flex-col gap-4 max-w-lg mx-auto w-full">

        {/* IDLE: scanner */}
        {appState === "idle" && (
          <div className="space-y-3">

            {/* Scanner panel */}
            <div className="bg-slate-900 rounded-2xl overflow-hidden border border-white/10">
              <div className="px-5 pt-5 pb-2 flex items-center justify-between">
                <div>
                  <p className="text-white font-bold">Scan Voucher</p>
                  <p className="text-slate-400 text-xs mt-0.5">Point camera at printed card</p>
                </div>
                {scanning && (
                  <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Scanning
                  </span>
                )}
              </div>

              <div className="relative mx-5 mb-2">
                {!scanning && (
                  <div className="h-52 bg-slate-800/80 rounded-xl border border-white/5 flex items-center justify-center">
                    <div className="relative w-32 h-32">
                      <span className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-blue-400 rounded-tl" />
                      <span className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-blue-400 rounded-tr" />
                      <span className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-blue-400 rounded-bl" />
                      <span className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-blue-400 rounded-br" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <p className="text-3xl opacity-30">⬛</p>
                      </div>
                    </div>
                  </div>
                )}
                <div id="qr-reader" className={scanning ? "w-full rounded-xl overflow-hidden" : "hidden"} />
              </div>

              <div className="p-4 pt-2">
                {!scanning ? (
                  <Button onClick={startScanner} className="w-full gradient-brand text-white font-bold py-5 border-0 hover:opacity-90 rounded-xl">
                    Start Camera
                  </Button>
                ) : (
                  <Button onClick={stopScanner} variant="outline" className="w-full border-slate-700 text-slate-300 hover:bg-slate-800 rounded-xl">
                    Stop Camera
                  </Button>
                )}
              </div>
            </div>

            {/* Manual entry */}
            <div className="bg-slate-900 rounded-2xl border border-white/10 px-5 py-4">
              <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-3">Manual Entry</p>
              <div className="space-y-2">
                <Input value={manualCode} onChange={e => setManualCode(e.target.value)}
                  placeholder="Voucher ID (from card)"
                  className="bg-slate-800 border-slate-700 text-slate-200 placeholder:text-slate-600 text-sm rounded-xl font-mono" />
                <Input value={claimToken ?? ""} onChange={e => setClaimToken(e.target.value)}
                  placeholder="Claim token (from card)"
                  className="bg-slate-800 border-slate-700 text-slate-200 placeholder:text-slate-600 text-sm rounded-xl font-mono" />
                <Button
                  onClick={() => {
                    if (manualCode && claimToken) {
                      setVoucherId(manualCode.trim());
                      fetch(`/api/vouchers/${manualCode.trim()}`, { cache: "no-store" })
                        .then(r => r.json())
                        .then(data => {
                          if (data.error) { setErrorMsg(data.error); return; }
                          setPreview(data);
                          setAppState("preview");
                        })
                        .catch(() => setErrorMsg("Could not fetch voucher"));
                    } else {
                      setErrorMsg("Enter both the Voucher ID and Claim Token from the printed card.");
                    }
                  }}
                  className="w-full gradient-brand text-white font-bold border-0 hover:opacity-90 rounded-xl py-5">
                  Look Up Voucher
                </Button>
              </div>
              {errorMsg && (
                <div className="mt-3 flex items-center gap-2 bg-red-950/60 border border-red-800/50 rounded-lg px-3 py-2">
                  <span className="text-red-400 text-sm">⚠</span>
                  <p className="text-red-300 text-sm">{errorMsg}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* PREVIEW: confirm redeem */}
        {appState === "preview" && preview && cat && (
          <div className="space-y-3">
            <div className={`relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br ${cat.dark} shadow-2xl ${cat.glow}`}>
              <div className="absolute inset-0 opacity-5"
                style={{ backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)", backgroundSize: "24px 24px" }} />
              <div className="relative px-6 pt-8 pb-7">
                <div className="flex items-start justify-between mb-4">
                  <span className={`text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full border ${cat.pill}`}>{cat.label}</span>
                  <span className="text-5xl">{cat.icon}</span>
                </div>
                <p className="text-7xl font-black text-white tabular-nums leading-none">
                  ${(preview.value_cents / 100).toFixed(2)}
                </p>
                {preview.unit_count > 1 && <p className="text-white/50 text-sm mt-2">× {preview.unit_count} units</p>}
                <div className="mt-6 pt-5 border-t border-white/10 flex items-center justify-between">
                  <p className="text-white/40 text-xs">Expires {new Date(preview.expires_at).toLocaleDateString()}</p>
                  <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide">
                    Valid
                  </span>
                </div>
              </div>
            </div>

            {errorMsg && (
              <div className="flex items-center gap-2 bg-red-950/60 border border-red-800/50 rounded-xl px-4 py-3">
                <span className="text-red-400">⚠</span>
                <p className="text-red-300 text-sm">{errorMsg}</p>
              </div>
            )}

            {preview.status !== "issued" ? (
              <div className="bg-amber-900/30 border border-amber-700/50 rounded-2xl p-5 text-center">
                <p className="text-amber-400 font-semibold">Cannot redeem — status: {preview.status}</p>
              </div>
            ) : (
              <Button onClick={confirmRedeem} disabled={confirming}
                className="w-full gradient-green text-white font-black text-xl py-8 border-0 hover:opacity-90 rounded-2xl shadow-xl shadow-emerald-950/50">
                {confirming ? (
                  <span className="flex items-center gap-3">
                    <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Confirming on Solana...
                  </span>
                ) : "✓ Confirm Redeem"}
              </Button>
            )}
            <Button variant="ghost" onClick={reset} className="w-full text-slate-600 hover:text-slate-400 text-sm">Cancel</Button>
          </div>
        )}

        {/* ALREADY REDEEMED */}
        {appState === "double_redeem" && (
          <div className="rounded-3xl overflow-hidden border-2 border-red-500/60">
            <div className="bg-red-950 px-8 py-10 text-center space-y-3">
              <div className="w-16 h-16 rounded-full bg-red-900/60 border border-red-600/40 flex items-center justify-center text-3xl mx-auto">🚫</div>
              <div className="pt-1">
                <p className="text-red-400 text-xs font-bold uppercase tracking-widest">On-chain rejection</p>
                <p className="text-white font-black text-4xl mt-2">Already<br />Redeemed</p>
              </div>
              <p className="text-red-300/70 text-sm leading-relaxed pt-1">
                This voucher was already used.<br />
                The Solana program rejected the duplicate.
              </p>
            </div>
            <div className="bg-slate-900 px-5 py-4">
              <Button onClick={reset} className="w-full bg-red-900/60 hover:bg-red-900 text-red-200 border border-red-700/50 font-bold rounded-xl">
                Scan Another Voucher
              </Button>
            </div>
          </div>
        )}

        {/* SUCCESS */}
        {appState === "success" && redeemResult && (
          <div className="space-y-3">
            <div className="rounded-3xl overflow-hidden border border-emerald-700/30">
              <div className="gradient-green px-6 py-10 text-center relative overflow-hidden">
                <div className="absolute inset-0 opacity-10"
                  style={{ backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)", backgroundSize: "28px 28px" }} />
                <div className="relative">
                  <div className="w-16 h-16 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-3xl mx-auto mb-4">✅</div>
                  <p className="text-white font-black text-4xl">Redeemed!</p>
                  <p className="text-5xl font-black text-emerald-200 mt-2 tabular-nums">
                    ${(redeemResult.value_cents / 100).toFixed(2)}
                  </p>
                  <p className="text-emerald-300/70 text-sm mt-1">credited to your account</p>
                </div>
              </div>
              <div className="bg-slate-900 px-5 py-4 space-y-3">
                <a href={redeemResult.explorer_url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center justify-between bg-slate-800 hover:bg-slate-700 border border-white/5 rounded-xl px-4 py-3.5 transition-colors group">
                  <div>
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-wide">On-chain proof</p>
                    <p className="text-blue-400 font-mono text-xs mt-0.5">{redeemResult.on_chain_sig.slice(0, 22)}...</p>
                  </div>
                  <span className="text-slate-500 group-hover:text-slate-300 transition-colors">→</span>
                </a>
                {selectedVendor && (
                  <div className="flex items-center justify-between bg-emerald-950/60 border border-emerald-700/30 rounded-xl px-4 py-3.5">
                    <p className="text-emerald-400 text-sm font-medium">New total pending</p>
                    <p className="text-emerald-300 font-black text-2xl tabular-nums">${(selectedVendor.pending_payout_cents / 100).toFixed(2)}</p>
                  </div>
                )}
              </div>
            </div>
            <Button onClick={reset} className="w-full gradient-brand text-white font-bold border-0 hover:opacity-90 rounded-2xl py-5">
              Scan Another Voucher
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
