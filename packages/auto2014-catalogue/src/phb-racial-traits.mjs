import {createActivityTools} from './activities.mjs';
/** Existing PHB racial preparation with caller-owned source identities and templates. */
export function createPhbRacialTools({moduleId, bindings: input, advancementTools, passiveTools}) {
  if (typeof moduleId !== 'string' || !moduleId || !input || typeof input !== 'object') throw Error('Missing racial bindings');
  const bindings = JSON.parse(JSON.stringify(input));
  for (const key of ['ids','labels','spells','identifiers','dragonbornBreath']) {
    if (!bindings[key] || typeof bindings[key] !== 'object' || Array.isArray(bindings[key])) throw Error('Missing racial binding table');
  }
  for (const key of ["poisonResistance1","poisonResistance2","fireResistance","skillVersatility","keenSenses","weaponTraining","fleetOfFoot","aquaticHeritage","drowMagic","dwarvenToughness","halflingLucky","halflingNimbleness","relentlessEndurance"]) if (typeof bindings.ids[key] !== 'string' || !bindings.ids[key]) throw Error('Missing racial identity');
  for (const key of ["skillVersatility","keenSenses","weaponTraining","drowMagic"]) if (typeof bindings.labels[key] !== 'string' || !bindings.labels[key]) throw Error('Missing racial label');
  for (const key of ['dancingLightsSpellId','faerieFireSpellId','officialDarknessSpellId']) if (typeof bindings.spells[key] !== 'string' || !bindings.spells[key]) throw Error('Missing racial spell identity');
  const {traitAdvancement, innateSpellGrant} = advancementTools ?? {};
  const {setPassiveEffects, passiveTransferEffect} = passiveTools ?? {};
  if ([traitAdvancement,innateSpellGrant,setPassiveEffects,passiveTransferEffect].some(fn => typeof fn !== 'function')) throw Error('Missing shared racial preparation tools');
  const {keepOnlyActivity} = createActivityTools({moduleId, spellAutomationProfiles: {}});
  function addResistanceEffect(doc, damageType, id) {
    setPassiveEffects(doc, [passiveTransferEffect(doc, {
      id,
      changes: [{ key: "system.traits.dr.value", mode: 2, value: damageType, priority: 20 }],
      flags: { racialPassive: true, damageResistance: damageType },
    })]);
  }

  function addBooleanFlagEffect(doc, flagKey, id) {
    setPassiveEffects(doc, [passiveTransferEffect(doc, {
      id,
      changes: [{ key: `flags.dnd5e.${flagKey}`, mode: 5, value: "true", priority: 20 }],
      flags: { racialPassive: true, dnd5eFlag: flagKey },
    })]);
  }

  function normalizeDragonbornBreath(doc) {
    const dragonbornBreath = bindings.dragonbornBreath[doc._id];
    if (!dragonbornBreath) return false;
    doc.system.identifier = dragonbornBreath.identifier;
    doc.system.uses ??= {};
    doc.system.uses.max = "1";
    doc.system.uses.spent ??= 0;
    doc.system.uses.recovery = [{ period: "sr", type: "recoverAll" }, { period: "lr", type: "recoverAll" }];
    const activity = Object.values(doc.system?.activities ?? {}).find(activity => activity.type === "save")
      ?? Object.values(doc.system?.activities ?? {})[0];
    if (!activity) return true;
    activity.type = "save";
    activity.activation ??= {};
    activity.activation.type = "action";
    activity.consumption ??= {};
    activity.consumption.targets = [{ type: "itemUses", target: "", value: "1", scaling: { mode: "", formula: "" } }];
    activity.damage ??= {};
    activity.damage.onSave = "half";
    activity.damage.parts = [{
      number: null,
      denomination: null,
      bonus: "",
      types: [dragonbornBreath.damageType],
      custom: { enabled: true, formula: "@scale.dragonborn.breath-weapon" },
      scaling: { mode: "whole", number: null, formula: "" },
    }];
    activity.save ??= {};
    activity.save.ability = [dragonbornBreath.save];
    activity.save.dc = { ...(activity.save.dc ?? {}), calculation: "con", formula: "" };
    activity.target ??= {};
    activity.target.prompt = true;
    activity.target.template = {
      count: "",
      contiguous: false,
      type: dragonbornBreath.shape,
      size: dragonbornBreath.size,
      width: dragonbornBreath.width,
      height: "",
      units: "ft",
    };
    activity.midiProperties ??= {};
    activity.midiProperties.forceConsumeDialog = "never";
    activity.midiProperties.forceRollDialog = "never";
    activity.midiProperties.confirmTargets = "never";
    keepOnlyActivity(doc, activity);
    return true;
  }

  function normalizePhbRacialTrait(doc) {
    const identifiers = bindings.identifiers;
    if (identifiers[doc._id]) doc.system.identifier = identifiers[doc._id];

    if (doc._id === bindings.ids.poisonResistance1 || doc._id === bindings.ids.poisonResistance2) addResistanceEffect(doc, "poison", "arcPoisonResistance01");
    if (doc._id === bindings.ids.fireResistance) addResistanceEffect(doc, "fire", "arcFireResistance01");
    if (doc._id === bindings.ids.skillVersatility) {
      doc.system.advancement = [
        traitAdvancement({
          id: "arcHalfElfSkillVersatilityTrait01",
          title: bindings.labels.skillVersatility,
          choices: [{ count: 2, pool: ["skills:*"] }],
        }),
      ];
    }
    if (doc._id === bindings.ids.keenSenses) {
      doc.system.advancement = [
        traitAdvancement({
          id: "arcKeenSensesTrait01",
          title: bindings.labels.keenSenses,
          grants: ["skills:prc"],
        }),
      ];
    }
    if (doc._id === bindings.ids.weaponTraining) {
      doc.system.advancement = [
        traitAdvancement({
          id: "arcElfWeaponTrainingTrait01",
          title: bindings.labels.weaponTraining,
          grants: [
            "weapon:mar:longsword",
            "weapon:mar:shortsword",
            "weapon:mar:longbow",
            "weapon:mar:shortbow",
          ],
        }),
      ];
    }
    if (doc._id === bindings.ids.fleetOfFoot) {
      setPassiveEffects(doc, [passiveTransferEffect(doc, {
        id: "arcFleetOfFootWalk01",
        changes: [{ key: "system.attributes.movement.walk", mode: 4, value: "35", priority: 20 }],
        flags: { racialPassive: true, movement: "walk", minimum: 35 },
      })]);
    }
    if (doc._id === bindings.ids.aquaticHeritage) {
      setPassiveEffects(doc, [passiveTransferEffect(doc, {
        id: "arcHalfElfAquaticHeritageSwim01",
        changes: [{ key: "system.attributes.movement.swim", mode: 4, value: "30", priority: 20 }],
        flags: { racialPassive: true, movement: "swim", minimum: 30 },
      })]);
    }
    if (doc._id === bindings.ids.drowMagic) {
      doc.system.uses ??= {};
      doc.system.uses.max = "";
      doc.system.uses.spent = 0;
      doc.system.uses.recovery = [];
      doc.system.advancement = [
        innateSpellGrant({
          id: "arcDrowMagicDancingLights00",
          level: 0,
          title: bindings.labels.drowMagic,
          spellId: bindings.spells.dancingLightsSpellId,
        }),
        innateSpellGrant({
          id: "arcDrowMagicFaerieFire03",
          level: 3,
          title: bindings.labels.drowMagic,
          spellId: bindings.spells.faerieFireSpellId,
          usesMax: "1",
          usesPer: "lr",
        }),
        innateSpellGrant({
          id: "arcDrowMagicDarkness05",
          level: 5,
          title: bindings.labels.drowMagic,
          spellId: bindings.spells.officialDarknessSpellId,
          usesMax: "1",
          usesPer: "lr",
        }),
      ];
    }
    if (doc._id === bindings.ids.dwarvenToughness) {
      setPassiveEffects(doc, [passiveTransferEffect(doc, {
        id: "arcDwarvenToughness01",
        changes: [{ key: "system.attributes.hp.bonuses.level", mode: 2, value: "+1", priority: 20 }],
        flags: { racialPassive: true, hpPerLevel: 1 },
      })]);
    }
    if (doc._id === bindings.ids.halflingLucky) addBooleanFlagEffect(doc, "halflingLucky", "arcHalflingLucky01");
    if (doc._id === bindings.ids.halflingNimbleness) addBooleanFlagEffect(doc, "halflingNimbleness", "arcHalflingNimbleness01");
    if (doc._id === bindings.ids.relentlessEndurance) {
      doc.system.uses ??= {};
      doc.system.uses.max = "1";
      doc.system.uses.spent ??= 0;
      doc.system.uses.recovery = [{ period: "lr", type: "recoverAll" }];
      doc.flags ??= {};
      doc.flags[moduleId] = {
        ...(doc.flags[moduleId] ?? {}),
        fatalDamageInterception: {
          version: 1,
          kind: "relentless-endurance",
          rank: 200,
          minimumHitPoints: 1,
        },
      };
      const activity = Object.values(doc.system?.activities ?? {})[0];
      if (activity) {
        activity.target ??= {};
        activity.target.prompt = false;
        activity.midiProperties ??= {};
        activity.midiProperties.forceConsumeDialog = "never";
        activity.midiProperties.confirmTargets = "never";
        activity.midiProperties.removeChatButtons = "all";
        keepOnlyActivity(doc, activity);
      }
    }
    normalizeDragonbornBreath(doc);
  }

  return Object.freeze({addResistanceEffect,addBooleanFlagEffect,normalizeDragonbornBreath,normalizePhbRacialTrait});
}
