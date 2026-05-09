"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Vendor = { id: string; name: string; category: string; pending_payout_cents: number };
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

const CATEGORY_ICONS: Record<string, string> = {
  meals: "🍽️",
  hygiene: "🧴",
  transit: "🚌",
  laundry: "👕",
};

export default function VendorPage() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [selectedVendorId, setSelectedVendorId] = useState<string>("");
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
  const scannerDivRef = useRef<HTMLDivElement>(null);

  const selectedVendor = vendors.find((v) => v.id === selectedVendorId);

  useEffect(() => {
    fetch("/api/orgs/vendors")
      .then((r) => r.json())
      .then((d) => {
        setVendors(d.vendors || []);
        if (d.vendors?.length > 0) setSelectedVendorId(d.vendors[0].id);
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
      // not a URL — maybe raw claim code format "voucherid:token"
      const split = raw.split(":");
      if (split.length === 2) return { voucherId: split[0], token: split[1] };
    }
    return null;
  }

  async function handleQrData(raw: string) {
    setError(null);
    const parsed = parseQrUrl(raw.trim());
    if (!parsed) {
      setError("Could not parse QR code. Try manual entry.");
      return;
    }
    await fetchPreview(parsed.voucherId, parsed.token);
  }

  async function fetchPreview(vid: string, token: string) {
    const res = await fetch(`/api/vouchers/${vid}`);
    const data = await res.json();
    if (data.error) { setError(data.error); return; }
    setVoucherId(vid);
    setClaimToken(token);
    setPreview(data);
    setRedeemResult(null);
  }

  async function handleManualEntry() {
    const raw = manualCode.trim();
    if (!raw) return;
    await handleQrData(raw);
  }

  async function startScanner() {
    if (!scannerDivRef.current) return;
    setScanning(true);
    const { Html5Qrcode } = await import("html5-qrcode");
    const scanner = new Html5Qrcode("qr-scanner-div");
    scannerRef.current = scanner;
    try {
      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: 250 },
        (decodedText: string) => {
          scanner.stop();
          setScanning(false);
          handleQrData(decodedText);
        },
        undefined
      );
    } catch {
      setScanning(false);
      setError("Camera access denied. Use manual entry.");
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
    setError(null);
    try {
      const res = await fetch("/api/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          voucher_id: voucherId,
          claim_token: claimToken,
          vendor_id: selectedVendorId,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.code === "ALREADY_REDEEMED") {
          setError("Already redeemed — on-chain proof prevents double use.");
        } else {
          setError(data.error || "Redemption failed");
        }
        return;
      }
      setRedeemResult(data);
      setPreview(null);

      // Refresh vendor payout
      fetch("/api/orgs/vendors").then((r) => r.json()).then((d) => {
        setVendors(d.vendors || []);
      });
    } finally {
      setConfirming(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 max-w-lg mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mt-6">Vendor Redemption</h1>
        <p className="text-sm text-gray-500">Scan or enter a voucher code</p>
      </div>

      {/* Vendor selector */}
      <Card>
        <CardContent className="pt-4">
          <Label>Vendor</Label>
          <Select value={selectedVendorId} onValueChange={(v) => v && setSelectedVendorId(v)}>
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="Select vendor..." />
            </SelectTrigger>
            <SelectContent>
              {vendors.map((v) => (
                <SelectItem key={v.id} value={v.id}>
                  {v.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedVendor && (
            <p className="text-sm text-green-700 font-semibold mt-2">
              Pending payout: ${(selectedVendor.pending_payout_cents / 100).toFixed(2)}
              <span className="text-xs text-gray-400 font-normal ml-2">auto-reimbursed from on-chain proof</span>
            </p>
          )}
        </CardContent>
      </Card>

      {/* QR scanner */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Scan QR Code</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div id="qr-scanner-div" ref={scannerDivRef} className="w-full min-h-16" />
          {!scanning ? (
            <Button onClick={startScanner} className="w-full">
              Start Camera
            </Button>
          ) : (
            <Button variant="outline" onClick={stopScanner} className="w-full">
              Stop Camera
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Manual entry fallback */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Manual Entry</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-2">
          <Input
            placeholder="Paste voucher URL or code..."
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleManualEntry()}
          />
          <Button onClick={handleManualEntry}>Go</Button>
        </CardContent>
      </Card>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-300 rounded-lg p-4">
          <p className="text-red-700 font-semibold text-sm">{error}</p>
        </div>
      )}

      {/* Voucher preview + confirm */}
      {preview && !redeemResult && (
        <Card className="border-2 border-blue-200">
          <CardContent className="pt-4 space-y-4">
            <div className="flex items-center gap-3">
              <span className="text-4xl">{CATEGORY_ICONS[preview.category] || "🎟️"}</span>
              <div>
                <p className="font-semibold capitalize">{preview.category}</p>
                <p className="text-2xl font-bold text-blue-600">
                  ${(preview.value_cents / 100).toFixed(2)}
                  {preview.unit_count > 1 && <span className="text-base text-gray-400"> × {preview.unit_count}</span>}
                </p>
              </div>
            </div>
            <p className="text-xs text-gray-500">
              Expires: {new Date(preview.expires_at).toLocaleDateString()}
            </p>

            {preview.status !== "issued" ? (
              <div className="bg-red-100 rounded p-3 text-red-700 text-sm font-medium">
                Cannot redeem — status: {preview.status}
              </div>
            ) : (
              <Button onClick={confirmRedeem} disabled={confirming} className="w-full bg-green-600 hover:bg-green-700">
                {confirming ? "Processing..." : "Confirm Redeem"}
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Success state */}
      {redeemResult && (
        <Card className="border-2 border-green-300 bg-green-50">
          <CardContent className="pt-4 space-y-3 text-center">
            <div className="text-4xl">✅</div>
            <p className="font-bold text-green-800 text-lg">Redeemed!</p>
            <p className="text-green-700">
              ${(redeemResult.value_cents / 100).toFixed(2)} credited
            </p>
            <a
              href={redeemResult.explorer_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-600 underline block"
            >
              View on-chain proof
            </a>
            <Button
              variant="outline"
              className="w-full mt-2"
              onClick={() => { setRedeemResult(null); setVoucherId(null); setClaimToken(null); setManualCode(""); }}
            >
              Scan Another
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
