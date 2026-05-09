"use client";

import { useState, useEffect } from "react";
import { DEMO_ORGS, type DemoOrg } from "@/lib/demo-session";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  on_chain_issue_sig: string | null;
  created_at: string;
  expires_at: string;
  claim_token?: string;
};

type IssueResult = {
  voucher_id: string;
  claim_token: string;
  qr_url: string;
  on_chain_sig: string;
  explorer_url: string;
};

const CATEGORY_LABELS: Record<string, string> = {
  meals: "Meals",
  hygiene: "Hygiene",
  transit: "Transit",
  laundry: "Laundry",
};

const CATEGORY_ICONS: Record<string, string> = {
  meals: "🍽️",
  hygiene: "🧴",
  transit: "🚌",
  laundry: "👕",
};

export default function AdminPage() {
  const [currentOrg, setCurrentOrg] = useState<DemoOrg>(DEMO_ORGS[0]);
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [loading, setLoading] = useState(false);
  const [issuing, setIssuing] = useState(false);
  const [printVoucher, setPrintVoucher] = useState<(Voucher & { qr_url: string }) | null>(null);

  // Issue form state
  const [form, setForm] = useState({
    category: "meals",
    value_cents: 500,
    unit_count: 1,
    alias: "",
    expires_days: 7,
  });

  const [lastIssued, setLastIssued] = useState<IssueResult | null>(null);

  async function switchOrg(cookieValue: string) {
    const org = DEMO_ORGS.find((o) => o.cookieValue === cookieValue)!;
    setCurrentOrg(org);
    await fetch("/api/orgs/switch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ org_cookie: cookieValue }),
    });
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
      const expires_at = new Date(
        Date.now() + form.expires_days * 24 * 60 * 60 * 1000
      ).toISOString();

      const res = await fetch("/api/vouchers/issue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: form.category,
          value_cents: form.value_cents,
          unit_count: form.unit_count,
          alias: form.alias || undefined,
          expires_at,
          org_id: currentOrg.id,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setLastIssued(data);
      loadVouchers(currentOrg.id);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : String(err));
    } finally {
      setIssuing(false);
    }
  }

  useEffect(() => {
    loadVouchers(currentOrg.id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentOrg.id]);

  const statusColor: Record<string, string> = {
    issued: "bg-blue-100 text-blue-800",
    redeemed: "bg-green-100 text-green-800",
    expired: "bg-gray-100 text-gray-600",
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className={`w-8 h-8 rounded-full ${
              currentOrg.color === "green" ? "bg-green-500" : "bg-orange-500"
            }`}
          />
          <span className="font-semibold text-gray-900">Relief Ledger — Admin</span>
        </div>

        {/* Org switcher */}
        <Select value={currentOrg.cookieValue} onValueChange={(v) => v && switchOrg(v)}>
          <SelectTrigger className="w-52">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {DEMO_ORGS.map((org) => (
              <SelectItem key={org.cookieValue} value={org.cookieValue}>
                <div className="flex items-center gap-2">
                  <div
                    className={`w-3 h-3 rounded-full ${
                      org.color === "green" ? "bg-green-500" : "bg-orange-500"
                    }`}
                  />
                  {org.name}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-8 grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Issue form */}
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">Issue Voucher</CardTitle>
            <p className="text-xs text-gray-500">Issuing as {currentOrg.name}</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Category</Label>
              <Select value={form.category} onValueChange={(v) => v && setForm({ ...form, category: v })}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>
                      {CATEGORY_ICONS[k]} {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Value (cents)</Label>
              <Input
                type="number"
                className="mt-1"
                value={form.value_cents}
                onChange={(e) => setForm({ ...form, value_cents: parseInt(e.target.value) || 0 })}
              />
            </div>

            <div>
              <Label>Unit count</Label>
              <Input
                type="number"
                className="mt-1"
                value={form.unit_count}
                onChange={(e) => setForm({ ...form, unit_count: parseInt(e.target.value) || 1 })}
              />
            </div>

            <div>
              <Label>Expires in (days)</Label>
              <Input
                type="number"
                className="mt-1"
                value={form.expires_days}
                onChange={(e) => setForm({ ...form, expires_days: parseInt(e.target.value) || 7 })}
              />
            </div>

            <div>
              <Label>Alias (optional)</Label>
              <Input
                className="mt-1"
                placeholder="e.g. River, Neighbor"
                value={form.alias}
                onChange={(e) => setForm({ ...form, alias: e.target.value })}
              />
            </div>

            <Button onClick={issueVoucher} disabled={issuing} className="w-full">
              {issuing ? "Issuing..." : "Issue Voucher"}
            </Button>

            {lastIssued && (
              <div className="bg-green-50 border border-green-200 rounded p-3 space-y-1">
                <p className="text-xs font-semibold text-green-800">Voucher issued!</p>
                <a
                  href={lastIssued.explorer_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 underline break-all"
                >
                  View on Solana Explorer
                </a>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Voucher list */}
        <div className="md:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">
              {currentOrg.name} — Vouchers
            </h2>
            <Button variant="outline" size="sm" onClick={() => loadVouchers(currentOrg.id)}>
              Refresh
            </Button>
          </div>

          {loading ? (
            <p className="text-sm text-gray-500">Loading...</p>
          ) : vouchers.length === 0 ? (
            <p className="text-sm text-gray-500">No vouchers yet. Issue one!</p>
          ) : (
            <div className="space-y-2">
              {vouchers.map((v) => (
                <Card key={v.id} className="py-3">
                  <CardContent className="flex items-center justify-between px-4">
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{CATEGORY_ICONS[v.category] || "?"}</span>
                      <div>
                        <p className="text-sm font-medium">
                          {CATEGORY_LABELS[v.category]} — ${(v.value_cents / 100).toFixed(2)}
                          {v.unit_count > 1 && ` × ${v.unit_count}`}
                        </p>
                        {v.alias && (
                          <p className="text-xs text-gray-500">{v.alias}</p>
                        )}
                        <p className="text-xs text-gray-400">
                          {new Date(v.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor[v.status]}`}
                      >
                        {v.status}
                      </span>
                      {v.status === "issued" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const baseUrl = window.location.origin;
                            setPrintVoucher({
                              ...v,
                              qr_url: `${baseUrl}/voucher/${v.id}?t=${v.claim_token || ""}`,
                            });
                          }}
                        >
                          Print Card
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
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
