import {createActivityTools} from './activities.mjs';

/** Existing martial feature mechanics with explicit caller-owned content bindings. */
export function createMartialFeatureTools({moduleId, uuidFor, content: input}) {
  if (typeof uuidFor !== 'function') throw Error('A feature reference builder is required');
  if (!input || typeof input !== 'object') throw Error('Missing martial content bindings');
  const content = JSON.parse(JSON.stringify(input));
  if (!content?.fighterImages || !content?.rogueImages || !content?.monkImages || !Array.isArray(content?.monk?.profUseIds) || !content?.rogue) throw Error('Missing martial content bindings');
  for (const map of [content.fighterImages, content.rogueImages, content.monkImages]) {
    if (typeof map !== 'object' || Array.isArray(map) || Object.values(map).some(value => typeof value !== 'string')) throw Error('Invalid martial image bindings');
  }
  for (const value of [...content.monk.profUseIds, content.monk.frightenFeatureId, content.monk.effectId, content.monk.effectName, content.rogue.sneakAttackFeatureId, content.rogue.damageActivityId, content.rogue.legacyEffectId]) {
    if (typeof value !== 'string' || !value) throw Error('Invalid martial feature binding');
  }
  const {ensureUtilityActivity, normalizeActivityForFullAutomation, normalizeSelfItemUseActivity} = createActivityTools({moduleId, spellAutomationProfiles: {}});


  function normalizeFighterAutomation(doc) {
    const identifier = doc.system?.identifier;
    const officialImageByIdentifier = content.fighterImages;
    const officialImage = officialImageByIdentifier[identifier];
    if (officialImage) {
      doc.img = officialImage;
      for (const effect of doc.effects ?? []) {
        if (typeof effect.img === "string" && effect.img.includes("/Nicons/")) effect.img = officialImage;
      }
    }
    if (identifier === "second-wind") {
      const activity = Object.values(doc.system?.activities ?? {}).find(candidate => candidate.type === "heal");
      if (!activity) return;
      normalizeSelfItemUseActivity(activity);
      activity.activation = { ...(activity.activation ?? {}), type: "bonus", value: 1 };
      activity.healing ??= {};
      activity.healing.number = 1;
      activity.healing.denomination = 10;
      activity.healing.bonus = "@classes.fighter.levels";
      activity.healing.types = ["healing"];
      doc.system.uses ??= {};
      doc.system.uses.max = "1";
      doc.system.uses.spent ??= 0;
      doc.system.uses.recovery = [{ period: "sr", type: "recoverAll" }];
    }
    if (identifier === "action-surge") {
      const activity = Object.values(doc.system?.activities ?? {}).find(candidate => candidate.type === "utility")
        ?? ensureUtilityActivity(doc, "arcActionSurge01");
      normalizeSelfItemUseActivity(activity);
      activity.activation = { ...(activity.activation ?? {}), type: "special", value: null };
      doc.system.uses ??= {};
      doc.system.uses.max = "@scale.fighter.action-surge";
      doc.system.uses.spent ??= 0;
      doc.system.uses.recovery = [{ period: "sr", type: "recoverAll" }];
    }
    if (identifier === "indomitable") {
      const activity = Object.values(doc.system?.activities ?? {}).find(candidate => candidate.type === "utility")
        ?? ensureUtilityActivity(doc, "arcIndomitable01");
      normalizeSelfItemUseActivity(activity);
      activity.activation = { ...(activity.activation ?? {}), type: "special", value: null };
      doc.system.uses ??= {};
      doc.system.uses.max = "@scale.fighter.indomitable";
      doc.system.uses.spent ??= 0;
      doc.system.uses.recovery = [{ period: "lr", type: "recoverAll" }];
    }
    if (identifier === "survivor") {
      const activity = Object.values(doc.system?.activities ?? {}).find(candidate => candidate.type === "heal");
      if (activity) {
        normalizeActivityForFullAutomation(activity);
        activity.range ??= {};
        activity.range.units = "self";
        activity.target ??= {};
        activity.target.prompt = false;
        activity.target.override = true;
        activity.target.affects = {
          ...(activity.target.affects ?? {}),
          count: "",
          type: "self",
          choice: false,
          special: "",
        };
      }
    }
  }

  function normalizeMonkAutomation(doc) {
    const officialImageById = content.monkImages;
    const officialImage = officialImageById[doc._id];
    if (officialImage) {
      doc.img = officialImage;
      for (const effect of doc.effects ?? []) {
        if (typeof effect.img === "string" && effect.img.includes("/Nicons/")) effect.img = officialImage;
      }
    }

    if (content.monk.profUseIds.includes(doc._id)) {
      doc.system.uses ??= {};
      doc.system.uses.max = "@prof";
      doc.system.uses.spent ??= 0;
      doc.system.uses.recovery = [{ period: "lr", type: "recoverAll" }];
    }

    if (doc._id === content.monk.frightenFeatureId) {
      const activity = Object.values(doc.system?.activities ?? {}).find(candidate => candidate.type === "save");
      if (!activity) return;
      const effect = doc.effects.find(candidate => candidate._id === content.monk.effectId) ?? doc.effects[0] ?? {
        _id: content.monk.effectId,
        name: content.monk.effectName,
        img: doc.img,
        type: "base",
        system: {},
        changes: [],
        flags: {},
      };
      effect.name = content.monk.effectName;
      effect.origin = uuidFor("classfeatures", doc._id);
      effect.transfer = false;
      effect.disabled = false;
      effect.type = "base";
      effect.system ??= {};
      effect.changes ??= [];
      effect.statuses = ["frightened"];
      effect.duration = {
        ...(effect.duration ?? {}),
        seconds: 60,
        rounds: 10,
        turns: null,
      };
      effect.flags ??= {};
      effect.flags.dae = {
        enableCondition: "",
        disableCondition: "",
        disableIncapacitated: false,
        selfTarget: false,
        selfTargetAlways: false,
        dontApply: false,
        stackable: "noneName",
        showIcon: true,
        durationExpression: "",
        macroRepeat: "none",
        specialDuration: [],
      };
      effect.flags.dnd5e ??= { riders: { statuses: [] } };
      effect.flags.core ??= { overlay: false };
      doc.effects = [effect];

      normalizeActivityForFullAutomation(activity);
      activity.effects = [{ _id: effect._id, level: {}, onSave: false }];
      activity.damage ??= {};
      activity.damage.onSave = "none";
      activity.save ??= {};
      activity.save.ability = ["wis"];
      activity.save.dc = {
        ...(activity.save.dc ?? {}),
        calculation: "wis",
        formula: "",
      };
    }
  }

  function normalizeRogueAutomation(doc) {
    const officialImageById = content.rogueImages;
    const officialImage = officialImageById[doc._id];
    if (officialImage) {
      doc.img = officialImage;
      for (const effect of doc.effects ?? []) {
        if (typeof effect.img === "string" && effect.img.includes("/Nicons/")) effect.img = officialImage;
      }
    }

    if (doc._id !== content.rogue.sneakAttackFeatureId) return;

    doc.system.identifier = "sneak-attack";
    const damageActivity = doc.system.activities?.[content.rogue.damageActivityId];
    if (!damageActivity || damageActivity.type !== "damage") {
      throw new Error("Sneak Attack requires its configured damage activity");
    }
    damageActivity.midiProperties ??= {};
    damageActivity.midiProperties.identifier = "sneakAttackDamage";
    damageActivity.midiProperties.automationOnly = true;
    damageActivity.midiProperties.otherActivityCompatible = true;
    damageActivity.midiProperties.forceDamageDialog = "never";
    damageActivity.activation ??= {};
    damageActivity.activation.type = "special";
    damageActivity.consumption ??= {};
    damageActivity.consumption.targets = [];
    damageActivity.consumption.spellSlot = false;
    damageActivity.target ??= {};
    damageActivity.target.prompt = false;
    damageActivity.damage ??= {};
    damageActivity.damage.critical ??= {};
    damageActivity.damage.critical.allow = true;

    doc.effects = (doc.effects ?? []).filter(effect =>
      effect._id !== content.rogue.legacyEffectId
        && !(effect.changes ?? []).some(change => change.key === "flags.dnd5e.DamageBonusMacro")
    );
    doc.flags ??= {};
    if (doc.flags.dae) {
      delete doc.flags.dae.macro;
      if (Object.keys(doc.flags.dae).length === 0) delete doc.flags.dae;
    }
    doc.flags[moduleId] = {
      ...(doc.flags[moduleId] ?? {}),
      declaredRider: {
        id: "sneak-attack",
        consumesOn: "hit",
        consumes: "none",
        damageType: "parent",
      },
    };
  }
  return Object.freeze({ensureUtilityActivity,normalizeFighterAutomation,normalizeMonkAutomation,normalizeRogueAutomation});
}
