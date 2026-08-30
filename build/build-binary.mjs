#!/usr/bin/env node
/*
 * Build a single-file executable from js/discover.mjs using Node's Single Executable
 * Application support. Produces dist/agentic-discovery (plus .exe on Windows).
 *
 *   node build/build-binary.mjs
 *
 * The binary embeds the Node runtime, so it is large (~110 MB) and platform-specific:
 * this script builds ONLY for the platform it runs on. Release binaries for every OS
 * come from CI running this script on each runner.
 *
 * IMPORTANT: the output is unsigned. Ship it only after signing/notarizing under the
 * 1Password/Apono certificates -- an unsigned binary triggers Gatekeeper and SmartScreen
 * warnings, and training users to click through those defeats the point of the tool.
 */
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const work = path.join(root, "build", ".work");
const dist = path.join(root, "dist");
const isWin = process.platform === "win32";
const exeName = "agentic-discovery" + (isWin ? ".exe" : "");

fs.rmSync(work, { recursive: true, force: true });
fs.mkdirSync(work, { recursive: true });
fs.mkdirSync(dist, { recursive: true });

// 1. Bundle: the source is dependency-free ESM, so a mechanical ESM->CJS transform is
//    enough. rules.json is inlined so the executable stays a single file.
const src = fs.readFileSync(path.join(root, "js", "discover.mjs"), "utf-8");
const rules = fs.readFileSync(path.join(root, "js", "rules.json"), "utf-8");
const bundle = src
  .replace(/^import\s+(\w+)\s+from\s+"([^"]+)";$/gm, 'const $1 = require("$2");')
  .replace(
    /const R = JSON\.parse\(fs\.readFileSync\(new URL\("\.\/rules\.json", import\.meta\.url\), "utf-8"\)\);/,
    `const R = ${rules};`
  );
if (bundle.includes("import.meta") || /^import\s/m.test(bundle))
  throw new Error("bundle still contains ESM syntax -- update the transform in build-binary.mjs");
fs.writeFileSync(path.join(work, "bundle.js"), bundle);

// 2. Generate the SEA blob
fs.writeFileSync(path.join(work, "sea-config.json"), JSON.stringify({
  main: "bundle.js", output: "sea-prep.blob", disableExperimentalSEAWarning: true,
}, null, 2));
execFileSync(process.execPath, ["--experimental-sea-config", "sea-config.json"],
             { cwd: work, stdio: "inherit" });

// 3. Copy the Node binary and inject the blob
const out = path.join(dist, exeName);
fs.copyFileSync(process.execPath, out);
fs.chmodSync(out, 0o755);
if (process.platform === "darwin") {
  try { execFileSync("codesign", ["--remove-signature", out]); } catch { /* unsigned already */ }
}
execFileSync("npx", ["--yes", "postject", out, "NODE_SEA_BLOB",
                     path.join(work, "sea-prep.blob"),
                     "--sentinel-fuse", "NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2",
                     ...(process.platform === "darwin" ? ["--macho-segment-name", "NODE_SEA"] : [])],
             { stdio: "inherit" });
if (process.platform === "darwin") {
  execFileSync("codesign", ["--sign", "-", out]);   // ad-hoc; replace with a real identity
}

fs.rmSync(work, { recursive: true, force: true });
const mb = (fs.statSync(out).size / 1024 / 1024).toFixed(0);
console.log(`\nBuilt ${out} (${mb} MB, ${process.platform}-${os.arch()}, UNSIGNED)`);
console.log("Sign before distribution. Verify with: " + out + " --help");
