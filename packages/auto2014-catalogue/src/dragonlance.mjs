// Content and source identities are supplied by the caller.
export function createDragonlanceTools({moduleId, uuidFor, backgroundIdentifier, featIdentifier, collectDeferredBackgroundItems, abilityChoiceAdvancement, bindings: input}) {
  if (typeof moduleId !== "string" || !moduleId) throw new TypeError("Missing moduleId");
  for (const fn of [uuidFor, backgroundIdentifier, featIdentifier, collectDeferredBackgroundItems, abilityChoiceAdvancement]) {
    if (typeof fn !== "function") throw new TypeError("Missing Dragonlance helper");
  }
  const bindings = structuredClone(input);
  for (const key of ["book", "equipmentSourcePack", "backgroundTitle", "backgroundHint", "backgroundSourcePack", "campaignSupplement", "asiTitle", "featSourcePack", "featPackReference"]) {
    if (typeof bindings?.[key] !== "string" || !bindings[key]) throw new TypeError("Missing Dragonlance content binding: " + key);
  }
  for (const key of ["backgroundFeatIds", "featAsiAbilities"]) {
    if (!Array.isArray(bindings[key]) || bindings[key].some(row => !Array.isArray(row) || row.length !== 2 || typeof row[0] !== "string" || !row[0] || (key === "backgroundFeatIds" ? typeof row[1] !== "string" || !row[1] : !Array.isArray(row[1]) || row[1].some(x => typeof x !== "string" || !x)))) throw new TypeError("Invalid mapping: " + key);
  }
  for (const key of ["featLevelFourIds", "featProficiencyUsesIds"]) {
    if (!Array.isArray(bindings[key]) || bindings[key].some(x => typeof x !== "string" || !x)) throw new TypeError("Invalid identity list: " + key);
  }
  const dragonlanceBackgroundFeatIds = new Map(bindings.backgroundFeatIds);
  const dragonlanceFeatAsiAbilities = new Map(bindings.featAsiAbilities);
  const dragonlanceFeatLevelFourIds = new Set(bindings.featLevelFourIds);
  const dragonlanceFeatProficiencyUsesIds = new Set(bindings.featProficiencyUsesIds);
  const clone = structuredClone;

  function rewriteDragonlanceFeatPackReferences(value) {
    if (typeof value === "string") {
      return value
        .replaceAll(
          `Compendium.${bindings.featPackReference}.`,
          `Compendium.${moduleId}.dragonlancefeats.`,
        )
        .replaceAll(
          `@Compendium[${bindings.featPackReference}.`,
          `@Compendium[${moduleId}.dragonlancefeats.`,
        )
        .replaceAll(
          `data-pack="${bindings.featPackReference}"`,
          `data-pack="${moduleId}.dragonlancefeats"`,
        );
    }
    if (Array.isArray(value)) return value.map(rewriteDragonlanceFeatPackReferences);
    if (!value || typeof value !== "object") return value;
    for (const [key, child] of Object.entries(value)) {
      value[key] = rewriteDragonlanceFeatPackReferences(child);
    }
    return value;
  }

  function normalizeDragonlanceBackground(doc) {
    const featId = dragonlanceBackgroundFeatIds.get(doc._id);
    if (!featId) throw new Error(`Missing Dragonlance background feat mapping for ${doc._id}`);

    doc.system ??= {};
    doc.system.source = {
      ...(doc.system.source ?? {}),
      custom: bindings.book,
      book: bindings.book,
      rules: "2014",
      revision: 1,
    };
    doc.system.identifier = backgroundIdentifier(doc);
    const traitAdvancements = (doc.system.advancement ?? [])
      .filter(advancement => advancement.type === "Trait")
      .map(advancement => clone(advancement));
    const deferredEquipment = collectDeferredBackgroundItems(doc)
      .filter(entry => entry.sourcePack === bindings.equipmentSourcePack);
    doc.system.advancement = [
      {
        _id: `arcDlBgFeat${doc._id.slice(0, 6)}`,
        type: "ItemGrant",
        configuration: {
          items: [{ uuid: uuidFor("dragonlancefeats", featId), optional: false }],
          optional: false,
          spell: null,
        },
        value: {},
        // Backgrounds are dropped before the class in Actor Studio, while the actor
        // is still level 0. dnd5e background grants therefore use advancement level
        // 0 even when the granted feat is a level-1 character-creation benefit.
        level: 0,
        title: bindings.backgroundTitle,
        hint: bindings.backgroundHint,
        icon: null,
      },
      ...traitAdvancements,
    ];
    doc.system.startingEquipment = [];
    doc.flags ??= {};
    doc.flags[moduleId] = {
      ...(doc.flags[moduleId] ?? {}),
      sourcePack: bindings.backgroundSourcePack,
      sourceId: doc._id,
      backgroundSource: bindings.book,
      deferredEquipment,
      campaignSupplement: bindings.campaignSupplement,
    };
    rewriteDragonlanceFeatPackReferences(doc);
  }

  function normalizeDragonlanceFeat(doc) {
    doc.system ??= {};
    doc.system.source = {
      ...(doc.system.source ?? {}),
      custom: bindings.book,
      book: bindings.book,
      rules: "2014",
      revision: 1,
    };
    doc.system.identifier = featIdentifier(doc);
    doc.system.prerequisites = {
      ...(doc.system.prerequisites ?? {}),
      level: dragonlanceFeatLevelFourIds.has(doc._id) ? 4 : null,
      repeatable: false,
    };
    if (dragonlanceFeatProficiencyUsesIds.has(doc._id)) {
      doc.system.uses = {
        max: "@prof",
        spent: 0,
        recovery: [{ period: "lr", type: "recoverAll" }],
      };
    } else {
      doc.system.uses = { max: "", spent: null, recovery: [] };
    }

    // Donor activities are incomplete combat shells. Builder support keeps the
    // rules text and useful resource counter, but does not expose misleading
    // one-click actions before each mechanic receives its own runtime QA.
    doc.system.activities = {};
    const asiAbilities = dragonlanceFeatAsiAbilities.get(doc._id);
    doc.system.advancement = asiAbilities
      ? [abilityChoiceAdvancement(`arcDlAsi${doc._id.slice(0, 8)}`, bindings.asiTitle, asiAbilities)]
      : [];
    doc.flags ??= {};
    doc.flags[moduleId] = {
      ...(doc.flags[moduleId] ?? {}),
      sourcePack: bindings.featSourcePack,
      sourceId: doc._id,
      featSource: bindings.book,
      automation: asiAbilities ? "advancement" : "builder",
      campaignSupplement: bindings.campaignSupplement,
    };
    rewriteDragonlanceFeatPackReferences(doc);
  }

  return {rewriteDragonlanceFeatPackReferences, normalizeDragonlanceBackground, normalizeDragonlanceFeat};
}
