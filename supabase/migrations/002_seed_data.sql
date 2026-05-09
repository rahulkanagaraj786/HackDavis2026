-- Seed data: 2 orgs, 2 vendors, 6 vouchers (3 issued, 2 redeemed, 1 expired)
-- IDs match the hardcoded demo-session.ts values

-- Orgs
insert into orgs (id, name, logo_url, signer_pubkey) values
  ('11111111-1111-1111-1111-111111111111', 'Aggie Pantry', '/logos/aggie-pantry.svg', 'AggiePantrySeed111111111111111111111111111'),
  ('22222222-2222-2222-2222-222222222222', 'Yolo Food Bank', '/logos/yolo-food-bank.svg', 'YoloFoodBankSeed2222222222222222222222222')
on conflict (id) do nothing;

-- Vendors
insert into vendors (id, name, category, pending_payout_cents) values
  ('aaaa0000-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Davis Community Meals', 'meals', 850),
  ('bbbb0000-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Unitrans', 'transit', 200)
on conflict (id) do nothing;

-- 6 Vouchers
insert into vouchers (id, voucher_hash, org_id, category, value_cents, unit_count, status, claim_token, expires_at, redeemed_by_vendor_id, redeemed_at, on_chain_issue_sig, on_chain_redeem_sig, alias) values
  -- 3 issued (unredeemed)
  (
    'cccc0001-cccc-cccc-cccc-cccccccccc01',
    'hash_issued_1',
    '11111111-1111-1111-1111-111111111111',
    'meals', 500, 1, 'issued',
    'tok_issued_001',
    now() + interval '7 days',
    null, null,
    '5mockIssueAggieMeals001xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    null, 'Anonymous Neighbor'
  ),
  (
    'cccc0002-cccc-cccc-cccc-cccccccccc02',
    'hash_issued_2',
    '11111111-1111-1111-1111-111111111111',
    'laundry', 350, 2, 'issued',
    'tok_issued_002',
    now() + interval '14 days',
    null, null,
    '5mockIssueAggieLaundry02xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    null, null
  ),
  (
    'cccc0003-cccc-cccc-cccc-cccccccccc03',
    'hash_issued_3',
    '22222222-2222-2222-2222-222222222222',
    'transit', 200, 3, 'issued',
    'tok_issued_003',
    now() + interval '3 days',
    null, null,
    '5mockIssueYoloTransit003xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    null, null
  ),
  -- 2 redeemed (cross-org × cross-vendor for impact dashboard stat)
  (
    'cccc0004-cccc-cccc-cccc-cccccccccc04',
    'hash_redeemed_4',
    '11111111-1111-1111-1111-111111111111',
    'meals', 500, 1, 'redeemed',
    'tok_redeemed_004',
    now() + interval '7 days',
    'aaaa0000-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    now() - interval '1 hour',
    '5mockIssueAggieMeals004xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    '5mockRedeemDCM004xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    'River'
  ),
  (
    'cccc0005-cccc-cccc-cccc-cccccccccc05',
    'hash_redeemed_5',
    '22222222-2222-2222-2222-222222222222',
    'transit', 200, 1, 'redeemed',
    'tok_redeemed_005',
    now() + interval '7 days',
    'bbbb0000-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    now() - interval '30 minutes',
    '5mockIssueYoloTransit005xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    '5mockRedeemUnitrans005xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    null
  ),
  -- 1 expired
  (
    'cccc0006-cccc-cccc-cccc-cccccccccc06',
    'hash_expired_6',
    '11111111-1111-1111-1111-111111111111',
    'hygiene', 300, 1, 'expired',
    'tok_expired_006',
    now() - interval '2 days',
    null, null,
    '5mockIssueAggieHygiene06xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    null, null
  )
on conflict (id) do nothing;

-- Audit log for seeded vouchers
insert into audit_log (voucher_id, event_type, metadata) values
  ('cccc0001-cccc-cccc-cccc-cccccccccc01', 'issued', '{"source": "seed"}'),
  ('cccc0002-cccc-cccc-cccc-cccccccccc02', 'issued', '{"source": "seed"}'),
  ('cccc0003-cccc-cccc-cccc-cccccccccc03', 'issued', '{"source": "seed"}'),
  ('cccc0004-cccc-cccc-cccc-cccccccccc04', 'issued', '{"source": "seed"}'),
  ('cccc0004-cccc-cccc-cccc-cccccccccc04', 'redeemed', '{"vendor_id": "aaaa0000-aaaa-aaaa-aaaa-aaaaaaaaaaaa", "source": "seed"}'),
  ('cccc0005-cccc-cccc-cccc-cccccccccc05', 'issued', '{"source": "seed"}'),
  ('cccc0005-cccc-cccc-cccc-cccccccccc05', 'redeemed', '{"vendor_id": "bbbb0000-bbbb-bbbb-bbbb-bbbbbbbbbbbb", "source": "seed"}'),
  ('cccc0006-cccc-cccc-cccc-cccccccccc06', 'issued', '{"source": "seed"}');
