/** Existing background, feat and equipment preparation with caller-owned source bindings. */
export function createCharacterOptionTools({moduleId, uuidFor, bindings: input}) {
  if (typeof moduleId !== 'string' || !moduleId || typeof uuidFor !== 'function' || !input || typeof input !== 'object') throw Error('Missing character option bindings');
  const bindings = JSON.parse(JSON.stringify(input));
  for (const key of ['backgroundFeatureFragment','skillCorrectionId','backgroundSourcePack','backgroundFeatureSourcePack','featSourcePack','equipmentSourcePack','equipmentBook','backgroundFeatureTitle','passiveEffectPack']) {
    if (typeof bindings[key] !== 'string' || !bindings[key]) throw Error('Missing character option label or source');
  }
  for (const key of ['backgroundIdentifierOverrides','backgroundFeatureOverrides','featIdentifierOverrides','featStaticEffectSpecs','featAdvancementSpecs','tierOverrides']) {
    if (!bindings[key] || typeof bindings[key] !== 'object' || Array.isArray(bindings[key])) throw Error('Missing character option table');
  }
  const {backgroundIdentifierOverrides,backgroundFeatureOverrides,featIdentifierOverrides,featStaticEffectSpecs,featAdvancementSpecs} = bindings;
  const clone = value => JSON.parse(JSON.stringify(value));
  function normalizeSourceIdentifier(identifier) {
    return String(identifier ?? "")
      .trim()
      .replace(/^-+/, "")
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .toLowerCase();
  }

  function backgroundIdentifier(doc) {
    if (backgroundIdentifierOverrides[doc._id]) return backgroundIdentifierOverrides[doc._id];
    const book = String(doc.system?.source?.book ?? "background").toLowerCase();
    const slug = normalizeSourceIdentifier(doc.system?.identifier || doc.name);
    return `${book}-${slug}`;
  }

  function backgroundFeatureIdentifier(doc) {
    return `background-${normalizeSourceIdentifier(doc.system?.identifier || doc.name || doc._id)}`;
  }

  function featIdentifier(doc) {
    if (featIdentifierOverrides[doc._id]) return featIdentifierOverrides[doc._id];
    const book = String(doc.system?.source?.book ?? "feat").toLowerCase();
    const slug = normalizeSourceIdentifier(doc.name || doc.system?.identifier || doc._id);
    return `${book}-${slug || doc._id.toLowerCase()}`;
  }

  function isBackgroundFeatureUuid(uuid) {
    return typeof uuid === "string" && uuid.includes(bindings.backgroundFeatureFragment);
  }

  function collectBackgroundFeatureIds(doc) {
    const override = backgroundFeatureOverrides[doc._id];
    if (override) return new Set(override);

    const ids = new Set();
    for (const advancement of doc.system?.advancement ?? []) {
      for (const item of advancement.configuration?.items ?? []) {
        if (isBackgroundFeatureUuid(item.uuid)) ids.add(item.uuid.split(".").pop());
      }
    }
    return ids;
  }

  function collectDeferredBackgroundItems(doc) {
    const deferred = [];
    for (const advancement of doc.system?.advancement ?? []) {
      if (advancement.type === "ItemGrant") {
        for (const item of advancement.configuration?.items ?? []) {
          const uuid = item.uuid;
          if (!uuid || isBackgroundFeatureUuid(uuid)) continue;
          const parts = uuid.split(".");
          deferred.push({ sourcePack: parts.at(-2) === "Item" ? parts.at(-3) : parts.at(-2), id: parts.at(-1) });
        }
      }
      if (advancement.type === "ItemChoice") {
        for (const item of advancement.configuration?.pool ?? []) {
          const uuid = item.uuid;
          if (!uuid) continue;
          const parts = uuid.split(".");
          deferred.push({ sourcePack: parts.at(-2) === "Item" ? parts.at(-3) : parts.at(-2), id: parts.at(-1), choice: true });
        }
      }
    }
    return deferred;
  }

  function backgroundFeatureGrantAdvancement(doc, featureIds) {
    return {
      _id: `arcBgFeature${doc._id.slice(0, 8)}`,
      type: "ItemGrant",
      configuration: {
        items: [...featureIds].map(id => ({ uuid: uuidFor("backgroundfeatures", id), optional: false })),
        optional: false,
        spell: null,
      },
      value: {},
      level: 0,
      title: bindings.backgroundFeatureTitle,
      hint: "",
      icon: null,
    };
  }

  function normalizeBackgroundAdvancement(doc) {
    const featureIds = collectBackgroundFeatureIds(doc);
    const traitAdvancements = (doc.system?.advancement ?? [])
      .filter(advancement => advancement.type === "Trait")
      .map(advancement => clone(advancement));

    if (doc._id === bindings.skillCorrectionId) {
      const skillTrait = traitAdvancements.find(advancement => {
        const grants = advancement.configuration?.grants ?? [];
        return grants.includes("skills:ins") && grants.includes("skills:ath");
      });
      if (skillTrait) skillTrait.configuration.grants = ["skills:inv", "skills:ins"];
    }

    doc.flags ??= {};
    doc.flags[moduleId] = {
      ...(doc.flags[moduleId] ?? {}),
      sourcePack: bindings.backgroundSourcePack,
      sourceId: doc._id,
      backgroundSource: doc.system?.source?.book ?? "",
      deferredEquipment: collectDeferredBackgroundItems(doc),
    };

    doc.system.advancement = [
      backgroundFeatureGrantAdvancement(doc, featureIds),
      ...traitAdvancements,
    ];
    doc.system.startingEquipment = [];
  }

  function normalizeBackground(doc) {
    doc.system ??= {};
    doc.system.identifier = backgroundIdentifier(doc);
    doc.system.source = {
      ...(doc.system.source ?? {}),
      book: doc.system.source?.book,
      rules: "2014",
      revision: 1,
    };
    normalizeBackgroundAdvancement(doc);
  }

  function normalizeBackgroundFeature(doc) {
    doc.system ??= {};
    doc.system.identifier = backgroundFeatureIdentifier(doc);
    doc.system.source = {
      ...(doc.system.source ?? {}),
      rules: "2014",
      revision: 1,
    };
    doc.flags ??= {};
    doc.flags[moduleId] = {
      ...(doc.flags[moduleId] ?? {}),
      sourcePack: bindings.backgroundFeatureSourcePack,
      sourceId: doc._id,
    };
  }

  function featAutomationTier(doc) {
    if (Object.prototype.hasOwnProperty.call(bindings.tierOverrides, doc._id)) return bindings.tierOverrides[doc._id];
    const hasStatic = Boolean(featStaticEffectSpecs[doc._id]);
    const hasAdvancement = Boolean(featAdvancementSpecs[doc._id]);
    if (hasStatic && hasAdvancement) return "static-advancement";
    if (hasStatic) return "static-effect";
    if (hasAdvancement) return "advancement";
    return "builder";
  }

  function applyFeatStaticAndAdvancement(doc) {
    const staticSpec = featStaticEffectSpecs[doc._id];
    const advancements = featAdvancementSpecs[doc._id] ?? [];
    if (staticSpec) {
      setPassiveEffects(doc, [passiveTransferEffect(doc, {
        id: staticSpec.id,
        changes: staticSpec.changes,
        flags: staticSpec.flags,
      })]);
    }
    if (advancements.length) doc.system.advancement = advancements.map(clone);
  }

  function normalizeFeat(doc) {
    doc.system ??= {};
    doc.system.identifier = featIdentifier(doc);
    doc.system.source = {
      ...(doc.system.source ?? {}),
      book: doc.system.source?.book,
      rules: "2014",
      revision: 1,
    };
    doc.system.prerequisites = {
      ...(doc.system.prerequisites ?? {}),
      repeatable: false,
    };
    doc.flags ??= {};
    const automationTier = featAutomationTier(doc);
    doc.flags[moduleId] = {
      ...(doc.flags[moduleId] ?? {}),
      sourcePack: bindings.featSourcePack,
      sourceId: doc._id,
      featSource: doc.system?.source?.book ?? "",
      automation: automationTier,
    };

    // Keep builder cards free of incomplete imported action shells.
    // Explicit static/advancement configuration is applied below.
    doc.system.activities = {};
    doc.system.advancement = Array.isArray(doc.system.advancement) ? doc.system.advancement : [];
    applyFeatStaticAndAdvancement(doc);
  }

  function removeEmptyEffects(doc) {
    doc.effects = (doc.effects ?? []).filter(effect => {
      if ((effect.changes ?? []).length) return true;
      if (effect.statuses?.length) return true;
      return false;
    });
  }

  function normalizeBasicEquipmentIdentifier(doc) {
    doc.system ??= {};
    doc.system.identifier = normalizeSourceIdentifier(doc.system?.identifier || doc.name || doc._id);
  }

  function normalizeBasicEquipment(doc, packName) {
    normalizeBasicEquipmentIdentifier(doc);
    doc.system.source = {
      ...(doc.system.source ?? {}),
      book: bindings.equipmentBook,
      rules: "2014",
      revision: 1,
    };
    doc.flags ??= {};
    doc.flags[moduleId] = {
      ...(doc.flags[moduleId] ?? {}),
      sourcePack: bindings.equipmentSourcePack,
      sourceId: doc._id,
      equipmentPack: packName,
      rules: "2014",
    };
  }

  function passiveTransferEffect(doc, { id, name = doc.name, changes = [], flags = {} }) {
    return {
      _id: id,
      name,
      origin: uuidFor(bindings.passiveEffectPack, doc._id),
      transfer: true,
      disabled: false,
      type: "base",
      system: {},
      changes,
      duration: { startTime: null, seconds: null, combat: null, rounds: null, turns: null },
      statuses: [],
      flags: {
        dae: {
          specialDuration: [],
          stackable: "noneName",
          showIcon: false,
        },
        [moduleId]: flags,
      },
      img: doc.img,
    };
  }

  function setPassiveEffects(doc, effects) {
    doc.effects = effects;
  }

  return Object.freeze({normalizeSourceIdentifier,backgroundIdentifier,backgroundFeatureIdentifier,featIdentifier,isBackgroundFeatureUuid,collectBackgroundFeatureIds,collectDeferredBackgroundItems,backgroundFeatureGrantAdvancement,normalizeBackgroundAdvancement,normalizeBackground,normalizeBackgroundFeature,featAutomationTier,applyFeatStaticAndAdvancement,normalizeFeat,removeEmptyEffects,normalizeBasicEquipmentIdentifier,normalizeBasicEquipment,passiveTransferEffect,setPassiveEffects});
}
