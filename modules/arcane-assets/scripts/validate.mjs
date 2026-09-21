// Sanity checks for the arcane-assets module: run from the repo root after build.
//   node modules/arcane-assets/scripts/validate.mjs
import fs from "node:fs/promises";
import path from "node:path";

const moduleDir = path.resolve(import.meta.dirname, "..");
const problems = [];

const manifest = JSON.parse(await fs.readFile(path.join(moduleDir, "module.json"), "utf8"));
if (manifest.id !== "arcane-assets") problems.push("manifest id mismatch");
if (!/^\d+\.\d+\.\d+$/.test(manifest.version)) problems.push("manifest version not semver");

const index = JSON.parse(await fs.readFile(path.join(moduleDir, "index.json"), "utf8"));
if (!Array.isArray(index) || index.length < 4000) problems.push(`index.json suspicious size: ${index.length}`);
const ids = new Set(index.map((r) => r.id));
if (ids.size !== index.length) problems.push("duplicate ids in index.json");
const enumSets = {
  type: new Set(["portrait", "token", "icon", "illustration"]),
  style: new Set(["doodle", "painted", "flat-icon", "classical", "dark"]),
  shape: new Set(["square", "circle"]),
  bg: new Set(["transparent", "solid"]),
  license: new Set(["PD", "CC0", "CC-BY-3.0", "custom-vil"]),
};
let missingFiles = 0;
for (const r of index) {
  for (const [k, allowed] of Object.entries(enumSets)) {
    if (!allowed.has(r[k])) { problems.push(`${r.id}: bad ${k}=${r[k]}`); break; }
  }
  if (r.license !== "PD" && r.license !== "CC0" && !r.attribution) problems.push(`${r.id}: attribution required for ${r.license}`);
}
// sample file existence (full check below)
for (const r of index) {
  try { await fs.access(path.join(moduleDir, r.file)); }
  catch { missingFiles++; if (missingFiles <= 3) problems.push(`missing file: ${r.file}`); }
}
if (missingFiles) problems.push(`total missing files: ${missingFiles}`);

for (const pack of manifest.packs) {
  const packDir = path.join(moduleDir, pack.path);
  try { const st = await fs.stat(packDir); if (!st.isDirectory()) throw 0; }
  catch { problems.push(`pack dir missing: ${pack.path}`); }
  const docPath = path.join(moduleDir, "docs", "packs", `${pack.name}.json`);
  try { const docs = JSON.parse(await fs.readFile(docPath, "utf8")); if (docs.length < 10) problems.push(`pack docs thin: ${pack.name}`); }
  catch { problems.push(`pack docs missing: ${pack.name}`); }
}

if (problems.length) {
  console.error(`arcane-assets validate FAILED (${problems.length}):`);
  for (const p of problems.slice(0, 20)) console.error(" -", p);
  process.exit(1);
}
console.log(`arcane-assets validate OK: ${index.length} index records, ${manifest.packs.length} packs`);
