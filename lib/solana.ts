import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import bs58 from "bs58";

export const SOLANA_RPC = process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com";
export const PROGRAM_ID = process.env.NEXT_PUBLIC_PROGRAM_ID || "11111111111111111111111111111111";

export function getConnection(): Connection {
  return new Connection(SOLANA_RPC, "confirmed");
}

export function getBackendKeypair(): Keypair {
  const secretKey = process.env.SOLANA_BACKEND_SECRET_KEY;
  if (!secretKey) throw new Error("SOLANA_BACKEND_SECRET_KEY not set");
  return Keypair.fromSecretKey(bs58.decode(secretKey));
}

export function explorerUrl(sig: string): string {
  return `https://explorer.solana.com/tx/${sig}?cluster=devnet`;
}

export function categoryCode(cat: string): number {
  const codes: Record<string, number> = {
    meals: 0,
    hygiene: 1,
    transit: 2,
    laundry: 3,
  };
  return codes[cat] ?? 0;
}

export async function findVoucherPDA(
  voucherIdHash: Buffer,
  programId: PublicKey
): Promise<[PublicKey, number]> {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("voucher"), voucherIdHash],
    programId
  );
}
