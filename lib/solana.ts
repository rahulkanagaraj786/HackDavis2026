import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import bs58 from "bs58";

export const SOLANA_RPC = process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com";

export function getConnection(): Connection {
  return new Connection(SOLANA_RPC, "confirmed");
}

export function getBackendKeypair(): Keypair {
  const secretKey = process.env.SOLANA_BACKEND_SECRET_KEY;
  if (!secretKey) throw new Error("SOLANA_BACKEND_SECRET_KEY not set");
  return Keypair.fromSecretKey(parseSecretKey(secretKey));
}

export function getProgramId(): PublicKey {
  const rawProgramId = process.env.NEXT_PUBLIC_PROGRAM_ID;
  if (!rawProgramId) {
    throw new Error("NEXT_PUBLIC_PROGRAM_ID not set");
  }

  try {
    return new PublicKey(rawProgramId);
  } catch {
    throw new Error("NEXT_PUBLIC_PROGRAM_ID is not a valid Solana public key");
  }
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
  const code = codes[cat];
  if (code === undefined) {
    throw new Error(`Invalid voucher category: ${cat}`);
  }
  return code;
}

export function findVoucherPDA(
  voucherIdHash: Buffer,
  programId: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("voucher"), voucherIdHash],
    programId
  );
}

function parseSecretKey(rawSecret: string): Uint8Array {
  const trimmed = rawSecret.trim();

  if (trimmed.startsWith("[")) {
    try {
      const parsed = JSON.parse(trimmed);
      if (!Array.isArray(parsed) || parsed.some((value) => typeof value !== "number")) {
        throw new Error("Invalid JSON array secret key");
      }
      return Uint8Array.from(parsed);
    } catch {
      throw new Error("SOLANA_BACKEND_SECRET_KEY JSON array is invalid");
    }
  }

  try {
    return bs58.decode(trimmed);
  } catch {
    throw new Error("SOLANA_BACKEND_SECRET_KEY must be base58 or a JSON array");
  }
}
