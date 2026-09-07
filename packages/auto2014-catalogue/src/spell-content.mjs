/** Prepare caller-supplied spell text, identities and class lists without loading content. */
export function createSpellContentTools({moduleId, actorStudioModuleId, maxPreparedSpellLevel, supportedSpellcastingClasses: classes, actorStudioSubclassSpellLists: subclasses, arcaneOwnedSpellDescriptionIds: ownedIds}) {
  if (![moduleId, actorStudioModuleId].every(value => typeof value === 'string' && value)) throw Error('Missing spell content namespace');
  if (!Number.isInteger(maxPreparedSpellLevel) || maxPreparedSpellLevel < 0 || maxPreparedSpellLevel > 9) throw Error('Invalid prepared spell level');
  if (!Array.isArray(classes) || !Array.isArray(ownedIds) || [...classes, ...ownedIds].some(value => typeof value !== 'string' || !value)) throw Error('Invalid spell content identities');
  if (!subclasses || typeof subclasses !== 'object' || Array.isArray(subclasses)) throw Error('Invalid subclass spell lists');
  const supportedSpellcastingClasses = new Set(classes);
  const arcaneOwnedSpellDescriptionIds = new Set(ownedIds);
  const actorStudioSubclassSpellLists = JSON.parse(JSON.stringify(subclasses));
  for (const entry of Object.values(actorStudioSubclassSpellLists)) {
    if (!entry || !Number.isInteger(entry.level) || !Array.isArray(entry.lists) || entry.lists.some(value => typeof value !== 'string' || !value)) throw Error('Invalid subclass spell list entry');
  }
  function idsFromUuidList(uuids) {
    return (uuids ?? []).map(uuid => uuid?.split(".").pop()).filter(Boolean);
  }

  function spellAliasKeys(doc) {
    return [doc?._id, doc?.system?.identifier, doc?.identifier]
      .filter(value => typeof value === "string" && value.length)
      .map(value => value.toLowerCase());
  }

  function addClassAssignment(assignments, key, identifier) {
    if (!key) return;
    const normalizedKey = key.toLowerCase();
    const classes = assignments.get(normalizedKey) ?? new Set();
    classes.add(identifier);
    assignments.set(normalizedKey, classes);
  }

  function addSpellListAssignments(assignments, spellId, identifier, spellsById) {
    const source = spellsById.get(spellId);
    addClassAssignment(assignments, spellId, identifier);
    for (const key of spellAliasKeys(source)) addClassAssignment(assignments, key, identifier);
  }

  function officialSpellIdentifierMap(officialSpells) {
    const spells = new Map();
    for (const spell of officialSpells) {
      const identifier = spell.system?.identifier;
      if (!identifier) continue;
      spells.set(identifier, spell);
    }
    return spells;
  }

  function officialSpellIdRemaps(spellsRaw, officialSpellsByIdentifier) {
    const remaps = new Map();
    for (const spell of spellsRaw) {
      const identifier = spell.system?.identifier;
      if (!identifier) continue;
      const official = officialSpellsByIdentifier.get(identifier);
      const level = Number(official?.system?.level);
      if (!official || !Number.isFinite(level) || level > maxPreparedSpellLevel) continue;
      if (spell._id !== official._id) remaps.set(spell._id, official._id);
    }
    return remaps;
  }

  function preferredSpellId(id, spellIdRemaps) {
    return spellIdRemaps.get(id) ?? id;
  }

  function addReferencedSpellId(spellIds, id, spellIdRemaps) {
    if (id) spellIds.add(preferredSpellId(id, spellIdRemaps));
  }

  function remapSpellReferences(value, spellIdRemaps) {
    if (!spellIdRemaps.size) return value;
    if (typeof value === "string") {
      let next = value;
      for (const [from, to] of spellIdRemaps) next = next.replaceAll(from, to);
      return next;
    }
    if (Array.isArray(value)) return value.map(child => remapSpellReferences(child, spellIdRemaps));
    if (!value || typeof value !== "object") return value;
    for (const [key, child] of Object.entries(value)) value[key] = remapSpellReferences(child, spellIdRemaps);
    return value;
  }

  function extractClassSpellLists(spellTableDocs, spellsById) {
    const lists = new Map();
    const assignments = new Map();
    for (const doc of spellTableDocs) {
      const identifier = doc.system?.identifier;
      if (doc.type !== "spells" || !supportedSpellcastingClasses.has(identifier)) continue;

      const ids = new Set();
      for (const spellId of idsFromUuidList(doc.system?.spells)) {
        const spell = spellsById.get(spellId);
        const level = Number(spell?.system?.level);
        if (!Number.isFinite(level) || level > maxPreparedSpellLevel) continue;
        ids.add(spellId);
        addSpellListAssignments(assignments, spellId, identifier, spellsById);
      }
      lists.set(identifier, ids);
    }
    return { lists, assignments };
  }

  function classAssignmentsForSpell(doc, assignments) {
    const classes = new Set();
    for (const key of spellAliasKeys(doc)) {
      for (const identifier of assignments.get(key) ?? []) classes.add(identifier);
    }
    return [...classes].sort();
  }

  function annotateActorStudioSpellClasses(doc, assignments) {
    const classes = classAssignmentsForSpell(doc, assignments);
    const value = classes.length ? classes.join(", ") : "arcane-hidden";
    doc.system ??= {};
    doc.system.classes = {
      ...(doc.system.classes ?? {}),
      value,
    };
    doc.flags ??= {};
    doc.flags[moduleId] ??= {};
    doc.flags[moduleId].spellClasses = classes;
  }

  function normalizeText(value) {
    return String(value ?? "").replace(/\s+/g, " ").trim();
  }

  function bilingualName(chineseName, englishName) {
    const zh = normalizeText(chineseName);
    const en = normalizeText(englishName);
    if (!zh) return en;
    if (!en || zh === en || zh.includes(en)) return zh;
    // Imported names may join Chinese and English without a separating space.
    // When the translation table supplies a clean Chinese name, strip any leading CJK
    // run from the donor name so the rebuilt form is "中文 English Name" with a space.
    if (en.includes(zh) || /^[\u4e00-\u9fff·]/.test(en)) {
      const strippedEn = en.replace(/^[\u4e00-\u9fff·]+/, "").trim();
      return strippedEn ? `${zh} ${strippedEn}` : zh;
    }
    return `${zh} ${en}`;
  }

  function bilingualDescription(chineseDescription, englishDescription) {
    const zh = normalizeText(chineseDescription);
    const en = normalizeText(englishDescription);
    if (!zh) return englishDescription ?? "";
    if (!en || zh === en) return chineseDescription;
    return `${chineseDescription}\n<hr />\n<h4>English</h4>\n${englishDescription}`;
  }

  function applyBilingualSpellText(doc, spellTranslations) {
    if (doc.type !== "spell") return;
    const translation = spellTranslations.get(doc._id);
    if (!translation) return;

    doc.name = bilingualName(translation.name, doc.name);
    const translatedDescription = translation.description;
    const englishDescription = doc.system?.description?.value;
    if (translatedDescription && englishDescription) {
      doc.system ??= {};
      doc.system.description ??= {};
      doc.system.description.value = arcaneOwnedSpellDescriptionIds.has(doc._id)
        ? translatedDescription
        : bilingualDescription(translatedDescription, englishDescription);
    }
  }

  function annotateClassSpellList(doc) {
    const identifier = doc.system?.identifier;
    if (!supportedSpellcastingClasses.has(identifier)) return;
    doc.flags ??= {};
    doc.flags[actorStudioModuleId] ??= {};
    doc.flags[actorStudioModuleId].spellLists = [identifier];
  }

  function annotateSubclassSpellList(doc) {
    const identifier = doc.system?.identifier;
    const spellLists = actorStudioSubclassSpellLists[identifier];
    if (!spellLists) return;
    doc.flags ??= {};
    doc.flags[actorStudioModuleId] ??= {};
    doc.flags[actorStudioModuleId].spellLists = {
      level: spellLists.level,
      lists: [...spellLists.lists],
    };
  }

  return Object.freeze({idsFromUuidList, spellAliasKeys, addClassAssignment, addSpellListAssignments, officialSpellIdentifierMap, officialSpellIdRemaps, preferredSpellId, addReferencedSpellId, remapSpellReferences, extractClassSpellLists, classAssignmentsForSpell, annotateActorStudioSpellClasses, normalizeText, bilingualName, bilingualDescription, applyBilingualSpellText, annotateClassSpellList, annotateSubclassSpellList});
}
