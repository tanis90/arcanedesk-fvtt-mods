import {createActivityTools} from './activities.mjs';
/** Existing supplemental racial preparation using explicit caller-owned bindings. */
export function createSupplementRacialTools({moduleId, uuidFor, bindings: input}) {
  if (typeof moduleId !== 'string' || !moduleId || typeof uuidFor !== 'function' || !input || typeof input !== 'object') throw Error('Missing supplemental racial bindings');
  const bindings = JSON.parse(JSON.stringify(input));
  if (!bindings.ids || !bindings.references || !bindings.identifierMap) throw Error('Missing supplemental racial tables');
  for (const key of ["healingHands","necroticShroud","radiantConsumption","radiantSoul"]) if (typeof bindings.ids[key] !== 'string' || !bindings.ids[key]) throw Error('Missing supplemental racial identity');
  for (const key of ['fearLabel','enemyTargetLabel','kenderBook','kenderSourcePack']) if (typeof bindings[key] !== 'string' || !bindings[key]) throw Error('Missing supplemental racial label');
  for (const key of ["aasimarRevelationDamageIdentifier","aasimarNecroticShroudIdentifier","aasimarRadiantConsumptionIdentifier","aasimarRadiantSoulIdentifier","kenderFearlessTraitId","kenderTauntTraitId"]) if (typeof bindings.references[key] !== 'string' || !bindings.references[key]) throw Error('Missing supplemental racial reference');
  if (!Array.isArray(bindings.references.aasimarRevelationTraitIds) || bindings.references.aasimarRevelationTraitIds.some(id => typeof id !== 'string' || !id)) throw Error('Invalid revelation identity list');
  const {aasimarRevelationTraitIds,aasimarRevelationDamageIdentifier,aasimarNecroticShroudIdentifier,aasimarRadiantConsumptionIdentifier,aasimarRadiantSoulIdentifier,kenderFearlessTraitId,kenderTauntTraitId} = bindings.references;
  const {keepOnlyActivity} = createActivityTools({moduleId, spellAutomationProfiles: {}});
  function setSelfUtilityActivity(activity, effectId) {
    activity.type = "utility";
    activity.target ??= {};
    activity.target.prompt = false;
    activity.target.affects = { count: "", type: "self", choice: false, special: "" };
    activity.target.template = {
      count: "",
      contiguous: false,
      type: "",
      size: "",
      width: "",
      height: "",
      units: "",
    };
    activity.range ??= {};
    activity.range.units = "self";
    activity.consumption ??= {};
    activity.consumption.targets = [{ type: "itemUses", value: "1", target: "" }];
    activity.effects = effectId ? [{ _id: effectId, level: {}, onSave: false }] : [];
    activity.midiProperties ??= {};
    activity.midiProperties.forceConsumeDialog = "never";
    activity.midiProperties.forceRollDialog = "never";
    activity.midiProperties.forceDamageDialog = "never";
    activity.midiProperties.confirmTargets = "never";
    activity.midiProperties.chooseEffects = false;
    activity.midiProperties.removeChatButtons = "all";
  }

  function aasimarRevelationEffect(doc, { identifier, damageType, changes = [] }) {
    return {
      _id: "arcAasimarRev01",
      name: doc.name,
      origin: uuidFor("racialtraits", doc._id),
      transfer: false,
      disabled: false,
      type: "base",
      system: {},
      changes,
      duration: { seconds: 60, rounds: 10, turns: null },
      statuses: [],
      flags: {
        dae: {
          specialDuration: ["combatEnd"],
          stackable: "noneName",
          showIcon: true,
        },
        [moduleId]: {
          aasimarRevelation: true,
          identifier,
          damageType,
        },
      },
      img: doc.img,
    };
  }

  function frightenedUntilNextTurnEffect(doc) {
    return {
      _id: "arcAasimarFear01",
      name: bindings.fearLabel,
      origin: uuidFor("racialtraits", doc._id),
      transfer: false,
      disabled: false,
      type: "base",
      system: {},
      changes: [],
      duration: { rounds: 1, turns: 1 },
      statuses: ["frightened"],
      flags: {
        dae: {
          specialDuration: ["turnEnd", "combatEnd"],
          stackable: "noneName",
          showIcon: true,
        },
      },
      img: doc.img,
    };
  }

  function normalizeAasimarRacialTrait(doc) {
    const identifiers = bindings.identifierMap;
    if (identifiers[doc._id]) doc.system.identifier = identifiers[doc._id];

    if (doc._id === bindings.ids.healingHands) {
      doc.system.uses ??= {};
      doc.system.uses.max = "1";
      doc.system.uses.spent ??= 0;
      doc.system.uses.recovery = [{ period: "lr", type: "recoverAll" }];
      const activity = Object.values(doc.system?.activities ?? {})[0];
      if (activity) {
        activity.target ??= {};
        activity.target.prompt = true;
        activity.target.affects = { ...(activity.target.affects ?? {}), count: "1", type: "ally", choice: false };
        activity.midiProperties ??= {};
        activity.midiProperties.forceConsumeDialog = "never";
        activity.midiProperties.confirmTargets = "never";
        activity.midiProperties.removeChatButtons = "all";
        keepOnlyActivity(doc, activity);
      }
    }

    if (doc._id === bindings.ids.necroticShroud) {
      doc.effects = [
        aasimarRevelationEffect(doc, { identifier: aasimarNecroticShroudIdentifier, damageType: "necrotic" }),
        frightenedUntilNextTurnEffect(doc),
      ];
      const activity = Object.values(doc.system?.activities ?? {})[0];
      if (activity) {
        activity.type = "save";
        activity.activation ??= {};
        activity.activation.type = "bonus";
        activity.consumption ??= {};
        activity.consumption.targets = [{ type: "itemUses", value: "1", target: "" }];
        activity.save ??= {};
        activity.save.ability = ["cha"];
        activity.save.dc = { ...(activity.save.dc ?? {}), calculation: "cha", formula: "" };
        activity.damage ??= {};
        activity.damage.onSave = "none";
        activity.effects = [{ _id: "arcAasimarFear01", level: {}, onSave: false }];
        activity.range ??= {};
        activity.range.value = "10";
        activity.range.units = "ft";
        activity.target ??= {};
        activity.target.prompt = false;
        activity.target.affects = { count: "", type: "enemy", choice: false, special: bindings.enemyTargetLabel };
        activity.target.template = { count: "", contiguous: false, type: "", size: "", width: "", height: "", units: "" };
        activity.midiProperties ??= {};
        activity.midiProperties.forceConsumeDialog = "never";
        activity.midiProperties.forceRollDialog = "never";
        activity.midiProperties.confirmTargets = "never";
        activity.midiProperties.removeChatButtons = "all";
        keepOnlyActivity(doc, activity);
      }
    }

    if (doc._id === bindings.ids.radiantConsumption) {
      const effect = aasimarRevelationEffect(doc, { identifier: aasimarRadiantConsumptionIdentifier, damageType: "radiant" });
      doc.effects = [effect];
      const activity = Object.values(doc.system?.activities ?? {})[0];
      if (activity) {
        setSelfUtilityActivity(activity, effect._id);
        keepOnlyActivity(doc, activity);
      }
    }

    if (doc._id === bindings.ids.radiantSoul) {
      const effect = aasimarRevelationEffect(doc, {
        identifier: aasimarRadiantSoulIdentifier,
        damageType: "radiant",
        changes: [{ key: "system.attributes.movement.fly", mode: 4, value: "@attributes.movement.walk", priority: 20 }],
      });
      doc.effects = [effect];
      const activity = Object.values(doc.system?.activities ?? {})[0];
      if (activity) {
        setSelfUtilityActivity(activity, effect._id);
        keepOnlyActivity(doc, activity);
      }
    }

    if (aasimarRevelationTraitIds.includes(doc._id)) {
      doc.flags ??= {};
      doc.flags[moduleId] = {
        ...(doc.flags[moduleId] ?? {}),
        declaredRider: {
          id: aasimarRevelationDamageIdentifier,
          damageType: doc._id === bindings.ids.necroticShroud ? "necrotic" : "radiant",
        },
      };
    }
  }

  function normalizeKenderRacialTrait(doc) {
    const identifiers = {
      [kenderFearlessTraitId]: "kender-fearless",
      [kenderTauntTraitId]: "kender-taunt",
    };
    const identifier = identifiers[doc._id];
    if (!identifier) return;

    doc.system.identifier = identifier;
    doc.system.source = {
      ...(doc.system.source ?? {}),
      custom: bindings.kenderBook,
      book: bindings.kenderBook,
      rules: "2014",
      revision: 1,
    };
    doc.flags ??= {};
    doc.flags[moduleId] = {
      ...(doc.flags[moduleId] ?? {}),
      sourcePack: bindings.kenderSourcePack,
      sourceId: doc._id,
      book: bindings.kenderBook,
      automation: "builder",
    };

    if (doc._id === kenderFearlessTraitId) {
      doc.system.uses = {
        max: "1",
        spent: 0,
        recovery: [{ period: "lr", type: "recoverAll" }],
      };
    }
    if (doc._id === kenderTauntTraitId) {
      doc.system.uses = {
        max: "@prof",
        spent: 0,
        recovery: [{ period: "lr", type: "recoverAll" }],
      };
      const activity = Object.values(doc.system?.activities ?? {})[0];
      if (activity) {
        activity.damage ??= {};
        activity.damage.onSave = "none";
      }
    }
    for (const activity of Object.values(doc.system?.activities ?? {})) {
      activity.consumption ??= {};
      activity.consumption.spellSlot = false;
    }
  }

  return Object.freeze({setSelfUtilityActivity,aasimarRevelationEffect,frightenedUntilNextTurnEffect,normalizeAasimarRacialTrait,normalizeKenderRacialTrait});
}
