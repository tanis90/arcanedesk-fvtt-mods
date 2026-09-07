/** Existing race document preparation using caller-owned content and identity bindings. */
export function createRaceTools({moduleId, uuidFor, innateSpellGrant, bindings: input}) {
  if (typeof moduleId !== 'string' || !moduleId || typeof uuidFor !== 'function' || typeof innateSpellGrant !== 'function' || !input || typeof input !== 'object') throw Error('Missing race preparation bindings');
  const bindings = JSON.parse(JSON.stringify(input));
  for (const key of ["aasimarRaceId","legacyRayId","legacyArmorId","kenderBook","kenderSourcePack","tieflingBook","revelationTitle","revelationHint","halfElfTitle","halfElfHint","halfElfSourcePattern","raceName","traitName","traitRequirement","grantTitle"]) if (typeof bindings[key] !== 'string' || !bindings[key]) throw Error('Missing race identity or label');
  if (!bindings.references || !bindings.identifierMap || !bindings.descriptions) throw Error('Missing race input tables');
  for (const key of ["kenderRaceId","halfElfRaceId","levistusTieflingRaceId","hellishResistanceTraitId","infernalLegacyTraitId","stygianLegacyTraitId","darkvisionTraitId","rayOfFrostSpellId","armorOfAgathysSpellId","darknessSpellId"]) if (typeof bindings.references[key] !== 'string' || !bindings.references[key]) throw Error('Missing race reference');
  for (const key of ['aasimarRevelationTraitIds','halfElfVariantTraitIds']) if (!Array.isArray(bindings.references[key]) || bindings.references[key].some(id => typeof id !== 'string' || !id)) throw Error('Invalid race choice list');
  for (const key of ['tiefling-levistus','stygian-legacy']) if (typeof bindings.descriptions[key] !== 'string' || !bindings.descriptions[key]) throw Error('Missing complete race description');
  const {kenderRaceId,aasimarRevelationTraitIds,halfElfRaceId,halfElfVariantTraitIds,levistusTieflingRaceId,hellishResistanceTraitId,infernalLegacyTraitId,stygianLegacyTraitId,darkvisionTraitId,rayOfFrostSpellId,armorOfAgathysSpellId,darknessSpellId} = bindings.references;
  const halfElfSourcePattern = new RegExp(bindings.halfElfSourcePattern, 'i');
  const clone = value => JSON.parse(JSON.stringify(value));
  function normalizeRaceIdentifier(doc) {
    const identifiers = bindings.identifierMap;
    if (identifiers[doc._id]) doc.system.identifier = identifiers[doc._id];
  }

  function normalizeKenderRace(doc) {
    if (doc._id !== kenderRaceId) return;
    doc.system.source = {
      ...(doc.system.source ?? {}),
      custom: bindings.kenderBook,
      book: bindings.kenderBook,
      rules: "2014",
      revision: 1,
    };
    doc.system.type = {
      ...(doc.system.type ?? {}),
      value: "humanoid",
      subtype: "kender",
    };
    doc.flags ??= {};
    doc.flags[moduleId] = {
      ...(doc.flags[moduleId] ?? {}),
      sourcePack: bindings.kenderSourcePack,
      sourceId: doc._id,
      book: bindings.kenderBook,
    };
  }

  function normalizeAasimarRace(doc) {
    if (doc._id !== bindings.aasimarRaceId) return;
    doc.system.type = {
      value: "humanoid",
      subtype: "aasimar",
      custom: "",
    };
    doc.system.advancement = (doc.system.advancement ?? []).map(adv => {
      const itemIds = (adv.configuration?.items ?? []).map(item => item.uuid?.split(".").pop());
      if (adv.type !== "ItemGrant" || itemIds.length !== 3 || !aasimarRevelationTraitIds.every(id => itemIds.includes(id))) {
        return adv;
      }
      return {
        _id: "arcAasimarRevelationChoice003",
        type: "ItemChoice",
        configuration: {
          choices: {
            3: { count: 1, replacement: false },
          },
          allowDrops: false,
          type: "feat",
          pool: aasimarRevelationTraitIds.map(id => ({ uuid: uuidFor("racialtraits", id) })),
          spell: null,
          restriction: {
            type: "race",
            subtype: "",
          },
        },
        value: { added: {}, replaced: {} },
        level: 3,
        title: bindings.revelationTitle,
        hint: bindings.revelationHint,
        icon: "icons/magic/holy/angel-wings-gray.webp",
      };
    });
  }

  function normalizePhbRace(doc) {
    if (doc._id === halfElfRaceId) {
      doc.system.advancement = (doc.system.advancement ?? []).map(adv => {
        if (adv.type !== "ItemChoice" || !halfElfSourcePattern.test(String(adv.title ?? ""))) return adv;
        const copy = clone(adv);
        copy.title = bindings.halfElfTitle;
        copy.hint = bindings.halfElfHint;
        copy.level = 0;
        copy.configuration = {
          ...(copy.configuration ?? {}),
          choices: { 0: { count: 1, replacement: false } },
          allowDrops: false,
          type: "feat",
          pool: halfElfVariantTraitIds.map(id => ({ uuid: uuidFor("racialtraits", id) })),
          spell: null,
          restriction: {
            type: "race",
            subtype: "half-elf",
          },
        };
        copy.value ??= { added: {}, replaced: {} };
        return copy;
      });
    }
  }

  function createLevistusTieflingRace(source) {
    const doc = clone(source);
    doc._id = levistusTieflingRaceId;
    doc.name = bindings.raceName;
    doc.system.identifier = "tiefling-levistus";
    doc.system.source = {
      ...(doc.system.source ?? {}),
      custom: bindings.tieflingBook,
      book: bindings.tieflingBook,
      rules: "2014",
      revision: 1,
    };
    doc.system.description ??= {};
    doc.system.description.value = bindings.descriptions["tiefling-levistus"];

    doc.system.advancement = (doc.system.advancement ?? []).map(adv => {
      const copy = clone(adv);
      if (copy.type === "AbilityScoreImprovement" && copy.level === 0) {
        copy.configuration.fixed = { str: 0, dex: 0, con: 1, int: 0, wis: 0, cha: 2 };
        return copy;
      }
      if (copy.type === "ItemGrant") {
        const itemIds = (copy.configuration?.items ?? []).map(item => item.uuid?.split(".").pop());
        if (itemIds.includes(hellishResistanceTraitId) && itemIds.includes(infernalLegacyTraitId)) {
          copy.configuration.items = [
            { uuid: uuidFor("racialtraits", hellishResistanceTraitId), optional: false },
            { uuid: uuidFor("racialtraits", stygianLegacyTraitId), optional: false },
            { uuid: uuidFor("racialtraits", darkvisionTraitId), optional: false },
          ];
          copy.configuration.optional = false;
          return copy;
        }
        if (itemIds.includes(rayOfFrostSpellId) || itemIds.includes(bindings.legacyRayId)) {
          return innateSpellGrant({
            id: "arcLevRayFrost01",
            level: 0,
            title: bindings.grantTitle,
            spellId: rayOfFrostSpellId,
          });
        }
        if (itemIds.some(id => id === bindings.legacyArmorId)) {
          return innateSpellGrant({
            id: "arcLevArmorAga03",
            level: 3,
            title: bindings.grantTitle,
            spellId: armorOfAgathysSpellId,
            usesMax: "1",
            usesPer: "lr",
          });
        }
        if (itemIds.includes(darknessSpellId)) {
          return innateSpellGrant({
            id: "arcLevDarkness05",
            level: 5,
            title: bindings.grantTitle,
            spellId: darknessSpellId,
            usesMax: "1",
            usesPer: "lr",
          });
        }
      }
      return copy;
    });

    return doc;
  }

  function createStygianLegacyTrait(source) {
    const doc = clone(source);
    doc._id = stygianLegacyTraitId;
    doc.name = bindings.traitName;
    doc.img = "icons/magic/water/projectile-icecicle-glowing.webp";
    doc.system.identifier = "stygian-legacy";
    doc.system.requirements = bindings.traitRequirement;
    doc.system.source = {
      ...(doc.system.source ?? {}),
      custom: bindings.tieflingBook,
      book: bindings.tieflingBook,
      rules: "2014",
      revision: 1,
    };
    doc.system.description ??= {};
    doc.system.description.value = bindings.descriptions["stygian-legacy"];
    return doc;
  }

  function normalizeRaceAutomation(doc) {
    normalizeRaceIdentifier(doc);
    normalizeAasimarRace(doc);
    normalizePhbRace(doc);
    normalizeKenderRace(doc);
  }

  return Object.freeze({normalizeRaceIdentifier,normalizeKenderRace,normalizeAasimarRace,normalizePhbRace,createLevistusTieflingRace,createStygianLegacyTrait,normalizeRaceAutomation});
}
