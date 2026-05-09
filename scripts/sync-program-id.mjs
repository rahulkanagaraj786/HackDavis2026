import fs from "node:fs";
import path from "node:path";
import { PublicKey } from "@solana/web3.js";

const nextProgramId = process.argv[2] || process.env.NEXT_PUBLIC_PROGRAM_ID || process.env.PROGRAM_ID;

if (!nextProgramId) {
  console.error("Usage: npm run sync:program-id -- <PROGRAM_ID>");
  process.exit(1);
}

try {
  new PublicKey(nextProgramId);
} catch {
  console.error("Provided program ID is not a valid Solana public key.");
  process.exit(1);
}

const root = process.cwd();

const replacements = [
  {
    file: path.join(root, "programs/relief-ledger/src/lib.rs"),
    search: /declare_id!\("([^"]+)"\);/,
    replace: `declare_id!("${nextProgramId}");`,
  },
  {
    file: path.join(root, "Anchor.toml"),
    search: /(relief_ledger = ")([^"]+)(")/,
    replace: `$1${nextProgramId}$3`,
  },
  {
    file: path.join(root, "Anchor.toml"),
    search: /(address = ")([^"]+)(")/,
    replace: `$1${nextProgramId}$3`,
  },
  {
    file: path.join(root, ".env.local.example"),
    search: /(NEXT_PUBLIC_PROGRAM_ID=)(.+)/,
    replace: `$1${nextProgramId}`,
  },
];

const optionalFiles = [
  {
    file: path.join(root, ".env.local"),
    search: /(NEXT_PUBLIC_PROGRAM_ID=)(.+)/,
    replace: `$1${nextProgramId}`,
  },
];

for (const { file, search, replace } of replacements) {
  const current = fs.readFileSync(file, "utf8");
  if (!search.test(current)) {
    console.error(`Failed to find replacement target in ${path.relative(root, file)}.`);
    process.exit(1);
  }
  const updated = current.replace(search, replace);
  fs.writeFileSync(file, updated);
  console.log(`Updated ${path.relative(root, file)}`);
}

for (const { file, search, replace } of optionalFiles) {
  if (!fs.existsSync(file)) continue;
  const current = fs.readFileSync(file, "utf8");
  const updated = search.test(current)
    ? current.replace(search, replace)
    : `${current.trimEnd()}\nNEXT_PUBLIC_PROGRAM_ID=${nextProgramId}\n`;
  fs.writeFileSync(file, updated);
  console.log(`Updated ${path.relative(root, file)}`);
}

console.log(`Program ID synced to ${nextProgramId}`);
