/** Shared progression transforms. Caller owns content, selection policy and reference mapping. */
export function createAdvancementTools({rewriteUuid, excludedFeatureIds: excluded = [], uuidFor}) {
  if (typeof rewriteUuid !== 'function') throw Error('A reference mapper is required');
  const excludedFeatureIds = new Set(excluded);
  const clone = value => JSON.parse(JSON.stringify(value));
  function collectAdvancementItemIds(doc, levelCap, includeExcludedIds = new Set()) {
    const ids = new Set();
    for (const adv of doc.system?.advancement ?? []) {
      const level = adv.level ?? Number(Object.keys(adv.configuration?.choices ?? {})[0] ?? 1);
      if (level > levelCap) continue;
      for (const item of adv.configuration?.items ?? []) {
        const id = item.uuid?.split(".").pop();
        if (id && (!excludedFeatureIds.has(id) || includeExcludedIds.has(id))) ids.add(id);
      }
    }
    return ids;
  }

  function collectAdvancementItemChoicePoolIds(doc, levelCap, includeExcludedIds = new Set()) {
    const ids = new Set();
    for (const adv of doc.system?.advancement ?? []) {
      if (adv.type !== "ItemChoice") continue;
      const choiceLevels = Object.keys(adv.configuration?.choices ?? {}).map(Number).filter(Number.isFinite);
      const level = adv.level ?? Math.min(...choiceLevels);
      if (level > levelCap) continue;
      for (const item of adv.configuration?.pool ?? []) {
        const id = item.uuid?.split(".").pop();
        if (id && (!excludedFeatureIds.has(id) || includeExcludedIds.has(id))) ids.add(id);
      }
    }
    return ids;
  }

  function normalizeItemGrantAdvancement(adv, allowedIds) {
    const copy = clone(adv);
    copy.configuration.items = (copy.configuration.items ?? [])
      .filter(item => allowedIds.has(item.uuid?.split(".").pop()))
      .map(item => ({
        ...item,
        uuid: rewriteUuid(item.uuid),
      }));
    copy.configuration.optional = false;
    copy.configuration.spell = null;
    return copy.configuration.items.length > 0 ? copy : null;
  }

  function filterClassAdvancement(doc, { levelCap, allowedIds }) {
    doc.system.advancement = (doc.system.advancement ?? [])
      .map(adv => {
        const level = adv.level ?? Number(Object.keys(adv.configuration?.choices ?? {})[0] ?? 1);
        if (level > levelCap) return null;
        if (adv.type === "HitPoints") return clone(adv);
        if (adv.type === "AbilityScoreImprovement") return clone(adv);
        if (["Trait", "ItemChoice", "ScaleValue", "Subclass"].includes(adv.type)) return clone(adv);
        if (adv.type !== "ItemGrant") return null;
        return normalizeItemGrantAdvancement(adv, allowedIds);
      })
      .filter(Boolean);

    doc.system.startingEquipment = [];
  }

  function normalizeActorStudioSpellLimitAdvancements(doc) {
    for (const advancement of doc.system?.advancement ?? []) {
      if (advancement.type !== "ScaleValue") continue;
      const identifier = advancement.configuration?.identifier;
      if (identifier === "cantrips-known") {
        advancement.title = "Cantrips Known";
      } else if (identifier === "spells-known") {
        advancement.title = "Spells Known";
      }
    }
  }

  function filterSubclassAdvancement(doc, { levelCap, allowedIds }) {
    doc.system.advancement = (doc.system.advancement ?? [])
      .map(adv => {
        const choiceLevel = Number(Object.keys(adv.configuration?.choices ?? {})[0] ?? 0);
        const level = adv.level ?? choiceLevel;
        if (level && level > levelCap) return null;
        if (["Trait", "ItemChoice", "ScaleValue"].includes(adv.type)) return clone(adv);
        if (adv.type !== "ItemGrant") return null;
        return normalizeItemGrantAdvancement(adv, allowedIds);
      })
      .filter(Boolean);
  }
  function ensureItemGrant(doc, { id, level, title, itemIds, packName = "classfeatures" }) {
    if (typeof uuidFor !== "function") throw Error("A grant reference builder is required");
    const existing = (doc.system.advancement ?? []).some(adv => {
      if (adv.type !== "ItemGrant" || adv.level !== level) return false;
      const existingIds = new Set((adv.configuration?.items ?? []).map(item => item.uuid?.split(".").pop()));
      return itemIds.every(itemId => existingIds.has(itemId));
    });
    if (existing) return;

    doc.system.advancement.push({
      _id: id,
      type: "ItemGrant",
      configuration: {
        items: itemIds.map(itemId => ({ uuid: uuidFor(packName, itemId), optional: false })),
        optional: false,
        spell: null,
      },
      value: {},
      level,
      title,
    });
  }

  function applyGrantProfile(doc, {allowedFeatureIds: allowed, levelCap, grants}) {
    if (!Array.isArray(allowed) || !Array.isArray(grants) || !Number.isFinite(levelCap)) throw Error('Invalid grant profile');
    if (typeof uuidFor !== 'function') throw Error('A grant reference builder is required');
    const allowedFeatureIds = new Set(allowed);
    doc.system.advancement = (doc.system.advancement ?? [])
      .map(adv => {
        const level = adv.level ?? 1;
        if (level > levelCap) return null;
        if (adv.type === "ItemGrant") return normalizeItemGrantAdvancement(adv, allowedFeatureIds);
        if (["Trait", "ScaleValue"].includes(adv.type)) return clone(adv);
        return null;
      })
      .filter(Boolean);
    // Explicit grants are the full declared progression, independent of source filtering.
    for (const grant of grants) ensureItemGrant(doc, grant);
  }
  return Object.freeze({ensureItemGrant,applyGrantProfile,collectAdvancementItemIds,collectAdvancementItemChoicePoolIds,normalizeItemGrantAdvancement,filterClassAdvancement,normalizeActorStudioSpellLimitAdvancements,filterSubclassAdvancement});
}
