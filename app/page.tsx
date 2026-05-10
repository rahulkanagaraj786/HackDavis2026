import Link from "next/link";

export default function Home() {
  return (
    <div
      className="min-h-screen overflow-x-hidden lg:h-[100svh] lg:overflow-hidden flex flex-col"
      style={{ background: "linear-gradient(160deg, #0f172a 0%, #1e3a8a 60%, #1d4ed8 100%)" }}
    >

      {/* Nav */}
      <nav className="px-6 py-4 md:px-8 md:py-5 flex items-center justify-between">
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
      <div className="flex-1 px-6 pb-8 pt-4 md:px-8 md:pb-10 lg:pb-8 lg:pt-2">
        <div className="mx-auto flex h-full w-full max-w-5xl flex-col items-center justify-center text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur border border-white/20 rounded-full px-4 py-1.5 text-blue-200 text-xs font-medium mb-6 md:mb-7">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            Live on Solana Devnet
          </div>

          <h1 className="text-5xl md:text-7xl font-black text-white leading-[0.95] tracking-tight max-w-3xl text-balance">
            Aid that protects<br />
            <span className="text-blue-300">dignity.</span>
          </h1>

          <p className="mt-5 text-blue-200 text-base md:text-lg lg:text-xl max-w-xl leading-relaxed">
            Anonymous QR vouchers for meals, hygiene, transit, and laundry on a shared ledger built for real-world aid.
          </p>

          {/* Role cards */}
          <div className="mt-9 md:mt-10 grid grid-cols-1 sm:grid-cols-3 gap-3.5 w-full max-w-4xl">
            <Link
              href="/admin"
              className="group bg-white/10 hover:bg-white/20 backdrop-blur border border-white/20 hover:border-white/40 rounded-2xl p-5 md:p-6 text-left transition-all duration-200"
            >
              <div className="w-10 h-10 rounded-xl bg-blue-500/30 flex items-center justify-center text-xl mb-4">🏛️</div>
              <p className="text-white font-bold text-lg">Nonprofit Admin</p>
              <p className="text-blue-300 text-sm mt-1 leading-6">Issue vouchers, print cards, and track redemptions.</p>
              <p className="text-white/40 text-xs mt-4 group-hover:text-blue-300 transition-colors">Open dashboard →</p>
            </Link>

            <Link
              href="/vendor"
              className="group bg-white/10 hover:bg-white/20 backdrop-blur border border-white/20 hover:border-white/40 rounded-2xl p-5 md:p-6 text-left transition-all duration-200"
            >
              <div className="w-10 h-10 rounded-xl bg-green-500/30 flex items-center justify-center text-xl mb-4">📲</div>
              <p className="text-white font-bold text-lg">Vendor Portal</p>
              <p className="text-blue-300 text-sm mt-1 leading-6">Scan QR codes, confirm redemption, and track payouts.</p>
              <p className="text-white/40 text-xs mt-4 group-hover:text-green-300 transition-colors">Open scanner →</p>
            </Link>

            <Link
              href="/impact"
              className="group bg-white/10 hover:bg-white/20 backdrop-blur border border-white/20 hover:border-white/40 rounded-2xl p-5 md:p-6 text-left transition-all duration-200"
            >
              <div className="w-10 h-10 rounded-xl bg-purple-500/30 flex items-center justify-center text-xl mb-4">📊</div>
              <p className="text-white font-bold text-lg">Impact Dashboard</p>
              <p className="text-blue-300 text-sm mt-1 leading-6">See the public audit trail across orgs and vendors.</p>
              <p className="text-white/40 text-xs mt-4 group-hover:text-purple-300 transition-colors">View impact →</p>
            </Link>
          </div>

          {/* Why Solana pill */}
          <div className="mt-7 md:mt-8 bg-white/5 border border-white/10 rounded-2xl px-5 py-3.5 max-w-2xl">
            <p className="text-blue-200 text-sm leading-relaxed">
              <span className="text-white font-semibold">Why Solana?</span> When multiple nonprofits issue vouchers redeemable at shared vendors, no single org&apos;s database can be the source of truth. A fraction of a cent per redemption. Confirmed in seconds.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
