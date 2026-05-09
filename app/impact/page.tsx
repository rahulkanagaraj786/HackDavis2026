"use client";

import { useEffect, useState } from "react";

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

const CATEGORY_META: Record<string, { icon: string; label: string; bg: string; text: string; border: string }> = {
  meals:   { icon: "🍽️", label: "Meals",   bg: "bg-orange-50",  text: "text-orange-700", border: "border-orange-200" },
  hygiene: { icon: "🧴", label: "Hygiene", bg: "bg-purple-50",  text: "text-purple-700", border: "border-purple-200" },
  transit: { icon: "🚌", label: "Transit", bg: "bg-blue-50",    text: "text-blue-700",   border: "border-blue-200"   },
  laundry: { icon: "👕", label: "Laundry", bg: "bg-teal-50",    text: "text-teal-700",   border: "border-teal-200"   },
};

export default function ImpactPage() {
  const [data, setData] = useState<ImpactData | null>(null);

  useEffect(() => {
    fetch("/api/impact").then(r => r.json()).then(setData);
  }, []);

  if (!data) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center space-y-2">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-slate-500 text-sm">Loading impact data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-5">
        <div className="max-w-5xl mx-auto">
          <p className="text-xs text-slate-400 uppercase tracking-wide font-medium">Public Dashboard</p>
          <h1 className="text-2xl font-bold text-slate-900 mt-0.5">Relief Ledger — Impact</h1>
          <p className="text-sm text-slate-500 mt-1">Cross-org shared ledger on Solana Devnet · live data</p>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-8 space-y-8">

        {/* HERO: Why Solana stat */}
        <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-3xl p-8 text-white shadow-lg">
          <p className="text-blue-200 text-sm font-medium uppercase tracking-wide mb-6">Cross-org shared ledger</p>
          <div className="flex items-center gap-6 flex-wrap">
            <div className="text-center">
              <p className="text-7xl font-black">{data.cross_org_count}</p>
              <p className="text-blue-200 text-sm mt-1 font-medium">Organizations</p>
            </div>
            <div className="text-blue-300 text-4xl font-light">×</div>
            <div className="text-center">
              <p className="text-7xl font-black">{data.cross_vendor_count}</p>
              <p className="text-blue-200 text-sm mt-1 font-medium">Vendors</p>
            </div>
            <div className="flex-1 min-w-56 pl-2">
              <p className="text-white font-semibold text-lg leading-snug">
                Vouchers redeemed across organizations on a ledger no single org controls.
              </p>
              <p className="text-blue-200 text-sm mt-2">A fraction of a cent per transaction on Solana Devnet.</p>
            </div>
          </div>
        </div>

        {/* Top stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Total Issued",      value: data.total,            color: "text-slate-900" },
            { label: "Redeemed",          value: data.redeemed,         color: "text-green-600" },
            { label: "Redemption Rate",   value: `${data.redemption_rate}%`, color: "text-blue-600" },
            { label: "Expired",           value: data.expired,          color: "text-slate-400" },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 text-center">
              <p className={`text-4xl font-bold ${color}`}>{value}</p>
              <p className="text-xs text-slate-500 mt-2 uppercase tracking-wide font-medium">{label}</p>
            </div>
          ))}
        </div>

        {/* By category */}
        <div>
          <h2 className="font-semibold text-slate-800 mb-4">By Category</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {data.by_category.map((cat) => {
              const meta = CATEGORY_META[cat.category] || { icon: "🎟️", label: cat.category, bg: "bg-slate-50", text: "text-slate-700", border: "border-slate-200" };
              const total = cat.issued + cat.redeemed;
              const pct = total > 0 ? Math.round((cat.redeemed / total) * 100) : 0;
              return (
                <div key={cat.category} className={`rounded-2xl border ${meta.border} ${meta.bg} p-5`}>
                  <div className="text-3xl mb-3">{meta.icon}</div>
                  <p className={`font-semibold ${meta.text}`}>{meta.label}</p>
                  <p className={`text-3xl font-bold mt-1 ${meta.text}`}>{cat.redeemed}</p>
                  <p className="text-xs text-slate-500 mt-1">of {total} issued · {pct}%</p>
                  {/* Progress bar */}
                  <div className="mt-3 h-1.5 bg-white/60 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${meta.text.replace("text-", "bg-")}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent redemptions */}
        {data.recent_redemptions.length > 0 && (
          <div>
            <h2 className="font-semibold text-slate-800 mb-4">Recent Redemptions</h2>
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden divide-y divide-slate-100">
              {data.recent_redemptions.map((r, i) => (
                <div key={i} className="px-5 py-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{CATEGORY_META[r.category]?.icon || "🎟️"}</span>
                    <div>
                      <p className="text-sm font-medium text-slate-900">
                        {r.org_name}
                        <span className="text-slate-400 mx-2">→</span>
                        {r.vendor_name}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        ${(r.value_cents / 100).toFixed(2)} · {new Date(r.redeemed_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  {r.explorer_url && (
                    <a href={r.explorer_url} target="_blank" rel="noopener noreferrer"
                      className="text-xs text-blue-600 underline shrink-0 font-medium">
                      On-chain →
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
