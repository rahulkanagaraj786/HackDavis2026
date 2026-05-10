"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowUpRight,
  CheckCircle2,
  Clock3,
  Printer,
  RefreshCcw,
  ShieldCheck,
  Sparkles,
  Ticket,
  WalletCards,
} from "lucide-react";
import { toast } from "sonner";
import VoucherPrintModal from "@/components/VoucherPrintModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DEMO_ORGS, type DemoOrg } from "@/lib/demo-session";
import { cn } from "@/lib/utils";

type Voucher = {
  id: string;
  category: string;
  value_cents: number;
  unit_count: number;
  status: string;
  alias: string | null;
  claim_token: string;
  on_chain_issue_sig: string | null;
  created_at: string;
  expires_at: string;
};

type IssueResult = {
  voucher_id: string;
  claim_token: string;
  qr_url: string;
  on_chain_sig: string;
  explorer_url: string;
};

type Filter = "all" | "issued" | "redeemed" | "expired";

const CAT = {
  meals: {
    icon: "🍽️",
    label: "Meals",
    preview: "from-orange-900/75 via-orange-800/45 to-amber-900/10",
    active: "bg-orange-500/18 text-orange-200 border-orange-400/35 shadow-lg shadow-orange-950/25",
    iconBg: "bg-orange-500/18 text-orange-200 border-orange-400/30",
    chip: "bg-orange-500/12 text-orange-200 border-orange-400/20",
    line: "before:bg-orange-400/70",
  },
  hygiene: {
    icon: "🧴",
    label: "Hygiene",
    preview: "from-fuchsia-900/70 via-violet-900/45 to-purple-900/10",
    active: "bg-purple-500/18 text-purple-200 border-purple-400/35 shadow-lg shadow-purple-950/25",
    iconBg: "bg-purple-500/18 text-purple-200 border-purple-400/30",
    chip: "bg-purple-500/12 text-purple-200 border-purple-400/20",
    line: "before:bg-purple-400/70",
  },
  transit: {
    icon: "🚌",
    label: "Transit",
    preview: "from-sky-900/70 via-blue-900/45 to-cyan-900/10",
    active: "bg-sky-500/18 text-sky-200 border-sky-400/35 shadow-lg shadow-sky-950/25",
    iconBg: "bg-sky-500/18 text-sky-200 border-sky-400/30",
    chip: "bg-sky-500/12 text-sky-200 border-sky-400/20",
    line: "before:bg-sky-400/70",
  },
  laundry: {
    icon: "👕",
    label: "Laundry",
    preview: "from-teal-900/75 via-emerald-900/45 to-green-900/10",
    active: "bg-teal-500/18 text-teal-200 border-teal-400/35 shadow-lg shadow-teal-950/25",
    iconBg: "bg-teal-500/18 text-teal-200 border-teal-400/30",
    chip: "bg-teal-500/12 text-teal-200 border-teal-400/20",
    line: "before:bg-teal-400/70",
  },
} as const;

const STATUS = {
  issued: {
    label: "Issued",
    className: "bg-blue-500/14 text-blue-200 border-blue-400/25",
  },
  redeemed: {
    label: "Redeemed",
    className: "bg-emerald-500/14 text-emerald-200 border-emerald-400/25",
  },
  expired: {
    label: "Expired",
    className: "bg-white/[0.06] text-slate-400 border-white/10",
  },
} as const;

const FILTER_META: Record<Filter, { label: string; hint: string }> = {
  all: {
    label: "All vouchers",
    hint: "The full issuance history for this nonprofit, including completed and expired aid.",
  },
  issued: {
    label: "Ready to redeem",
    hint: "Live cards that can still be printed, handed out, and redeemed at partner vendors.",
  },
  redeemed: {
    label: "Redeemed",
    hint: "Completed vouchers with proof already written to the shared ledger.",
  },
  expired: {
    label: "Expired",
    hint: "Inactive vouchers kept for reporting and operational visibility.",
  },
};

export default function AdminPage() {
  const [currentOrg, setCurrentOrg] = useState<DemoOrg>(DEMO_ORGS[0]);
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [loading, setLoading] = useState(false);
  const [issuing, setIssuing] = useState(false);
  const [filter, setFilter] = useState<Filter>("all");
  const [printVoucher, setPrintVoucher] = useState<(Voucher & { qr_url: string }) | null>(null);
  const [form, setForm] = useState({
    category: "meals",
    value_cents: 500,
    unit_count: 1,
    alias: "",
    expires_days: 7,
  });
  const [lastIssued, setLastIssued] = useState<IssueResult | null>(null);
  const composerRef = useRef<HTMLDivElement>(null);
  const [matchLedgerHeight, setMatchLedgerHeight] = useState(false);
  const [ledgerHeight, setLedgerHeight] = useState<number | null>(null);

  async function switchOrg(cookieValue: string) {
    const org = DEMO_ORGS.find((item) => item.cookieValue === cookieValue)!;
    setCurrentOrg(org);
    setFilter("all");
    setVouchers([]);
    fetch("/api/orgs/switch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ org_cookie: cookieValue }),
    });
    await loadVouchers(org.id);
  }

  async function loadVouchers(orgId: string) {
    setLoading(true);
    try {
      const res = await fetch(`/api/vouchers?org_id=${orgId}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load vouchers");
      setVouchers(data.vouchers || []);
    } catch (err: unknown) {
      toast.error(`Could not load vouchers: ${err instanceof Error ? err.message : "Network error"}`);
    } finally {
      setLoading(false);
    }
  }

  async function issueVoucher() {
    setIssuing(true);
    setLastIssued(null);
    try {
      const expires_at = new Date(Date.now() + form.expires_days * 86400000).toISOString();
      const res = await fetch("/api/vouchers/issue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          alias: form.alias || undefined,
          expires_at,
          org_id: currentOrg.id,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setLastIssued(data);
      await loadVouchers(currentOrg.id);
      toast.success("Confirmed on Solana", {
        description: (
          <a
            href={data.explorer_url}
            target="_blank"
            rel="noopener noreferrer"
            className="underline text-blue-400"
          >
            View transaction →
          </a>
        ),
      });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Issue failed");
    } finally {
      setIssuing(false);
    }
  }

  useEffect(() => {
    loadVouchers(DEMO_ORGS[0].id);
  }, []);

  useEffect(() => {
    const media = window.matchMedia("(min-width: 1280px)");
    const update = () => setMatchLedgerHeight(media.matches);
    update();

    if (typeof media.addEventListener === "function") {
      media.addEventListener("change", update);
      return () => media.removeEventListener("change", update);
    }

    media.addListener(update);
    return () => media.removeListener(update);
  }, []);

  useEffect(() => {
    if (!matchLedgerHeight || !composerRef.current) {
      setLedgerHeight(null);
      return;
    }

    const node = composerRef.current;
    const update = () => setLedgerHeight(node.getBoundingClientRect().height);
    update();

    const observer = new ResizeObserver(update);
    observer.observe(node);
    window.addEventListener("resize", update);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", update);
    };
  }, [matchLedgerHeight]);

  const orgGradient = currentOrg.color === "green" ? "gradient-green" : "gradient-orange";
  const counts = {
    all: vouchers.length,
    issued: vouchers.filter((voucher) => voucher.status === "issued").length,
    redeemed: vouchers.filter((voucher) => voucher.status === "redeemed").length,
    expired: vouchers.filter((voucher) => voucher.status === "expired").length,
  };
  const filteredVouchers = filter === "all" ? vouchers : vouchers.filter((voucher) => voucher.status === filter);
  const activeCat = CAT[form.category as keyof typeof CAT] ?? CAT.meals;
  const fieldClass =
    "mt-2 h-11 rounded-xl border-white/10 bg-slate-950/65 text-slate-100 placeholder:text-slate-500 shadow-inner shadow-black/20";

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-24 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="absolute right-0 top-72 h-96 w-96 rounded-full bg-emerald-500/8 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-96 w-96 rounded-full bg-fuchsia-500/6 blur-3xl" />
      </div>

      <div className="relative">
        <header className="px-6 pt-4">
          <div className="relative mx-auto max-w-7xl overflow-hidden rounded-[30px] border border-white/10 bg-slate-950/72 shadow-2xl shadow-black/30 backdrop-blur-2xl">
            <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-blue-500/10 to-transparent" />
            <div className="relative grid gap-4 px-5 py-4 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] lg:items-center">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-blue-400/20 bg-blue-500/12 shadow-lg shadow-blue-950/40">
                  <WalletCards className="h-5 w-5 text-blue-300" />
                </div>
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                    <Sparkles className="h-3 w-3 text-blue-300" />
                    Nonprofit Admin
                  </div>
                  <p className="mt-2 text-lg font-black tracking-tight text-white">Relief Ledger Issuing Studio</p>
                </div>
              </div>

              <div className="flex justify-start lg:justify-center">
                <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3.5 py-1.5 text-xs font-semibold text-emerald-200 shadow-lg shadow-emerald-950/20">
                  <span className="h-2 w-2 rounded-full bg-emerald-300 animate-pulse" />
                  Solana Devnet live
                </div>
              </div>

              <div className="flex justify-start lg:justify-end">
                <div className="flex flex-wrap gap-1.5 rounded-[22px] border border-white/10 bg-white/[0.05] p-1.5 shadow-2xl shadow-black/25">
                  {DEMO_ORGS.map((org) => (
                    <button
                      key={org.cookieValue}
                      onClick={() => switchOrg(org.cookieValue)}
                      className={cn(
                        "flex min-h-11 items-center gap-2 rounded-2xl border px-4 py-2 text-sm font-medium transition-all",
                        currentOrg.cookieValue === org.cookieValue
                          ? "border-white/15 bg-white/12 text-white shadow-lg shadow-black/20"
                          : "border-transparent bg-transparent text-slate-400 hover:border-white/10 hover:bg-white/[0.05] hover:text-slate-100",
                      )}
                    >
                      <span
                        className={cn(
                          "h-2.5 w-2.5 rounded-full",
                          org.color === "green" ? "bg-emerald-400" : "bg-orange-400",
                        )}
                      />
                      {org.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </header>

        <section className="border-b border-white/10 px-6 py-8 lg:py-10">
          <div className={cn("mx-auto max-w-7xl overflow-hidden rounded-[36px] border border-white/10", orgGradient)}>
            <div
              className="relative"
              style={{
                backgroundImage: "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.2) 1px, transparent 0)",
                backgroundSize: "30px 30px",
              }}
            >
              <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(15,23,42,0.16),rgba(15,23,42,0.48))]" />
              <div className="relative grid gap-8 px-7 py-8 lg:grid-cols-[1.25fr_0.75fr] lg:px-8 lg:py-10">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-white/75">
                    <Sparkles className="h-3.5 w-3.5" />
                    Issuing as {currentOrg.name}
                  </div>
                  <h1 className="mt-4 max-w-3xl text-4xl font-black tracking-tight text-white md:text-6xl">
                    Build an aid voucher,
                    <br />
                    then let the ledger carry it.
                  </h1>
                  <p className="mt-4 max-w-2xl text-sm leading-7 text-white/75 md:text-base">
                    This workspace is for fast, respectful operations: create the card, print it, and keep the proof
                    durable without adding friction for staff or recipients.
                  </p>

                  <div className="mt-7 flex flex-wrap gap-3">
                    <div className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/10 px-3 py-2 text-sm text-white/85">
                      <ShieldCheck className="h-4 w-4 text-emerald-200" />
                      Shared ledger, no single owner
                    </div>
                    <div className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/10 px-3 py-2 text-sm text-white/85">
                      <Printer className="h-4 w-4 text-white/80" />
                      Printable, dignity-first cards
                    </div>
                  </div>
                </div>

                <div className="flex flex-col justify-end gap-6">
                  <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
                    {[
                      { value: counts.all, label: "Total issued", note: "Operational history" },
                      { value: counts.issued, label: "Live now", note: "Ready to print or redeem" },
                      { value: counts.redeemed, label: "Completed", note: "Already settled on-chain" },
                    ].map((item) => (
                      <div key={item.label} className="border-l border-white/20 pl-4 sm:border-l-0 sm:border-t sm:pt-4 lg:border-l lg:border-t-0 lg:pt-0">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/50">{item.label}</p>
                        <p className="mt-3 text-5xl font-black tabular-nums text-white">{item.value}</p>
                        <p className="mt-1 text-sm text-white/60">{item.note}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <main className="mx-auto grid max-w-7xl gap-8 px-6 py-8 xl:grid-cols-[460px_minmax(0,1fr)]">
          <aside className="xl:self-start">
            <div
              ref={composerRef}
              className="overflow-hidden rounded-[38px] border border-white/10 bg-white/[0.04] shadow-2xl shadow-black/30 backdrop-blur-sm"
            >
              <div className="relative overflow-hidden border-b border-white/10 px-6 py-6">
                <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-blue-500/10 to-transparent" />
                <div className="relative flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Composer</p>
                    <h2 className="mt-2 text-2xl font-black text-white">Issue a new voucher</h2>
                    <p className="mt-2 text-sm leading-6 text-slate-400">
                      Keep the motion on the left: choose the type, set the value, issue, then print.
                    </p>
                  </div>
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-slate-950/55">
                    <Ticket className="h-5 w-5 text-blue-300" />
                  </div>
                </div>
              </div>

              <div className="space-y-6 px-6 py-6">
                <div className={cn("relative overflow-hidden rounded-[30px] border border-white/10 bg-gradient-to-br p-5", activeCat.preview)}>
                  <div
                    className="absolute inset-0 opacity-10"
                    style={{
                      backgroundImage: "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.7) 1px, transparent 0)",
                      backgroundSize: "24px 24px",
                    }}
                  />
                  <div className="relative">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className={cn("inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold", activeCat.chip)}>
                          <span>{activeCat.icon}</span>
                          {activeCat.label}
                        </div>
                        <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.24em] text-white/50">Voucher value</p>
                        <p className="mt-2 text-6xl font-black tabular-nums leading-none text-white">
                          ${(form.value_cents / 100).toFixed(2)}
                        </p>
                        <p className="mt-2 text-sm text-white/60">
                          {form.unit_count > 1 ? `× ${form.unit_count} units` : "Single-use card"}
                        </p>
                      </div>
                      <div className="text-6xl drop-shadow-xl">{activeCat.icon}</div>
                    </div>

                    <div className="mt-8 grid gap-4 border-t border-white/10 pt-4 text-sm sm:grid-cols-2">
                      <div>
                        <p className="text-[11px] uppercase tracking-[0.22em] text-white/40">Alias</p>
                        <p className="mt-1 font-medium text-white/85">{form.alias || "No alias added"}</p>
                      </div>
                      <div>
                        <p className="text-[11px] uppercase tracking-[0.22em] text-white/40">Expires</p>
                        <p className="mt-1 font-medium text-white/85">In {form.expires_days} days</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-5">
                  <div className="border-b border-white/8 pb-5">
                    <Label className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Voucher type</Label>
                    <p className="mt-1 text-sm text-slate-500">Choose the aid category the recipient can redeem.</p>
                    <div className="mt-4 grid grid-cols-2 gap-2">
                      {Object.entries(CAT).map(([key, value]) => (
                        <button
                          key={key}
                          onClick={() => setForm({ ...form, category: key })}
                          className={cn(
                            "flex items-center gap-2 rounded-2xl border px-3 py-3 text-sm font-medium transition-all",
                            form.category === key
                              ? value.active
                              : "border-white/10 bg-white/[0.03] text-slate-300 hover:border-white/15 hover:bg-white/[0.06] hover:text-white",
                          )}
                        >
                          <span>{value.icon}</span>
                          {value.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid gap-5 border-b border-white/8 pb-5 sm:grid-cols-2">
                    <div>
                      <Label className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Value (¢)</Label>
                      <p className="mt-1 text-sm text-slate-500">Set the exact amount the card should carry.</p>
                      <Input
                        type="number"
                        value={form.value_cents}
                        onChange={(e) => setForm({ ...form, value_cents: parseInt(e.target.value) || 0 })}
                        className={fieldClass}
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Units</Label>
                      <p className="mt-1 text-sm text-slate-500">Useful for packs or repeated service uses.</p>
                      <Input
                        type="number"
                        value={form.unit_count}
                        onChange={(e) => setForm({ ...form, unit_count: parseInt(e.target.value) || 1 })}
                        className={fieldClass}
                      />
                    </div>
                  </div>

                  <div className="grid gap-5 border-b border-white/8 pb-5 sm:grid-cols-2">
                    <div>
                      <Label className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Expiration</Label>
                      <p className="mt-1 text-sm text-slate-500">Keep the help tied to the intended time window.</p>
                      <Input
                        type="number"
                        value={form.expires_days}
                        onChange={(e) => setForm({ ...form, expires_days: parseInt(e.target.value) || 7 })}
                        className={fieldClass}
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Alias</Label>
                      <p className="mt-1 text-sm text-slate-500">Optional. Internal shorthand only, never personal data.</p>
                      <Input
                        placeholder="e.g. River, Neighbor"
                        value={form.alias}
                        onChange={(e) => setForm({ ...form, alias: e.target.value })}
                        className={cn(fieldClass, "font-medium")}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Issue to chain</p>
                        <p className="mt-1 text-sm text-slate-500">Creation writes immediately so the card is redeemable anywhere in the network.</p>
                      </div>
                      <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-200">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Live
                      </div>
                    </div>

                    <Button
                      onClick={issueVoucher}
                      disabled={issuing}
                      className={cn(
                        "h-14 w-full rounded-[22px] border-0 text-base font-bold text-white shadow-xl shadow-black/25",
                        orgGradient,
                      )}
                    >
                      {issuing ? (
                        <span className="flex items-center gap-3">
                          <span className="h-5 w-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                          Confirming on Solana...
                        </span>
                      ) : (
                        <span className="flex items-center gap-2">
                          Issue voucher
                          <ArrowUpRight className="h-4 w-4" />
                        </span>
                      )}
                    </Button>
                  </div>
                </div>

                {lastIssued && (
                  <div className="rounded-[24px] border border-emerald-400/20 bg-emerald-500/10 p-4 shadow-lg shadow-emerald-950/15">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-400/12 text-emerald-200">
                        <CheckCircle2 className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-emerald-100">Voucher committed successfully</p>
                        <p className="mt-1 text-sm text-emerald-100/70">
                          The card can now be printed and redeemed across partner vendors.
                        </p>
                        <a
                          href={lastIssued.explorer_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-3 inline-flex items-center gap-2 text-xs font-medium text-blue-300 underline decoration-blue-400/40 underline-offset-4"
                        >
                          {lastIssued.on_chain_sig.slice(0, 32)}...
                          <ArrowUpRight className="h-3.5 w-3.5" />
                        </a>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </aside>

          <section className="xl:self-start">
            <div
              className="flex flex-col overflow-hidden rounded-[38px] border border-white/10 bg-white/[0.04] shadow-2xl shadow-black/30 backdrop-blur-sm"
              style={matchLedgerHeight && ledgerHeight ? { height: `${ledgerHeight}px` } : undefined}
            >
              <div className="grid gap-6 border-b border-white/10 px-6 py-6 lg:grid-cols-[1fr_auto] lg:items-end">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Ledger stream</p>
                  <h2 className="mt-2 text-3xl font-black text-white">{FILTER_META[filter].label}</h2>
                  <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-400">{FILTER_META[filter].hint}</p>
                </div>

                <Button
                  variant="outline"
                  onClick={() => loadVouchers(currentOrg.id)}
                  className="h-11 rounded-xl border-white/10 bg-slate-950/60 px-4 text-slate-200 hover:bg-white/[0.06]"
                >
                  <RefreshCcw className="mr-2 h-4 w-4" />
                  Refresh
                </Button>
              </div>

              <div className="grid gap-0 border-b border-white/8 sm:grid-cols-4">
                {(["all", "issued", "redeemed", "expired"] as const).map((item) => (
                  <button
                    key={item}
                    onClick={() => setFilter(item)}
                    className={cn(
                      "px-6 py-5 text-left transition-all",
                      filter === item ? "bg-white/[0.05]" : "hover:bg-white/[0.03]",
                    )}
                  >
                    <div className="flex items-end justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">{item}</p>
                        <p className="mt-3 text-4xl font-black tabular-nums text-white">{counts[item]}</p>
                      </div>
                      <div className={cn("h-10 w-px bg-white/8", item === "expired" && "hidden sm:block")} />
                    </div>
                    <p className="mt-2 text-sm text-slate-400">{FILTER_META[item].label}</p>
                  </button>
                ))}
              </div>

              {loading ? (
                <div className="flex flex-1 items-center justify-center p-16 text-center">
                  <div>
                    <div className="mx-auto h-10 w-10 rounded-full border-2 border-blue-400/40 border-t-blue-300 animate-spin" />
                    <p className="mt-4 text-sm text-slate-400">Loading vouchers…</p>
                  </div>
                </div>
              ) : filteredVouchers.length === 0 ? (
                <div className="flex flex-1 items-center justify-center p-16 text-center">
                  <div>
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl border border-white/10 bg-slate-950/60 text-blue-300">
                      <Ticket className="h-7 w-7" />
                    </div>
                    <h3 className="mt-5 text-xl font-semibold text-white">
                      {filter === "all" ? "No vouchers yet" : `No ${filter} vouchers`}
                    </h3>
                    <p className="mt-2 text-sm text-slate-400">
                      {filter === "all"
                        ? "Issue one from the composer to populate the ledger."
                        : "Switch filters to inspect a different voucher state."}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="min-h-0 flex-1 overflow-y-auto divide-y divide-white/8">
                  {filteredVouchers.map((voucher) => {
                    const cat = CAT[voucher.category as keyof typeof CAT] ?? {
                      icon: "🎟️",
                      label: voucher.category,
                      preview: "",
                      active: "",
                      iconBg: "bg-white/[0.06] text-white/70 border-white/10",
                      chip: "bg-white/[0.06] text-white/70 border-white/10",
                      line: "before:bg-white/30",
                    };
                    const status = STATUS[voucher.status as keyof typeof STATUS] ?? {
                      label: voucher.status,
                      className: "bg-white/[0.06] text-slate-400 border-white/10",
                    };

                    return (
                      <div
                        key={voucher.id}
                        className={cn(
                          "group relative px-6 py-6 transition-colors hover:bg-white/[0.03] before:absolute before:bottom-6 before:left-0 before:top-6 before:w-1.5",
                          cat.line,
                        )}
                      >
                        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                          <div className="flex min-w-0 gap-4">
                            <div className={cn("flex h-14 w-14 shrink-0 items-center justify-center rounded-3xl border text-2xl", cat.iconBg)}>
                              {cat.icon}
                            </div>

                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className={cn("inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold", cat.chip)}>
                                  {cat.label}
                                </span>
                                <span className={cn("inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold", status.className)}>
                                  {status.label}
                                </span>
                                {voucher.alias && (
                                  <span className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-xs font-medium text-slate-300">
                                    {voucher.alias}
                                  </span>
                                )}
                              </div>

                              <p className="mt-3 text-xl font-semibold text-white">{cat.label} voucher</p>
                              <p className="mt-1 font-mono text-xs text-slate-500">{voucher.id}</p>

                              <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-400">
                                <span>Issued {new Date(voucher.created_at).toLocaleDateString()}</span>
                                <span>Expires {new Date(voucher.expires_at).toLocaleDateString()}</span>
                                <span>{voucher.unit_count > 1 ? `× ${voucher.unit_count} units` : "Single-use card"}</span>
                              </div>

                              {voucher.on_chain_issue_sig && (
                                <div className="mt-3 inline-flex items-center gap-2 text-xs text-slate-500">
                                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-300" />
                                  <span className="font-mono">{voucher.on_chain_issue_sig.slice(0, 28)}...</span>
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="flex flex-col items-start gap-4 xl:items-end">
                            <div className="text-left xl:text-right">
                              <p className="text-5xl font-black tabular-nums leading-none text-white">
                                ${(voucher.value_cents / 100).toFixed(2)}
                              </p>
                              <p className="mt-2 text-sm text-slate-500">Voucher value</p>
                            </div>

                            {voucher.status === "issued" ? (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-10 rounded-xl border-white/10 bg-slate-950/60 px-4 text-slate-200 hover:bg-white/[0.08]"
                                onClick={() => {
                                  setPrintVoucher({
                                    ...voucher,
                                    qr_url: `${window.location.origin}/voucher/${voucher.id}?t=${voucher.claim_token}`,
                                  });
                                }}
                              >
                                <Printer className="mr-2 h-4 w-4" />
                                Print card
                              </Button>
                            ) : (
                              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-slate-950/60 px-3 py-2 text-xs font-medium text-slate-400">
                                <Clock3 className="h-3.5 w-3.5" />
                                View-only record
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>
        </main>
      </div>

      {printVoucher && (
        <VoucherPrintModal
          voucher={printVoucher}
          orgName={currentOrg.name}
          onClose={() => setPrintVoucher(null)}
        />
      )}
    </div>
  );
}
