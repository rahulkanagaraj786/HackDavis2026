"use client";

import { useEffect, useState } from "react";

type ImpactData = {
  total: number; issued: number; redeemed: number; expired: number;
  redemption_rate: number;
  by_category: { category: string; issued: number; redeemed: number }[];
  cross_org_count: number; cross_vendor_count: number;
  orgs: number; vendors: number;
  recent_redemptions: {
    voucher_id: string; category: string; value_cents: number;
    org_name: string; vendor_name: string; redeemed_at: string; explorer_url: string | null;
  }[];
};

const CAT: Record<string, { icon: string; label: string; bar: string; bg: string; text: string; border: string }> = {
  meals:   { icon: "🍽️", label: "Meals",   bar: "bg-orange-500", bg: "bg-orange-50",  text: "text-orange-700", border: "border-orange-200" },
  hygiene: { icon: "🧴", label: "Hygiene", bar: "bg-purple-500", bg: "bg-purple-50",  text: "text-purple-700", border: "border-purple-200" },
  transit: { icon: "🚌", label: "Transit", bar: "bg-sky-500",    bg: "bg-sky-50",     text: "text-sky-700",    border: "border-sky-200"    },
  laundry: { icon: "👕", label: "Laundry", bar: "bg-teal-500",   bg: "bg-teal-50",    text: "text-teal-700",   border: "border-teal-200"   },
};

export default function ImpactPage() {
  const [data, setData] = useState<ImpactData | null>(null);

  useEffect(() => { fetch("/api/impact").then(r => r.json()).then(setData); }, []);

  if (!data) return (
    <div className="min-h-screen gradient-brand flex items-center justify-center">
      <div className="text-center space-y-3">
        <div className="w-10 h-10 border-3 border-white/30 border-t-white rounded-full animate-spin mx-auto" style={{ borderWidth: 3 }} />
        <p className="text-white/70 text-sm">Loading impact data...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-950 text-white">

      {/* Header */}
      <header className="border-b border-white/10 px-8 py-5">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-md bg-blue-500/20 border border-blue-500/30 flex items-center justify-center">
                <span className="text-blue-400 font-black text-xs">RL</span>
              </div>
              <span className="font-bold text-white">Relief Ledger</span>
              <span className="text-white/20">/</span>
              <span className="text-white/50 text-sm">Impact</span>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-emerald-400 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Solana Devnet · Live
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-8 py-10 space-y-10">

        {/* HERO: the why-Solana moment */}
        <div className="relative overflow-hidden rounded-3xl p-8 md:p-12" style={{ background: "linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 50%, #0ea5e9 100%)" }}>
          {/* background grid */}
          <div className="absolute inset-0 opacity-10"
            style={{ backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)", backgroundSize: "32px 32px" }} />

          <div className="relative">
            <p className="text-blue-200 text-sm font-bold uppercase tracking-widest mb-8">Shared ledger — no single org controls it</p>
            <div className="flex items-center gap-8 flex-wrap">
              <div className="text-center">
                <p className="text-8xl md:text-9xl font-black leading-none tabular-nums">{data.cross_org_count}</p>
                <p className="text-blue-200 text-sm font-semibold mt-2 uppercase tracking-wide">Organizations</p>
              </div>
              <div className="text-5xl font-thin text-blue-300">×</div>
              <div className="text-center">
                <p className="text-8xl md:text-9xl font-black leading-none tabular-nums">{data.cross_vendor_count}</p>
                <p className="text-blue-200 text-sm font-semibold mt-2 uppercase tracking-wide">Vendors</p>
              </div>
              <div className="flex-1 min-w-52 pl-4 border-l border-white/20">
                <p className="text-white font-bold text-xl leading-snug">
                  Vouchers redeemed across organizations on a ledger none of them control.
                </p>
                <p className="text-blue-200 text-sm mt-3">A fraction of a cent per transaction. Confirmed in seconds.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Total Issued",    value: data.total,            sub: "across all orgs",          color: "text-white" },
            { label: "Redeemed",        value: data.redeemed,         sub: `${data.redemption_rate}% rate`, color: "text-emerald-400" },
            { label: "Active",          value: data.issued,           sub: "ready to use",             color: "text-blue-400" },
            { label: "Organizations",   value: data.orgs,             sub: `+ ${data.vendors} vendors`, color: "text-purple-400" },
          ].map(({ label, value, sub, color }) => (
            <div key={label} className="bg-white/5 hover:bg-white/8 border border-white/10 rounded-2xl p-5 transition-colors">
              <p className={`text-4xl font-black tabular-nums ${color}`}>{value}</p>
              <p className="text-white/70 text-sm font-semibold mt-2">{label}</p>
              <p className="text-white/30 text-xs mt-0.5">{sub}</p>
            </div>
          ))}
        </div>

        {/* By category */}
        <div>
          <h2 className="text-white/50 text-xs font-bold uppercase tracking-widest mb-5">Breakdown by Category</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {data.by_category.map(cat => {
              const meta = CAT[cat.category];
              if (!meta) return null;
              const total = cat.issued + cat.redeemed;
              const pct = total > 0 ? Math.round((cat.redeemed / total) * 100) : 0;
              return (
                <div key={cat.category} className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-2xl">{meta.icon}</span>
                    <span className="text-white/30 text-xs font-bold">{pct}%</span>
                  </div>
                  <div>
                    <p className="text-white font-bold">{meta.label}</p>
                    <p className="text-3xl font-black text-white mt-1">{cat.redeemed}</p>
                    <p className="text-white/30 text-xs">of {total} issued</p>
                  </div>
                  <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${meta.bar} transition-all`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent redemptions */}
        {data.recent_redemptions.length > 0 && (
          <div>
            <h2 className="text-white/50 text-xs font-bold uppercase tracking-widest mb-5">Recent Redemptions</h2>
            <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden divide-y divide-white/5">
              {data.recent_redemptions.map((r, i) => {
                const meta = CAT[r.category];
                return (
                  <div key={i} className="px-6 py-4 flex items-center justify-between gap-4 hover:bg-white/5 transition-colors">
                    <div className="flex items-center gap-4">
                      <span className="text-2xl">{meta?.icon ?? "🎟️"}</span>
                      <div>
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-white font-semibold">{r.org_name}</span>
                          <span className="text-white/30">→</span>
                          <span className="text-white/70">{r.vendor_name}</span>
                        </div>
                        <p className="text-white/30 text-xs mt-0.5">
                          <span className="font-mono">${(r.value_cents / 100).toFixed(2)}</span>
                          {" · "}{new Date(r.redeemed_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    {r.explorer_url && (
                      <a href={r.explorer_url} target="_blank" rel="noopener noreferrer"
                        className="text-xs text-blue-400 hover:text-blue-300 font-medium shrink-0 transition-colors">
                        On-chain →
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
