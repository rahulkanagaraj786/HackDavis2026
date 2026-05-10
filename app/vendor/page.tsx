"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowUpRight,
  Camera,
  CheckCircle2,
  CircleAlert,
  HandCoins,
  QrCode,
  RotateCcw,
  ScanLine,
  Store,
  WalletCards,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Vendor = {
  id: string;
  name: string;
  category: string;
  pending_payout_cents: number;
};

type VoucherPreview = {
  id: string;
  category: string;
  value_cents: number;
  unit_count: number;
  status: string;
  expires_at: string;
};

type RedeemResult = {
  success: boolean;
  on_chain_sig: string;
  explorer_url: string;
  value_cents: number;
};

const CAT: Record<
  string,
  { icon: string; label: string; dark: string; glow: string; chip: string; accent: string }
> = {
  meals: {
    icon: "🍽️",
    label: "Meals",
    dark: "from-orange-900/75 via-orange-800/40 to-amber-900/15",
    glow: "shadow-orange-950/45",
    chip: "bg-orange-500/18 text-orange-200 border-orange-400/25",
    accent: "text-orange-200",
  },
  hygiene: {
    icon: "🧴",
    label: "Hygiene",
    dark: "from-fuchsia-900/75 via-violet-900/40 to-purple-900/15",
    glow: "shadow-purple-950/45",
    chip: "bg-purple-500/18 text-purple-200 border-purple-400/25",
    accent: "text-purple-200",
  },
  transit: {
    icon: "🚌",
    label: "Transit",
    dark: "from-sky-900/75 via-blue-900/40 to-cyan-900/15",
    glow: "shadow-sky-950/45",
    chip: "bg-sky-500/18 text-sky-200 border-sky-400/25",
    accent: "text-sky-200",
  },
  laundry: {
    icon: "👕",
    label: "Laundry",
    dark: "from-teal-900/75 via-emerald-900/40 to-green-900/15",
    glow: "shadow-emerald-950/45",
    chip: "bg-teal-500/18 text-teal-200 border-teal-400/25",
    accent: "text-teal-200",
  },
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

  const selectedVendor = vendors.find((vendor) => vendor.id === selectedVendorId);
  const vendorMeta = (category: string) =>
    CAT[category] ?? {
      icon: "🏪",
      label: category,
      dark: "",
      glow: "",
      chip: "bg-white/[0.06] text-white/70 border-white/10",
      accent: "text-white",
    };

  useEffect(() => {
    fetch("/api/orgs/vendors", { cache: "no-store" })
      .then((response) => response.json())
      .then((data) => {
        const list = data.vendors || [];
        setVendors(list);
        if (list.length > 0) setSelectedVendorId(list[0].id);
      })
      .catch(() => toast.error("Could not load vendors"));
  }, []);

  function reset() {
    setAppState("idle");
    setPreview(null);
    setVoucherId(null);
    setClaimToken(null);
    setRedeemResult(null);
    setManualCode("");
    setErrorMsg("");
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
    if (!parsed) {
      setErrorMsg("Could not parse QR code.");
      return;
    }
    const res = await fetch(`/api/vouchers/${parsed.voucherId}`);
    const data = await res.json();
    if (data.error) {
      setErrorMsg(data.error);
      return;
    }
    setVoucherId(parsed.voucherId);
    setClaimToken(parsed.token);
    setPreview(data);
    setAppState("preview");
  }

  async function startScanner() {
    setScanning(true);
    setErrorMsg("");
    const { Html5Qrcode } = await import("html5-qrcode");
    const scanner = new Html5Qrcode("qr-reader");
    scannerRef.current = scanner;
    try {
      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: 220 },
        (text: string) => {
          scanner.stop();
          setScanning(false);
          handleQrData(text);
        },
        undefined,
      );
    } catch {
      setScanning(false);
      setErrorMsg("Camera denied. Use manual entry.");
    }
  }

  async function stopScanner() {
    if (scannerRef.current) {
      await scannerRef.current.stop().catch(() => {});
      scannerRef.current = null;
    }
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
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ voucher_id: voucherId, claim_token: claimToken, vendor_id: selectedVendorId }),
        signal: controller.signal,
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.code === "ALREADY_REDEEMED") {
          setAppState("double_redeem");
          toast.error("Already Redeemed", {
            description: "The blockchain prevented double-spending.",
          });
        } else {
          setErrorMsg(data.error || "Redemption failed");
        }
        return;
      }
      setRedeemResult(data);
      setAppState("success");
      toast.success("Redeemed!", {
        description: (
          <a href={data.explorer_url} target="_blank" rel="noopener noreferrer" className="underline">
            View on-chain proof →
          </a>
        ),
      });
      fetch("/api/orgs/vendors")
        .then((response) => response.json())
        .then((data) => setVendors(data.vendors || []));
    } catch (error: unknown) {
      const message =
        error instanceof Error && error.name === "AbortError"
          ? "Timed out — Solana may be slow. Try again."
          : error instanceof Error
            ? error.message
            : "Network error";
      setErrorMsg(message);
    } finally {
      clearTimeout(timeout);
      setConfirming(false);
    }
  }

  const cat = preview
    ? CAT[preview.category] ?? {
        icon: "🎟️",
        label: preview.category,
        dark: "from-slate-800 via-slate-900 to-slate-950",
        glow: "shadow-slate-950/40",
        chip: "bg-white/10 text-white/70 border-white/10",
        accent: "text-white",
      }
    : null;

  const shellClass = "rounded-[34px] border border-white/10 bg-white/[0.04] shadow-2xl shadow-black/30 backdrop-blur-sm";
  const fieldClass =
    "h-11 rounded-xl border-white/10 bg-slate-950/65 text-slate-100 placeholder:text-slate-500 shadow-inner shadow-black/25";

  return (
    <div className={cn("min-h-screen bg-slate-950 text-white", appState === "idle" && "lg:h-screen lg:overflow-hidden")}>
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-8 top-20 h-80 w-80 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-96 w-96 rounded-full bg-emerald-500/8 blur-3xl" />
        <div className="absolute left-1/2 top-1/3 h-72 w-72 -translate-x-1/2 rounded-full bg-purple-500/6 blur-3xl" />
      </div>

      <div className={cn("relative", appState === "idle" && "lg:flex lg:h-full lg:flex-col")}>
        <section className="px-4 pt-4 lg:px-6">
          <div className="relative mx-auto max-w-6xl overflow-hidden rounded-[30px] border border-blue-400/12 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.18),transparent_32%),linear-gradient(135deg,rgba(8,15,33,0.92),rgba(18,38,92,0.88),rgba(8,15,33,0.94))] shadow-2xl shadow-black/30 backdrop-blur-2xl">
            <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-blue-400/14 via-blue-500/6 to-transparent" />
            <div className="relative px-5 py-4 lg:px-6">
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-blue-400/20 bg-blue-500/12 shadow-lg shadow-blue-950/35">
                    <Store className="h-5 w-5 text-blue-300" />
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">Vendor Portal</p>
                    <p className="mt-1 text-lg font-black tracking-tight text-white">Redemption terminal</p>
                  </div>
                </div>

                <div className="flex items-center justify-start gap-4 lg:justify-end">
                  <div className="min-w-0 text-left lg:text-right">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Pending reimbursement</p>
                    <p className="mt-1 text-3xl font-black tabular-nums text-white">
                      {selectedVendor ? `$${(selectedVendor.pending_payout_cents / 100).toFixed(2)}` : "—"}
                    </p>
                  </div>
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05]">
                    <WalletCards className="h-5 w-5 text-white" />
                  </div>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1.5 text-xs font-semibold text-emerald-200">
                  <span className="h-2 w-2 rounded-full bg-emerald-300 animate-pulse" />
                  Solana Devnet live
                </div>
                <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5 text-xs font-medium text-slate-300">
                  <ScanLine className="h-3.5 w-3.5 text-blue-300" />
                  Camera-first
                </div>
                <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5 text-xs font-medium text-slate-300">
                  <HandCoins className="h-3.5 w-3.5 text-emerald-300" />
                  Payout-ready
                </div>
              </div>

              <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-center gap-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Active vendor</p>
                    <p className="mt-1 text-sm font-semibold text-white">{selectedVendor?.name ?? "—"}</p>
                  </div>
                </div>

                {vendors.length > 1 && (
                  <div className="flex flex-wrap gap-1.5 rounded-2xl border border-white/10 bg-slate-950/30 p-1.5">
                    {vendors.map((vendor) => {
                      const meta = vendorMeta(vendor.category);
                      const active = selectedVendorId === vendor.id;

                      return (
                        <button
                          key={vendor.id}
                          onClick={() => setSelectedVendorId(vendor.id)}
                          className={cn(
                            "inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium transition-all",
                            active
                              ? cn("shadow-lg shadow-black/20", meta.chip)
                              : "border-white/8 bg-white/[0.03] text-slate-400 hover:bg-white/[0.08] hover:text-white",
                          )}
                        >
                          <span className={cn("h-2 w-2 rounded-full", meta.accent.replace("text-", "bg-"))} />
                          {vendor.name}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        <main className={cn("mx-auto max-w-6xl px-4 py-4 lg:px-6 lg:py-5", appState === "idle" && "lg:flex-1 lg:min-h-0")}>
          {appState === "idle" && (
            <div className="grid gap-5 lg:h-full lg:grid-cols-[minmax(0,1fr)_320px] lg:items-stretch">
              <section className="relative min-h-0 overflow-hidden rounded-[40px] border border-white/10 bg-white/[0.04] shadow-2xl shadow-black/35 backdrop-blur-sm">
                <div
                  className="absolute inset-0 opacity-10"
                  style={{
                    backgroundImage: "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.5) 1px, transparent 0)",
                    backgroundSize: "30px 30px",
                  }}
                />
                <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-blue-500/10 to-transparent" />

                <div className="relative flex h-full min-h-0 flex-col">
                  <div className="flex flex-col gap-3 px-6 pt-5 pb-4 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Scan stage</p>
                      <h2 className="mt-2 text-2xl font-black text-white">Point at the voucher</h2>
                      <p className="mt-2 max-w-xl text-sm leading-6 text-slate-400">
                        Printed cards scan fastest. Manual entry is open too, using the same redemption path.
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2 md:justify-end">
                      {[
                        { step: "01", label: "Open camera" },
                        { step: "02", label: "Frame QR" },
                        { step: "03", label: "Confirm payout" },
                      ].map((item) => (
                        <div
                          key={item.step}
                          className="inline-flex items-center gap-2 rounded-full border border-white/8 bg-slate-950/45 px-3 py-2"
                        >
                          <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">{item.step}</span>
                          <span className="text-sm font-medium text-slate-200">{item.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex min-h-0 flex-1 px-6 pb-6">
                    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-[32px] border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.88),rgba(2,6,23,0.98))]">
                      <div className="flex items-center justify-between border-b border-white/8 px-5 py-4">
                        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5 text-xs font-semibold text-slate-300">
                          <QrCode className="h-3.5 w-3.5 text-blue-300" />
                          Camera view
                        </div>
                        {scanning && (
                          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1.5 text-xs font-semibold text-emerald-200">
                            <span className="h-2 w-2 rounded-full bg-emerald-300 animate-pulse" />
                            Live scan
                          </div>
                        )}
                      </div>

                      <div className="relative flex min-h-0 flex-1 items-center justify-center p-5">
                        {!scanning && (
                          <div className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-[28px] border border-white/8 bg-[radial-gradient(circle_at_center,rgba(37,99,235,0.12),transparent_50%),linear-gradient(180deg,rgba(30,41,59,0.85),rgba(15,23,42,0.98))]">
                            <div className="absolute left-6 top-6 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                              Ready for printed cards
                            </div>
                            <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-gradient-to-r from-transparent via-blue-400/45 to-transparent" />
                            <div className="relative h-44 w-44">
                              <span className="absolute left-0 top-0 h-9 w-9 rounded-tl-3xl border-l-2 border-t-2 border-blue-300" />
                              <span className="absolute right-0 top-0 h-9 w-9 rounded-tr-3xl border-r-2 border-t-2 border-blue-300" />
                              <span className="absolute bottom-0 left-0 h-9 w-9 rounded-bl-3xl border-b-2 border-l-2 border-blue-300" />
                              <span className="absolute bottom-0 right-0 h-9 w-9 rounded-br-3xl border-b-2 border-r-2 border-blue-300" />
                              <div className="absolute inset-0 flex items-center justify-center">
                                <QrCode className="h-14 w-14 text-white/25" />
                              </div>
                            </div>
                            <p className="absolute bottom-8 text-sm font-medium text-slate-400">Ready to scan</p>
                          </div>
                        )}

                        <div id="qr-reader" className={scanning ? "h-full w-full overflow-hidden rounded-[28px]" : "hidden"} />
                      </div>

                      <div className="border-t border-white/8 px-5 py-4">
                        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                          {!scanning ? (
                            <Button className="h-14 rounded-2xl border-0 gradient-brand px-6 text-base font-bold text-white" onClick={startScanner}>
                              <Camera className="mr-2 h-4.5 w-4.5" />
                              Start camera
                            </Button>
                          ) : (
                            <Button
                              onClick={stopScanner}
                              variant="outline"
                              className="h-14 rounded-2xl border-white/10 bg-slate-950/65 px-6 text-base font-semibold text-slate-200 hover:bg-white/[0.06]"
                            >
                              Stop camera
                            </Button>
                          )}

                          <p className="max-w-sm text-sm text-slate-500">
                            Most reliable on stage: use a printed card and a bright camera feed.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              <aside className={cn(shellClass, "flex h-full min-h-0 flex-col px-5 py-5")}>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Fallback</p>
                    <div className="mt-2">
                      <p className="text-base font-bold text-white">Manual entry</p>
                      <p className="mt-1 text-sm leading-5 text-slate-400">
                        Use the printed card’s voucher ID and token if the camera is inconvenient.
                      </p>
                    </div>

                    <div className="mt-3 space-y-2.5 border-t border-white/8 pt-3">
                      <Input
                        value={manualCode}
                        onChange={(e) => setManualCode(e.target.value)}
                        placeholder="Voucher ID from card"
                        className={cn(fieldClass, "font-mono text-sm")}
                      />
                      <Input
                        value={claimToken ?? ""}
                        onChange={(e) => setClaimToken(e.target.value)}
                        placeholder="Claim token from card"
                        className={cn(fieldClass, "font-mono text-sm")}
                      />
                      <Button
                        onClick={() => {
                          if (manualCode && claimToken) {
                            setVoucherId(manualCode.trim());
                            fetch(`/api/vouchers/${manualCode.trim()}`, { cache: "no-store" })
                              .then((response) => response.json())
                              .then((data) => {
                                if (data.error) {
                                  setErrorMsg(data.error);
                                  return;
                                }
                                setPreview(data);
                                setAppState("preview");
                              })
                              .catch(() => setErrorMsg("Could not fetch voucher"));
                          } else {
                            setErrorMsg("Enter both the Voucher ID and Claim Token from the printed card.");
                          }
                        }}
                        className="h-11 w-full rounded-2xl border-0 gradient-brand text-sm font-bold text-white"
                      >
                        Look up voucher
                      </Button>
                    </div>
                  </div>

                  <div className="mt-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Protection</p>
                    <div className="mt-3 space-y-2.5">
                      <div className="rounded-2xl border border-white/8 bg-slate-950/50 px-4 py-3">
                        <p className="text-sm font-semibold text-white">Single redemption enforced</p>
                        <p className="mt-1 text-xs leading-5 text-slate-400">Double use is blocked by the same on-chain logic the demo already proves.</p>
                      </div>
                      <div className="rounded-2xl border border-white/8 bg-slate-950/50 px-4 py-3">
                        <p className="text-sm font-semibold text-white">Payout-ready proof</p>
                        <p className="mt-1 text-xs leading-5 text-slate-400">Successful redemption updates vendor totals and produces a proof link judges can open.</p>
                      </div>
                    </div>
                  </div>

                  {errorMsg && (
                    <div className="mt-4">
                      <div className="flex items-start gap-3 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3">
                        <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-red-300" />
                        <p className="text-sm text-red-200">{errorMsg}</p>
                      </div>
                    </div>
                  )}
              </aside>
            </div>
          )}

          {appState === "preview" && preview && cat && (
            <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
              <section className={cn("relative overflow-hidden rounded-[40px] border border-white/10 bg-gradient-to-br shadow-2xl", cat.dark, cat.glow)}>
                <div
                  className="absolute inset-0 opacity-10"
                  style={{
                    backgroundImage: "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.72) 1px, transparent 0)",
                    backgroundSize: "28px 28px",
                  }}
                />
                <div className="absolute right-8 top-8 text-7xl opacity-30">{cat.icon}</div>
                <div className="relative flex min-h-[560px] flex-col justify-between px-6 py-7 md:px-8">
                  <div>
                    <div className={cn("inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold", cat.chip)}>
                      <span>{cat.icon}</span>
                      {cat.label}
                    </div>
                    <h2 className="mt-5 max-w-lg text-4xl font-black tracking-tight text-white md:text-5xl">
                      Review the voucher before confirming.
                    </h2>
                    <p className="mt-3 max-w-xl text-sm leading-6 text-white/70">
                      The amount is intentionally large and clear so the staff member and recipient can both verify it at a glance.
                    </p>
                  </div>

                  <div className="mt-10">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/45">Redeeming value</p>
                    <p className="mt-3 text-7xl font-black tabular-nums leading-none text-white md:text-8xl">
                      ${(preview.value_cents / 100).toFixed(2)}
                    </p>
                    <p className={cn("mt-3 text-sm font-medium", cat.accent)}>
                      {preview.unit_count > 1 ? `× ${preview.unit_count} units` : "Single-use voucher"}
                    </p>
                  </div>

                  <div className="mt-8 grid gap-3 border-t border-white/10 pt-5 sm:grid-cols-3">
                    <div className="rounded-2xl border border-white/10 bg-slate-950/25 px-4 py-3">
                      <p className="text-[11px] uppercase tracking-[0.22em] text-white/40">Status</p>
                      <p className="mt-1 text-sm font-semibold text-white/90">{preview.status}</p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-slate-950/25 px-4 py-3">
                      <p className="text-[11px] uppercase tracking-[0.22em] text-white/40">Expires</p>
                      <p className="mt-1 text-sm font-semibold text-white/90">
                        {new Date(preview.expires_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-slate-950/25 px-4 py-3">
                      <p className="text-[11px] uppercase tracking-[0.22em] text-white/40">Vendor</p>
                      <p className="mt-1 text-sm font-semibold text-white/90">{selectedVendor?.name ?? "Selected vendor"}</p>
                    </div>
                  </div>
                </div>
              </section>

              <aside className={cn(shellClass, "overflow-hidden lg:sticky lg:top-6 lg:self-start")}>
                <div className="px-5 py-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Confirmation rail</p>
                  <h3 className="mt-2 text-2xl font-bold text-white">Complete redemption</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-400">
                    Same network path, stronger focus on the final decision moment.
                  </p>
                </div>

                <div className="h-px bg-white/8" />

                <div className="space-y-4 px-5 py-5">
                  <div className="rounded-2xl border border-white/8 bg-slate-950/50 px-4 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05]">
                        <Store className="h-4.5 w-4.5 text-blue-300" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white">{selectedVendor?.name ?? "Selected vendor"}</p>
                        <p className="text-sm text-slate-500">Pending payout will update after confirmation.</p>
                      </div>
                    </div>
                  </div>

                  {errorMsg && (
                    <div className="flex items-start gap-3 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3">
                      <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-red-300" />
                      <p className="text-sm text-red-200">{errorMsg}</p>
                    </div>
                  )}

                  {preview.status !== "issued" ? (
                    <div className="rounded-2xl border border-amber-400/20 bg-amber-500/10 px-4 py-5">
                      <p className="text-sm font-semibold text-amber-200">This voucher cannot be redeemed.</p>
                      <p className="mt-2 text-sm text-amber-100/75">Current status: {preview.status}</p>
                    </div>
                  ) : (
                    <Button
                      onClick={confirmRedeem}
                      disabled={confirming}
                      className="h-16 w-full rounded-[24px] border-0 gradient-green text-lg font-black text-white shadow-xl shadow-emerald-950/35"
                    >
                      {confirming ? (
                        <span className="flex items-center gap-3">
                          <span className="h-5 w-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                          Confirming on Solana...
                        </span>
                      ) : (
                        <span className="flex items-center gap-2">
                          <CheckCircle2 className="h-5 w-5" />
                          Confirm redeem
                        </span>
                      )}
                    </Button>
                  )}

                  <div className="rounded-2xl border border-white/8 bg-slate-950/50 px-4 py-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Chain note</p>
                    <p className="mt-2 text-sm leading-6 text-slate-400">
                      If a second attempt happens later, the same program will reject it and return the already redeemed state.
                    </p>
                  </div>

                  <Button
                    variant="ghost"
                    onClick={reset}
                    className="h-11 w-full rounded-2xl text-slate-400 hover:bg-white/[0.05] hover:text-slate-200"
                  >
                    Cancel and rescan
                  </Button>
                </div>
              </aside>
            </div>
          )}

          {appState === "double_redeem" && (
            <div className="mx-auto max-w-4xl">
              <div className="overflow-hidden rounded-[40px] border border-red-400/25 bg-red-500/10 shadow-2xl shadow-red-950/25">
                <div className="border-b border-red-400/15 bg-red-950/45 px-8 py-12 text-center">
                  <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border border-red-300/20 bg-red-400/10 text-red-100">
                    <CircleAlert className="h-9 w-9" />
                  </div>
                  <p className="mt-6 text-xs font-semibold uppercase tracking-[0.24em] text-red-200/70">On-chain rejection</p>
                  <h2 className="mt-3 text-5xl font-black tracking-tight text-white">Already redeemed</h2>
                  <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-red-100/75 md:text-base">
                    Someone already used this voucher. The duplicate attempt was blocked by the same Solana logic that protects the rest of the network.
                  </p>
                </div>

                <div className="bg-slate-950 px-6 py-5">
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <p className="text-sm text-slate-400">
                      This is one of the strongest demo moments because the failure is intentional and trustworthy.
                    </p>
                    <Button
                      onClick={reset}
                      className="h-12 rounded-2xl border border-red-300/20 bg-red-400/10 px-5 font-bold text-red-50 hover:bg-red-400/15"
                    >
                      Scan another voucher
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {appState === "success" && redeemResult && (
            <div className="mx-auto max-w-4xl">
              <div className="overflow-hidden rounded-[40px] border border-emerald-400/20 shadow-2xl shadow-emerald-950/20">
                <div className="gradient-green relative px-8 py-12 text-center">
                  <div
                    className="absolute inset-0 opacity-10"
                    style={{
                      backgroundImage: "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.65) 1px, transparent 0)",
                      backgroundSize: "30px 30px",
                    }}
                  />
                  <div className="relative">
                    <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white">
                      <CheckCircle2 className="h-9 w-9" />
                    </div>
                    <p className="mt-6 text-xs font-semibold uppercase tracking-[0.24em] text-emerald-100/70">Confirmed on-chain</p>
                    <h2 className="mt-3 text-5xl font-black tracking-tight text-white">Voucher redeemed</h2>
                    <p className="mt-5 text-7xl font-black tabular-nums text-emerald-100">
                      ${(redeemResult.value_cents / 100).toFixed(2)}
                    </p>
                    <p className="mt-3 text-sm text-emerald-100/75">The vendor balance has already been updated from the confirmed redemption.</p>
                  </div>
                </div>

                <div className="grid gap-3 bg-slate-950 px-5 py-5 md:grid-cols-[1.1fr_0.9fr]">
                  <a
                    href={redeemResult.explorer_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group rounded-[24px] border border-white/10 bg-white/[0.04] px-5 py-4 transition-all hover:bg-white/[0.06]"
                  >
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">On-chain proof</p>
                    <div className="mt-3 flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <p className="truncate font-mono text-xs text-blue-300">
                          {redeemResult.on_chain_sig.slice(0, 28)}...
                        </p>
                        <p className="mt-2 text-sm text-slate-400">Open the transaction judges can inspect.</p>
                      </div>
                      <ArrowUpRight className="h-4.5 w-4.5 shrink-0 text-slate-500 transition-colors group-hover:text-slate-200" />
                    </div>
                  </a>

                  {selectedVendor && (
                    <div className="rounded-[24px] border border-emerald-400/20 bg-emerald-500/10 px-5 py-4">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-100/65">Pending reimbursement</p>
                      <p className="mt-3 text-4xl font-black tabular-nums text-emerald-100">
                        ${(selectedVendor.pending_payout_cents / 100).toFixed(2)}
                      </p>
                      <p className="mt-2 text-sm text-emerald-100/70">Ready for reconciliation without extra invoicing.</p>
                    </div>
                  )}
                </div>
              </div>

              <Button className="mt-4 h-14 w-full rounded-[24px] border-0 gradient-brand text-base font-bold text-white" onClick={reset}>
                <RotateCcw className="mr-2 h-4.5 w-4.5" />
                Scan another voucher
              </Button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
