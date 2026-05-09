import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: "linear-gradient(160deg, #0f172a 0%, #1e3a8a 60%, #1d4ed8 100%)" }}>

      {/* Nav */}
      <nav className="px-8 py-5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-white/20 backdrop-blur flex items-center justify-center">
            <span className="text-white font-black text-sm">RL</span>
          </div>
          <span className="text-white font-bold text-lg tracking-tight">Relief Ledger</span>
        </div>
        <Link href="/impact" className="text-blue-200 hover:text-white text-sm font-medium transition-colors">
          View Impact →
        </Link>
      </nav>

      {/* Hero */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 py-16 text-center">
        <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur border border-white/20 rounded-full px-4 py-1.5 text-blue-200 text-xs font-medium mb-8">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          Live on Solana Devnet
        </div>

        <h1 className="text-5xl md:text-7xl font-black text-white leading-tight tracking-tight max-w-3xl text-balance">
          Aid that protects<br />
          <span className="text-blue-300">dignity.</span>
        </h1>

        <p className="mt-6 text-blue-200 text-lg md:text-xl max-w-xl leading-relaxed">
          Anonymous QR vouchers for meals, hygiene, transit, and laundry —
          tamper-evident across organizations on a shared ledger.
        </p>

        {/* Role cards */}
        <div className="mt-14 grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-2xl">
          <Link href="/admin"
            className="group bg-white/10 hover:bg-white/20 backdrop-blur border border-white/20 hover:border-white/40 rounded-2xl p-6 text-left transition-all duration-200">
            <div className="w-10 h-10 rounded-xl bg-blue-500/30 flex items-center justify-center text-xl mb-4">🏛️</div>
            <p className="text-white font-bold text-lg">Nonprofit Admin</p>
            <p className="text-blue-300 text-sm mt-1">Issue vouchers, print cards, track redemptions</p>
            <p className="text-white/40 text-xs mt-4 group-hover:text-blue-300 transition-colors">Open dashboard →</p>
          </Link>

          <Link href="/vendor"
            className="group bg-white/10 hover:bg-white/20 backdrop-blur border border-white/20 hover:border-white/40 rounded-2xl p-6 text-left transition-all duration-200">
            <div className="w-10 h-10 rounded-xl bg-green-500/30 flex items-center justify-center text-xl mb-4">📲</div>
            <p className="text-white font-bold text-lg">Vendor Portal</p>
            <p className="text-blue-300 text-sm mt-1">Scan QR codes, confirm redemptions, track payouts</p>
            <p className="text-white/40 text-xs mt-4 group-hover:text-green-300 transition-colors">Open scanner →</p>
          </Link>

          <Link href="/impact"
            className="group bg-white/10 hover:bg-white/20 backdrop-blur border border-white/20 hover:border-white/40 rounded-2xl p-6 text-left transition-all duration-200">
            <div className="w-10 h-10 rounded-xl bg-purple-500/30 flex items-center justify-center text-xl mb-4">📊</div>
            <p className="text-white font-bold text-lg">Impact Dashboard</p>
            <p className="text-blue-300 text-sm mt-1">Public audit trail across all orgs and vendors</p>
            <p className="text-white/40 text-xs mt-4 group-hover:text-purple-300 transition-colors">View impact →</p>
          </Link>
        </div>

        {/* Why Solana pill */}
        <div className="mt-12 bg-white/5 border border-white/10 rounded-2xl px-6 py-4 max-w-xl">
          <p className="text-blue-200 text-sm leading-relaxed">
            <span className="text-white font-semibold">Why Solana?</span> When multiple nonprofits issue vouchers redeemable at shared vendors,
            no single org&apos;s database can be the source of truth. A fraction of a cent per redemption. Confirmed in seconds.
          </p>
        </div>
      </div>
    </div>
  );
}
