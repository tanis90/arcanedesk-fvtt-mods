import {createActivityTools} from './activities.mjs';

/** Existing class effect preparation using caller-owned effect identities and labels. */
export function createClassEffectTools({moduleId, uuidFor, bindings: input}) {
  if (typeof uuidFor !== 'function' || !input || typeof input !== 'object') throw Error('Missing class effect bindings');
  const bindings = JSON.parse(JSON.stringify(input));
  for (const [values, keys] of [[bindings.effectIds, ["abjure","vow"]], [bindings.labels, ["abjureLegacy","abjure","vow","turned","undeadTarget","vigilant","twilight","steps","umbral","font","counter"]]]) {
    if (!values || keys.some(key => typeof values[key] !== 'string' || !values[key])) throw Error('Missing class effect identity or label');
  }
  const {normalizeActivityForFullAutomation} = createActivityTools({moduleId, spellAutomationProfiles: {}});
  function normalizeAbjureEnemyAutomation(doc) {
    if (doc.system?.identifier !== "channel-divinity-abjure-enemy") return;

    const activity = Object.values(doc.system?.activities ?? {}).find(candidate => candidate.type === "save");
    if (!activity) return;

    const effect = doc.effects.find(candidate => candidate._id === bindings.effectIds.abjure) ?? doc.effects[0];
    if (effect) {
      effect.name = bindings.labels.abjureLegacy;
      effect.name = bindings.labels.abjure;
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
        specialDuration: ["isDamaged"],
      };
      effect.flags.dnd5e ??= { riders: { statuses: [] } };
      effect.flags.core ??= { overlay: false };
    }

    normalizeActivityForFullAutomation(activity);
    if (effect) activity.effects = [{ _id: effect._id, level: {}, onSave: false }];
    activity.damage ??= {};
    activity.damage.onSave = "none";
    activity.save ??= {};
    activity.save.ability = ["wis"];
    activity.save.dc = {
      ...(activity.save.dc ?? {}),
      calculation: "spellcasting",
      formula: "",
    };
  }

  function normalizeVowOfEnmityAutomation(doc) {
    if (doc.system?.identifier !== "channel-divinity-vow-of-enmity") return;

    const activity = Object.values(doc.system?.activities ?? {}).find(candidate => candidate.type === "utility");
    if (!activity) return;

    const effect = doc.effects.find(candidate => candidate._id === bindings.effectIds.vow) ?? doc.effects[0];
    if (effect) {
      effect.name = bindings.labels.vow;
      effect.name = bindings.labels.vow;
      effect.origin = uuidFor("classfeatures", doc._id);
      effect.transfer = false;
      effect.disabled = false;
      effect.type = "base";
      effect.system ??= {};
      effect.changes ??= [];
      effect.statuses = [];
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
        specialDuration: ["combatEnd"],
      };
      effect.flags[moduleId] = {
        ...(effect.flags[moduleId] ?? {}),
        vowOfEnmity: true,
      };
      effect.flags.dnd5e ??= { riders: { statuses: [] } };
      effect.flags.core ??= { overlay: false };
    }

    activity.range ??= {};
    activity.range.value = "10";
    activity.range.units = "ft";
    activity.target ??= {};
    activity.target.prompt = true;
    activity.target.override = false;
    activity.target.affects = {
      ...(activity.target.affects ?? {}),
      count: "1",
      type: "creature",
      choice: false,
      special: "",
    };
    activity.target.template ??= {};
    activity.target.template.type = "";

    activity.midiProperties ??= {};
    activity.midiProperties.forceConsumeDialog = "never";
    activity.midiProperties.forceRollDialog = "never";
    activity.midiProperties.forceDamageDialog = "never";
    activity.midiProperties.confirmTargets = "always";
    activity.midiProperties.chooseEffects = false;
    activity.midiProperties.removeChatButtons = "all";
    if (effect) activity.effects = [{ _id: effect._id, level: {}, onSave: false }];
  }

  function normalizeBardicInspiration(doc) {
    if (doc.system?.identifier !== "bardic-inspiration") return;
    doc.system.uses ??= {};
    doc.system.uses.max = "max(@abilities.cha.mod, 1)";
    doc.system.uses.spent ??= 0;
    doc.system.uses.recovery = [{ period: "lr", type: "recoverAll" }];
    doc.effects = [];
    const activity = Object.values(doc.system?.activities ?? {})[0];
    if (activity) {
      activity.activation ??= {};
      activity.activation.type = "bonus";
      activity.range ??= {};
      activity.range.value = "60";
      activity.range.units = "ft";
      activity.target ??= {};
      activity.target.prompt = true;
      activity.target.affects = { ...(activity.target.affects ?? {}), type: "creature", count: "1", choice: false };
      activity.consumption ??= {};
      activity.consumption.targets = [{ type: "itemUses", value: "1", target: "" }];
      activity.effects = [];
      activity.midiProperties ??= {};
      activity.midiProperties.forceConsumeDialog = "never";
      activity.midiProperties.forceRollDialog = "never";
      activity.midiProperties.forceDamageDialog = "never";
      activity.midiProperties.confirmTargets = "never";
      activity.midiProperties.chooseEffects = false;
      activity.midiProperties.removeChatButtons = "all";
    }
  }

  function normalizeFontOfInspiration(doc) {
    if (doc.system?.identifier !== "font-of-inspiration") return;
    doc.effects = [
      {
        _id: "arcFontInspire01",
        name: bindings.labels.font,
        origin: uuidFor("classfeatures", doc._id),
        transfer: true,
        disabled: false,
        type: "base",
        system: {},
        changes: [
          {
            key: `flags.${moduleId}.bardicInspirationRecovery`,
            mode: 5,
            value: "sr",
            priority: 20,
          },
        ],
        duration: {},
        statuses: [],
        flags: {},
        img: doc.img,
      },
    ];
  }

  function normalizeCountercharm(doc) {
    if (doc.system?.identifier !== "countercharm") return;
    doc.effects = [
      {
        _id: "arcCountercharm01",
        name: bindings.labels.counter,
        origin: uuidFor("classfeatures", doc._id),
        transfer: false,
        disabled: false,
        type: "base",
        system: {},
        changes: [],
        duration: { rounds: 1, seconds: 6 },
        statuses: [],
        flags: {
          [moduleId]: {
            countercharm: true,
          },
        },
        img: doc.img,
      },
    ];
    const activity = Object.values(doc.system?.activities ?? {})[0];
    if (activity) {
      activity.target ??= {};
      activity.target.prompt = false;
      activity.target.affects = { ...(activity.target.affects ?? {}), count: "", type: "self", choice: false };
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
      activity.range.value = "";
      activity.range.units = "self";
      activity.effects = [];
      activity.midiProperties ??= {};
      activity.midiProperties.forceConsumeDialog = "never";
      activity.midiProperties.forceRollDialog = "never";
      activity.midiProperties.forceDamageDialog = "never";
      activity.midiProperties.confirmTargets = "never";
      activity.midiProperties.chooseEffects = false;
      activity.midiProperties.removeChatButtons = "all";
    }
  }

  function normalizeChannelDivinity(doc) {
    if (doc.system?.identifier !== "channel-divinity") return;
    doc.system.uses ??= {};
    doc.system.uses.max = "ceil((@classes.cleric.levels >= 18 ? 3 : @classes.cleric.levels >= 6 ? 2 : 1))";
    doc.system.uses.spent ??= 0;
    doc.system.uses.recovery = [{ period: "sr", type: "recoverAll" }];
  }

  function normalizeTurnUndead(doc) {
    if (doc.system?.identifier !== "channel-divinity-turn-undead") return;
    const activity = Object.values(doc.system?.activities ?? {}).find(candidate => candidate.type === "save");
    if (!activity) return;
    const effect = {
      _id: "arcTurnUndead01",
      name: bindings.labels.turned,
      origin: uuidFor("classfeatures", doc._id),
      transfer: false,
      disabled: false,
      type: "base",
      system: {},
      changes: [],
      duration: { seconds: 60, rounds: 10, turns: null },
      statuses: [],
      flags: {
        dae: {
          specialDuration: ["isDamaged", "combatEnd"],
          stackable: "noneName",
          showIcon: true,
        },
        [moduleId]: {
          turnedUndead: true,
        },
      },
      img: doc.img,
    };
    doc.effects = [effect];
    activity.consumption ??= {};
    activity.consumption.targets = [{ type: "itemUses", value: "1", target: "channel-divinity" }];
    activity.save ??= {};
    activity.save.ability = ["wis"];
    activity.save.dc = { ...(activity.save.dc ?? {}), calculation: "spellcasting", formula: "" };
    activity.effects = [];
    activity.target ??= {};
    activity.target.prompt = false;
    delete activity.target.type;
    delete activity.target.value;
    delete activity.target.units;
    delete activity.target.width;
    activity.target.affects = { ...(activity.target.affects ?? {}), type: "creature", count: "", choice: false, special: bindings.labels.undeadTarget };
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
    activity.range.value = "30";
    activity.range.units = "ft";
    activity.midiProperties ??= {};
    activity.midiProperties.forceConsumeDialog = "never";
    activity.midiProperties.forceRollDialog = "never";
    activity.midiProperties.confirmTargets = "never";
    activity.midiProperties.effectConditionText = 'raceOrType === "undead"';
  }

  function normalizeVigilantBlessing(doc) {
    if (doc.system?.identifier !== "vigilant-blessing") return;
    const effect = {
      _id: "arcVigilBless01",
      name: bindings.labels.vigilant,
      origin: uuidFor("classfeatures", doc._id),
      transfer: false,
      disabled: false,
      type: "base",
      system: {},
      changes: [],
      duration: {},
      statuses: [],
      flags: {
        [moduleId]: {
          vigilantBlessing: true,
        },
      },
      img: doc.img,
    };
    doc.effects = [effect];
    const activity = Object.values(doc.system?.activities ?? {})[0];
    if (activity) {
      activity.effects = [{ _id: effect._id, level: {}, onSave: false }];
      activity.target ??= {};
      activity.target.prompt = true;
      activity.target.affects = { ...(activity.target.affects ?? {}), type: "creature", count: "1", choice: false };
    }
  }

  function normalizeTwilightSanctuary(doc) {
    if (doc.system?.identifier !== "channel-divinity-twilight-sanctuary") return;
    const effect = {
      _id: "arcTwilightSan01",
      name: bindings.labels.twilight,
      origin: uuidFor("classfeatures", doc._id),
      transfer: false,
      disabled: false,
      type: "base",
      system: {},
      changes: [],
      duration: { seconds: 60, rounds: 10, turns: null },
      statuses: [],
      flags: {
        dae: {
          specialDuration: ["combatEnd"],
          stackable: "noneName",
          showIcon: true,
        },
        [moduleId]: {
          twilightSanctuary: true,
        },
      },
      img: doc.img,
    };
    doc.effects = [effect];
    const activity = Object.values(doc.system?.activities ?? {})[0];
    if (activity) {
      activity.type = "utility";
      activity.consumption ??= {};
      activity.consumption.targets = [{ type: "itemUses", value: "1", target: "channel-divinity" }];
      activity.effects = [];
      activity.range ??= {};
      activity.range.value = "30";
      activity.range.units = "self";
      activity.target ??= {};
      delete activity.target.type;
      delete activity.target.value;
      delete activity.target.units;
      delete activity.target.width;
      activity.target.template = {
        count: "",
        contiguous: false,
        type: "",
        size: "",
        width: "",
        height: "",
        units: "",
      };
      activity.target.affects = { count: "", type: "", choice: false, special: "" };
      activity.target.prompt = false;
      activity.midiProperties ??= {};
      activity.midiProperties.forceConsumeDialog = "never";
      activity.midiProperties.confirmTargets = "never";
    }
  }

  function normalizeStepsOfNight(doc) {
    if (doc.system?.identifier !== "steps-of-night") return;
    const effect = {
      _id: "arcStepsNight01",
      name: bindings.labels.steps,
      origin: uuidFor("classfeatures", doc._id),
      transfer: false,
      disabled: false,
      type: "base",
      system: {},
      changes: [{ key: "system.attributes.movement.fly", mode: 4, value: "30", priority: 20 }],
      duration: { seconds: 60, rounds: 10, turns: null },
      statuses: [],
      flags: { dae: { specialDuration: ["combatEnd"], stackable: "noneName", showIcon: true } },
      img: doc.img,
    };
    doc.effects = [effect];
    const activity = Object.values(doc.system?.activities ?? {})[0];
    if (activity) {
      activity.effects = [{ _id: effect._id, level: {}, onSave: false }];
      activity.target ??= {};
      activity.target.prompt = false;
    }
  }

  function normalizeDreadAmbusher(doc) {
    if (doc.system?.identifier !== "dread-ambusher") return;
    doc.flags ??= {};
    doc.flags[moduleId] = {
      ...(doc.flags[moduleId] ?? {}),
      declaredRider: { id: "dread-ambusher", timing: "on-hit-extra-damage" },
    };
    doc.system.uses ??= {};
    doc.system.uses.max = "1";
    doc.system.uses.spent = 0;
    doc.system.uses.recovery = [{ period: "turnStart", type: "recoverAll" }];
    const activity = Object.values(doc.system?.activities ?? {}).find(candidate => candidate.type === "damage");
    if (activity) {
      activity.activation ??= {};
      activity.activation.type = "special";
      activity.damage ??= {};
      activity.damage.parts = [
        {
          number: 1,
          denomination: 8,
          bonus: "",
          types: ["weapon"],
          custom: { enabled: false, formula: "" },
          scaling: { mode: "", number: 1 },
        },
      ];
    }
  }

  function normalizeUmbralSight(doc) {
    if (doc.system?.identifier !== "umbral-sight") return;
    const effect = {
      _id: "arcUmbralSight01",
      name: bindings.labels.umbral,
      origin: uuidFor("classfeatures", doc._id),
      transfer: true,
      disabled: false,
      type: "base",
      system: {},
      changes: [{ key: "system.attributes.senses.darkvision", mode: 4, value: "90", priority: 20 }],
      duration: {},
      statuses: [],
      flags: {},
      img: doc.img,
    };
    doc.effects = [effect];
  }

  function normalizeDivineSmite(doc) {
    if (doc.system?.identifier !== "divine-smite") return;
    doc.flags ??= {};
    doc.flags[moduleId] = {
      ...(doc.flags[moduleId] ?? {}),
      declaredRider: {
        id: "divine-smite",
        consumesOn: "hit",
        consumes: "spell-slot-on-hit",
        minSpellLevel: 1,
        damageType: "radiant",
      },
    };
    for (const activity of Object.values(doc.system?.activities ?? {})) {
      if (activity.type !== "damage") continue;
      activity.activation ??= {};
      activity.activation.type = "special";
      activity.consumption ??= {};
      activity.consumption.targets = [];
      activity.consumption.spellSlot = false;
      activity.midiProperties ??= {};
      activity.midiProperties.automationOnly = true;
      activity.midiProperties.forceDamageDialog = "never";
    }
  }

  function normalizeFightingStyleAutomation(doc) {
    const automationByIdentifier = {
      "fighting-style-dueling": "dueling",
      "fighting-style-great-weapon-fighting": "great-weapon-fighting",
    };
    const automation = automationByIdentifier[doc.system?.identifier];
    if (!automation) return;

    doc.flags ??= {};
    doc.flags[moduleId] = {
      ...(doc.flags[moduleId] ?? {}),
      automation: {
        type: "fighting-style",
        style: automation,
      },
    };
  }

  function normalizeAuraOfProtection(doc) {
    if (doc.system?.identifier !== "aura-of-protection") return;

    // Saving throw bonuses are applied by the Arcane runtime hook so the aura
    // can enforce range, disposition, consciousness, and strongest-source
    // selection consistently. The donor's ActiveAuras effect applies the same
    // Charisma bonus independently and would therefore double the result.
    doc.effects = [];
    if (doc.flags?.dnd5e?.riders) doc.flags.dnd5e.riders.effect = [];
  }
  return Object.freeze({normalizeAbjureEnemyAutomation,normalizeVowOfEnmityAutomation,normalizeBardicInspiration,normalizeFontOfInspiration,normalizeCountercharm,normalizeChannelDivinity,normalizeTurnUndead,normalizeVigilantBlessing,normalizeTwilightSanctuary,normalizeStepsOfNight,normalizeDreadAmbusher,normalizeUmbralSight,normalizeDivineSmite,normalizeFightingStyleAutomation,normalizeAuraOfProtection});
}
