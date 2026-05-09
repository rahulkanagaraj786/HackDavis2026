import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { ReliefLedger } from "../target/types/relief_ledger";
import { assert } from "chai";
import * as crypto from "crypto";

function sha256(input: string): Buffer {
  return crypto.createHash("sha256").update(input).digest();
}

describe("relief-ledger", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.ReliefLedger as Program<ReliefLedger>;

  const voucherId = "test-voucher-001";
  const orgId = "test-org-001";
  const vendorId = "test-vendor-001";

  const voucherIdHash = Array.from(sha256(voucherId));
  const orgIdHash = Array.from(sha256(orgId));
  const vendorHash = Array.from(sha256(vendorId));

  let voucherPDA: anchor.web3.PublicKey;
  let voucherBump: number;

  before(async () => {
    [voucherPDA, voucherBump] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("voucher"), Buffer.from(voucherIdHash)],
      program.programId
    );
  });

  it("issues a voucher", async () => {
    await program.methods
      .issueVoucher(voucherIdHash, orgIdHash, 0, 500, 1)
      .accounts({
        voucherAccount: voucherPDA,
        authority: provider.wallet.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    const account = await program.account.voucherAccount.fetch(voucherPDA);
    assert.equal(account.status, 0, "status should be 0 (issued)");
    assert.equal(account.valueCents, 500);
    assert.equal(account.categoryCode, 0);
    assert.deepEqual(Array.from(account.voucherIdHash), voucherIdHash);
  });

  it("redeems an issued voucher", async () => {
    await program.methods
      .redeemVoucher(voucherIdHash, vendorHash)
      .accounts({
        voucherAccount: voucherPDA,
        authority: provider.wallet.publicKey,
      })
      .rpc();

    const account = await program.account.voucherAccount.fetch(voucherPDA);
    assert.equal(account.status, 1, "status should be 1 (redeemed)");
    assert.notEqual(account.redeemedAt.toNumber(), 0);
    assert.deepEqual(Array.from(account.vendorHash), vendorHash);
  });

  it("rejects double-redeem with AlreadyRedeemed error", async () => {
    try {
      await program.methods
        .redeemVoucher(voucherIdHash, vendorHash)
        .accounts({
          voucherAccount: voucherPDA,
          authority: provider.wallet.publicKey,
        })
        .rpc();
      assert.fail("Expected AlreadyRedeemed error");
    } catch (err: any) {
      assert.include(err.message, "AlreadyRedeemed");
    }
  });

  it("rejects invalid category code", async () => {
    const badId = "test-voucher-bad-category";
    const badHash = Array.from(sha256(badId));
    const [badPDA] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("voucher"), Buffer.from(badHash)],
      program.programId
    );

    try {
      await program.methods
        .issueVoucher(badHash, orgIdHash, 99, 100, 1)
        .accounts({
          voucherAccount: badPDA,
          authority: provider.wallet.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();
      assert.fail("Expected InvalidCategory error");
    } catch (err: any) {
      assert.include(err.message, "InvalidCategory");
    }
  });
});
