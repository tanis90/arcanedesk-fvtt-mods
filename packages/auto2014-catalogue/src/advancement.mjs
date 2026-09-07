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
  function applyMartialClassProfile(doc, {allowedFeatureIds: allowed, levelCap, grants, choice, styleIds, img, choiceBasedLevel = false}) {
    const allowedFeatureIds = new Set(allowed);
    if (img !== undefined) doc.img = img;
    doc.system.advancement = (doc.system.advancement ?? [])
      .filter(adv => {
        const choiceLevel = Number(Object.keys(adv.configuration?.choices ?? {})[0] ?? 0);
        const level = adv.level ?? (choiceBasedLevel ? choiceLevel : 1);
        if (adv.type === 'HitPoints') return true;
        if (['AbilityScoreImprovement', 'Trait', 'ScaleValue', 'Subclass'].includes(adv.type)) return level <= levelCap;
        if (adv.type !== 'ItemGrant' || level > levelCap) return false;
        return (adv.configuration?.items ?? []).some(item => allowedFeatureIds.has(item.uuid?.split('.').pop()));
      })
      .map(adv => {
        const copy = clone(adv);
        if (copy.type === 'ItemGrant') {
          copy.configuration.items = (copy.configuration.items ?? [])
            .filter(item => allowedFeatureIds.has(item.uuid?.split('.').pop()))
            .map(item => ({...item, uuid: uuidFor('classfeatures', item.uuid.split('.').pop())}));
          copy.configuration.optional = false;
          copy.configuration.spell = null;
        }
        return copy;
      });
    for (const grant of grants) ensureItemGrant(doc, grant);
    const preparedChoice = clone(choice);
    preparedChoice.configuration.pool = styleIds.map(id => ({uuid: uuidFor('classfeatures', id)}));
    doc.system.advancement.push(preparedChoice);
    doc.system.startingEquipment = [];
  }

  function applyStyleSubclassProfile(doc, {allowedFeatureIds: allowed, levelCap, styleIds, img}) {
    const allowedFeatureIds = new Set(allowed);
    if (img !== undefined) doc.img = img;
    doc.system.advancement = (doc.system.advancement ?? [])
      .map(adv => {
        const choiceLevel = Number(Object.keys(adv.configuration?.choices ?? {})[0] ?? 0);
        const level = adv.level ?? choiceLevel;
        if (level > levelCap) return null;
        if (adv.type === 'ItemGrant') return normalizeItemGrantAdvancement(adv, allowedFeatureIds);
        if (adv.type === 'ItemChoice') {
          const copy = clone(adv);
          copy.configuration ??= {};
          copy.configuration.pool = styleIds.map(id => ({uuid: uuidFor('classfeatures', id)}));
          copy.configuration.allowDrops = false;
          copy.configuration.type = 'feat';
          copy.configuration.spell = null;
          copy.configuration.restriction = {type: 'class', subtype: 'fightingStyle'};
          copy.level = level;
          return copy;
        }
        return ['Trait', 'ScaleValue'].includes(adv.type) ? clone(adv) : null;
      }).filter(Boolean);
  }
  return Object.freeze({applyMartialClassProfile,applyStyleSubclassProfile,ensureItemGrant,applyGrantProfile,collectAdvancementItemIds,collectAdvancementItemChoicePoolIds,normalizeItemGrantAdvancement,filterClassAdvancement,normalizeActorStudioSpellLimitAdvancements,filterSubclassAdvancement});
}
