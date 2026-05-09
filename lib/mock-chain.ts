/**
 * Chain-independent fallback — used when NEXT_PUBLIC_MOCK_CHAIN=true.
 * Returns realistic-looking Solana devnet explorer links backed by
 * deterministic fake signatures so the demo never depends on devnet being reachable.
 */

const FAKE_SIG_PREFIX = "5mock";

function fakeSignature(seed: string): string {
  // Deterministic base58-ish string derived from seed
  const chars = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  let result = FAKE_SIG_PREFIX;
  let n = Math.abs(hash);
  while (result.length < 88) {
    result += chars[n % chars.length];
    n = Math.floor(n / chars.length) || (n + 1) * 31337;
  }
  return result.slice(0, 88);
}

export function explorerUrl(sig: string): string {
  return `https://explorer.solana.com/tx/${sig}?cluster=devnet`;
}

export async function mockIssueVoucher(params: {
  voucherId: string;
  orgId: string;
  category: number;
  valueCents: number;
  unitCount: number;
}): Promise<{ signature: string; explorerUrl: string }> {
  // Simulate ~400ms network latency
  await new Promise((r) => setTimeout(r, 400));
  const sig = fakeSignature(`issue-${params.voucherId}`);
  return { signature: sig, explorerUrl: explorerUrl(sig) };
}

export async function mockRedeemVoucher(params: {
  voucherId: string;
  vendorId: string;
}): Promise<{ signature: string; explorerUrl: string }> {
  await new Promise((r) => setTimeout(r, 400));
  const sig = fakeSignature(`redeem-${params.voucherId}`);
  return { signature: sig, explorerUrl: explorerUrl(sig) };
}

export function isMockChain(): boolean {
  return process.env.NEXT_PUBLIC_MOCK_CHAIN === "true";
}
