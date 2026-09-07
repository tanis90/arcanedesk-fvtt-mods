/** Existing class choice preparation with explicit caller-owned pools and source bindings. */
export function createClassChoiceTools({uuidFor, bindings: input}) {
  if (typeof uuidFor !== 'function' || !input || typeof input !== 'object') throw Error('Missing class choice bindings');
  const bindings = JSON.parse(JSON.stringify(input));
  if (!bindings.ids || !bindings.labels || !bindings.references) throw Error('Missing class choice tables');
  for (const key of ["stormLegacy","stormReplacement","favoredEnemy","naturalExplorer"]) if (typeof bindings.ids[key] !== 'string' || !bindings.ids[key]) throw Error('Missing class choice identity');
  for (const key of ["metamagicTitle","metamagicHint","affinityTitle","affinityHint","favoredEnemyTitle","naturalExplorerTitle","rangerImprovementTitle"]) if (typeof bindings.labels[key] !== 'string' || !bindings.labels[key]) throw Error('Missing class choice text');
  for (const key of ['sorcererMetamagicIds','divineSoulAffinitySpellIds','divineSoulAffinitySpellIdSet']) if (!Array.isArray(bindings.references[key]) || bindings.references[key].some(id => typeof id !== 'string' || !id)) throw Error('Invalid class choice pool');
  if (typeof bindings.references.divineSoulAffinityChoiceAdvancementId !== 'string' || !bindings.references.divineSoulAffinityChoiceAdvancementId) throw Error('Missing affinity choice identity');
  const {sorcererMetamagicIds,divineSoulAffinitySpellIds,divineSoulAffinityChoiceAdvancementId} = bindings.references;
  const divineSoulAffinitySpellIdSet = new Set(bindings.references.divineSoulAffinitySpellIdSet);
  function removeEmptyBarbarianItemChoices(doc) {
    if (doc.system?.identifier !== "barbarian") return;
    doc.system.advancement = (doc.system.advancement ?? []).filter(advancement => {
      if (advancement.type !== "ItemChoice") return true;
      const choices = Object.values(advancement.configuration?.choices ?? {});
      const pool = advancement.configuration?.pool ?? [];
      return choices.some(choice => Number(choice?.count ?? 0) > 0) && pool.length > 0;
    });
  }

  function normalizeBarbarianSubclassAdvancement(doc) {
    if (doc.system?.identifier !== "path-of-the-storm-herald") return;
    for (const advancement of doc.system?.advancement ?? []) {
      if (advancement.type !== "ItemGrant" || Number(advancement.level) !== 10) continue;
      advancement.configuration ??= {};
      advancement.configuration.items = (advancement.configuration.items ?? []).map(item => {
        const itemId = item.uuid?.split(".").pop();
        if (itemId !== bindings.ids.stormLegacy) return item;
        return {
          ...item,
          uuid: uuidFor("classfeatures", bindings.ids.stormReplacement),
        };
      });
    }
  }

  function isFightingStyleChoiceAtLevel(advancement, level) {
    if (advancement?.type !== "ItemChoice") return false;
    const choicesAtLevel = advancement.configuration?.choices?.[String(level)];
    if (Number(advancement.level) !== level && !choicesAtLevel) return false;
    return advancement.configuration?.restriction?.subtype === "fightingStyle"
      || /(?:Fighting Style|战斗风格)/iu.test(advancement.title ?? "");
  }

  function setFightingStyleChoice(doc, { id, level, title, hint, styleIds }) {
    doc.system.advancement = (doc.system.advancement ?? [])
      .filter(advancement => !isFightingStyleChoiceAtLevel(advancement, level));
    doc.system.advancement.push({
      _id: id,
      type: "ItemChoice",
      configuration: {
        choices: {
          [level]: {
            count: 1,
            replacement: false,
          },
        },
        allowDrops: false,
        type: "feat",
        pool: styleIds.map(styleId => ({ uuid: uuidFor("classfeatures", styleId) })),
        spell: null,
        restriction: {
          type: "class",
          subtype: "fightingStyle",
        },
      },
      value: {
        added: {},
        replaced: {},
      },
      level,
      title,
      hint,
    });
  }

  function addSorcererMetamagicChoice(doc) {
    const hasChoice = (doc.system.advancement ?? []).some(
      adv => adv.type === "ItemChoice" && adv.configuration?.restriction?.subtype === "metamagic",
    );
    if (hasChoice) return;
    doc.system.advancement.push({
      _id: "srcMetamagic0001",
      type: "ItemChoice",
      configuration: {
        choices: {
          3: { count: 2, replacement: false },
          10: { count: 1, replacement: false },
          17: { count: 1, replacement: false },
        },
        allowDrops: true,
        type: "feat",
        pool: sorcererMetamagicIds.map(id => ({ uuid: uuidFor("classfeatures", id) })),
        spell: null,
        restriction: { type: "class", subtype: "metamagic" },
      },
      value: { added: {}, replaced: {} },
      title: bindings.labels.metamagicTitle,
      hint: bindings.labels.metamagicHint,
    });
  }

  function addDivineSoulAffinitySpellChoice(doc) {
    doc.system.advancement = (doc.system.advancement ?? []).filter(adv => {
      if (adv.type !== "ItemGrant" || adv.level !== 1) return true;
      const itemIds = (adv.configuration?.items ?? [])
        .map(item => item.uuid?.split(".").pop())
        .filter(Boolean);
      const isLegacyAffinityGrant = itemIds.length === divineSoulAffinitySpellIds.length
        && itemIds.every(id => divineSoulAffinitySpellIdSet.has(id));
      return !isLegacyAffinityGrant;
    });

    const hasChoice = (doc.system.advancement ?? []).some(adv => adv.type === "ItemChoice" && adv._id === divineSoulAffinityChoiceAdvancementId);
    if (hasChoice) return;

    doc.system.advancement.push({
      _id: divineSoulAffinityChoiceAdvancementId,
      type: "ItemChoice",
      configuration: {
        choices: {
          1: { count: 1, replacement: false },
        },
        allowDrops: false,
        type: "spell",
        pool: divineSoulAffinitySpellIds.map(id => ({ uuid: uuidFor("spells", id) })),
        spell: {
          ability: [""],
          preparation: "",
          uses: { max: "", per: "", requireSlot: false },
        },
        restriction: { level: "1" },
      },
      value: { added: {}, replaced: {} },
      level: 1,
      title: bindings.labels.affinityTitle,
      hint: bindings.labels.affinityHint,
    });
  }

  function addRangerPhbImprovementAdvancements(doc) {
    if (doc.system?.identifier !== "ranger") return;
    const hasFavoredEnemy = (doc.system.advancement ?? []).some(adv =>
      (adv.configuration?.items ?? []).some(item => item.uuid?.endsWith(("." + bindings.ids.favoredEnemy))),
    );
    if (!hasFavoredEnemy) {
      doc.system.advancement.push({
        _id: "rngFavEnemy0001",
        type: "ItemGrant",
        configuration: {
          items: [{ uuid: uuidFor("classfeatures", bindings.ids.favoredEnemy), optional: false }],
          optional: false,
          spell: null,
        },
        value: {},
        level: 1,
        title: bindings.labels.favoredEnemyTitle,
      });
    }
    const hasNaturalExplorer = (doc.system.advancement ?? []).some(adv =>
      (adv.configuration?.items ?? []).some(item => item.uuid?.endsWith(("." + bindings.ids.naturalExplorer))),
    );
    if (!hasNaturalExplorer) {
      doc.system.advancement.push({
        _id: "rngNaturalExplorer0001",
        type: "ItemGrant",
        configuration: {
          items: [{ uuid: uuidFor("classfeatures", bindings.ids.naturalExplorer), optional: false }],
          optional: false,
          spell: null,
        },
        value: {},
        level: 1,
        title: bindings.labels.naturalExplorerTitle,
      });
    }
    doc.system.advancement.push({
      _id: "rngPhbImprove0006",
      type: "ItemGrant",
      configuration: {
        items: [
          { uuid: uuidFor("classfeatures", bindings.ids.favoredEnemy), optional: false },
          { uuid: uuidFor("classfeatures", bindings.ids.naturalExplorer), optional: false },
        ],
        optional: false,
        spell: null,
      },
      value: {},
      level: 6,
      title: bindings.labels.rangerImprovementTitle,
    });
  }

  return Object.freeze({removeEmptyBarbarianItemChoices,normalizeBarbarianSubclassAdvancement,isFightingStyleChoiceAtLevel,setFightingStyleChoice,addSorcererMetamagicChoice,addDivineSoulAffinitySpellChoice,addRangerPhbImprovementAdvancements});
}
