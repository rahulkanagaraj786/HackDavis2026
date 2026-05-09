import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-8 p-8">
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-bold text-gray-900">Relief Ledger</h1>
        <p className="text-gray-500 max-w-md">
          Dignity-first aid voucher platform. Anonymous, tamper-evident, cross-org on Solana.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-lg">
        <Link
          href="/admin"
          className="bg-white border-2 border-gray-200 hover:border-blue-400 rounded-xl p-6 text-center transition-colors group"
        >
          <div className="text-3xl mb-2">🏢</div>
          <p className="font-semibold group-hover:text-blue-600">Admin</p>
          <p className="text-xs text-gray-400 mt-1">Issue vouchers</p>
        </Link>

        <Link
          href="/vendor"
          className="bg-white border-2 border-gray-200 hover:border-green-400 rounded-xl p-6 text-center transition-colors group"
        >
          <div className="text-3xl mb-2">📲</div>
          <p className="font-semibold group-hover:text-green-600">Vendor</p>
          <p className="text-xs text-gray-400 mt-1">Scan &amp; redeem</p>
        </Link>

        <Link
          href="/impact"
          className="bg-white border-2 border-gray-200 hover:border-purple-400 rounded-xl p-6 text-center transition-colors group"
        >
          <div className="text-3xl mb-2">📊</div>
          <p className="font-semibold group-hover:text-purple-600">Impact</p>
          <p className="text-xs text-gray-400 mt-1">Public dashboard</p>
        </Link>
      </div>
    </div>
  );
}
