import {createActivityTools} from './activities.mjs';

/** Existing Warlock/Ranger content adapters, driven by explicit caller bindings. */
export function createClassFeatureAdapters({moduleId, uuidFor, content: input}) {
  if (typeof uuidFor !== 'function' || !input || typeof input !== 'object') throw Error('Missing class feature bindings');
  const content = JSON.parse(JSON.stringify(input));
  for (const map of [content.warlockImages, content.rangerImages]) {
    if (!map || typeof map !== 'object' || Array.isArray(map) || Object.values(map).some(value => typeof value !== 'string')) throw Error('Invalid class feature image mappings');
  }
  for (const [bindings, keys] of [[content.warlock, ['pactMagicId','armorOfShadowsId','activityId','activityName','effectName']], [content.ranger, ['favoredFoeFeatureId','deftExplorerFeatureId','cannyFeatureId','rovingFeatureId']]]) {
    if (!bindings || keys.some(key => typeof bindings[key] !== 'string' || !bindings[key])) throw Error('Missing class feature identity or text');
  }
  const {ensureUtilityActivity, keepOnlyActivity} = createActivityTools({moduleId, spellAutomationProfiles: {}});
  function normalizeWarlockAutomation(doc) {
    const officialImageById = content.warlockImages;
    const officialImage = officialImageById[doc._id];
    if (officialImage) {
      doc.img = officialImage;
      for (const effect of doc.effects ?? []) {
        if (typeof effect.img === "string" && effect.img.includes("/Nicons/")) effect.img = officialImage;
      }
    }
    if (doc._id === content.warlock.pactMagicId && doc.system?.description?.value) {
      doc.system.description.value = doc.system.description.value.replace(
        /@UUID\[Compendium\.dnd5e_classpack\.itempack\.[^\]]*\]\{?/,
        "",
      );
    }
    if (doc._id === content.warlock.armorOfShadowsId) {
      const activity = Object.values(doc.system?.activities ?? {})[0] ?? ensureUtilityActivity(doc, content.warlock.activityId);
      activity.type = "utility";
      activity.name = activity.name || content.warlock.activityName;
      delete activity.spell;
      activity.activation ??= {};
      activity.activation.type = "action";
      activity.activation.value = null;
      activity.consumption ??= {};
      activity.consumption.targets = [];
      activity.consumption.spellSlot = false;
      activity.consumption.scaling ??= { allowed: false, max: "" };
      activity.duration ??= {};
      activity.duration.concentration = false;
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
      activity.target.template = {
        count: "",
        contiguous: false,
        type: "",
        size: "",
        width: "",
        height: "",
        units: "",
      };
      activity.effects = [];
      activity.midiProperties ??= {};
      activity.midiProperties.forceConsumeDialog = "never";
      activity.midiProperties.forceRollDialog = "never";
      activity.midiProperties.forceDamageDialog = "never";
      activity.midiProperties.confirmTargets = "never";
      activity.midiProperties.chooseEffects = false;
      activity.midiProperties.removeChatButtons = "all";
      keepOnlyActivity(doc, activity);
      doc.effects = [{
        _id: "arcArmorShadow01",
        name: content.warlock.effectName,
        origin: uuidFor("classfeatures", doc._id),
        transfer: true,
        disabled: false,
        type: "base",
        system: {},
        changes: [{ key: "system.attributes.ac.calc", mode: 5, value: "mage", priority: 20 }],
        duration: {},
        statuses: [],
        flags: {
          dae: {
            specialDuration: [],
            stackable: "noneName",
            showIcon: false,
          },
          [moduleId]: {
            armorOfShadowsMageArmor: true,
          },
        },
        img: doc.img,
      }];
    }
  }

  function normalizeRangerTceFeatureAutomation(doc) {
    const icon = content.rangerImages[doc._id];
    if (icon) {
      doc.img = icon;
      for (const effect of doc.effects ?? []) {
        if (typeof effect.img === "string" && effect.img.includes("/Nicons/")) effect.img = icon;
      }
    }

    if (doc._id === content.ranger.favoredFoeFeatureId) {
      doc.flags ??= {};
      doc.flags[moduleId] = {
        ...(doc.flags[moduleId] ?? {}),
        favoredFoe: true,
        damageScale: {
          1: "1d4",
          6: "1d6",
          14: "1d8",
        },
      };
    }

    if (doc._id === content.ranger.deftExplorerFeatureId || doc._id === content.ranger.cannyFeatureId) {
      doc.system.advancement = [];
    }

    if (doc._id === content.ranger.rovingFeatureId) {
      const effect = doc.effects?.[0];
      if (effect) {
        effect.transfer = true;
        effect.changes = [
          { key: "system.attributes.movement.walk", mode: 2, value: "5", priority: 20 },
          { key: "system.attributes.movement.climb", mode: 5, value: "@attributes.movement.walk", priority: 20 },
          { key: "system.attributes.movement.swim", mode: 5, value: "@attributes.movement.walk", priority: 20 },
        ];
      }
    }
  }
  return Object.freeze({normalizeWarlockAutomation,normalizeRangerTceFeatureAutomation});
}
