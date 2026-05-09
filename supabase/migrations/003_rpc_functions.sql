-- RPC: atomically increment vendor pending payout
create or replace function increment_vendor_payout(p_vendor_id uuid, p_amount int)
returns void
language sql
security definer
as $$
  update vendors
  set pending_payout_cents = pending_payout_cents + p_amount
  where id = p_vendor_id;
$$;
