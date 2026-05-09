/**
 * Hardcoded demo admin sessions — replaces Supabase Auth for the hackathon.
 * Org identity is stored in a cookie. No login flow, no magic links.
 */

export const DEMO_ORGS = [
  {
    id: "11111111-1111-1111-1111-111111111111",
    name: "Aggie Pantry",
    logo_url: "/logos/aggie-pantry.svg",
    color: "green",
    signer_pubkey: "AggiePantrySeed111111111111111111111111111",
    cookieValue: "aggie-pantry",
  },
  {
    id: "22222222-2222-2222-2222-222222222222",
    name: "Yolo Food Bank",
    logo_url: "/logos/yolo-food-bank.svg",
    color: "orange",
    signer_pubkey: "YoloFoodBankSeed2222222222222222222222222",
    cookieValue: "yolo-food-bank",
  },
] as const;

export type DemoOrg = (typeof DEMO_ORGS)[number];

export function getOrgByCookie(cookieValue: string | undefined): DemoOrg {
  return DEMO_ORGS.find((o) => o.cookieValue === cookieValue) ?? DEMO_ORGS[0];
}

export function getOrgById(id: string): DemoOrg | undefined {
  return DEMO_ORGS.find((o) => o.id === id);
}
