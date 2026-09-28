/** Browser-safe source selection. No source document is changed or executed.
 * sourceRuleset must come from a verified pack adapter or explicit user choice;
 * it is never inferred from a display name or a DDB "legacy" flag.
 * identities maps source document IDs to reviewed catalogue IDs.
 */
export function previewSpellSources({documents, catalogue, sourceRuleset, identities = {}, ddbIdentities = {}}) {
  if (!Array.isArray(documents) || !Array.isArray(catalogue)) {
    throw new TypeError("documents and catalogue must be arrays");
  }
  const definitions = new Map();
  for (const entry of catalogue) {
    if (!entry?.id || definitions.has(entry.id) || !Number.isInteger(entry.level)
      || entry.level < 1 || entry.level > 6) {
      throw new Error("Invalid or duplicate spell catalogue entry");
    }
    definitions.set(entry.id, entry);
  }
  const rows = documents.map((document, index) => {
    const sourceId = document?._id;
    const row = {index, sourceId: sourceId ?? null, name: document?.name ?? ""};
    const reject = reason => ({...row, status: "rejected", reason});
    if (typeof sourceId !== "string" || !sourceId) return reject("missing-source-id");
    if (document.type !== "spell") return reject("not-a-spell");
    const imported = document.flags?.ddbimporter;
    const flag2014 = imported?.is2014, flag2024 = imported?.is2024;
    if ([flag2014, flag2024].some(value => value !== undefined && typeof value !== 'boolean')
      || (flag2014 !== undefined && flag2024 !== undefined && flag2014 === flag2024)) return reject('conflicting-ddb-ruleset');
    const importedRules = flag2014 === true || flag2024 === false ? '2014'
      : flag2024 === true || flag2014 === false ? '2024' : undefined;
    const declaredRules = document.system?.source?.rules;
    if (declaredRules && importedRules && declaredRules !== importedRules) return reject('conflicting-ddb-ruleset');
    const rules = declaredRules || importedRules;
    if (rules && sourceRuleset && rules !== sourceRuleset) return reject("conflicting-ruleset");
    if ((rules || sourceRuleset) !== "2014") return reject("unsupported-or-unknown-ruleset");
    const identifier = document.system?.identifier;
    const sourceMapping = Object.hasOwn(identities, sourceId) ? identities[sourceId] : undefined;
    const definitionId = String(imported?.definitionId ?? '');
    const ddbMapping = /^[1-9][0-9]*$/.test(definitionId) && Object.hasOwn(ddbIdentities, definitionId)
      ? ddbIdentities[definitionId] : undefined;
    if (sourceMapping && ddbMapping && sourceMapping !== ddbMapping) return reject('conflicting-identity');
    const explicit = sourceMapping ?? ddbMapping;
    if (explicit && definitions.has(identifier) && explicit !== identifier) {
      return reject("conflicting-identity");
    }
    const id = explicit ?? identifier;
    const definition = definitions.get(id);
    if (!definition) return {...row, status: "unsupported", reason: "no-definition"};
    if (document.system?.level !== definition.level) return reject("conflicting-level");
    return {...row, id, status: "matched", matchedBy: sourceMapping ? 'explicit' : ddbMapping ? 'ddb-definition-id' : 'identifier',
      ...(imported ? {sourceKind: 'ddb-importer', definitionId: definitionId || null} : {})};
  });
  const sourceCounts = new Map();
  const matchedCounts = new Map();
  for (const row of rows) {
    if (row.sourceId) sourceCounts.set(row.sourceId, (sourceCounts.get(row.sourceId) ?? 0) + 1);
    if (row.status === "matched") matchedCounts.set(row.id, (matchedCounts.get(row.id) ?? 0) + 1);
  }
  for (const row of rows) {
    if (sourceCounts.get(row.sourceId) > 1) {
      row.status = "rejected";
      row.reason = "duplicate-source-id";
    } else if (row.status === "matched" && matchedCounts.get(row.id) > 1) {
      row.status = "rejected";
      row.reason = "ambiguous-spell";
    }
  }
  return {schemaVersion: 1, rows, counts: {
    matched: rows.filter(row => row.status === "matched").length,
    unsupported: rows.filter(row => row.status === "unsupported").length,
    rejected: rows.filter(row => row.status === "rejected").length,
  }};
}

/** Report literal references without fetching, executing or rewriting caller HTML.
 * This is a dependency inventory, not an HTML sanitizer or a link validity check.
 */
export function describePresentationDependencies(document) {
  const references = new Map();
  const add = (kind, value) => {if (value) references.set(`${kind}:${value}`, {kind, value});};
  add('image', document.img);
  for (const text of [document.system?.description?.value, document.system?.description?.chat]) {
    if (typeof text !== 'string') continue;
    for (const match of text.matchAll(/@(UUID|Compendium)\[([^\]]+)\]/g)) add(match[1].toLowerCase(), match[2]);
    for (const match of text.matchAll(/\b(src|href)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi)) {
      add(match[1].toLowerCase() === 'src' ? 'asset' : 'link', match[2] ?? match[3] ?? match[4]);
    }
  }
  return {verified: false, references: [...references.values()]};
}

/** Presentation whitelist only; source macros, activities and effects never pass. */
export function extractSpellPresentation(document) {
  const result = {};
  for (const key of ["name", "img"]) {
    if (document[key] !== undefined) result[key] = structuredClone(document[key]);
  }
  result.system = {};
  for (const key of ["description", "source"]) {
    if (document.system?.[key] !== undefined) result.system[key] = structuredClone(document.system[key]);
  }
  if (document.system?.materials?.value !== undefined) {
    result.system.materials = {value: structuredClone(document.system.materials.value)};
  }
  return result;
}
