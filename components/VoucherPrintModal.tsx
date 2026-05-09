"use client";

import { useRef } from "react";
import QRCode from "react-qr-code";
import { useReactToPrint } from "react-to-print";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type Props = {
  voucher: {
    id: string;
    category: string;
    value_cents: number;
    unit_count: number;
    expires_at: string;
    alias: string | null;
    qr_url: string;
  };
  orgName: string;
  onClose: () => void;
};

const CATEGORY_ICONS: Record<string, string> = {
  meals: "🍽️",
  hygiene: "🧴",
  transit: "🚌",
  laundry: "👕",
};

export default function VoucherPrintModal({ voucher, orgName, onClose }: Props) {
  const printRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({ contentRef: printRef });

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Print Voucher Card</DialogTitle>
        </DialogHeader>

        {/* Printable card */}
        <div ref={printRef} className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center space-y-4 bg-white">
          <p className="text-xs text-gray-400 uppercase tracking-widest">{orgName}</p>
          <div className="text-4xl">{CATEGORY_ICONS[voucher.category] || "🎟️"}</div>
          <h2 className="text-xl font-bold capitalize">{voucher.category}</h2>
          <p className="text-3xl font-bold text-blue-600">
            ${(voucher.value_cents / 100).toFixed(2)}
            {voucher.unit_count > 1 && <span className="text-lg text-gray-400"> × {voucher.unit_count}</span>}
          </p>

          <div className="flex justify-center bg-gray-50 p-3 rounded-xl">
            <QRCode value={voucher.qr_url} size={180} />
          </div>

          <p className="text-xs text-gray-500">
            Show this card at a participating location.
            <br />
            No account needed. Anonymous and secure.
          </p>

          <p className="text-xs text-gray-400">
            Expires: {new Date(voucher.expires_at).toLocaleDateString()}
          </p>

          {voucher.alias && (
            <p className="text-xs text-gray-500 italic">{voucher.alias}</p>
          )}

          <p className="text-xs text-gray-300">relief-ledger.vercel.app · Solana Devnet</p>
        </div>

        <div className="flex gap-2 mt-2">
          <Button onClick={() => handlePrint()} className="flex-1">
            Print
          </Button>
          <Button variant="outline" onClick={onClose} className="flex-1">
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
