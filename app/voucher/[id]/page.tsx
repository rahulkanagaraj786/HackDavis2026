"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useSearchParams } from "next/navigation";
import QRCode from "react-qr-code";
import { Button } from "@/components/ui/button";
import { useReactToPrint } from "react-to-print";

type VoucherData = {
  id: string;
  category: string;
  value_cents: number;
  unit_count: number;
  status: string;
  expires_at: string;
  alias: string | null;
  explorer_url: string | null;
};

const CATEGORY_ICONS: Record<string, string> = {
  meals: "🍽️",
  hygiene: "🧴",
  transit: "🚌",
  laundry: "👕",
};

const TRANSLATIONS: Record<string, Record<string, string>> = {
  en: {
    title: "Aid Voucher",
    value: "Value",
    expires: "Expires",
    status: "Status",
    issued: "Ready to use",
    redeemed: "Already used",
    expired: "Expired",
    scan_note: "Show this QR code at a participating location",
    print: "Print Card",
    chain: "Verified on Solana",
    claim_code: "Code:",
  },
  es: {
    title: "Vale de Ayuda",
    value: "Valor",
    expires: "Vence",
    status: "Estado",
    issued: "Listo para usar",
    redeemed: "Ya utilizado",
    expired: "Vencido",
    scan_note: "Muestre este código QR en un lugar participante",
    print: "Imprimir Tarjeta",
    chain: "Verificado en Solana",
    claim_code: "Código:",
  },
};

const CATEGORY_LABELS: Record<string, Record<string, string>> = {
  en: { meals: "Meals", hygiene: "Hygiene", transit: "Transit", laundry: "Laundry" },
  es: { meals: "Comidas", hygiene: "Higiene", transit: "Transporte", laundry: "Lavandería" },
};

export default function VoucherPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const claimToken = searchParams.get("t");
  const voucherId = params.id as string;

  const [voucher, setVoucher] = useState<VoucherData | null>(null);
  const [valid, setValid] = useState<boolean | null>(null);
  const [lang, setLang] = useState<"en" | "es">("en");
  const printRef = useRef<HTMLDivElement>(null);

  const t = TRANSLATIONS[lang];
  const catLabel = CATEGORY_LABELS[lang];

  const qrValue = `${window?.location?.origin || ""}/voucher/${voucherId}?t=${claimToken}`;

  const handlePrint = useReactToPrint({ contentRef: printRef });

  useEffect(() => {
    if (!claimToken) {
      setValid(false);
      return;
    }

    fetch(`/api/vouchers/${voucherId}`)
      .then((r) => r.json())
      .then(async (data) => {
        if (data.error) { setValid(false); return; }

        // Verify claim token server-side
        const verifyRes = await fetch(`/api/vouchers/${voucherId}/verify`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ claim_token: claimToken }),
        });
        const verifyData = await verifyRes.json();

        if (!verifyData.valid) { setValid(false); return; }

        setVoucher(data);
        setValid(true);
      })
      .catch(() => setValid(false));
  }, [voucherId, claimToken]);

  if (valid === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  if (!valid || !voucher) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center p-8">
          <p className="text-2xl mb-2">Invalid Voucher</p>
          <p className="text-gray-500 text-sm">This link is invalid or has expired.</p>
        </div>
      </div>
    );
  }

  const isUsable = voucher.status === "issued" && new Date(voucher.expires_at) > new Date();

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      {/* Language toggle */}
      <div className="fixed top-4 right-4 flex gap-2">
        <button
          onClick={() => setLang("en")}
          className={`text-sm px-3 py-1 rounded-full ${lang === "en" ? "bg-blue-600 text-white" : "bg-white text-gray-600 border"}`}
        >
          EN
        </button>
        <button
          onClick={() => setLang("es")}
          className={`text-sm px-3 py-1 rounded-full ${lang === "es" ? "bg-blue-600 text-white" : "bg-white text-gray-600 border"}`}
        >
          ES
        </button>
      </div>

      <div ref={printRef} className="bg-white rounded-2xl shadow-lg p-8 max-w-sm w-full text-center space-y-6">
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wide">{t.title}</p>
          <div className="text-5xl mt-2">{CATEGORY_ICONS[voucher.category] || "🎟️"}</div>
          <h1 className="text-2xl font-bold mt-2">{catLabel[voucher.category] || voucher.category}</h1>
          <p className="text-3xl font-bold text-blue-600 mt-1">
            ${(voucher.value_cents / 100).toFixed(2)}
            {voucher.unit_count > 1 && <span className="text-lg text-gray-500"> × {voucher.unit_count}</span>}
          </p>
        </div>

        {isUsable ? (
          <div className="bg-gray-50 p-4 rounded-xl inline-block">
            <QRCode value={qrValue} size={200} />
          </div>
        ) : (
          <div className="bg-red-50 rounded-xl p-6">
            <p className="text-red-600 font-semibold">
              {voucher.status === "redeemed" ? t.redeemed : t.expired}
            </p>
          </div>
        )}

        {isUsable && (
          <div className="text-xs text-gray-400 font-mono bg-gray-50 rounded p-2">
            <span className="text-gray-600">{t.claim_code}</span>{" "}
            <span className="select-all">{claimToken}</span>
          </div>
        )}

        <p className="text-xs text-gray-500">{t.scan_note}</p>

        <div className="text-xs text-gray-400">
          <p>
            {t.expires}: {new Date(voucher.expires_at).toLocaleDateString()}
          </p>
          {voucher.explorer_url && (
            <a
              href={voucher.explorer_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 underline"
            >
              {t.chain}
            </a>
          )}
        </div>

        <Button
          variant="outline"
          className="w-full print:hidden"
          onClick={() => handlePrint()}
        >
          {t.print}
        </Button>
      </div>
    </div>
  );
}
