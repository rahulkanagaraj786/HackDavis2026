use anchor_lang::prelude::*;

declare_id!("6Rsp9ftCT1DYRACKsNQTeevnQd6AeQZ7Cvj9Mq5QkETC");

#[program]
pub mod relief_ledger {
    use super::*;

    pub fn issue_voucher(
        ctx: Context<IssueVoucher>,
        voucher_id_hash: [u8; 32],
        org_id_hash: [u8; 32],
        category_code: u8,
        value_cents: u32,
        unit_count: u8,
    ) -> Result<()> {
        require!(category_code <= 3, ReliefLedgerError::InvalidCategory);

        let voucher = &mut ctx.accounts.voucher_account;
        voucher.voucher_id_hash = voucher_id_hash;
        voucher.org_id_hash = org_id_hash;
        voucher.category_code = category_code;
        voucher.value_cents = value_cents;
        voucher.unit_count = unit_count;
        voucher.status = 0; // issued
        voucher.issued_at = Clock::get()?.unix_timestamp;
        voucher.redeemed_at = 0;
        voucher.vendor_hash = [0u8; 32];
        voucher.bump = ctx.bumps.voucher_account;

        emit!(VoucherIssued {
            voucher_id_hash,
            org_id_hash,
            category_code,
            value_cents,
            issued_at: voucher.issued_at,
        });

        Ok(())
    }

    pub fn redeem_voucher(
        ctx: Context<RedeemVoucher>,
        voucher_id_hash: [u8; 32],
        vendor_hash: [u8; 32],
    ) -> Result<()> {
        let voucher = &mut ctx.accounts.voucher_account;

        require!(voucher.status == 0, ReliefLedgerError::AlreadyRedeemed);

        voucher.status = 1; // redeemed
        voucher.vendor_hash = vendor_hash;
        voucher.redeemed_at = Clock::get()?.unix_timestamp;

        emit!(VoucherRedeemed {
            voucher_id_hash,
            vendor_hash,
            redeemed_at: voucher.redeemed_at,
        });

        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(voucher_id_hash: [u8; 32])]
pub struct IssueVoucher<'info> {
    #[account(
        init,
        payer = authority,
        space = VoucherAccount::LEN,
        seeds = [b"voucher", voucher_id_hash.as_ref()],
        bump
    )]
    pub voucher_account: Account<'info, VoucherAccount>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(voucher_id_hash: [u8; 32])]
pub struct RedeemVoucher<'info> {
    #[account(
        mut,
        seeds = [b"voucher", voucher_id_hash.as_ref()],
        bump = voucher_account.bump
    )]
    pub voucher_account: Account<'info, VoucherAccount>,

    pub authority: Signer<'info>,
}

#[account]
pub struct VoucherAccount {
    pub voucher_id_hash: [u8; 32],
    pub org_id_hash: [u8; 32],
    pub category_code: u8,
    pub value_cents: u32,
    pub unit_count: u8,
    pub status: u8,         // 0 = issued, 1 = redeemed
    pub issued_at: i64,
    pub redeemed_at: i64,   // 0 if not redeemed
    pub vendor_hash: [u8; 32],
    pub bump: u8,
}

impl VoucherAccount {
    // 8 (discriminator) + 32 + 32 + 1 + 4 + 1 + 1 + 8 + 8 + 32 + 1
    pub const LEN: usize = 8 + 32 + 32 + 1 + 4 + 1 + 1 + 8 + 8 + 32 + 1;
}

#[event]
pub struct VoucherIssued {
    pub voucher_id_hash: [u8; 32],
    pub org_id_hash: [u8; 32],
    pub category_code: u8,
    pub value_cents: u32,
    pub issued_at: i64,
}

#[event]
pub struct VoucherRedeemed {
    pub voucher_id_hash: [u8; 32],
    pub vendor_hash: [u8; 32],
    pub redeemed_at: i64,
}

#[error_code]
pub enum ReliefLedgerError {
    #[msg("Voucher has already been redeemed")]
    AlreadyRedeemed,
    #[msg("Invalid category code — must be 0-3")]
    InvalidCategory,
}
