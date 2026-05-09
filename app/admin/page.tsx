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

const CATEGORY_ICONS: Record<string, string> = { meals: "🍽️", hygiene: "🧴", transit: "🚌", laundry: "👕" };
const CATEGORY_LABELS: Record<string, string> = { meals: "Meals", hygiene: "Hygiene", transit: "Transit", laundry: "Laundry" };

const STATUS_STYLES: Record<string, string> = {
  issued: "bg-blue-50 text-blue-700 border border-blue-200",
  redeemed: "bg-green-50 text-green-700 border border-green-200",
  expired: "bg-gray-100 text-gray-500 border border-gray-200",
};

export default function AdminPage() {
  const [currentOrg, setCurrentOrg] = useState<DemoOrg>(DEMO_ORGS[0]);
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [loading, setLoading] = useState(false);
  const [issuing, setIssuing] = useState(false);
  const [printVoucher, setPrintVoucher] = useState<(Voucher & { qr_url: string }) | null>(null);
  const [form, setForm] = useState({ category: "meals", value_cents: 500, unit_count: 1, alias: "", expires_days: 7 });
  const [lastIssued, setLastIssued] = useState<IssueResult | null>(null);

  async function switchOrg(cookieValue: string) {
    const org = DEMO_ORGS.find((o) => o.cookieValue === cookieValue)!;
    setCurrentOrg(org);
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
    setIssuing(true);
    setLastIssued(null);
    try {
      const expires_at = new Date(Date.now() + form.expires_days * 86400000).toISOString();
      const res = await fetch("/api/vouchers/issue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, alias: form.alias || undefined, expires_at, org_id: currentOrg.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setLastIssued(data);
      loadVouchers(currentOrg.id);
      toast.success("Voucher issued on Solana!", {
        description: <a href={data.explorer_url} target="_blank" rel="noopener noreferrer" className="underline text-blue-600">View on Explorer →</a>,
      });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Issue failed");
    } finally {
      setIssuing(false);
    }
  }

  useEffect(() => { loadVouchers(currentOrg.id); }, [currentOrg.id]);

  const issuedCount = vouchers.filter(v => v.status === "issued").length;
  const redeemedCount = vouchers.filter(v => v.status === "redeemed").length;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-white font-bold text-sm ${currentOrg.color === "green" ? "bg-green-600" : "bg-orange-500"}`}>
              {currentOrg.name.charAt(0)}
            </div>
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wide font-medium">Admin Dashboard</p>
              <p className="font-semibold text-slate-900 leading-tight">Relief Ledger</p>
            </div>
          </div>

          <Select value={currentOrg.cookieValue} onValueChange={(v) => v && switchOrg(v)}>
            <SelectTrigger className="w-52 bg-white">
              <div className="flex items-center gap-2">
                <div className={`w-2.5 h-2.5 rounded-full ${currentOrg.color === "green" ? "bg-green-500" : "bg-orange-500"}`} />
                <SelectValue />
              </div>
            </SelectTrigger>
            <SelectContent>
              {DEMO_ORGS.map((org) => (
                <SelectItem key={org.cookieValue} value={org.cookieValue}>
                  <div className="flex items-center gap-2">
                    <div className={`w-2.5 h-2.5 rounded-full ${org.color === "green" ? "bg-green-500" : "bg-orange-500"}`} />
                    {org.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Issue form */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className={`px-6 py-5 ${currentOrg.color === "green" ? "bg-green-600" : "bg-orange-500"}`}>
              <p className="text-white font-semibold text-lg">Issue Voucher</p>
              <p className="text-white/70 text-sm mt-0.5">Issuing as {currentOrg.name}</p>
            </div>

            <div className="px-6 py-5 space-y-4">
              <div>
                <Label className="text-slate-700 font-medium">Category</Label>
                <Select value={form.category} onValueChange={(v) => v && setForm({ ...form, category: v })}>
                  <SelectTrigger className="mt-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>
                        <span className="flex items-center gap-2">{CATEGORY_ICONS[k]} {v}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-slate-700 font-medium">Value (¢)</Label>
                  <Input type="number" className="mt-1.5" value={form.value_cents}
                    onChange={(e) => setForm({ ...form, value_cents: parseInt(e.target.value) || 0 })} />
                </div>
                <div>
                  <Label className="text-slate-700 font-medium">Units</Label>
                  <Input type="number" className="mt-1.5" value={form.unit_count}
                    onChange={(e) => setForm({ ...form, unit_count: parseInt(e.target.value) || 1 })} />
                </div>
              </div>

              <div>
                <Label className="text-slate-700 font-medium">Expires in (days)</Label>
                <Input type="number" className="mt-1.5" value={form.expires_days}
                  onChange={(e) => setForm({ ...form, expires_days: parseInt(e.target.value) || 7 })} />
              </div>

              <div>
                <Label className="text-slate-700 font-medium">Alias <span className="text-slate-400 font-normal">(optional)</span></Label>
                <Input className="mt-1.5" placeholder="e.g. River, Neighbor" value={form.alias}
                  onChange={(e) => setForm({ ...form, alias: e.target.value })} />
              </div>

              <Button onClick={issueVoucher} disabled={issuing} className={`w-full mt-2 font-semibold ${currentOrg.color === "green" ? "bg-green-600 hover:bg-green-700" : "bg-orange-500 hover:bg-orange-600"}`}>
                {issuing ? "Issuing on Solana..." : "Issue Voucher"}
              </Button>

              {lastIssued && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    <p className="text-sm font-semibold text-green-800">Confirmed on Solana</p>
                  </div>
                  <a href={lastIssued.explorer_url} target="_blank" rel="noopener noreferrer"
                    className="text-xs text-blue-600 underline break-all block">
                    {lastIssued.on_chain_sig.slice(0, 20)}... → Explorer
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Voucher list */}
        <div className="lg:col-span-2 space-y-5">
          {/* Stats row */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: "Total", value: vouchers.length, color: "text-slate-900" },
              { label: "Issued", value: issuedCount, color: "text-blue-600" },
              { label: "Redeemed", value: redeemedCount, color: "text-green-600" },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-white rounded-xl border border-slate-200 p-4 text-center shadow-sm">
                <p className={`text-3xl font-bold ${color}`}>{value}</p>
                <p className="text-xs text-slate-500 mt-1 uppercase tracking-wide">{label}</p>
              </div>
            ))}
          </div>

          {/* List header */}
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-slate-900">{currentOrg.name} — Vouchers</h2>
            <Button variant="outline" size="sm" onClick={() => loadVouchers(currentOrg.id)} className="text-slate-600">
              Refresh
            </Button>
          </div>

          {loading ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
              <p className="text-slate-400">Loading vouchers...</p>
            </div>
          ) : vouchers.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 border-dashed p-12 text-center">
              <p className="text-4xl mb-3">🎟️</p>
              <p className="text-slate-500">No vouchers yet — issue one above.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {vouchers.map((v) => (
                <div key={v.id} className="bg-white rounded-xl border border-slate-200 shadow-sm px-5 py-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="text-3xl">{CATEGORY_ICONS[v.category] || "🎟️"}</div>
                    <div>
                      <p className="font-semibold text-slate-900">
                        {CATEGORY_LABELS[v.category]}
                        <span className="ml-2 text-slate-500 font-normal">${(v.value_cents / 100).toFixed(2)}{v.unit_count > 1 && ` × ${v.unit_count}`}</span>
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {v.alias && <span className="text-slate-600 mr-2">{v.alias}</span>}
                        {new Date(v.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${STATUS_STYLES[v.status]}`}>
                      {v.status}
                    </span>
                    {v.status === "issued" && (
                      <Button variant="outline" size="sm" className="text-slate-700 border-slate-300"
                        onClick={() => {
                          const baseUrl = window.location.origin;
                          setPrintVoucher({ ...v, qr_url: `${baseUrl}/voucher/${v.id}?t=${v.claim_token}` });
                        }}>
                        Print Card
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {printVoucher && (
        <VoucherPrintModal voucher={printVoucher} orgName={currentOrg.name} onClose={() => setPrintVoucher(null)} />
      )}
    </div>
  );
}
