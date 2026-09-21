// Build compendium packs from docs/packs/*.json using the workspace pack builder.
// Run from the repository root:  node modules/arcane-assets/scripts/build_packs.mjs
import fs from "node:fs/promises";
import path from "node:path";
import {writeCompendium} from "@arcanedesk/foundry-pack-builder";

const moduleDir = path.resolve(import.meta.dirname, "..");
const docsDir = path.join(moduleDir, "docs", "packs");
const packsRoot = path.join(moduleDir, "packs");
const PACK_NAMES = ["portraits-doodles", "named-characters", "classical-portraits", "vil-faces"];

await fs.rm(packsRoot, {recursive: true, force: true});
for (const name of PACK_NAMES) {
  const docs = JSON.parse(await fs.readFile(path.join(docsDir, `${name}.json`), "utf8"));
  if (!Array.isArray(docs) || docs.length === 0) throw Error(`empty pack docs: ${name}`);
  await writeCompendium(path.join(packsRoot, name), "Actor", docs);
  console.log(`pack ${name}: ${docs.length} actors written`);
}
console.log("packs build done");
