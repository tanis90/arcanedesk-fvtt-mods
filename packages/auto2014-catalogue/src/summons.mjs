// Arcane summon assembly implementation. Content and trusted validation data are caller inputs.
// Data providers are explicit arguments. This module performs no content loading or writes.
import { createHash } from "node:crypto";
const moduleId = "arcane-dnd5e-2014-automation";
function clone(value) { return JSON.parse(JSON.stringify(value)); }
export function createSummonAssembler(rawContracts) {
  const tableNames = ["expectedSummonProfileRecipes","expectedSummonProfileDocuments","expectedSummonPoolProfiles","expectedSummonRecipeRulesModels","expectedSummonRecipeActionIds","expected2014SummonProfiles"];
  assertSummonExactKeys(rawContracts, ["schemaVersion", ...tableNames], "summon validation contracts");
  assertSummonSource(rawContracts.schemaVersion === 1, "unsupported summon validation contracts schemaVersion");
  const contracts = clone(rawContracts);
  for (const name of tableNames) {
    const entries = contracts[name];
    assertSummonSource(Array.isArray(entries) && entries.length > 0, `validation contracts ${name} must be a nonempty entry array`);
    assertSummonSource(entries.every(entry => Array.isArray(entry) && entry.length === 2 && typeof entry[0] === "string"), `validation contracts ${name} have invalid entries`);
    assertSummonSource(new Set(entries.map(entry => entry[0])).size === entries.length, `validation contracts ${name} repeat a key`);
  }
  assertSummonSource(contracts.expectedSummonPoolProfiles.every(([, values]) => Array.isArray(values)), "validation contract pool values must be arrays");
const summonFoundryIdPattern = /^[A-Za-z0-9]{16}$/;
const expectedSummonProfileRecipes = new Map(contracts.expectedSummonProfileRecipes);
const expectedSummonProfileDocuments = new Map(contracts.expectedSummonProfileDocuments);
const expectedSummonPoolProfiles = new Map(contracts.expectedSummonPoolProfiles.map(([key, values]) => [key, new Set(values)]));

const expectedSummonRecipeRulesModels = new Map(contracts.expectedSummonRecipeRulesModels);
const expectedSummonRecipeActionIds = new Map(contracts.expectedSummonRecipeActionIds);

function assertSummonSource(condition, message) {
  if (!condition) throw new Error(`Summon source contract: ${message}`);
}

function summonModuleExport(namespace, names, label, { allowDefaultCollection = false } = {}) {
  const containers = [namespace, namespace?.default]
    .filter(value => value && typeof value === "object" && !Array.isArray(value));
  for (const container of containers) {
    for (const name of names) {
      if (container[name] !== undefined) return container[name];
    }
  }
  if (allowDefaultCollection && (Array.isArray(namespace?.default) || namespace?.default instanceof Map)) {
    return namespace.default;
  }
  throw new Error(`Missing ${label} export (${names.join(" / ")})`);
}

function summonDefinitionArray(value, idFields, label) {
  let entries;
  if (Array.isArray(value)) entries = value.map((entry, index) => [String(index), entry]);
  else if (value instanceof Map) entries = [...value.entries()];
  else if (value && typeof value === "object") entries = Object.entries(value);
  else throw new Error(`${label} must be an Array, Map, or plain object`);
  return entries.map(([key, raw]) => {
    assertSummonSource(raw && typeof raw === "object" && !Array.isArray(raw), `${label}.${key} must be an object`);
    const entry = clone(raw);
    if (!idFields.some(field => typeof entry[field] === "string" && entry[field].length)) {
      entry[idFields[0]] = key;
    }
    return entry;
  });
}

function summonProfileIdentity(profile) {
  return {
    profileId: profile.profileId ?? profile.id,
    revision: profile.revision ?? profile.profileRevision,
    documentId: profile.documentId ?? profile.actorId,
    recipeId: profile.recipeId,
    rulesModel: profile.rulesModel,
    summonUsage: profile.summonUsage,
  };
}

function stableSummonId(...parts) {
  return createHash("sha256").update(parts.join(":"), "utf8").digest("hex").slice(0, 16);
}

function summonRollConfig(ability = "") {
  return { ability, roll: { min: null, max: null, mode: 0 } };
}

function summonAbilitySource(value, proficient = 0) {
  return {
    value,
    proficient,
    max: null,
    bonuses: { check: "", save: "" },
    check: { roll: { min: null, max: null, mode: 0 } },
    save: { roll: { min: null, max: null, mode: 0 } },
  };
}

function summonDamageTrait(values, bypasses = []) {
  const foundryBypasses = bypasses.map(bypass => {
    assertSummonSource(bypass === "magical", `unsupported damage-trait bypass ${bypass}`);
    return "mgc";
  });
  return { value: [...values], custom: "", bypasses: foundryBypasses };
}

function assertSummonExactKeys(value, expected, label) {
  assertSummonSource(value && typeof value === "object" && !Array.isArray(value), `${label} must be an object`);
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  assertSummonSource(
    JSON.stringify(actual) === JSON.stringify(wanted),
    `${label} keys must be exactly ${wanted.join(", ")}; got ${actual.join(", ")}`,
  );
}

function assertLegacySummonActionSource(action, recipeId) {
  const label = `recipe ${recipeId} action ${action?.actionId ?? "<missing>"}`;
  assertSummonSource(action && typeof action === "object" && !Array.isArray(action), `${label} must be an object`);
  const attackKeys = ["actionId", "actionType", "activation", "attackBonus", "damage", "opportunityAttackEligible", "resource", "target"];
  const saveKeys = ["actionId", "actionType", "activation", "damage", "damageOnSuccessfulSave", "resource", "savingThrow", "target"];
  assertSummonExactKeys(
    action,
    action.rider === undefined ? (action.actionType === "melee-spell-attack" ? attackKeys : saveKeys) : [...attackKeys, "rider"],
    label,
  );
  assertSummonExactKeys(action.activation, ["cost", "type"], `${label} activation`);
  assertSummonExactKeys(action.target, ["count", "kind", "range", "selection"], `${label} target`);
  assertSummonExactKeys(action.target.range, ["distance", "units"], `${label} target range`);
  assertSummonSource(
    ["melee-spell-attack", "saving-throw"].includes(action.actionType),
    `${label} has unsupported actionType ${action.actionType}`,
  );
  assertSummonSource(
    ["bonus-action", "special"].includes(action.activation?.type)
      && Number.isInteger(action.activation?.cost)
      && action.activation.cost >= 0,
    `${label} activation must be a closed type and non-negative integer cost`,
  );
  assertSummonSource(
    action.target?.kind === "creature"
      && action.target?.count === 1
      && action.target?.selection === "explicit"
      && Number.isFinite(action.target?.range?.distance)
      && action.target.range.distance >= 0
      && action.target.range.units === "ft",
    `${label} target must be one explicitly selected creature at a closed ft range`,
  );
  assertSummonSource(
    ["at-will", "limited-use"].includes(action.resource?.type),
    `${label} has unsupported resource type ${action.resource?.type}`,
  );
  assertSummonSource(
    action.resource.consumesSourceSpellSlot === false,
    `${label} must explicitly forbid source spell-slot consumption`,
  );
  assertSummonSource(
    action.opportunityAttackEligible === undefined || action.opportunityAttackEligible === false,
    `${label} must not enable opportunity attacks`,
  );
  if (action.resource.type === "limited-use") {
    assertSummonExactKeys(
      action.resource,
      ["consumesSourceSpellSlot", "maximum", "recovery", "type"],
      `${label} resource`,
    );
    assertSummonSource(
      Number.isInteger(action.resource.maximum)
        && action.resource.maximum > 0
        && Array.isArray(action.resource.recovery)
        && action.resource.recovery.length === 1
        && ["short-rest", "long-rest"].includes(action.resource.recovery[0]?.period)
        && action.resource.recovery[0]?.amount === action.resource.maximum,
      `${label} limited-use resource must be positive and have one matching closed recovery`,
    );
    assertSummonExactKeys(action.resource.recovery[0], ["amount", "period"], `${label} recovery`);
  } else {
    assertSummonExactKeys(action.resource, ["consumesSourceSpellSlot", "type"], `${label} resource`);
  }
  assertSummonSource(
    Array.isArray(action.damage) && action.damage.length === 1,
    `${label} must declare exactly one damage entry`,
  );
  const [damage] = action.damage;
  assertSummonExactKeys(damage, ["damageType", "value"], `${label} damage`);
  if (damage.value?.type === "constant") {
    assertSummonExactKeys(damage.value, ["type", "value"], `${label} damage value`);
    assertSummonSource(
      damage.value.value === 1 && damage.damageType === "force",
      `${label} constant damage must remain the Spiritual Weapon base 1 force`,
    );
  } else {
    assertSummonExactKeys(
      damage.value,
      ["bonus", "denomination", "number", "type"],
      `${label} damage value`,
    );
    assertSummonSource(
      damage.value?.type === "dice"
        && damage.value.number === 1
        && damage.value.denomination === 6
        && damage.value.bonus === ""
        && damage.damageType === "fire",
      `${label} dice damage must remain the Flaming Sphere base 1d6 fire`,
    );
  }
  if (action.actionType === "melee-spell-attack") {
    assertSummonExactKeys(action.attackBonus, ["type", "value"], `${label} attack bonus`);
    assertSummonSource(
      action.attackBonus?.type === "constant"
        && action.attackBonus.value === 0,
      `${label} base attack bonus must remain zero before native match.attacks`,
    );
    assertSummonSource(action.opportunityAttackEligible === false, `${label} must explicitly forbid opportunity attacks`);
    assertSummonSource(action.savingThrow === undefined, `${label} attack must not declare a primary savingThrow`);
  } else {
    assertSummonSource(action.attackBonus === undefined, `${label} saving throw must not declare attackBonus`);
    assertSummonSource(["dex", "con"].includes(action.savingThrow?.ability), `${label} has unsupported save ability`);
    assertSummonExactKeys(action.savingThrow, ["ability", "difficulty"], `${label} saving throw`);
    assertSummonExactKeys(action.savingThrow.difficulty, ["type", "value"], `${label} save difficulty`);
    assertSummonSource(
      action.savingThrow.difficulty.type === "constant"
        && action.savingThrow.difficulty.value === 10,
      `${label} base save DC must remain 10 before native match.saves`,
    );
    assertSummonSource(
      ["half", "none"].includes(action.damageOnSuccessfulSave),
      `${label} has unsupported successful-save damage mode`,
    );
  }
  if (action.rider !== undefined) {
    const save = action.rider?.savingThrow;
    const marker = save?.onFailure?.marker;
    assertSummonSource(action.actionType === "melee-spell-attack", `${label} only attacks may declare riders`);
    assertSummonExactKeys(action.rider, ["savingThrow", "trigger"], `${label} rider`);
    assertSummonExactKeys(save, ["ability", "difficulty", "onFailure", "onSuccess"], `${label} rider saving throw`);
    assertSummonExactKeys(save.difficulty, ["type", "value"], `${label} rider save difficulty`);
    assertSummonExactKeys(save.onFailure, ["marker"], `${label} rider failure`);
    assertSummonExactKeys(marker, ["automation", "duration", "label", "markerId"], `${label} rider marker`);
    assertSummonExactKeys(marker.duration, ["type", "value"], `${label} rider marker duration`);
    assertSummonSource(action.rider.trigger === "on-hit", `${label} rider trigger must be on-hit`);
    assertSummonSource(["dex", "con"].includes(save?.ability), `${label} rider has unsupported save ability`);
    assertSummonSource(
      save?.difficulty?.type === "constant"
        && Number.isInteger(save.difficulty.value)
        && save.difficulty.value > 0,
      `${label} rider save must use a positive constant difficulty`,
    );
    assertSummonSource(save.onSuccess === "none", `${label} rider success contract must be none`);
    assertSummonSource(
      typeof marker?.markerId === "string"
        && marker.markerId.length > 0
        && typeof marker.label === "string"
        && marker.label.length > 0
        && marker.duration?.type === "turns"
        && Number.isInteger(marker.duration.value)
        && marker.duration.value > 0
        && marker.automation === "marker-and-duration-only",
      `${label} rider marker contract is open or incomplete`,
    );
  }

  assertSummonSource(action.target.range.distance === 5, `${label} range must remain 5 ft`);
  if (recipeId === "ram-ablaze") {
    assertSummonSource(["ram", "ablaze"].includes(action.actionId), `${label} actionId is not frozen`);
    assertSummonSource(action.actionType === "saving-throw", `${label} must remain a saving throw`);
    assertSummonSource(action.damage[0].damageType === "fire", `${label} must remain fire damage`);
    assertSummonSource(action.savingThrow.ability === "dex", `${label} must remain a DEX save`);
    assertSummonSource(
      action.savingThrow.difficulty.type === "constant"
        && action.savingThrow.difficulty.value === 10,
      `${label} base save DC must remain 10 before native matching`,
    );
    assertSummonSource(action.damageOnSuccessfulSave === "half", `${label} must remain half damage on save`);
    assertSummonSource(action.resource.type === "at-will", `${label} must remain at-will`);
    assertSummonSource(
      action.activation.type === (action.actionId === "ram" ? "bonus-action" : "special")
        && action.activation.cost === (action.actionId === "ram" ? 1 : 0),
      `${label} activation drifted from frozen SUM-1 semantics`,
    );
  } else {
    assertSummonSource(["weapon-strike", "special-strike"].includes(action.actionId), `${label} actionId is not frozen`);
    assertSummonSource(action.actionType === "melee-spell-attack", `${label} must remain a melee spell attack`);
    assertSummonSource(action.activation.type === "bonus-action" && action.activation.cost === 1, `${label} must remain a bonus action`);
    assertSummonSource(action.damage[0].damageType === "force", `${label} must remain force damage`);
    if (action.actionId === "weapon-strike") {
      assertSummonSource(action.resource.type === "at-will" && action.rider === undefined, `${label} must remain rider-free at-will`);
    } else {
      assertSummonSource(
        action.resource.type === "limited-use"
          && action.resource.maximum === 1
          && action.resource.recovery[0].period === "short-rest"
          && action.rider?.savingThrow?.ability === "con"
          && action.rider.savingThrow.difficulty.type === "constant"
          && action.rider.savingThrow.difficulty.value === 12,
        `${label} special strike resource/rider semantics drifted`,
      );
    }
  }
}

function assert2014SummonActionSource(action, recipeId) {
  const label = `recipe ${recipeId} action ${action?.actionId ?? "<missing>"}`;
  assertSummonSource(action && typeof action === "object" && !Array.isArray(action), `${label} must be an object`);
  const isMeleeAttack = action.actionType === "melee-weapon-attack";
  const isRangedAttack = action.actionType === "ranged-weapon-attack";
  const isAttack = isMeleeAttack || isRangedAttack;
  const isSave = action.actionType === "saving-throw";
  const isDamage = action.actionType === "damage";
  const isNativeSummon = action.actionType === "native-summon";
  assertSummonSource(
    isAttack || isSave || isDamage || isNativeSummon,
    `${label} has unsupported actionType ${action.actionType}`,
  );
  if (isNativeSummon) {
    assertSummonExactKeys(action, [
      "actionId",
      "actionType",
      "activation",
      "count",
      "lifecycle",
      "liveGuard",
      "profileId",
      "resource",
    ], label);
    assertSummonExactKeys(action.activation, ["cost", "type"], `${label} activation`);
    assertSummonExactKeys(action.resource, [
      "consumesSourceSpellSlot",
      "maximum",
      "recovery",
      "type",
    ], `${label} resource`);
    assertSummonExactKeys(action.resource.recovery?.[0], ["amount", "period"], `${label} recovery`);
    assertSummonExactKeys(action.liveGuard, ["maximum", "type"], `${label} liveGuard`);
    assertSummonExactKeys(action.lifecycle, ["type"], `${label} lifecycle`);
    assertSummonSource(
      recipeId === "dryad-2014"
        && action.actionId === "fallen-lover"
        && action.activation.type === "action"
        && action.activation.cost === 1
        && action.profileId === "wood-woad"
        && action.count === 1
        && action.resource.type === "limited-use"
        && action.resource.maximum === 1
        && action.resource.recovery.length === 1
        && action.resource.recovery[0].period === "short-rest"
        && action.resource.recovery[0].amount === 1
        && action.resource.consumesSourceSpellSlot === false
        && action.liveGuard.type === "maximum-live-profile"
        && action.liveGuard.maximum === 1
        && action.lifecycle.type === "inherit-root-concentration",
      `${label} must remain the frozen count-1 Fallen Lover native summon contract`,
    );
    return;
  }
  assertSummonExactKeys(
    action,
    isAttack
      ? [
          "actionId",
          "actionType",
          "activation",
          "attackBonus",
          ...(action.attackProperties === undefined ? [] : ["attackProperties"]),
          "damage",
          "opportunityAttackEligible",
          "resource",
          "target",
        ]
      : isSave
        ? ["actionId", "actionType", "activation", "damage", "damageOnSuccessfulSave", "resource", "savingThrow", "target"]
        : ["actionId", "actionType", "activation", "damage", "resource", "target"],
    label,
  );
  assertSummonExactKeys(action.activation, ["cost", "type"], `${label} activation`);
  assertSummonSource(
    ["action", "special"].includes(action.activation.type)
      && action.activation.cost === (action.activation.type === "action" ? 1 : 0),
    `${label} activation must be a closed 2014 action or manual special trigger`,
  );
  const targetKeys = action.target?.selection === "template"
    ? ["count", "kind", "range", "selection", "template"]
    : ["count", "kind", "range", "selection"];
  assertSummonExactKeys(action.target, targetKeys, `${label} target`);
  assertSummonExactKeys(
    action.target.range,
    isRangedAttack ? ["distance", "longDistance", "units"] : ["distance", "units"],
    `${label} target range`,
  );
  assertSummonSource(action.target.kind === "creature", `${label} target kind must be creature`);
  if (action.target.selection === "template") {
    assertSummonExactKeys(action.target.template, ["size", "type", "units"], `${label} target template`);
    assertSummonSource(
      action.target.count === "any"
        && action.target.range.distance === null
        && action.target.range.units === "self"
        && action.target.template.type === "cone"
        && action.target.template.size === 15
        && action.target.template.units === "ft",
      `${label} template must remain a 15-foot cone from self`,
    );
  } else {
    assertSummonSource(
      action.target.selection === "explicit"
        && [1, "any"].includes(action.target.count)
        && Number.isFinite(action.target.range.distance)
        && action.target.range.distance > 0
        && action.target.range.units === "ft",
      `${label} explicit target must retain a positive audited ft range`,
    );
    if (isRangedAttack) {
      assertSummonSource(
        action.target.count === 1
          && Number.isFinite(action.target.range.longDistance)
          && action.target.range.longDistance > action.target.range.distance,
        `${label} ranged target must retain one target and a longer audited long range`,
      );
    }
  }
  if (isAttack) {
    assertSummonExactKeys(action.attackBonus, ["type", "value"], `${label} attack bonus`);
    assertSummonSource(
      action.attackBonus.type === "constant"
        && Number.isInteger(action.attackBonus.value)
        && action.attackBonus.value > 0,
      `${label} attack bonus must be a positive immutable constant`,
    );
    assertSummonSource(
      action.opportunityAttackEligible === isMeleeAttack,
      `${label} opportunity-attack eligibility must match melee versus ranged reach`,
    );
    if (action.attackProperties !== undefined) {
      assertSummonSource(
        JSON.stringify(action.attackProperties) === JSON.stringify(["magical"]),
        `${label} attack properties must remain the closed magical property`,
      );
    }
  }
  if (isSave) {
    assertSummonExactKeys(action.savingThrow, ["ability", "difficulty"], `${label} saving throw`);
    assertSummonExactKeys(action.savingThrow.difficulty, ["type", "value"], `${label} save difficulty`);
    assertSummonSource(
      ["str", "dex", "wis"].includes(action.savingThrow.ability)
        && action.savingThrow.difficulty.type === "constant"
        && [10, 11, 13, 14, 15].includes(action.savingThrow.difficulty.value),
      `${label} save must use its audited immutable ability and DC`,
    );
    assertSummonSource(["half", "none"].includes(action.damageOnSuccessfulSave), `${label} save damage mode is unsupported`);
  }
  assertSummonSource(Array.isArray(action.damage), `${label} damage must be an array`);
  for (const [damageIndex, damage] of action.damage.entries()) {
    const damageLabel = `${label} damage ${damageIndex}`;
    assertSummonExactKeys(damage, ["damageType", "value"], damageLabel);
    assertSummonExactKeys(damage.value, ["bonus", "denomination", "number", "type"], `${damageLabel} value`);
    assertSummonSource(
      damage.value.type === "dice"
        && Number.isInteger(damage.value.number)
        && damage.value.number > 0
        && Number.isInteger(damage.value.denomination)
        && /^\d*$/.test(damage.value.bonus)
        && typeof damage.damageType === "string"
        && damage.damageType.length > 0,
      `${damageLabel} must use static dice and a damage type`,
    );
  }
  if (isAttack || isDamage || recipeId === "ice-mephit-2014") {
    assertSummonSource(action.damage.length > 0, `${label} must retain its audited damage`);
  }
  assertSummonSource(action.resource?.consumesSourceSpellSlot === false, `${label} cannot consume the source spell slot`);
  if (action.resource?.type === "limited-use") {
    assertSummonExactKeys(action.resource, ["consumesSourceSpellSlot", "maximum", "recovery", "type"], `${label} resource`);
    assertSummonSource(
      action.resource.maximum === 1
        && Array.isArray(action.resource.recovery)
        && action.resource.recovery.length === 1,
      `${label} recharge resource must have one use`,
    );
    const [recovery] = action.resource.recovery;
    assertSummonExactKeys(recovery, ["amount", "formula", "period"], `${label} recovery`);
    assertSummonSource(
      recovery.period === "recharge"
        && ["4", "6"].includes(recovery.formula)
        && recovery.amount === 1,
      `${label} recovery must remain an audited Recharge 4-6 or Recharge 6`,
    );
  } else {
    assertSummonExactKeys(action.resource, ["consumesSourceSpellSlot", "type"], `${label} resource`);
    assertSummonSource(action.resource.type === "at-will", `${label} resource must be at-will or an audited recharge`);
  }
}

function assertSummonActionSource(action, recipe) {
  if (recipe.rulesModel === "dnd5e-2014-simplified") {
    assert2014SummonActionSource(action, recipe.recipeId);
    return;
  }
  assertSummonSource(recipe.rulesModel === "bg3-simplified", `recipe ${recipe.recipeId} rulesModel is unsupported`);
  assertLegacySummonActionSource(action, recipe.recipeId);
}

function assertLegacySummonProfileSource(profile) {
  const label = `profile ${profile?.profileId ?? "<missing>"}`;
  assertSummonExactKeys(profile, [
    "actionPresentation",
    "baseActor",
    "deltaSlots",
    "documentId",
    "icon",
    "label",
    "profileId",
    "prototypeToken",
    "recipeId",
    "revision",
    "rulesModel",
    "summonUsage",
  ], label);
  const base = profile.baseActor;
  assertSummonExactKeys(base, [
    "abilities",
    "actorType",
    "armorClass",
    "combat",
    "creature",
    "defenses",
    "hitPoints",
    "identifier",
    "movement",
    "opportunityAttacks",
    "proficiencyBonus",
  ], `${label} baseActor`);
  assertSummonExactKeys(base.abilities, ["cha", "con", "dex", "int", "str", "wis"], `${label} abilities`);
  assertSummonExactKeys(base.creature, ["category", "size"], `${label} creature`);
  assertSummonExactKeys(base.hitPoints, ["current", "maximum"], `${label} hit points`);
  assertSummonExactKeys(base.combat, ["initiativeBonus", "type"], `${label} combat`);
  assertSummonExactKeys(base.defenses, [
    "conditionImmunities",
    "damageImmunities",
    "damageResistances",
    "damageVulnerabilities",
  ], `${label} defenses`);
  assertSummonSource(Array.isArray(base.movement) && base.movement.length === 1, `${label} must declare one movement mode`);
  assertSummonExactKeys(base.movement[0], ["distance", "type", "units"], `${label} movement`);
  const token = profile.prototypeToken;
  assertSummonExactKeys(token, ["actorLink", "dimensions", "disposition", "light", "texture"], `${label} prototypeToken`);
  assertSummonExactKeys(token.dimensions, ["height", "width"], `${label} token dimensions`);
  assertSummonExactKeys(token.texture, ["scale", "src"], `${label} token texture`);
  assertSummonExactKeys(token.light, ["additionalDimRadius", "brightRadius", "units"], `${label} token light`);
  assertSummonSource(base.identifier === profile.profileId, `${label} baseActor identifier drifted`);
  assertSummonSource(base.proficiencyBonus === 0, `${label} proficiencyBonus must remain zero`);
  assertSummonSource(base.combat.type === "independent", `${label} combat type must remain independent`);
  assertSummonSource(profile.summonUsage === "pool-choice", `${label} summonUsage must remain pool-choice`);
}

const expected2014SummonProfiles = new Map(contracts.expected2014SummonProfiles);

function assert2014SummonProfileSource(profile) {
  const label = `profile ${profile?.profileId ?? "<missing>"}`;
  const expected = expected2014SummonProfiles.get(profile?.profileId);
  assertSummonSource(expected, `${label} is not an approved 2014 profile`);
  assertSummonExactKeys(profile, [
    "actionPresentation",
    "baseActor",
    "capabilityAudit",
    "deltaSlots",
    "documentId",
    "icon",
    "label",
    "profileId",
    "profileKind",
    "prototypeToken",
    "recipeId",
    "revision",
    "rulesModel",
    ...(profile.source === undefined ? [] : ["source"]),
    "summonUsage",
  ], label);
  assertSummonSource(profile.profileKind === "monster-2014", `${label}.profileKind must be monster-2014`);
  assertSummonSource(profile.rulesModel === "dnd5e-2014-simplified", `${label}.rulesModel drifted`);
  assertSummonSource(Array.isArray(profile.deltaSlots) && profile.deltaSlots.length === 0, `${label}.deltaSlots must be empty`);
  const base = profile.baseActor;
  assertSummonExactKeys(base, [
    "abilities",
    "actorType",
    "alignment",
    "armorClass",
    "challengeRating",
    "combat",
    "creature",
    "defenses",
    "hitPoints",
    "identifier",
    "languages",
    "movement",
    "hover",
    "opportunityAttacks",
    "proficiencyBonus",
    "savingThrowProficiencies",
    "senses",
    "skillProficiencies",
  ], `${label} baseActor`);
  assertSummonSource(base.actorType === "npc" && base.identifier === profile.profileId, `${label} must be an immutable NPC source`);
  assertSummonExactKeys(base.creature, ["category", "size"], `${label} creature`);
  const expectedCategory = expected.category ?? (profile.profileId === "dryad"
    ? "fey"
    : profile.profileId === "wood-woad" ? "plant" : "elemental");
  const expectedProficiencyBonus = expected.proficiencyBonus ?? (profile.profileId === "wood-woad" ? 3 : 2);
  assertSummonSource(
    base.creature.category === expectedCategory && base.creature.size === expected.size,
    `${label} creature identity drifted`,
  );
  assertSummonSource(JSON.stringify(base.abilities) === JSON.stringify(expected.abilities), `${label} abilities drifted`);
  assertSummonSource(
    base.proficiencyBonus === expectedProficiencyBonus,
    `${label} proficiency bonus drifted`,
  );
  assertSummonSource(base.armorClass === expected.armorClass, `${label} armor class drifted`);
  assertSummonSource(JSON.stringify(base.hitPoints) === JSON.stringify(expected.hitPoints), `${label} hit points drifted`);
  assertSummonSource(JSON.stringify(base.movement) === JSON.stringify(expected.movement), `${label} movement drifted`);
  assertSummonSource(base.hover === (expected.hover ?? false), `${label} hover drifted`);
  assertSummonExactKeys(base.combat, ["initiativeBonus", "type"], `${label} combat`);
  assertSummonSource(
    base.combat.type === "independent" && base.combat.initiativeBonus === expected.initiativeBonus,
    `${label} combat initiative drifted`,
  );
  const expectedDefenses = {
    damageResistances: expected.defenses.damageResistances,
    damageResistanceBypasses: expected.defenses.damageResistanceBypasses ?? [],
    damageImmunities: expected.defenses.damageImmunities,
    damageVulnerabilities: expected.defenses.damageVulnerabilities,
    conditionImmunities: expected.defenses.conditionImmunities,
  };
  assertSummonSource(JSON.stringify(base.defenses) === JSON.stringify(expectedDefenses), `${label} defenses drifted`);
  assertSummonSource(base.opportunityAttacks === true, `${label} must retain normal opportunity attacks`);
  assertSummonSource(base.challengeRating === expected.challengeRating, `${label} challenge rating drifted`);
  assertSummonSource(typeof base.alignment === "string" && base.alignment.length > 0, `${label} alignment is required`);
  assertSummonSource(
    JSON.stringify(base.savingThrowProficiencies) === JSON.stringify(expected.savingThrowProficiencies),
    `${label} saving throw proficiencies drifted`,
  );
  assertSummonSource(
    JSON.stringify(base.skillProficiencies) === JSON.stringify(expected.skillProficiencies),
    `${label} skill proficiencies drifted`,
  );
  assertSummonSource(JSON.stringify(base.senses) === JSON.stringify(expected.senses), `${label} senses drifted`);
  assertSummonSource(JSON.stringify(base.languages) === JSON.stringify(expected.languages), `${label} languages drifted`);
  const expectedSummonUsage = profile.profileId === "wood-woad" ? "native-activity" : "pool-choice";
  assertSummonSource(profile.summonUsage === expectedSummonUsage, `${label} summonUsage drifted`);
  const expectedSource = expected.source ?? (
    profile.profileId === "dryad"
      ? { rules: "2014", book: "MM" }
      : profile.profileId === "wood-woad"
        ? { rules: "2014", book: "VGM" }
        : null
  );
  if (expectedSource) {
    assertSummonExactKeys(profile.source, ["book", "rules"], `${label} source`);
    assertSummonSource(
      JSON.stringify(profile.source) === JSON.stringify(expectedSource),
      `${label} source provenance drifted`,
    );
  } else {
    assertSummonSource(profile.source === undefined, `${label} must not invent source provenance`);
  }
  const token = profile.prototypeToken;
  assertSummonExactKeys(token, ["actorLink", "dimensions", "disposition", "light", "texture"], `${label} prototypeToken`);
  assertSummonSource(token.actorLink === false && token.disposition === "inherit-source", `${label} token ownership contract drifted`);
  const expectedTokenSize = expected.size === "large" ? 2 : 1;
  assertSummonSource(
    token.dimensions.width === expectedTokenSize && token.dimensions.height === expectedTokenSize,
    `${label} token footprint drifted`,
  );
  const capabilityIds = profile.capabilityAudit?.map(entry => entry.capabilityId);
  assertSummonSource(
    JSON.stringify(capabilityIds) === JSON.stringify(expected.capabilityIds),
    `${label} capability audit is incomplete`,
  );
  for (const [auditIndex, audit] of profile.capabilityAudit.entries()) {
    const auditLabel = `${label} capabilityAudit ${auditIndex}`;
    assertSummonExactKeys(
      audit,
      ["actionId", "capabilityId", "classification", "implementation", "omission", "operatorAction"],
      auditLabel,
    );
    assertSummonSource(["A0", "A1", "A2"].includes(audit.classification), `${auditLabel} classification is unsupported`);
    if (["manual-activity", "manual", "excluded"].includes(audit.implementation)) {
      assertSummonSource(
        typeof audit.operatorAction === "string"
          && audit.operatorAction.length > 0
          && typeof audit.omission === "string"
          && audit.omission.length > 0,
        `${auditLabel} must expose the exact HITL action and omission`,
      );
    }
  }
}

function assertSummonProfileSource(profile) {
  if (profile.rulesModel === "dnd5e-2014-simplified") {
    assert2014SummonProfileSource(profile);
    return;
  }
  assertSummonSource(profile.rulesModel === "bg3-simplified", `profile ${profile.profileId} rulesModel is unsupported`);
  assertLegacySummonProfileSource(profile);
}

function summonActivityBindings(profile, action) {
  const damageValue = action.damage?.[0]?.value;
  const defaultOpportunityAttackEligibility = action.actionType === "melee-weapon-attack"
    ? profile.baseActor.opportunityAttacks
    : false;
  return {
    version: 1,
    actionId: action.actionId,
    opportunityAttackEligible: action.opportunityAttackEligible
      ?? defaultOpportunityAttackEligibility,
    attackBonusSlot: action.attackBonus?.type === "delta-slot" ? action.attackBonus.slot : null,
    saveDcSlot: action.savingThrow?.difficulty?.type === "delta-slot"
      ? action.savingThrow.difficulty.slot
      : null,
    damageSlot: damageValue?.type === "delta-slot" ? damageValue.slot : null,
  };
}

function summonBaseActivity(profile, action, presentation, activityId) {
  const activationType = {
    "bonus-action": "bonus",
    special: "special",
  }[action.activation?.type];
  assertSummonSource(activationType, `${profile.profileId} action ${action.actionId} has unsupported activation`);
  const limitedUse = action.resource?.type === "limited-use";
  const recovery = limitedUse
    ? (action.resource.recovery ?? []).map(entry => ({
      period: entry.period === "short-rest" ? "sr" : entry.period === "long-rest" ? "lr" : entry.period,
      type: "recoverAll",
      formula: "",
    }))
    : [];
  const range = action.target?.range ?? { distance: null, units: "ft" };
  return {
    _id: activityId,
    type: action.actionType === "melee-spell-attack" ? "attack" : "save",
    name: presentation.label,
    img: profile.icon,
    sort: 0,
    activation: {
      type: activationType,
      value: Number(action.activation?.cost ?? 0),
      condition: "",
      override: true,
    },
    consumption: {
      scaling: { allowed: false, max: "" },
      spellSlot: false,
      targets: limitedUse
        ? [{ type: "activityUses", target: "", value: "1", scaling: { mode: "", formula: "" } }]
        : [],
    },
    description: { chatFlavor: "" },
    duration: { value: null, units: "inst", special: "", concentration: false, override: true },
    effects: [],
    flags: {
      [moduleId]: {
        summonAction: summonActivityBindings(profile, action),
      },
    },
    range: { value: range.distance, units: range.units, special: "", override: true },
    target: {
      template: {
        count: "",
        contiguous: false,
        stationary: false,
        type: "",
        size: "",
        width: "",
        height: "",
        units: "",
      },
      affects: {
        count: String(action.target?.count ?? 1),
        type: action.target?.kind ?? "creature",
        choice: false,
        special: "",
      },
      prompt: true,
      override: true,
    },
    uses: {
      spent: 0,
      max: limitedUse ? String(action.resource.maximum) : "",
      recovery,
    },
    visibility: {
      identifier: "",
      level: { min: null, max: null },
      requireAttunement: false,
      requireIdentification: false,
      requireMagic: false,
    },
  };
}

function summonDamagePart(profile, action) {
  const damage = action.damage?.[0];
  const damageType = damage?.damageType;
  assertSummonSource(typeof damageType === "string" && damageType.length, `${profile.profileId} ${action.actionId} needs damage type`);
  const value = damage?.value;
  const constant = value?.type === "constant";
  const dice = value?.type === "dice";
  assertSummonSource(constant || dice, `${profile.profileId} ${action.actionId} needs closed constant/dice damage`);
  return {
    number: constant ? 0 : value.number,
    denomination: constant ? 0 : value.denomination,
    bonus: constant ? String(value.value) : value.bonus,
    types: [damageType],
    custom: { enabled: false, formula: "" },
    scaling: { mode: "", number: 1, formula: "" },
  };
}

function summonActiveEffect(profile, recipe, action, itemId, effectId) {
  const marker = action.rider?.savingThrow?.onFailure?.marker;
  assertSummonSource(marker, `${profile.profileId} ${action.actionId} rider needs marker`);
  return {
    _id: effectId,
    name: marker.label,
    img: marker.markerId === "bleeding"
      ? "systems/dnd5e/icons/svg/statuses/bleeding.svg"
      : profile.icon,
    type: "base",
    system: {},
    changes: [],
    disabled: false,
    duration: { turns: marker.duration?.value ?? null },
    description: `<p>${recipe.manualRules.join("</p><p>")}</p>`,
    origin: `Compendium.${moduleId}.summons.Actor.${profile.documentId}.Item.${itemId}`,
    tint: "#ffffff",
    transfer: false,
    statuses: marker.markerId === "bleeding" ? ["bleeding"] : [],
    sort: 0,
    flags: {
      [moduleId]: {
        summonMarker: {
          version: 1,
          markerId: marker.markerId,
          automation: marker.automation,
        },
      },
    },
  };
}

function summonActionItem(profile, recipe, action, presentation) {
  const itemId = stableSummonId(profile.profileId, "item", action.actionId);
  const activityId = stableSummonId(profile.profileId, "activity", action.actionId);
  const activity = summonBaseActivity(profile, action, presentation, activityId);
  const opportunityAttackEligible = action.opportunityAttackEligible
    ?? profile.baseActor.opportunityAttacks;
  const opportunityAttackDescription = opportunityAttackEligible === false
    ? "<p>This summoned Actor and its actions are not eligible for opportunity attacks.</p>"
    : "";
  const effects = [];
  if (activity.type === "attack") {
    activity.attack = {
      ability: "none",
      bonus: "0",
      critical: { threshold: null },
      flat: true,
      type: { value: "melee", classification: "spell" },
    };
    activity.damage = {
      critical: { bonus: "" },
      includeBase: false,
      parts: [summonDamagePart(profile, action)],
    };
  } else {
    const difficulty = action.savingThrow?.difficulty;
    const dcFormula = difficulty?.type === "constant" ? String(difficulty.value) : "0";
    activity.save = {
      ability: [action.savingThrow?.ability],
      dc: { calculation: "", formula: dcFormula },
    };
    activity.damage = {
      onSave: action.damageOnSuccessfulSave === "half" ? "half" : "none",
      parts: [summonDamagePart(profile, action)],
    };
  }

  const activities = { [activityId]: activity };
  if (action.rider?.savingThrow) {
    const effectId = stableSummonId(profile.profileId, "effect", action.actionId);
    const saveActivityId = stableSummonId(profile.profileId, "activity", action.actionId, "rider-save");
    const save = action.rider.savingThrow;
    const hiddenSave = {
      ...summonBaseActivity(
        profile,
        {
          actionId: `${action.actionId}-rider-save`,
          actionType: "saving-throw",
          activation: { type: "special", cost: 0 },
          target: action.target,
          resource: { type: "at-will" },
        },
        { label: `${presentation.label}: ${save.ability.toUpperCase()} Save` },
        saveActivityId,
      ),
      sort: 100,
      effects: [{ _id: effectId, onSave: false, level: { min: null, max: null } }],
      save: {
        ability: [save.ability],
        dc: { calculation: "", formula: String(save.difficulty.value) },
      },
      damage: { onSave: "none", parts: [] },
      midiProperties: {
        automationOnly: true,
        otherActivityCompatible: false,
        otherActivityAsParentType: false,
        triggeredActivityConsume: false,
        triggeredActivityConfigure: false,
      },
      otherActivityAsParentType: false,
    };
    hiddenSave.flags = {
      [moduleId]: {
        summonActionRider: {
          version: 1,
          parentActionId: action.actionId,
          markerEffectId: effectId,
        },
      },
    };
    activity.midiProperties = {
      triggeredActivityId: saveActivityId,
      triggeredActivityTargets: "hitTargets",
      triggeredActivityConsume: false,
      triggeredActivityConfigure: false,
      otherActivityCompatible: false,
      otherActivityAsParentType: false,
    };
    activity.otherActivityAsParentType = false;
    activities[saveActivityId] = hiddenSave;
    effects.push(summonActiveEffect(profile, recipe, action, itemId, effectId));
  }

  return {
    _id: itemId,
    name: presentation.label,
    type: "feat",
    img: profile.icon,
    system: {
      description: {
        value: `<p>${presentation.label}</p>${opportunityAttackDescription}<p>${recipe.manualRules.join("</p><p>")}</p>`,
        chat: "",
      },
      identifier: presentation.identifier,
      source: { book: "", page: "", custom: "Arcane Desk", license: "", revision: 1, rules: "2014" },
      activities,
      uses: { spent: 0, max: "", recovery: [] },
      advancement: {},
      cover: null,
      crewed: false,
      enchant: { max: "", period: "" },
      prerequisites: { items: [], level: null, repeatable: false },
      properties: [],
      requirements: null,
      type: { value: "monster", subtype: "" },
    },
    effects,
    sort: 0,
    ownership: { default: 0 },
    flags: {
      [moduleId]: {
        summonActionItem: {
          version: 1,
          actionId: action.actionId,
          primaryActivityId: activityId,
        },
      },
    },
    _stats: {
      coreVersion: "13.351",
      systemId: "dnd5e",
      systemVersion: "5.3.3",
      lastModifiedBy: null,
      compendiumSource: null,
      duplicateSource: null,
      exportSource: null,
    },
  };
}

function summonMovementSource(movement, hover = false) {
  const result = {
    walk: 0,
    burrow: 0,
    climb: 0,
    fly: 0,
    swim: 0,
    bonus: "",
    special: "",
    units: "ft",
    hover,
    ignoredDifficultTerrain: [],
  };
  for (const entry of movement ?? []) {
    assertSummonSource(["walk", "burrow", "climb", "fly", "swim"].includes(entry.type), `unsupported movement ${entry.type}`);
    result[entry.type] = entry.distance;
    result.units = entry.units;
  }
  return result;
}

function materializeLegacySummonActor(profile, recipe) {
  const base = profile.baseActor;
  assertSummonSource(base?.actorType === "npc", `${profile.profileId} baseActor.actorType must be npc`);
  assertSummonSource(
    base.opportunityAttacks === false,
    `${profile.profileId} baseActor.opportunityAttacks must be explicitly false`,
  );
  const presentations = new Map(profile.actionPresentation.map(entry => [entry.actionId, entry]));
  const items = recipe.actions.map(action => {
    const presentation = presentations.get(action.actionId);
    assertSummonSource(presentation, `${profile.profileId} lacks presentation for ${action.actionId}`);
    return summonActionItem(profile, recipe, action, presentation);
  });
  const size = { tiny: "tiny", medium: "med" }[base.creature?.size];
  assertSummonSource(size, `${profile.profileId} has unsupported creature size ${base.creature?.size}`);
  const creatureType = base.creature?.category === "elemental"
    ? { value: "elemental", subtype: "", swarm: "", custom: "" }
    : { value: "custom", subtype: "", swarm: "", custom: "Spell Entity" };
  const bright = profile.prototypeToken.light.brightRadius;
  const dim = bright + profile.prototypeToken.light.additionalDimRadius;
  const hitPointsSlot = profile.deltaSlots.some(declaration => declaration.slot === "hit-points")
    ? "hit-points"
    : null;
  return {
    _id: profile.documentId,
    name: profile.label,
    type: "npc",
    img: profile.icon,
    system: {
      abilities: Object.fromEntries(
        Object.entries(base.abilities).map(([ability, value]) => [ability, summonAbilitySource(value)]),
      ),
      attributes: {
        ac: { calc: "flat", flat: base.armorClass, formula: "" },
        hp: {
          value: base.hitPoints.current,
          max: base.hitPoints.maximum,
          temp: 0,
          tempmax: 0,
          formula: "",
        },
        init: { ...summonRollConfig(""), bonus: String(base.combat.initiativeBonus) },
        movement: summonMovementSource(base.movement),
        attunement: { max: 3 },
        senses: {
          ranges: { darkvision: null, blindsight: null, tremorsense: null, truesight: null },
          units: "ft",
          special: "",
        },
        spellcasting: "",
        exhaustion: 0,
        concentration: { ...summonRollConfig(""), bonuses: { save: "" }, limit: 1 },
        loyalty: { value: null },
        hd: { spent: 0 },
        death: { ...summonRollConfig(""), success: 0, failure: 0, bonuses: { save: "" } },
        price: { value: null, denomination: "gp" },
        spell: { level: 0 },
      },
      details: {
        biography: {
          value: "<p>This summoned Actor is not eligible for opportunity attacks.</p>",
          public: "",
        },
        alignment: "",
        ideal: "",
        bond: "",
        flaw: "",
        race: null,
        type: creatureType,
        habitat: { value: [], custom: "" },
        cr: 0,
        treasure: { value: [] },
      },
      traits: {
        size,
        di: summonDamageTrait(base.defenses.damageImmunities),
        dr: summonDamageTrait(base.defenses.damageResistances),
        dv: summonDamageTrait(base.defenses.damageVulnerabilities),
        dm: { amount: {}, bypasses: [] },
        ci: { value: [...base.defenses.conditionImmunities], custom: "" },
        languages: { value: [], custom: "", communication: {} },
        important: false,
      },
      bonuses: {
        mwak: { attack: "", damage: "" },
        rwak: { attack: "", damage: "" },
        msak: { attack: "", damage: "" },
        rsak: { attack: "", damage: "" },
        abilities: { check: "", save: "", skill: "" },
        spell: { dc: "" },
      },
      resources: {
        legact: { max: 0, spent: 0 },
        legres: { max: 0, spent: 0 },
        lair: { value: false, initiative: 20, inside: false },
      },
      source: { book: "", page: "", custom: "Arcane Desk", license: "", revision: 1, rules: "2014" },
    },
    prototypeToken: {
      name: profile.label,
      displayName: 20,
      displayBars: 20,
      actorLink: false,
      width: profile.prototypeToken.dimensions.width,
      height: profile.prototypeToken.dimensions.height,
      disposition: 0,
      bar1: { attribute: "attributes.hp" },
      bar2: { attribute: null },
      texture: {
        src: profile.prototypeToken.texture.src,
        scaleX: profile.prototypeToken.texture.scale,
        scaleY: profile.prototypeToken.texture.scale,
        offsetX: 0,
        offsetY: 0,
        rotation: 0,
        tint: "#ffffff",
        anchorX: 0.5,
        anchorY: 0.5,
        fit: "contain",
        alphaThreshold: 0.75,
      },
      sight: { enabled: true, range: 0, angle: 360, visionMode: "basic" },
      light: {
        bright,
        dim,
        angle: 360,
        color: null,
        alpha: 0.5,
        animation: { type: null, speed: 5, intensity: 5, reverse: false },
        coloration: 1,
        luminosity: 0,
        attenuation: 0.5,
        saturation: 0,
        contrast: 0,
        shadows: 0,
      },
      flags: {
        [moduleId]: {
          summonPrototype: { version: 1, disposition: profile.prototypeToken.disposition },
        },
      },
    },
    items,
    effects: [],
    sort: 0,
    ownership: { default: 0 },
    flags: {
      [moduleId]: {
        summonProfile: {
          version: 1,
          profileId: profile.profileId,
          revision: profile.revision,
          documentId: profile.documentId,
          recipeId: profile.recipeId,
          rulesModel: profile.rulesModel,
          hitPointsSlot,
          opportunityAttacks: base.opportunityAttacks,
          proficiencyBonus: base.proficiencyBonus,
          combatType: base.combat.type,
          summonUsage: profile.summonUsage,
        },
      },
    },
    _stats: {
      coreVersion: "13.351",
      systemId: "dnd5e",
      systemVersion: "5.3.3",
      lastModifiedBy: null,
      compendiumSource: null,
      duplicateSource: null,
      exportSource: null,
    },
  };
}

function summon2014DamagePart(profile, action, damage, damageIndex) {
  const label = `${profile.profileId} ${action.actionId} damage ${damageIndex}`;
  assertSummonSource(damage?.value?.type === "dice", `${label} must use static dice`);
  assertSummonSource(typeof damage.damageType === "string" && damage.damageType.length > 0, `${label} needs a damage type`);
  return {
    number: damage.value.number,
    denomination: damage.value.denomination,
    bonus: damage.value.bonus,
    types: [damage.damageType],
    custom: { enabled: false, formula: "" },
    scaling: { mode: "", number: 1, formula: "" },
  };
}

function summon2014BaseActivity(profile, action, presentation, activityId) {
  const activationType = { action: "action", special: "special" }[action.activation.type];
  assertSummonSource(activationType, `${profile.profileId} action ${action.actionId} has unsupported activation`);
  const isNativeSummon = action.actionType === "native-summon";
  const isRangedWeapon = action.actionType === "ranged-weapon-attack";
  const activityType = {
    "melee-weapon-attack": "attack",
    "ranged-weapon-attack": "attack",
    "saving-throw": "save",
    damage: "damage",
    "native-summon": "summon",
  }[action.actionType];
  assertSummonSource(activityType, `${profile.profileId} action ${action.actionId} has unsupported type`);
  const limitedUse = action.resource.type === "limited-use";
  const range = isNativeSummon ? { distance: null, units: "self" } : action.target.range;
  const template = !isNativeSummon && action.target.selection === "template" ? action.target.template : null;
  const activity = {
    _id: activityId,
    type: activityType,
    name: presentation.label,
    img: profile.icon,
    sort: 0,
    activation: {
      type: activationType,
      value: action.activation.cost,
      condition: "",
      override: true,
    },
    consumption: {
      scaling: { allowed: false, max: "" },
      spellSlot: false,
      targets: limitedUse
        ? [{ type: "activityUses", target: "", value: "1", scaling: { mode: "", formula: "" } }]
        : [],
    },
    description: { chatFlavor: "" },
    duration: { value: null, units: "inst", special: "", concentration: false, override: true },
    effects: [],
    flags: isNativeSummon
      ? {
          [moduleId]: {
            nativeSummon: {
              provider: "dnd5e",
              humanStep: "native-summon-placement",
              artifactId: "fallen-lover",
              choice: action.profileId,
              profileId: action.profileId,
              revision: 1,
              documentId: expectedSummonProfileDocuments.get(action.profileId),
              expectedCount: action.count,
              cleanup: "root-concentration",
              uniqueness: {
                scope: "root-invocation",
                maximum: action.liveGuard.maximum,
                enforcement: "pre-use-reject",
              },
            },
          },
        }
      : {
          [moduleId]: {
            summonAction: summonActivityBindings(profile, action),
          },
        },
    range: {
      value: range.distance,
      units: range.units,
      special: "",
      override: !isRangedWeapon,
    },
    target: {
      template: {
        count: "",
        contiguous: false,
        stationary: false,
        type: template?.type ?? "",
        size: template ? String(template.size) : "",
        width: "",
        height: "",
        units: template?.units ?? "",
      },
      affects: {
        count: isNativeSummon || action.target.count === "any" ? "" : String(action.target.count),
        type: isNativeSummon ? "self" : "creature",
        choice: false,
        special: "",
      },
      prompt: !isNativeSummon,
      override: true,
    },
    uses: {
      spent: 0,
      max: limitedUse ? String(action.resource.maximum) : "",
      recovery: limitedUse
        ? action.resource.recovery.map(entry => ({
            period: entry.period === "short-rest" ? "sr" : entry.period,
            type: "recoverAll",
            formula: entry.formula ?? "",
          }))
        : [],
    },
    visibility: {
      identifier: "",
      level: { min: null, max: null },
      requireAttunement: false,
      requireIdentification: false,
      requireMagic: false,
    },
  };
  if (isNativeSummon) {
    const documentId = expectedSummonProfileDocuments.get(action.profileId);
    assertSummonSource(documentId, `${profile.profileId} ${action.actionId} references an unknown native profile`);
    activity.bonuses = {
      ac: "",
      hd: "",
      hp: "",
      attackDamage: "",
      saveDamage: "",
      healing: "",
    };
    activity.creatureSizes = [];
    activity.creatureTypes = [];
    activity.match = {
      ability: "",
      attacks: false,
      disposition: true,
      proficiency: false,
      saves: false,
    };
    activity.profiles = [{
      _id: stableSummonId(profile.profileId, action.actionId, "summon-profile", action.profileId),
      count: String(action.count),
      cr: "",
      level: { min: null, max: null },
      name: "Wood Woad",
      types: [],
      uuid: `Compendium.${moduleId}.summons.Actor.${documentId}`,
    }];
    activity.midiProperties = { removeChatButtons: "all" };
    activity.summon = { mode: "", prompt: true };
    activity.tempHP = "";
  }
  return activity;
}

function summon2014ActionDescription(profile, action, presentation) {
  const audits = profile.capabilityAudit.filter(entry => entry.actionId === action.actionId);
  const auditHtml = audits.map(entry => {
    const operatorAction = entry.operatorAction ? `<p><strong>DM action:</strong> ${entry.operatorAction}</p>` : "";
    const omission = entry.omission ? `<p><strong>Omission:</strong> ${entry.omission}</p>` : "";
    return `<section data-capability-id="${entry.capabilityId}"><p><strong>${entry.classification} ${entry.capabilityId}</strong> (${entry.implementation})</p>${operatorAction}${omission}</section>`;
  }).join("");
  const rangeHtml = action.target?.range?.longDistance === undefined
    ? ""
    : `<p><strong>Range:</strong> ${action.target.range.distance}/${action.target.range.longDistance} ${action.target.range.units} (normal/long).</p>`;
  return `<p>${presentation.label}</p>${rangeHtml}<p>This 2014 monster action retains normal opportunity-attack rules when otherwise eligible.</p>${auditHtml}`;
}

function summon2014ActionItem(profile, action, presentation) {
  const itemId = stableSummonId(profile.profileId, "item", action.actionId);
  const activityId = stableSummonId(profile.profileId, "activity", action.actionId);
  const activity = summon2014BaseActivity(profile, action, presentation, activityId);
  const damageParts = (action.damage ?? []).map((damage, index) =>
    summon2014DamagePart(profile, action, damage, index)
  );
  if (activity.type === "attack") {
    activity.attack = {
      ability: "none",
      bonus: String(action.attackBonus.value),
      critical: { threshold: null },
      flat: true,
      type: {
        value: action.actionType === "ranged-weapon-attack" ? "ranged" : "melee",
        classification: "weapon",
      },
    };
    activity.damage = {
      critical: { bonus: "" },
      includeBase: false,
      parts: damageParts,
    };
  } else if (activity.type === "save") {
    activity.save = {
      ability: [action.savingThrow.ability],
      dc: { calculation: "", formula: String(action.savingThrow.difficulty.value) },
    };
    activity.damage = {
      onSave: action.damageOnSuccessfulSave === "half" ? "half" : "none",
      parts: damageParts,
      critical: { allow: false },
    };
  } else if (activity.type === "damage") {
    activity.damage = {
      critical: { allow: false },
      parts: damageParts,
    };
  }
  const description = {
    value: summon2014ActionDescription(profile, action, presentation),
    chat: "",
  };
  const source = {
    book: profile.source?.book ?? "MM",
    page: "",
    custom: "Arcane Desk 2014 audited profile",
    license: "",
    revision: 1,
    rules: "2014",
  };
  const isRangedWeapon = action.actionType === "ranged-weapon-attack";
  let itemSystem;
  if (isRangedWeapon) {
    assertSummonSource(
      damageParts.length === 1,
      `${profile.profileId} action ${action.actionId} ranged weapon must have one base damage part`,
    );
    const [baseDamage] = damageParts;
    itemSystem = {
      description,
      source,
      quantity: 1,
      weight: { value: 2, units: "lb" },
      price: { value: 25, denomination: "gp" },
      attunement: "",
      equipped: true,
      rarity: "",
      identified: true,
      cover: null,
      range: {
        value: action.target.range.distance,
        long: action.target.range.longDistance,
        units: action.target.range.units,
        reach: null,
      },
      uses: { spent: 0, max: "", recovery: [] },
      damage: {
        versatile: {
          number: null,
          denomination: null,
          bonus: "",
          types: [],
          custom: { enabled: false, formula: "" },
          scaling: { mode: "", number: null, formula: "" },
        },
        base: {
          number: baseDamage.number,
          denomination: baseDamage.denomination,
          bonus: baseDamage.bonus,
          types: [...baseDamage.types],
          custom: { enabled: false, formula: "" },
          scaling: { mode: "", number: null, formula: "" },
        },
      },
      armor: { value: 10 },
      hp: { value: 0, max: 0, dt: null, conditions: "" },
      properties: ["amm", "two"],
      proficient: null,
      type: { value: "simpleR", baseItem: "shortbow" },
      unidentified: { description: "" },
      container: null,
      activities: { [activityId]: activity },
      attuned: false,
      ammunition: { type: "arrow" },
      mastery: "",
      identifier: presentation.identifier,
    };
  } else {
    itemSystem = {
      description,
      identifier: presentation.identifier,
      source,
      activities: { [activityId]: activity },
      uses: { spent: 0, max: "", recovery: [] },
      advancement: {},
      cover: null,
      crewed: false,
      enchant: { max: "", period: "" },
      prerequisites: { items: [], level: null, repeatable: false },
      properties: action.attackProperties?.includes("magical") ? ["mgc"] : [],
      requirements: null,
      type: { value: "monster", subtype: "" },
    };
  }
  return {
    _id: itemId,
    name: presentation.label,
    type: isRangedWeapon ? "weapon" : "feat",
    img: profile.icon,
    system: itemSystem,
    effects: [],
    sort: 0,
    ownership: { default: 0 },
    flags: {
      [moduleId]: {
        summonActionItem: {
          version: 1,
          actionId: action.actionId,
          primaryActivityId: activityId,
        },
      },
    },
    _stats: {
      coreVersion: "13.351",
      systemId: "dnd5e",
      systemVersion: "5.3.3",
      lastModifiedBy: null,
      compendiumSource: null,
      duplicateSource: null,
      exportSource: null,
    },
  };
}

function summon2014Biography(profile, recipe) {
  const capabilityHtml = profile.capabilityAudit.map(entry => {
    const operatorAction = entry.operatorAction ? `<p><strong>DM action:</strong> ${entry.operatorAction}</p>` : "";
    const omission = entry.omission ? `<p><strong>Omission:</strong> ${entry.omission}</p>` : "";
    return `<li data-capability-id="${entry.capabilityId}"><p><strong>${entry.classification} ${entry.capabilityId}</strong> (${entry.implementation})</p>${operatorAction}${omission}</li>`;
  }).join("");
  const manualRules = recipe.manualRules.map(rule => `<li>${rule}</li>`).join("");
  return [
    "<p>Arcane-owned immutable 2014 monster profile. This Actor retains normal opportunity attacks.</p>",
    "<h2>Capability audit</h2>",
    `<ul>${capabilityHtml}</ul>`,
    "<h2>Human-in-the-loop workflow</h2>",
    `<ul>${manualRules}</ul>`,
  ].join("");
}

function summon2014SkillSource(skill) {
  return {
    ability: skill.ability,
    value: skill.value,
    bonuses: { check: "", passive: "" },
    roll: { min: null, max: null, mode: 0 },
  };
}

function materialize2014SummonActor(profile, recipe) {
  const base = profile.baseActor;
  assertSummonSource(base?.actorType === "npc", `${profile.profileId} baseActor.actorType must be npc`);
  assertSummonSource(base.opportunityAttacks === true, `${profile.profileId} must retain normal opportunity attacks`);
  const presentations = new Map(profile.actionPresentation.map(entry => [entry.actionId, entry]));
  const items = recipe.actions.map(action => {
    const presentation = presentations.get(action.actionId);
    assertSummonSource(presentation, `${profile.profileId} lacks presentation for ${action.actionId}`);
    return summon2014ActionItem(profile, action, presentation);
  });
  const size = { small: "sm", medium: "med", large: "lg" }[base.creature.size];
  assertSummonSource(size, `${profile.profileId} has unsupported creature size ${base.creature.size}`);
  const bright = profile.prototypeToken.light.brightRadius;
  const dim = bright + profile.prototypeToken.light.additionalDimRadius;
  const saveProficiencies = new Set(base.savingThrowProficiencies);
  const darkvision = base.senses.darkvision || null;
  const sightRange = Math.max(
    base.senses.darkvision,
    base.senses.blindsight,
    base.senses.tremorsense,
    base.senses.truesight,
  );
  return {
    _id: profile.documentId,
    name: profile.label,
    type: "npc",
    img: profile.icon,
    system: {
      abilities: Object.fromEntries(
        Object.entries(base.abilities).map(([ability, value]) => [
          ability,
          summonAbilitySource(value, saveProficiencies.has(ability) ? 1 : 0),
        ]),
      ),
      skills: Object.fromEntries(
        base.skillProficiencies.map(skill => [skill.skill, summon2014SkillSource(skill)]),
      ),
      attributes: {
        ac: { calc: "flat", flat: base.armorClass, formula: "" },
        hp: {
          value: base.hitPoints.current,
          max: base.hitPoints.maximum,
          temp: 0,
          tempmax: 0,
          formula: base.hitPoints.formula,
        },
        init: { ...summonRollConfig("dex"), bonus: "" },
        movement: summonMovementSource(base.movement, base.hover),
        attunement: { max: 3 },
        senses: {
          ranges: {
            darkvision,
            blindsight: base.senses.blindsight || null,
            tremorsense: base.senses.tremorsense || null,
            truesight: base.senses.truesight || null,
          },
          units: base.senses.units,
          special: "",
        },
        spellcasting: "",
        exhaustion: 0,
        concentration: { ...summonRollConfig(""), bonuses: { save: "" }, limit: 1 },
        loyalty: { value: null },
        hd: { spent: 0 },
        death: { ...summonRollConfig(""), success: 0, failure: 0, bonuses: { save: "" } },
        price: { value: null, denomination: "gp" },
        spell: { level: 0 },
      },
      details: {
        biography: { value: summon2014Biography(profile, recipe), public: "" },
        alignment: base.alignment,
        ideal: "",
        bond: "",
        flaw: "",
        race: null,
        type: { value: base.creature.category, subtype: "", swarm: "", custom: "" },
        habitat: { value: [], custom: "" },
        cr: base.challengeRating,
        treasure: { value: [] },
      },
      traits: {
        size,
        di: summonDamageTrait(base.defenses.damageImmunities),
        dr: summonDamageTrait(base.defenses.damageResistances, base.defenses.damageResistanceBypasses),
        dv: summonDamageTrait(base.defenses.damageVulnerabilities),
        dm: { amount: {}, bypasses: [] },
        ci: { value: [...base.defenses.conditionImmunities], custom: "" },
        languages: { value: [...base.languages], custom: "", communication: {} },
        important: false,
      },
      bonuses: {
        mwak: { attack: "", damage: "" },
        rwak: { attack: "", damage: "" },
        msak: { attack: "", damage: "" },
        rsak: { attack: "", damage: "" },
        abilities: { check: "", save: "", skill: "" },
        spell: { dc: "" },
      },
      resources: {
        legact: { max: 0, spent: 0 },
        legres: { max: 0, spent: 0 },
        lair: { value: false, initiative: 20, inside: false },
      },
      source: {
        book: profile.source?.book ?? "MM",
        page: "",
        custom: "Arcane Desk 2014 audited profile",
        license: "",
        revision: 1,
        rules: "2014",
      },
    },
    prototypeToken: {
      name: profile.label,
      displayName: 20,
      displayBars: 20,
      actorLink: false,
      width: profile.prototypeToken.dimensions.width,
      height: profile.prototypeToken.dimensions.height,
      disposition: 0,
      bar1: { attribute: "attributes.hp" },
      bar2: { attribute: null },
      texture: {
        src: profile.prototypeToken.texture.src,
        scaleX: profile.prototypeToken.texture.scale,
        scaleY: profile.prototypeToken.texture.scale,
        offsetX: 0,
        offsetY: 0,
        rotation: 0,
        tint: "#ffffff",
        anchorX: 0.5,
        anchorY: 0.5,
        fit: "contain",
        alphaThreshold: 0.75,
      },
      sight: {
        enabled: true,
        range: sightRange,
        angle: 360,
        visionMode: darkvision ? "darkvision" : "basic",
      },
      light: {
        bright,
        dim,
        angle: 360,
        color: null,
        alpha: 0.5,
        animation: { type: null, speed: 5, intensity: 5, reverse: false },
        coloration: 1,
        luminosity: 0,
        attenuation: 0.5,
        saturation: 0,
        contrast: 0,
        shadows: 0,
      },
      flags: {
        [moduleId]: {
          summonPrototype: { version: 1, disposition: profile.prototypeToken.disposition },
        },
      },
    },
    items,
    effects: [],
    sort: 0,
    ownership: { default: 0 },
    flags: {
      [moduleId]: {
        summonProfile: {
          version: 1,
          profileId: profile.profileId,
          revision: profile.revision,
          documentId: profile.documentId,
          recipeId: profile.recipeId,
          rulesModel: profile.rulesModel,
          hitPointsSlot: null,
          opportunityAttacks: true,
          proficiencyBonus: base.proficiencyBonus,
          combatType: base.combat.type,
          summonUsage: profile.summonUsage,
        },
      },
    },
    _stats: {
      coreVersion: "13.351",
      systemId: "dnd5e",
      systemVersion: "5.3.3",
      lastModifiedBy: null,
      compendiumSource: null,
      duplicateSource: null,
      exportSource: null,
    },
  };
}

function materializeSummonActor(profile, recipe) {
  if (profile.rulesModel === "dnd5e-2014-simplified") {
    return materialize2014SummonActor(profile, recipe);
  }
  assertSummonSource(profile.rulesModel === "bg3-simplified", `${profile.profileId} rulesModel is unsupported`);
  return materializeLegacySummonActor(profile, recipe);
}

function assertSummonFoundryId(value, label) {
  assertSummonSource(
    typeof value === "string" && summonFoundryIdPattern.test(value),
    `${label} must be a stable 16-character Foundry id`,
  );
}

function assertSummonActorDocument(actor, identity) {
  const label = `profile ${identity.profileId}`;
  assertSummonFoundryId(actor._id, `${label} Actor id`);
  assertSummonSource(actor._id === identity.documentId, `${label} documentId must equal Actor._id`);
  assertSummonSource(actor.type === "npc", `${label} Actor type must be npc`);
  assertSummonSource(actor.prototypeToken?.actorLink === false, `${label} prototypeToken.actorLink must be false`);
  assertSummonSource(actor.folder === undefined, `${label} Actor must not declare a folder`);
  assertSummonSource(
    JSON.stringify(actor.ownership ?? {}) === JSON.stringify({ default: 0 }),
    `${label} Actor ownership must be Arcane base ownership {default:0}`,
  );
  const actorFlagNamespaces = Object.keys(actor.flags ?? {});
  assertSummonSource(
    actorFlagNamespaces.every(namespace => namespace === moduleId),
    `${label} Actor flags contain non-Arcane namespaces: ${actorFlagNamespaces.join(", ")}`,
  );

  const actorEffectIds = new Set();
  for (const effect of actor.effects ?? []) {
    assertSummonFoundryId(effect?._id, `${label} Actor effect id`);
    assertSummonSource(!actorEffectIds.has(effect._id), `${label} repeats Actor effect id ${effect._id}`);
    actorEffectIds.add(effect._id);
  }
  const itemIds = new Set();
  const identifiers = new Set();
  for (const item of actor.items ?? []) {
    assertSummonFoundryId(item?._id, `${label} embedded Item id`);
    assertSummonSource(!itemIds.has(item._id), `${label} repeats embedded Item id ${item._id}`);
    itemIds.add(item._id);
    assertSummonSource(item.folder === undefined, `${label} Item ${item._id} must not declare a folder`);
    const identifier = item.system?.identifier;
    assertSummonSource(typeof identifier === "string" && identifier.length > 0, `${label} Item ${item._id} needs an identifier`);
    assertSummonSource(!identifiers.has(identifier), `${label} repeats Item identifier ${identifier}`);
    identifiers.add(identifier);
    const itemEffectIds = new Set();
    for (const effect of item.effects ?? []) {
      assertSummonFoundryId(effect?._id, `${label} Item ${item._id} effect id`);
      assertSummonSource(!itemEffectIds.has(effect._id), `${label} Item ${item._id} repeats effect id ${effect._id}`);
      itemEffectIds.add(effect._id);
    }
    const activities = item.system?.activities ?? {};
    for (const [activityId, activity] of Object.entries(activities)) {
      assertSummonFoundryId(activityId, `${label} Item ${item._id} activity key`);
      assertSummonFoundryId(activity?._id, `${label} Item ${item._id} activity id`);
      assertSummonSource(activity._id === activityId, `${label} Item ${item._id} activity key/id mismatch`);
      for (const reference of activity.effects ?? []) {
        assertSummonFoundryId(reference?._id, `${label} activity ${activityId} effect reference`);
        assertSummonSource(
          itemEffectIds.has(reference._id),
          `${label} activity ${activityId} references missing Item effect ${reference._id}`,
        );
      }
    }
  }

  const serialized = JSON.stringify(actor);
  assertSummonSource(!/(?:dnd5e_classpack|5epack|tasha)/i.test(serialized), `${label} leaks Tasha/donor source data`);
  assertSummonSource(
    !/(?:castGroupId|castId|sourceActorUuid|sourceTokenUuid|sourceItemUuid|concentrationEffectUuid|ownerUserId)/.test(serialized),
    `${label} contains per-cast state in immutable Actor source`,
  );
  for (const match of serialized.matchAll(/modules\/([A-Za-z0-9_-]+)\//g)) {
    assertSummonSource(match[1] === moduleId, `${label} references external module asset ${match[1]}`);
  }
  for (const match of serialized.matchAll(/Compendium\.([A-Za-z0-9_-]+)\.([A-Za-z0-9_-]+)/g)) {
    assertSummonSource(
      match[1] === moduleId && match[2] === "summons",
      `${label} references external compendium ${match[1]}.${match[2]}`,
    );
  }
}

function normalizeSummonProfile(profile, recipesById) {
  assertSummonProfileSource(profile);
  const identity = summonProfileIdentity(profile);
  assertSummonSource(
    typeof identity.profileId === "string" && identity.profileId.length > 0,
    "every profile must declare profileId",
  );
  assertSummonSource(Number.isInteger(identity.revision) && identity.revision > 0, `${identity.profileId} revision must be a positive integer`);
  assertSummonFoundryId(identity.documentId, `${identity.profileId} documentId`);
  assertSummonSource(identity.revision === 1, `${identity.profileId} revision must remain 1`);
  assertSummonSource(
    identity.documentId === expectedSummonProfileDocuments.get(identity.profileId),
    `${identity.profileId} stable documentId drifted`,
  );
  assertSummonSource(typeof identity.recipeId === "string" && identity.recipeId.length > 0, `${identity.profileId} needs recipeId`);
  const recipe = recipesById.get(identity.recipeId);
  assertSummonSource(recipe, `${identity.profileId} references unknown recipe ${identity.recipeId}`);
  assertSummonSource(
    identity.rulesModel === recipe.rulesModel
      && identity.rulesModel === expectedSummonRecipeRulesModels.get(identity.recipeId),
    `${identity.profileId} rulesModel must match its closed recipe contract`,
  );
  const actor = materializeSummonActor(profile, recipe);
  const normalizedIdentity = { ...identity, actor };
  assertSummonActorDocument(actor, normalizedIdentity);
  return normalizedIdentity;
}

function summonPoolProfileIds(pool) {
  const raw = pool.profileIds ?? pool.profiles ?? pool.actorProfileIds ?? pool.choices;
  assertSummonSource(Array.isArray(raw), `${pool.poolId ?? pool.spellIdentifier ?? pool.identifier ?? pool.id} pool profiles must be an array`);
  return raw.map((entry, index) => {
    const profileId = typeof entry === "string" ? entry : entry?.profileId ?? entry?.id;
    assertSummonSource(typeof profileId === "string" && profileId.length > 0, `pool profile ${index} needs profileId`);
    return profileId;
  });
}

function assembleSummonActors(profileNamespace, poolNamespace) {
  const profileDefinitions = summonDefinitionArray(
    summonModuleExport(
      profileNamespace,
      ["summonActorProfiles", "summonProfiles", "SUMMON_PROFILES", "profiles"],
      "summon profiles",
      { allowDefaultCollection: true },
    ),
    ["profileId", "id"],
    "summon profiles",
  );
  const recipeDefinitions = summonDefinitionArray(
    summonModuleExport(
      profileNamespace,
      ["summonActionRecipes", "summonRecipes", "SUMMON_RECIPES", "recipes"],
      "summon recipes",
    ),
    ["recipeId", "id"],
    "summon recipes",
  );
  const poolDefinitions = summonDefinitionArray(
    summonModuleExport(
      poolNamespace,
      ["summonActorPools", "summonPools", "SUMMON_POOLS", "pools"],
      "summon pools",
      { allowDefaultCollection: true },
    ),
    ["poolId", "spellIdentifier", "identifier", "id"],
    "summon pools",
  );

  const recipes = recipeDefinitions.map(recipe => ({
    ...recipe,
    recipeId: recipe.recipeId ?? recipe.id,
  }));
  const recipeIds = new Set(recipes.map(recipe => recipe.recipeId));
  assertSummonSource(recipes.every(recipe => typeof recipe.recipeId === "string" && recipe.recipeId.length), "every recipe needs recipeId");
  assertSummonSource(recipeIds.size === recipes.length, "recipeId values must be unique");
  assertSummonSource(
    recipeIds.size === expectedSummonRecipeRulesModels.size
      && [...expectedSummonRecipeRulesModels.keys()].every(recipeId => recipeIds.has(recipeId)),
    `expected exactly ${expectedSummonRecipeRulesModels.size} summon recipes, found ${recipeIds.size}`,
  );
  const recipesById = new Map(recipes.map(recipe => [recipe.recipeId, recipe]));
  for (const recipe of recipes) {
    assertSummonSource(
      recipe.rulesModel === expectedSummonRecipeRulesModels.get(recipe.recipeId),
      `${recipe.recipeId} rulesModel drifted`,
    );
    const expectedActionIds = expectedSummonRecipeActionIds.get(recipe.recipeId);
    assertSummonSource(
      Array.isArray(recipe.actions)
        && JSON.stringify(recipe.actions.map(action => action.actionId)) === JSON.stringify(expectedActionIds),
      `${recipe.recipeId} action order drifted`,
    );
    for (const action of recipe.actions) assertSummonActionSource(action, recipe);
  }

  const profiles = profileDefinitions.map(profile => normalizeSummonProfile(profile, recipesById));
  const profileIds = new Set(profiles.map(profile => profile.profileId));
  assertSummonSource(profileIds.size === profiles.length, "profileId values must be unique");
  assertSummonSource(
    profileIds.size === expectedSummonProfileRecipes.size
      && [...expectedSummonProfileRecipes.keys()].every(profileId => profileIds.has(profileId)),
    `expected exactly the ${expectedSummonProfileRecipes.size} frozen summon profiles, found ${[...profileIds].sort().join(", ")}`,
  );
  for (const profile of profiles) {
    const expectedRecipe = expectedSummonProfileRecipes.get(profile.profileId);
    assertSummonSource(profile.recipeId === expectedRecipe, `${profile.profileId} must use recipe ${expectedRecipe}`);
  }

  for (const profile of profiles) assertSummonSource(recipeIds.has(profile.recipeId), `${profile.profileId} references unknown recipe ${profile.recipeId}`);
  for (const recipeId of recipeIds) {
    assertSummonSource(profiles.some(profile => profile.recipeId === recipeId), `recipe ${recipeId} is orphaned`);
  }

  const pools = poolDefinitions.map(pool => {
    const poolId = pool.poolId ?? pool.spellIdentifier ?? pool.spellId ?? pool.identifier ?? pool.id;
    return { ...pool, poolId, profileIds: summonPoolProfileIds(pool) };
  });
  assertSummonSource(pools.length === expectedSummonPoolProfiles.size, `expected exactly ${expectedSummonPoolProfiles.size} summon pools, found ${pools.length}`);
  const poolIdentifiers = new Set(pools.map(pool => pool.poolId));
  assertSummonSource(poolIdentifiers.size === pools.length, "summon poolId values must be unique");
  for (const pool of pools) {
    const expectedProfiles = expectedSummonPoolProfiles.get(pool.poolId);
    assertSummonSource(expectedProfiles, `unexpected summon pool ${pool.poolId}`);
    const actualProfiles = new Set(pool.profileIds);
    assertSummonSource(
      actualProfiles.size === pool.profileIds.length || pool.poolId === "create-undead",
      `${pool.poolId} pool repeats profile ids outside the closed Create Undead cardinality choices`,
    );
    assertSummonSource(
      actualProfiles.size === expectedProfiles.size && [...expectedProfiles].every(profileId => actualProfiles.has(profileId)),
      `${pool.poolId} pool profile whitelist mismatch`,
    );
    for (const profileId of actualProfiles) assertSummonSource(profileIds.has(profileId), `${pool.poolId} references unknown profile ${profileId}`);
    for (const [choiceIndex, choice] of (pool.choices ?? []).entries()) {
      const choiceLabel = `${pool.poolId} choice ${choiceIndex}`;
      const expectedKeys = [
        "choice",
        "count",
        "documentId",
        "label",
        "mode",
        "profileId",
        "recipeId",
        "revision",
      ];
      assertSummonExactKeys(choice, expectedKeys, choiceLabel);
      const expectedCardinality = {
        azer: { profileId: "azer", mode: "single", count: 1 },
        "ice-mephit": { profileId: "ice-mephit", mode: "fixed-small", count: 2 },
        "mud-mephit": { profileId: "mud-mephit", mode: "fixed-small", count: 2 },
        skeleton: { profileId: "skeleton", mode: "fixed-group", count: 5 },
        zombie: { profileId: "zombie", mode: "fixed-group", count: 5 },
        "one-ghoul": { profileId: "ghoul", mode: "single", count: 1 },
        "two-ghouls": { profileId: "ghoul", mode: "fixed-small", count: 2 },
        "three-ghouls": { profileId: "ghoul", mode: "fixed-three", count: 3 },
      }[choice.choice] ?? {
        profileId: choice.profileId,
        mode: "single",
        count: 1,
      };
      assertSummonSource(
        choice.profileId === expectedCardinality.profileId
          && choice.mode === expectedCardinality.mode
          && choice.count === expectedCardinality.count,
        `${choiceLabel} cardinality drifted from the frozen native profile contract`,
      );
    }
  }
  for (const profile of profiles) {
    const pooled = pools.some(pool => pool.profileIds.includes(profile.profileId));
    if (profile.summonUsage === "pool-choice") {
      assertSummonSource(pooled, `profile ${profile.profileId} is absent from every summon pool`);
    } else {
      assertSummonSource(
        profile.profileId === "wood-woad"
          && profile.summonUsage === "native-activity"
          && !pooled,
        `profile ${profile.profileId} has an unsupported native-activity reachability contract`,
      );
    }
  }
  const sourceText = JSON.stringify({
    profiles: profileDefinitions,
    recipes: recipeDefinitions,
    pools: poolDefinitions,
  });
  assertSummonSource(!/(?:dnd5e_classpack|5epack|tasha)/i.test(sourceText), "source modules leak Tasha/donor data");
  return {
    actors: profiles.toSorted((left, right) => left.profileId.localeCompare(right.profileId)).map(profile => profile.actor),
    profiles,
    recipes,
    pools,
  };
}


// JSON-decoded data boundary; no module imports or executable content evaluation.
function assembleSummonProvider(provider) {
  assertSummonExactKeys(provider, ["schemaVersion", "profiles", "recipes", "pools"], "summon provider");
  assertSummonSource(provider.schemaVersion === 1, "unsupported summon provider schemaVersion");
  for (const key of ["profiles", "recipes", "pools"]) {
    assertSummonSource(Array.isArray(provider[key]), `summon provider ${key} must be an array`);
  }
  return assembleSummonActors(
    { summonProfiles: provider.profiles, summonActionRecipes: provider.recipes },
    { summonPools: provider.pools },
  );
}

  return Object.freeze({assembleSummonActors, assembleSummonProvider, assertSummonActorDocument, assertSummonSource});
}
