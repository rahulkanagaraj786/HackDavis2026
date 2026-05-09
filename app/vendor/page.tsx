"use client";

import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Vendor = { id: string; name: string; category: string; pending_payout_cents: number };
type VoucherPreview = { id: string; category: string; value_cents: number; unit_count: number; status: string; expires_at: string };
type RedeemResult = { success: boolean; on_chain_sig: string; explorer_url: string; value_cents: number };

const CATEGORY_ICONS: Record<string, string> = { meals: "🍽️", hygiene: "🧴", transit: "🚌", laundry: "👕" };
const CATEGORY_LABELS: Record<string, string> = { meals: "Meals", hygiene: "Hygiene", transit: "Transit", laundry: "Laundry" };

export default function VendorPage() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [selectedVendorId, setSelectedVendorId] = useState("");
  const [manualCode, setManualCode] = useState("");
  const [preview, setPreview] = useState<VoucherPreview | null>(null);
  const [voucherId, setVoucherId] = useState<string | null>(null);
  const [claimToken, setClaimToken] = useState<string | null>(null);
  const [redeemResult, setRedeemResult] = useState<RedeemResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [confirming, setConfirming] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const scannerRef = useRef<any>(null);

  const selectedVendor = vendors.find((v) => v.id === selectedVendorId);

  useEffect(() => {
    fetch("/api/orgs/vendors").then(r => r.json()).then(d => {
      const list = d.vendors || [];
      setVendors(list);
      if (list.length > 0) setSelectedVendorId(list[0].id);
    });
  }, []);

  function parseQrUrl(raw: string): { voucherId: string; token: string } | null {
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
    setError(null);
    const parsed = parseQrUrl(raw.trim());
    if (!parsed) { setError("Could not parse QR code. Try manual entry."); return; }
    const res = await fetch(`/api/vouchers/${parsed.voucherId}`);
    const data = await res.json();
    if (data.error) { setError(data.error); return; }
    setVoucherId(parsed.voucherId);
    setClaimToken(parsed.token);
    setPreview(data);
    setRedeemResult(null);
  }

  async function startScanner() {
    if (!document.getElementById("qr-scanner-div")) return;
    setScanning(true);
    const { Html5Qrcode } = await import("html5-qrcode");
    const scanner = new Html5Qrcode("qr-scanner-div");
    scannerRef.current = scanner;
    try {
      await scanner.start({ facingMode: "environment" }, { fps: 10, qrbox: 250 },
        (decodedText: string) => { scanner.stop(); setScanning(false); handleQrData(decodedText); },
        undefined
      );
    } catch { setScanning(false); setError("Camera access denied. Use manual entry."); }
  }

  async function stopScanner() {
    if (scannerRef.current) { await scannerRef.current.stop().catch(() => {}); scannerRef.current = null; }
    setScanning(false);
  }

  async function confirmRedeem() {
    if (!voucherId || !claimToken || !selectedVendorId) return;
    setConfirming(true);
    setError(null);
    try {
      const res = await fetch("/api/redeem", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ voucher_id: voucherId, claim_token: claimToken, vendor_id: selectedVendorId }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.code === "ALREADY_REDEEMED") {
          setError("ALREADY_REDEEMED");
          toast.error("Already Redeemed", { description: "The blockchain prevented double-spending.", duration: 6000 });
        } else {
          setError(data.error || "Redemption failed");
        }
        return;
      }
      setRedeemResult(data);
      setPreview(null);
      toast.success("Redeemed!", { description: <a href={data.explorer_url} target="_blank" rel="noopener noreferrer" className="underline">View on-chain proof →</a> });
      fetch("/api/orgs/vendors").then(r => r.json()).then(d => setVendors(d.vendors || []));
    } finally { setConfirming(false); }
  }

  function reset() {
    setRedeemResult(null); setPreview(null); setVoucherId(null);
    setClaimToken(null); setManualCode(""); setError(null);
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 uppercase tracking-wide font-medium">Vendor Portal</p>
            <p className="font-semibold text-slate-900">Relief Ledger</p>
          </div>
          {selectedVendor && (
            <div className="text-right">
              <p className="text-xs text-slate-500">{selectedVendor.name}</p>
              <p className="text-sm font-bold text-green-700">${(selectedVendor.pending_payout_cents / 100).toFixed(2)} pending</p>
            </div>
          )}
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">

        {/* Vendor selector */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <p className="text-sm font-semibold text-slate-700 mb-2">Vendor</p>
          <Select value={selectedVendorId} onValueChange={(v) => v && setSelectedVendorId(v)}>
            <SelectTrigger><SelectValue placeholder="Select vendor..." /></SelectTrigger>
            <SelectContent>
              {vendors.map((v) => (
                <SelectItem key={v.id} value={v.id}>
                  <span className="flex items-center gap-2">{CATEGORY_ICONS[v.category]} {v.name}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedVendor && (
            <div className="mt-3 flex items-center justify-between bg-green-50 border border-green-200 rounded-lg px-4 py-2.5">
              <span className="text-sm text-green-800">Pending reimbursement</span>
              <span className="text-lg font-bold text-green-700">${(selectedVendor.pending_payout_cents / 100).toFixed(2)}</span>
            </div>
          )}
        </div>

        {/* Scanner */}
        {!preview && !redeemResult && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 pt-5 pb-3">
              <p className="font-semibold text-slate-900">Scan QR Code</p>
              <p className="text-sm text-slate-500 mt-0.5">Point camera at printed voucher card</p>
            </div>
            <div id="qr-scanner-div" className="w-full" />
            <div className="px-5 pb-5 pt-3 space-y-3">
              {!scanning ? (
                <Button onClick={startScanner} className="w-full bg-slate-900 hover:bg-slate-800 font-semibold">
                  Start Camera
                </Button>
              ) : (
                <Button variant="outline" onClick={stopScanner} className="w-full">Stop Camera</Button>
              )}
              <div className="relative">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200" /></div>
                <div className="relative text-center"><span className="bg-white px-3 text-xs text-slate-400">or enter manually</span></div>
              </div>
              <div className="flex gap-2">
                <Input placeholder="Paste voucher URL or code..." value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleQrData(manualCode)} />
                <Button variant="outline" onClick={() => handleQrData(manualCode)}>Go</Button>
              </div>
            </div>
          </div>
        )}

        {/* Already redeemed error — big red for projector */}
        {error === "ALREADY_REDEEMED" && (
          <div className="bg-red-600 rounded-2xl p-6 text-center shadow-lg">
            <div className="text-4xl mb-3">🚫</div>
            <p className="text-white font-bold text-xl">Already Redeemed</p>
            <p className="text-red-100 text-sm mt-2">This voucher was already used.<br />The blockchain prevented double-spending.</p>
            <Button onClick={reset} variant="outline" className="mt-4 bg-transparent text-white border-white hover:bg-red-700 hover:text-white">
              Scan Another
            </Button>
          </div>
        )}

        {/* Generic error */}
        {error && error !== "ALREADY_REDEEMED" && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
            <span className="text-red-500 text-lg">⚠️</span>
            <div>
              <p className="text-red-800 font-semibold text-sm">Error</p>
              <p className="text-red-700 text-sm mt-0.5">{error}</p>
            </div>
            <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-600 text-sm">✕</button>
          </div>
        )}

        {/* Voucher preview */}
        {preview && !redeemResult && error !== "ALREADY_REDEEMED" && (
          <div className="bg-white rounded-2xl border-2 border-blue-300 shadow-md overflow-hidden">
            <div className="bg-blue-50 px-5 py-4 flex items-center gap-4">
              <div className="text-5xl">{CATEGORY_ICONS[preview.category] || "🎟️"}</div>
              <div>
                <p className="text-sm font-medium text-blue-700 uppercase tracking-wide">{CATEGORY_LABELS[preview.category]}</p>
                <p className="text-4xl font-bold text-slate-900">${(preview.value_cents / 100).toFixed(2)}</p>
                {preview.unit_count > 1 && <p className="text-sm text-slate-500">× {preview.unit_count} units</p>}
              </div>
            </div>
            <div className="px-5 py-4 space-y-3">
              <div className="flex justify-between text-sm text-slate-500">
                <span>Expires</span>
                <span>{new Date(preview.expires_at).toLocaleDateString()}</span>
              </div>

              {preview.status !== "issued" ? (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-center">
                  <p className="text-amber-800 font-semibold">Cannot redeem — status: {preview.status}</p>
                </div>
              ) : (
                <Button onClick={confirmRedeem} disabled={confirming}
                  className="w-full bg-green-600 hover:bg-green-700 font-bold text-lg py-6">
                  {confirming ? "Processing..." : "✓ Confirm Redeem"}
                </Button>
              )}
              <Button variant="ghost" onClick={reset} className="w-full text-slate-400 text-sm">Cancel</Button>
            </div>
          </div>
        )}

        {/* Success state */}
        {redeemResult && (
          <div className="bg-white rounded-2xl border-2 border-green-300 shadow-md overflow-hidden">
            <div className="bg-green-600 px-5 py-6 text-center">
              <div className="text-5xl mb-2">✅</div>
              <p className="text-white font-bold text-2xl">Redeemed!</p>
              <p className="text-green-100 text-sm mt-1">${(redeemResult.value_cents / 100).toFixed(2)} credited to your account</p>
            </div>
            <div className="px-5 py-4 space-y-3">
              <a href={redeemResult.explorer_url} target="_blank" rel="noopener noreferrer"
                className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-sm hover:bg-slate-100 transition-colors">
                <span className="text-slate-600 font-medium">On-chain proof</span>
                <span className="text-blue-600 underline font-mono text-xs">{redeemResult.on_chain_sig.slice(0, 16)}... →</span>
              </a>
              {selectedVendor && (
                <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg px-4 py-3">
                  <span className="text-sm text-green-800">Total pending payout</span>
                  <span className="font-bold text-green-700 text-lg">${(selectedVendor.pending_payout_cents / 100).toFixed(2)}</span>
                </div>
              )}
              <Button onClick={reset} className="w-full bg-slate-900 hover:bg-slate-800 font-semibold">
                Scan Another Voucher
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
