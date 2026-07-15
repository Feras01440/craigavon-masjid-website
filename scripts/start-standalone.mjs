// Start the production standalone server that deployment actually uses.
//
// `next build` with `output: "standalone"` emits `.next/standalone/server.js`,
// which deliberately excludes `public/` and `.next/static/` (a host is expected
// to serve or stage them). `next start` refuses this output mode, so browser
// checks that ran through it were silently testing a fallback server rather
// than the deployable artifact. This script stages the assets exactly as the
// deployment does, loads `.env.local` for parity with `next dev`/`next start`,
// and boots the standalone server on a loopback address.
//
// Usage: node scripts/start-standalone.mjs   (after `pnpm build`)

import { cpSync, existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const root = process.cwd();
const standaloneDir = path.join(root, ".next", "standalone");
const serverEntry = path.join(standaloneDir, "server.js");

if (!existsSync(serverEntry)) {
  console.error(
    "No standalone build found at .next/standalone/server.js — run `pnpm build` first.",
  );
  process.exit(1);
}

// Load .env.local the way Next.js dev/start do, without overriding variables
// that the caller has already set explicitly.
const envFile = path.join(root, ".env.local");
if (existsSync(envFile)) {
  for (const line of readFileSync(envFile, "utf8").split(/\r?\n/)) {
    const match = /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/.exec(line);
    if (!match) continue;
    const [, key, rawValue] = match;
    if (process.env[key] !== undefined) continue;
    let value = rawValue;
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

// Stage the assets the standalone output expects a host to provide.
const staticSource = path.join(root, ".next", "static");
if (existsSync(staticSource)) {
  cpSync(staticSource, path.join(standaloneDir, ".next", "static"), {
    recursive: true,
    force: true,
  });
}
const publicSource = path.join(root, "public");
if (existsSync(publicSource)) {
  cpSync(publicSource, path.join(standaloneDir, "public"), { recursive: true, force: true });
}

process.env.HOSTNAME = process.env.HOSTNAME ?? "127.0.0.1";
process.env.PORT = process.env.PORT ?? "3000";
process.chdir(standaloneDir);

await import(pathToFileURL(serverEntry).href);
