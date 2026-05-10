"use client";

import { useEffect, useState } from "react";
import {
  ArrowUpRight,
  Building2,
  ChartNoAxesCombined,
  HandCoins,
  ShieldCheck,
  Sparkles,
  Store,
  WalletCards,
} from "lucide-react";
import { cn } from "@/lib/utils";

type ImpactData = {
  total: number;
  issued: number;
  redeemed: number;
  expired: number;
  redemption_rate: number;
  by_category: { category: string; issued: number; redeemed: number }[];
  cross_org_count: number;
  cross_vendor_count: number;
  orgs: number;
  vendors: number;
  recent_redemptions: {
    voucher_id: string;
    category: string;
    value_cents: number;
    org_name: string;
    vendor_name: string;
    redeemed_at: string;
    explorer_url: string | null;
  }[];
};

const CAT: Record<
  string,
  {
    icon: string;
    label: string;
    bar: string;
    chip: string;
    line: string;
    accent: string;
  }
> = {
  meals: {
    icon: "🍽️",
    label: "Meals",
    bar: "bg-orange-400",
    chip: "bg-orange-500/12 text-orange-200 border-orange-400/20",
    line: "before:bg-orange-400/70",
    accent: "text-orange-200",
  },
  hygiene: {
    icon: "🧴",
    label: "Hygiene",
    bar: "bg-purple-400",
    chip: "bg-purple-500/12 text-purple-200 border-purple-400/20",
    line: "before:bg-purple-400/70",
    accent: "text-purple-200",
  },
  transit: {
    icon: "🚌",
    label: "Transit",
    bar: "bg-sky-400",
    chip: "bg-sky-500/12 text-sky-200 border-sky-400/20",
    line: "before:bg-sky-400/70",
    accent: "text-sky-200",
  },
  laundry: {
    icon: "👕",
    label: "Laundry",
    bar: "bg-teal-400",
    chip: "bg-teal-500/12 text-teal-200 border-teal-400/20",
    line: "before:bg-teal-400/70",
    accent: "text-teal-200",
  },
};

export default function ImpactPage() {
  const [data, setData] = useState<ImpactData | null>(null);

  useEffect(() => {
    fetch("/api/impact").then((response) => response.json()).then(setData);
  }, []);

  if (!data) {
    return (
      <div className="min-h-screen bg-slate-950 text-white">
        <div className="pointer-events-none fixed inset-0 overflow-hidden">
          <div className="absolute left-8 top-20 h-80 w-80 rounded-full bg-blue-500/10 blur-3xl" />
          <div className="absolute bottom-0 right-0 h-96 w-96 rounded-full bg-emerald-500/8 blur-3xl" />
        </div>
        <div className="relative flex min-h-screen items-center justify-center px-6">
          <div className="space-y-4 text-center">
            <div className="mx-auto h-10 w-10 rounded-full border-[3px] border-white/25 border-t-white animate-spin" />
            <p className="text-sm text-white/70">Loading impact data…</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-10 top-16 h-80 w-80 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="absolute right-0 top-80 h-96 w-96 rounded-full bg-emerald-500/8 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-96 w-96 rounded-full bg-fuchsia-500/6 blur-3xl" />
      </div>

      <div className="relative">
        <header className="px-6 pt-4">
          <div className="relative mx-auto max-w-7xl overflow-hidden rounded-[30px] border border-white/10 bg-slate-950/72 shadow-2xl shadow-black/30 backdrop-blur-2xl">
            <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-blue-500/10 to-transparent" />
            <div className="relative grid gap-4 px-5 py-4 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] lg:items-center">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-blue-400/20 bg-blue-500/12 shadow-lg shadow-blue-950/40">
                  <ChartNoAxesCombined className="h-5 w-5 text-blue-300" />
                </div>
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                    <Sparkles className="h-3 w-3 text-blue-300" />
                    Public Impact
                  </div>
                  <p className="mt-2 text-lg font-black tracking-tight text-white">Relief Ledger Network View</p>
                </div>
              </div>

              <div className="flex justify-start lg:justify-center">
                <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3.5 py-1.5 text-xs font-semibold text-emerald-200 shadow-lg shadow-emerald-950/20">
                  <span className="h-2 w-2 rounded-full bg-emerald-300 animate-pulse" />
                  Solana Devnet live
                </div>
              </div>

              <div className="flex justify-start lg:justify-end">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-3.5 py-1.5 text-xs font-medium text-slate-300">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-300" />
                  Shared proof across nonprofits and vendors
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-7xl space-y-8 px-6 py-8">
          <section className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
            <div
              className="relative overflow-hidden rounded-[38px] border border-white/10 px-7 py-7 shadow-2xl shadow-blue-950/20"
              style={{ background: "linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 50%, #0ea5e9 100%)" }}
            >
              <div
                className="absolute inset-0 opacity-10"
                style={{
                  backgroundImage: "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.7) 1px, transparent 0)",
                  backgroundSize: "30px 30px",
                }}
              />

              <div className="relative">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-blue-100/80">
                  <WalletCards className="h-3.5 w-3.5" />
                  Shared ledger, no single org controls it
                </div>

                <h1 className="mt-5 max-w-3xl text-4xl font-black tracking-tight text-white md:text-5xl">
                  Proof of aid distribution across the whole network.
                </h1>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-blue-100/80 md:text-base">
                  This page is the public-facing view of what the system is doing: how many organizations are issuing,
                  how many vendors are redeeming, and how much assistance is actually flowing through the network.
                </p>

                <div className="mt-8 rounded-[30px] border border-white/15 bg-white/10 p-6 backdrop-blur-sm">
                  <div className="grid gap-6 md:grid-cols-[1fr_auto_1fr] md:items-end">
                    <div className="text-center md:text-left">
                      <p className="text-8xl font-black leading-none tabular-nums text-white md:text-9xl">{data.cross_org_count}</p>
                      <p className="mt-2 text-sm font-semibold uppercase tracking-[0.18em] text-blue-100/70">Organizations</p>
                      <p className="mt-2 text-sm text-blue-100/65">Issuing support through Relief Ledger</p>
                    </div>

                    <div className="flex items-center justify-center text-5xl font-thin text-blue-200/70 md:pb-6">×</div>

                    <div className="text-center md:text-right">
                      <p className="text-8xl font-black leading-none tabular-nums text-white md:text-9xl">{data.cross_vendor_count}</p>
                      <p className="mt-2 text-sm font-semibold uppercase tracking-[0.18em] text-blue-100/70">Vendors</p>
                      <p className="mt-2 text-sm text-blue-100/65">Redeeming aid across partner locations</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-1">
              <div className="grid gap-5 md:col-span-2 xl:col-span-1 xl:grid-cols-[1.1fr_0.9fr]">
                <div className="rounded-[34px] border border-white/10 bg-white/[0.04] p-6 shadow-2xl shadow-black/30 backdrop-blur-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Redeemed value flow</p>
                  <p className="mt-3 text-6xl font-black tabular-nums text-emerald-300">{data.redeemed}</p>
                  <p className="mt-2 text-base font-semibold text-white">Completed redemptions</p>
                  <p className="mt-2 text-sm leading-6 text-slate-400">
                    {data.redemption_rate}% of all issued vouchers have already turned into real assistance.
                  </p>
                </div>

                <div className="rounded-[34px] border border-white/10 bg-white/[0.04] p-6 shadow-2xl shadow-black/30 backdrop-blur-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Network summary</p>
                  <div className="mt-5 space-y-3">
                    <div className="flex items-center justify-between gap-4 rounded-[24px] border border-white/8 bg-slate-950/45 px-5 py-4">
                      <div className="flex min-w-0 flex-1 items-center gap-4">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-slate-950/55">
                          <Building2 className="h-5 w-5 text-blue-300" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[15px] font-semibold leading-tight text-white">Organizations</p>
                          <p className="mt-1 text-xs leading-tight text-slate-500">Active issuers</p>
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-4xl font-black tabular-nums leading-none text-white">{data.orgs}</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-4 rounded-[24px] border border-white/8 bg-slate-950/45 px-5 py-4">
                      <div className="flex min-w-0 flex-1 items-center gap-4">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-slate-950/55">
                          <Store className="h-5 w-5 text-emerald-300" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[15px] font-semibold leading-tight text-white">Vendors</p>
                          <p className="mt-1 text-xs leading-tight text-slate-500">Redeeming partners</p>
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-4xl font-black tabular-nums leading-none text-white">{data.vendors}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-[34px] border border-white/10 bg-white/[0.04] p-6 shadow-2xl shadow-black/30 backdrop-blur-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Issued and live</p>
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-5xl font-black tabular-nums text-white">{data.total}</p>
                    <p className="mt-2 text-sm font-semibold text-white">Total issued</p>
                    <p className="mt-1 text-sm text-slate-500">Across all participating orgs.</p>
                  </div>
                  <div>
                    <p className="text-5xl font-black tabular-nums text-blue-300">{data.issued}</p>
                    <p className="mt-2 text-sm font-semibold text-white">Still active</p>
                    <p className="mt-1 text-sm text-slate-500">Ready to redeem right now.</p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="grid gap-5 xl:grid-cols-[0.92fr_1.08fr]">
            <div className="rounded-[38px] border border-white/10 bg-white/[0.04] p-6 shadow-2xl shadow-black/30 backdrop-blur-sm">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Category spread</p>
                  <h2 className="mt-2 text-2xl font-black text-white">Where vouchers are being used</h2>
                </div>
                <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5 text-xs font-medium text-slate-300">
                  <HandCoins className="h-3.5 w-3.5 text-emerald-300" />
                  Live redemption mix
                </div>
              </div>

              <div className="mt-6 space-y-4">
                {data.by_category.map((category) => {
                  const meta = CAT[category.category];
                  if (!meta) return null;
                  const total = category.issued + category.redeemed;
                  const pct = total > 0 ? Math.round((category.redeemed / total) * 100) : 0;

                  return (
                    <div key={category.category} className="rounded-[24px] border border-white/8 bg-slate-950/45 px-4 py-4">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className={cn("flex h-11 w-11 items-center justify-center rounded-2xl border", meta.chip)}>
                            <span className="text-xl">{meta.icon}</span>
                          </div>
                          <div>
                            <p className="text-base font-semibold text-white">{meta.label}</p>
                            <p className="text-sm text-slate-500">{category.redeemed} redeemed of {total} total</p>
                          </div>
                        </div>
                        <p className={cn("text-3xl font-black tabular-nums", meta.accent)}>{pct}%</p>
                      </div>

                      <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/8">
                        <div className={cn("h-full rounded-full transition-all", meta.bar)} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {data.recent_redemptions.length > 0 && (
              <div className="rounded-[38px] border border-white/10 bg-white/[0.04] shadow-2xl shadow-black/30 backdrop-blur-sm">
                <div className="border-b border-white/10 px-6 py-6">
                  <div className="flex items-end justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Activity feed</p>
                      <h2 className="mt-2 text-2xl font-black text-white">Recent redemptions</h2>
                      <p className="mt-2 text-sm leading-6 text-slate-400">
                        A live ledger-style stream of vouchers moving from issuer to vendor.
                      </p>
                    </div>
                    <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5 text-xs font-medium text-slate-300">
                      <ShieldCheck className="h-3.5 w-3.5 text-emerald-300" />
                      Verified on-chain
                    </div>
                  </div>
                </div>

                <div className="divide-y divide-white/8">
                  {data.recent_redemptions.map((redemption, index) => {
                    const meta =
                      CAT[redemption.category] ?? {
                        icon: "🎟️",
                        label: redemption.category,
                        bar: "bg-white/20",
                        chip: "bg-white/[0.06] text-white/70 border-white/10",
                        line: "before:bg-white/30",
                        accent: "text-white",
                      };

                    return (
                      <div
                        key={`${redemption.voucher_id}-${index}`}
                        className={cn(
                          "group relative px-6 py-5 transition-colors hover:bg-white/[0.03] before:absolute before:bottom-5 before:left-0 before:top-5 before:w-1.5",
                          meta.line,
                        )}
                      >
                        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                          <div className="flex min-w-0 gap-4">
                            <div className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-3xl border", meta.chip)}>
                              <span className="text-2xl">{meta.icon}</span>
                            </div>
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className={cn("inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold", meta.chip)}>
                                  {meta.label}
                                </span>
                                <span className="text-xs text-slate-500">{new Date(redemption.redeemed_at).toLocaleString()}</span>
                              </div>

                              <p className="mt-3 text-lg font-semibold text-white">
                                {redemption.org_name}
                                <span className="mx-2 text-white/30">→</span>
                                <span className="text-slate-300">{redemption.vendor_name}</span>
                              </p>
                              <p className="mt-1 font-mono text-xs text-slate-500">{redemption.voucher_id}</p>
                            </div>
                          </div>

                          <div className="flex flex-col items-start gap-3 lg:items-end">
                            <div className="text-left lg:text-right">
                              <p className="text-4xl font-black tabular-nums text-white">
                                ${(redemption.value_cents / 100).toFixed(2)}
                              </p>
                              <p className="mt-1 text-sm text-slate-500">Redeemed value</p>
                            </div>

                            {redemption.explorer_url && (
                              <a
                                href={redemption.explorer_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-slate-950/55 px-3 py-2 text-xs font-medium text-blue-300 transition-colors hover:bg-white/[0.06] hover:text-blue-200"
                              >
                                On-chain proof
                                <ArrowUpRight className="h-3.5 w-3.5" />
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </section>
        </main>
      </div>
    </div>
  );
}
