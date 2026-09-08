import { readFileSync, readdirSync } from "node:fs";

const entries = [
  {
    id: "banishing-smite",
    version: 1,
    sourceFile: "banishing-smite.js",
    modulePath: "scripts/spells/banishing-smite.js",
  },
  {
    id: "harm",
    version: 1,
    sourceFile: "harm.js",
    modulePath: "scripts/spells/harm.js",
  },
];

const ids = entries.map(entry => entry.id);
const duplicateIds = ids.filter((id, index) => ids.indexOf(id) !== index);
if (duplicateIds.length > 0) {
  throw new Error(
    `Duplicate per-spell script registry ids: ${[...new Set(duplicateIds)].join(", ")}`,
  );
}

const registeredFiles = entries.map(entry => entry.sourceFile).sort();
const sourceFiles = readdirSync(new URL('./spells/', import.meta.url)).flatMap(id =>
  readdirSync(new URL(`./spells/${id}/`, import.meta.url)).filter(file => file === 'script.js').map(() => `${id}.js`)
).sort();
if (JSON.stringify(registeredFiles) !== JSON.stringify(sourceFiles)) {
  throw new Error(
    `Per-spell script registry/files mismatch: registered=${registeredFiles.join(", ")} `
    + `files=${sourceFiles.join(", ")}`,
  );
}

for (const entry of entries) {
  const source = readFileSync(new URL(`./spells/${entry.id}/script.js`, import.meta.url), "utf8");
  if (/\bHooks\s*\./u.test(source)) {
    throw new Error(`${entry.id} per-spell script must not access Foundry hooks`);
  }
  if (
    /\b(?:game|canvas|ui|MidiQOL|socketlib|fromUuid|fromUuidSync)\s*(?:\.|\()/u
      .test(source)
  ) {
    throw new Error(
      `${entry.id} per-spell script must use dispatcher context/services instead of Foundry globals`,
    );
  }
}

export const perSpellScriptRegistry = Object.freeze(Object.fromEntries(
  entries.map(entry => [entry.id, Object.freeze({ ...entry })]),
));

// Published script artifacts retain their original CRLF bytes on every build host.
// Editable source uses LF; both public and internal packagers call this function.
export function readPerSpellScriptSource(id) {
  if (!Object.hasOwn(perSpellScriptRegistry, id)) throw new Error(`Unknown per-spell script ${id}`);
  const entry = perSpellScriptRegistry[id];
  return readFileSync(new URL(`./spells/${entry.id}/script.js`, import.meta.url), "utf8").replace(/\r?\n/g, "\r\n");
}

export function assertRegisteredPerSpellScript(definition) {
  const contract = definition?.script;
  if (!contract) return true;
  const entry = perSpellScriptRegistry[contract.id];
  if (!entry) {
    throw new Error(`${definition.id} per-spell script is not explicitly registered`);
  }
  if (
    entry.id !== definition.id
    || Number(entry.version) !== Number(contract.version)
    || entry.sourceFile !== `${definition.id}.js`
    || entry.modulePath !== `scripts/spells/${definition.id}.js`
  ) {
    throw new Error(`${definition.id} per-spell script registry contract does not match its spec`);
  }
  return true;
}
