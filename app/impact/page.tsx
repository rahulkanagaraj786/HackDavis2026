"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";

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

const CATEGORY_ICONS: Record<string, string> = {
  meals: "🍽️",
  hygiene: "🧴",
  transit: "🚌",
  laundry: "👕",
};

const CATEGORY_COLORS: Record<string, string> = {
  meals: "bg-orange-100 text-orange-700",
  hygiene: "bg-purple-100 text-purple-700",
  transit: "bg-blue-100 text-blue-700",
  laundry: "bg-teal-100 text-teal-700",
};

export default function ImpactPage() {
  const [data, setData] = useState<ImpactData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/impact")
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); });
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Loading impact data...</p>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-6 py-4">
        <h1 className="text-xl font-bold text-gray-900">Relief Ledger — Impact Dashboard</h1>
        <p className="text-sm text-gray-500">Cross-org shared ledger on Solana Devnet</p>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-8 space-y-8">
        {/* Top stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Total Issued" value={data.total} />
          <StatCard label="Redeemed" value={data.redeemed} highlight />
          <StatCard label="Redemption Rate" value={`${data.redemption_rate}%`} />
          <StatCard label="Expired" value={data.expired} dim />
        </div>

        {/* Cross-org highlight — the "why Solana" stat */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-4">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="text-center">
                <p className="text-4xl font-bold text-blue-700">{data.cross_org_count}</p>
                <p className="text-sm text-blue-600">Organizations</p>
              </div>
              <div className="text-2xl text-blue-300">×</div>
              <div className="text-center">
                <p className="text-4xl font-bold text-blue-700">{data.cross_vendor_count}</p>
                <p className="text-sm text-blue-600">Vendors</p>
              </div>
              <div className="flex-1 min-w-48">
                <p className="text-sm text-blue-700 font-medium">
                  Vouchers redeemed across organizations on a shared ledger no single org controls.
                </p>
                <p className="text-xs text-blue-500 mt-1">A fraction of a cent per transaction on Solana Devnet.</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* By category */}
        <div>
          <h2 className="font-semibold text-gray-800 mb-3">By Category</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {data.by_category.map((cat) => (
              <Card key={cat.category} className={CATEGORY_COLORS[cat.category]}>
                <CardContent className="pt-4 text-center">
                  <div className="text-3xl">{CATEGORY_ICONS[cat.category]}</div>
                  <p className="capitalize font-semibold mt-1">{cat.category}</p>
                  <p className="text-2xl font-bold">{cat.redeemed}</p>
                  <p className="text-xs opacity-70">of {cat.issued + cat.redeemed} issued</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Recent redemptions */}
        {data.recent_redemptions.length > 0 && (
          <div>
            <h2 className="font-semibold text-gray-800 mb-3">Recent Redemptions</h2>
            <div className="space-y-2">
              {data.recent_redemptions.map((r) => (
                <div
                  key={r.voucher_id + r.redeemed_at}
                  className="bg-white rounded-lg border px-4 py-3 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{CATEGORY_ICONS[r.category] || "🎟️"}</span>
                    <div>
                      <p className="text-sm font-medium">
                        {r.org_name} → {r.vendor_name}
                      </p>
                      <p className="text-xs text-gray-500">
                        ${(r.value_cents / 100).toFixed(2)} · {new Date(r.redeemed_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  {r.explorer_url && (
                    <a
                      href={r.explorer_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 underline"
                    >
                      On-chain
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

function StatCard({ label, value, highlight, dim }: { label: string; value: number | string; highlight?: boolean; dim?: boolean }) {
  return (
    <Card>
      <CardContent className="pt-4 text-center">
        <p className={`text-3xl font-bold ${highlight ? "text-green-600" : dim ? "text-gray-400" : "text-gray-900"}`}>
          {value}
        </p>
        <p className="text-xs text-gray-500 mt-1">{label}</p>
      </CardContent>
    </Card>
  );
}
