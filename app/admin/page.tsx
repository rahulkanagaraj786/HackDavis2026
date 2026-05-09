"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { DEMO_ORGS, type DemoOrg } from "@/lib/demo-session";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import VoucherPrintModal from "@/components/VoucherPrintModal";

type Voucher = {
  id: string; category: string; value_cents: number; unit_count: number;
  status: string; alias: string | null; claim_token: string;
  on_chain_issue_sig: string | null; created_at: string; expires_at: string;
};
type IssueResult = { voucher_id: string; claim_token: string; qr_url: string; on_chain_sig: string; explorer_url: string };
type Filter = "all" | "issued" | "redeemed" | "expired";

const CAT = {
  meals:   { icon: "🍽️", label: "Meals",   preview: "from-orange-900/50 to-amber-900/30",   active: "bg-orange-500/20 text-orange-300 border-orange-500/40", icon_bg: "bg-orange-500/20 text-orange-300 border-orange-500/30" },
  hygiene: { icon: "🧴", label: "Hygiene", preview: "from-purple-900/50 to-violet-900/30",  active: "bg-purple-500/20 text-purple-300 border-purple-500/40", icon_bg: "bg-purple-500/20 text-purple-300 border-purple-500/30" },
  transit: { icon: "🚌", label: "Transit", preview: "from-sky-900/50 to-blue-900/30",       active: "bg-sky-500/20 text-sky-300 border-sky-500/40",          icon_bg: "bg-sky-500/20 text-sky-300 border-sky-500/30"          },
  laundry: { icon: "👕", label: "Laundry", preview: "from-teal-900/50 to-emerald-900/30",   active: "bg-teal-500/20 text-teal-300 border-teal-500/40",       icon_bg: "bg-teal-500/20 text-teal-300 border-teal-500/30"       },
} as const;

const STATUS = {
  issued:   "bg-blue-500/20 text-blue-300 border border-blue-500/30 font-semibold",
  redeemed: "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold",
  expired:  "bg-white/5 text-slate-500 border border-white/10",
} as Record<string, string>;

export default function AdminPage() {
  const [currentOrg, setCurrentOrg] = useState<DemoOrg>(DEMO_ORGS[0]);
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [loading, setLoading] = useState(false);
  const [issuing, setIssuing] = useState(false);
  const [filter, setFilter] = useState<Filter>("all");
  const [printVoucher, setPrintVoucher] = useState<(Voucher & { qr_url: string }) | null>(null);
  const [form, setForm] = useState({ category: "meals", value_cents: 500, unit_count: 1, alias: "", expires_days: 7 });
  const [lastIssued, setLastIssued] = useState<IssueResult | null>(null);

  async function switchOrg(cookieValue: string) {
    const org = DEMO_ORGS.find(o => o.cookieValue === cookieValue)!;
    setCurrentOrg(org);
    setFilter("all");
    await fetch("/api/orgs/switch", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ org_cookie: cookieValue }) });
    loadVouchers(org.id);
  }

  async function loadVouchers(orgId: string) {
    setLoading(true);
    const res = await fetch(`/api/vouchers?org_id=${orgId}`);
    const data = await res.json();
    setVouchers(data.vouchers || []);
    setLoading(false);
  }

  async function issueVoucher() {
    setIssuing(true); setLastIssued(null);
    try {
      const expires_at = new Date(Date.now() + form.expires_days * 86400000).toISOString();
      const res = await fetch("/api/vouchers/issue", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, alias: form.alias || undefined, expires_at, org_id: currentOrg.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setLastIssued(data);
      loadVouchers(currentOrg.id);
      toast.success("Confirmed on Solana", {
        description: <a href={data.explorer_url} target="_blank" rel="noopener noreferrer" className="underline text-blue-400">View transaction →</a>,
      });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Issue failed");
    } finally { setIssuing(false); }
  }

  useEffect(() => { loadVouchers(currentOrg.id); }, [currentOrg.id]);

  const orgGradient = currentOrg.color === "green" ? "gradient-green" : "gradient-orange";
  const counts = {
    all:      vouchers.length,
    issued:   vouchers.filter(v => v.status === "issued").length,
    redeemed: vouchers.filter(v => v.status === "redeemed").length,
    expired:  vouchers.filter(v => v.status === "expired").length,
  };
  const filteredVouchers = filter === "all" ? vouchers : vouchers.filter(v => v.status === filter);
  const activeCat = CAT[form.category as keyof typeof CAT] ?? CAT.meals;

  return (
    <div className="min-h-screen bg-slate-950">

      {/* Top bar */}
      <header className="bg-slate-900 border-b border-white/10 sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-md bg-blue-500/20 border border-blue-500/30 flex items-center justify-center">
              <span className="text-blue-400 font-black text-xs">RL</span>
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Nonprofit Admin</p>
              <p className="font-bold text-white text-sm leading-none">Relief Ledger</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Solana Devnet
            </div>
            <Select value={currentOrg.cookieValue} onValueChange={v => v && switchOrg(v)}>
              <SelectTrigger className="w-52 h-9 text-sm bg-slate-800 border-white/10 text-slate-200">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${currentOrg.color === "green" ? "bg-green-400" : "bg-orange-400"}`} />
                  <SelectValue />
                </div>
              </SelectTrigger>
              <SelectContent>
                {DEMO_ORGS.map(org => (
                  <SelectItem key={org.cookieValue} value={org.cookieValue}>
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${org.color === "green" ? "bg-green-400" : "bg-orange-400"}`} />
                      {org.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </header>

      {/* Org banner */}
      <div className={`${orgGradient} px-6 py-8 relative overflow-hidden`}>
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)", backgroundSize: "32px 32px" }} />
        <div className="relative max-w-6xl mx-auto flex items-end justify-between">
          <div>
            <p className="text-white/60 text-xs font-bold uppercase tracking-widest">Issuing vouchers as</p>
            <h1 className="text-white font-black text-4xl mt-2">{currentOrg.name}</h1>
          </div>
          <div className="flex gap-8 text-right">
            {[
              { value: counts.all,      label: "Total",    color: "text-white" },
              { value: counts.issued,   label: "Active",   color: "text-blue-200" },
              { value: counts.redeemed, label: "Redeemed", color: "text-emerald-300" },
            ].map(({ value, label, color }) => (
              <div key={label}>
                <p className={`font-black text-4xl tabular-nums ${color}`}>{value}</p>
                <p className="text-white/50 text-xs uppercase tracking-wide mt-1">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-5 gap-8">

        {/* Issue form — 2 of 5 cols */}
        <div className="lg:col-span-2">
          <div className="bg-slate-900 rounded-2xl border border-white/10 overflow-hidden sticky top-20">

            {/* Form header */}
            <div className="px-6 pt-6 pb-4 border-b border-white/10">
              <h2 className="font-bold text-white text-lg">Issue New Voucher</h2>
              <p className="text-slate-500 text-xs mt-0.5">Commits to Solana on creation</p>
            </div>

            <div className="px-6 py-5 space-y-5">

              {/* Live voucher preview */}
              <div className={`rounded-2xl border border-white/10 p-5 bg-gradient-to-br ${activeCat.preview} relative overflow-hidden`}>
                <div className="absolute inset-0 opacity-5"
                  style={{ backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)", backgroundSize: "20px 20px" }} />
                <div className="relative flex items-start justify-between">
                  <div>
                    <p className="text-white/50 text-xs font-bold uppercase tracking-widest">{activeCat.label} Voucher</p>
                    <p className="text-white font-black text-4xl mt-1.5 tabular-nums leading-none">
                      ${(form.value_cents / 100).toFixed(2)}
                    </p>
                    {form.unit_count > 1 && (
                      <p className="text-white/40 text-xs mt-1">× {form.unit_count} units</p>
                    )}
                  </div>
                  <span className="text-4xl">{activeCat.icon}</span>
                </div>
                <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between">
                  <p className="text-white/40 text-xs">
                    {form.alias ? <span className="text-white/60 font-medium">{form.alias}</span> : <span className="italic">No alias</span>}
                  </p>
                  <p className="text-white/40 text-xs">Expires in {form.expires_days}d</p>
                </div>
              </div>

              {/* Category */}
              <div>
                <Label className="text-slate-400 font-bold text-xs uppercase tracking-widest">Category</Label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {Object.entries(CAT).map(([k, v]) => (
                    <button key={k} onClick={() => setForm({ ...form, category: k })}
                      className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-medium transition-all ${
                        form.category === k ? `${v.active} shadow-sm` : "bg-white/5 border-white/10 text-slate-400 hover:bg-white/8 hover:border-white/20"
                      }`}>
                      <span>{v.icon}</span>{v.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Value + Units */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Value (¢)</Label>
                  <Input type="number" value={form.value_cents}
                    onChange={e => setForm({ ...form, value_cents: parseInt(e.target.value) || 0 })}
                    className="mt-1.5 font-mono bg-slate-800 border-white/10 text-slate-200" />
                </div>
                <div>
                  <Label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Units</Label>
                  <Input type="number" value={form.unit_count}
                    onChange={e => setForm({ ...form, unit_count: parseInt(e.target.value) || 1 })}
                    className="mt-1.5 font-mono bg-slate-800 border-white/10 text-slate-200" />
                </div>
              </div>

              {/* Expires */}
              <div>
                <Label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Expires in (days)</Label>
                <Input type="number" value={form.expires_days}
                  onChange={e => setForm({ ...form, expires_days: parseInt(e.target.value) || 7 })}
                  className="mt-1.5 font-mono bg-slate-800 border-white/10 text-slate-200" />
              </div>

              {/* Alias */}
              <div>
                <Label className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                  Alias <span className="text-slate-600 normal-case font-normal ml-1">(optional, never PII)</span>
                </Label>
                <Input placeholder="e.g. River, Neighbor" value={form.alias}
                  onChange={e => setForm({ ...form, alias: e.target.value })}
                  className="mt-1.5 bg-slate-800 border-white/10 text-slate-200 placeholder:text-slate-600" />
              </div>

              {/* Submit */}
              <Button onClick={issueVoucher} disabled={issuing}
                className={`w-full font-bold py-5 text-white ${orgGradient} hover:opacity-90 border-0`}>
                {issuing ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Confirming on Solana...
                  </span>
                ) : "Issue Voucher →"}
              </Button>

              {/* Last issued */}
              {lastIssued && (
                <div className="bg-emerald-950/60 border border-emerald-700/40 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-emerald-400">✓</span>
                    <p className="text-sm font-bold text-emerald-300">Confirmed on Solana</p>
                  </div>
                  <a href={lastIssued.explorer_url} target="_blank" rel="noopener noreferrer"
                    className="block text-xs text-blue-400 hover:text-blue-300 underline font-mono break-all">
                    {lastIssued.on_chain_sig.slice(0, 32)}...
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Voucher list — 3 of 5 cols */}
        <div className="lg:col-span-3 space-y-4">

          {/* List header + filter tabs */}
          <div className="flex items-center justify-between gap-4">
            <h2 className="font-bold text-white text-lg shrink-0">Vouchers</h2>
            <div className="flex-1 flex items-center bg-slate-900 border border-white/10 rounded-xl p-1 gap-0.5">
              {(["all", "issued", "redeemed", "expired"] as const).map(f => (
                <button key={f} onClick={() => setFilter(f)}
                  className={`flex-1 text-xs font-semibold py-1.5 rounded-lg transition-all ${
                    filter === f ? "bg-white/10 text-white" : "text-slate-500 hover:text-slate-300"
                  }`}>
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                  <span className={`ml-1 ${filter === f ? "text-white/50" : "text-slate-600"}`}>
                    {counts[f]}
                  </span>
                </button>
              ))}
            </div>
            <button onClick={() => loadVouchers(currentOrg.id)}
              className="text-slate-500 hover:text-slate-300 transition-colors shrink-0 text-sm">
              ↻
            </button>
          </div>

          {/* List body */}
          {loading ? (
            <div className="bg-slate-900 rounded-2xl border border-white/10 p-16 text-center">
              <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-slate-500 text-sm mt-3">Loading...</p>
            </div>
          ) : filteredVouchers.length === 0 ? (
            <div className="bg-slate-900 rounded-2xl border-2 border-dashed border-white/10 p-16 text-center">
              <p className="text-4xl mb-3">🎟️</p>
              <p className="text-slate-400 font-medium">
                {filter === "all" ? "No vouchers yet" : `No ${filter} vouchers`}
              </p>
              <p className="text-slate-600 text-sm mt-1">
                {filter === "all" ? "Issue one using the form." : "Switch filter to see others."}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredVouchers.map(v => {
                const cat = CAT[v.category as keyof typeof CAT] ?? { icon: "🎟️", label: v.category, preview: "", active: "", icon_bg: "bg-white/5 text-white/50 border-white/10" };
                return (
                  <div key={v.id} className="bg-slate-900 rounded-2xl border border-white/10 px-5 py-4 flex items-center gap-4 hover:bg-white/5 transition-colors">

                    {/* Category icon */}
                    <div className={`w-12 h-12 rounded-2xl border flex items-center justify-center text-2xl shrink-0 ${cat.icon_bg}`}>
                      {cat.icon}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-bold text-white">{cat.label}</p>
                        {v.alias && (
                          <span className="text-xs bg-white/10 text-slate-300 px-2 py-0.5 rounded-full">{v.alias}</span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        Issued {new Date(v.created_at).toLocaleDateString()}
                        <span className="mx-1.5 text-slate-700">·</span>
                        Expires {new Date(v.expires_at).toLocaleDateString()}
                      </p>
                      {v.on_chain_issue_sig && (
                        <p className="text-xs text-blue-500/50 font-mono mt-0.5 truncate">{v.on_chain_issue_sig.slice(0, 18)}…</p>
                      )}
                    </div>

                    {/* Value + actions */}
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <p className="text-white font-black text-2xl tabular-nums leading-none">
                        ${(v.value_cents / 100).toFixed(2)}
                      </p>
                      {v.unit_count > 1 && (
                        <p className="text-slate-500 text-xs -mt-1">× {v.unit_count}</p>
                      )}
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-2.5 py-1 rounded-full ${STATUS[v.status] ?? "bg-white/5 text-slate-500"}`}>
                          {v.status}
                        </span>
                        {v.status === "issued" && (
                          <Button size="sm" variant="outline"
                            className="text-slate-400 border-white/10 hover:bg-white/10 hover:text-white text-xs bg-transparent h-7 px-2.5"
                            onClick={() => { setPrintVoucher({ ...v, qr_url: `${window.location.origin}/voucher/${v.id}?t=${v.claim_token}` }); }}>
                            🖨 Print
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {printVoucher && <VoucherPrintModal voucher={printVoucher} orgName={currentOrg.name} onClose={() => setPrintVoucher(null)} />}
    </div>
  );
}
