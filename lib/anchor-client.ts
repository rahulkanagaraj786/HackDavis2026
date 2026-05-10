/**
 * Server-side Solana client for the Relief Ledger Anchor program.
 * It talks to the deployed program directly, so Vercel does not need local
 * Anchor build artifacts or an IDL checked into the repo.
 */

import {
  SystemProgram,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";
import {
  categoryCode,
  explorerUrl,
  findVoucherPDA,
  getBackendKeypair,
  getConnection,
  getProgramId,
} from "./solana";
import { isMockChain, mockIssueVoucher, mockRedeemVoucher } from "./mock-chain";
import { createHash } from "crypto";

const ISSUE_VOUCHER_DISCRIMINATOR = instructionDiscriminator("issue_voucher");
const REDEEM_VOUCHER_DISCRIMINATOR = instructionDiscriminator("redeem_voucher");
const ALREADY_REDEEMED_CODE = "0x1770";
const INVALID_CATEGORY_CODE = "0x1771";
const ACCOUNT_NOT_INITIALIZED_CODE = "3012";

export function sha256(input: string): Buffer {
  return createHash("sha256").update(input).digest();
}

function instructionDiscriminator(name: string): Buffer {
  return sha256(`global:${name}`).subarray(0, 8);
}

function encodeIssueVoucherInstruction(params: {
  voucherIdHash: Buffer;
  orgIdHash: Buffer;
  category: number;
  valueCents: number;
  unitCount: number;
}): Buffer {
  const valueCents = Buffer.alloc(4);
  valueCents.writeUInt32LE(params.valueCents, 0);

  return Buffer.concat([
    ISSUE_VOUCHER_DISCRIMINATOR,
    params.voucherIdHash,
    params.orgIdHash,
    Buffer.from([params.category]),
    valueCents,
    Buffer.from([params.unitCount]),
  ]);
}

function encodeRedeemVoucherInstruction(params: {
  voucherIdHash: Buffer;
  vendorHash: Buffer;
}): Buffer {
  return Buffer.concat([
    REDEEM_VOUCHER_DISCRIMINATOR,
    params.voucherIdHash,
    params.vendorHash,
  ]);
}

function mapProgramError(error: unknown): Error {
  if (!(error instanceof Error)) {
    return new Error("Solana transaction failed");
  }

  const errorWithLogs = error as Error & { getLogs?: () => unknown };
  const rawLogs = typeof errorWithLogs.getLogs === "function" ? errorWithLogs.getLogs() : undefined;
  const logs = Array.isArray(rawLogs)
    ? rawLogs.join("\n")
    : typeof rawLogs === "string"
    ? rawLogs
    : "";
  const combined = `${error.message}\n${logs}`;

  // Anchor custom errors start at 6000; these hex codes match the Rust program.
  if (combined.includes(ALREADY_REDEEMED_CODE) || combined.includes("AlreadyRedeemed")) {
    return new Error("AlreadyRedeemed");
  }

  // In practice this can surface on a second redeem attempt if the voucher PDA
  // lookup/simulation fails before our cleaner custom error bubbles up.
  if (
    combined.includes("AccountNotInitialized") ||
    combined.includes(ACCOUNT_NOT_INITIALIZED_CODE)
  ) {
    return new Error("AlreadyRedeemed");
  }

  if (combined.includes(INVALID_CATEGORY_CODE) || combined.includes("InvalidCategory")) {
    return new Error("InvalidCategory");
  }

  return error;
}

async function sendProgramInstruction(ix: TransactionInstruction): Promise<string> {
  const connection = getConnection();
  const backendKeypair = getBackendKeypair();
  const latestBlockhash = await connection.getLatestBlockhash("confirmed");
  const tx = new Transaction({
    feePayer: backendKeypair.publicKey,
    blockhash: latestBlockhash.blockhash,
    lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
  }).add(ix);
  tx.sign(backendKeypair);

  try {
    const signature = await connection.sendRawTransaction(tx.serialize(), {
      preflightCommitment: "confirmed",
    });

    await waitForSignatureConfirmation(
      connection,
      signature,
      latestBlockhash.lastValidBlockHeight
    );

    return signature;
  } catch (error) {
    throw mapProgramError(error);
  }
}

async function waitForSignatureConfirmation(
  connection: ReturnType<typeof getConnection>,
  signature: string,
  lastValidBlockHeight: number
): Promise<void> {
  for (;;) {
    const currentHeight = await connection.getBlockHeight("confirmed");
    if (currentHeight > lastValidBlockHeight) {
      throw new Error("Transaction expired before confirmation");
    }

    const { value: [status] } = await connection.getSignatureStatuses([signature]);
    if (status?.err) {
      throw new Error(JSON.stringify(status.err));
    }

    if (
      status &&
      (status.confirmationStatus === "confirmed" ||
        status.confirmationStatus === "finalized")
    ) {
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, 400));
  }
}

export async function issueVoucherOnChain(params: {
  voucherId: string;
  orgId: string;
  category: string;
  valueCents: number;
  unitCount: number;
}): Promise<{ signature: string; explorerUrl: string }> {
  if (isMockChain()) {
    return mockIssueVoucher({
      voucherId: params.voucherId,
      orgId: params.orgId,
      category: categoryCode(params.category),
      valueCents: params.valueCents,
      unitCount: params.unitCount,
    });
  }

  const backendKeypair = getBackendKeypair();
  const programId = getProgramId();
  const voucherIdHash = sha256(params.voucherId);
  const orgIdHash = sha256(params.orgId);
  const [voucherPDA] = findVoucherPDA(voucherIdHash, programId);

  const ix = new TransactionInstruction({
    programId,
    keys: [
      { pubkey: voucherPDA, isSigner: false, isWritable: true },
      { pubkey: backendKeypair.publicKey, isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: encodeIssueVoucherInstruction({
      voucherIdHash,
      orgIdHash,
      category: categoryCode(params.category),
      valueCents: params.valueCents,
      unitCount: params.unitCount,
    }),
  });

  const signature = await sendProgramInstruction(ix);
  return { signature, explorerUrl: explorerUrl(signature) };
}

export async function redeemVoucherOnChain(params: {
  voucherId: string;
  vendorId: string;
}): Promise<{ signature: string; explorerUrl: string }> {
  if (isMockChain()) {
    return mockRedeemVoucher({
      voucherId: params.voucherId,
      vendorId: params.vendorId,
    });
  }

  const backendKeypair = getBackendKeypair();
  const programId = getProgramId();
  const voucherIdHash = sha256(params.voucherId);
  const vendorHash = sha256(params.vendorId);
  const [voucherPDA] = findVoucherPDA(voucherIdHash, programId);

  const ix = new TransactionInstruction({
    programId,
    keys: [
      { pubkey: voucherPDA, isSigner: false, isWritable: true },
      { pubkey: backendKeypair.publicKey, isSigner: true, isWritable: false },
    ],
    data: encodeRedeemVoucherInstruction({
      voucherIdHash,
      vendorHash,
    }),
  });

  const signature = await sendProgramInstruction(ix);
  return { signature, explorerUrl: explorerUrl(signature) };
}
