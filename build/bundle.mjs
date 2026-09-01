#!/usr/bin/env node
/*
 * Produce agentic-discovery.cjs: the scanner as one self-contained CommonJS file with
 * rules.json inlined, so it can be fetched and run in a single command without npm.
 *
 *   node build/bundle.mjs
 *
 * The output is committed, because the whole point is that a URL serves a runnable file.
 * Regenerate it in the same commit as any change to js/discover.mjs or js/rules.json --
 * CI should fail if the committed bundle differs from a fresh build.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const src = fs.readFileSync(path.join(root, "js", "discover.mjs"), "utf-8");
const rules = fs.readFileSync(path.join(root, "js", "rules.json"), "utf-8");

const out = src
  .replace(/^#!.*\n/, "")                        // the header below supplies the shebang
  .replace(/^import\s+(\w+)\s+from\s+"([^"]+)";$/gm, 'const $1 = require("$2");')
  .replace(
    /const R = JSON\.parse\(fs\.readFileSync\(new URL\("\.\/rules\.json", import\.meta\.url\), "utf-8"\)\);/,
    `const R = ${rules};`
  );

if (/^import\s/m.test(out) || out.includes("import.meta"))
  throw new Error("bundle still contains ESM syntax -- update the transform in build/bundle.mjs");

const header = `#!/usr/bin/env node\n/* GENERATED FILE -- do not edit. Built from js/discover.mjs + js/rules.json\n   by build/bundle.mjs. Edit those and rebuild. */\n`;
const dest = path.join(root, "agentic-discovery.cjs");
fs.writeFileSync(dest, header + out);
fs.chmodSync(dest, 0o755);
console.log(`wrote ${path.relative(root, dest)} (${Math.round(fs.statSync(dest).size / 1024)} KB)`);
