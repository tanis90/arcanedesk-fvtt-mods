import {
  summonProfileIdentities as summonProfiles,
  summonProfileIdentitiesById as summonProfilesById,
} from "./identities.mjs";

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function assert(condition, message) {
  if (!condition) throw new Error(`summon pool source: ${message}`);
}

const CARDINALITY_BY_MODE = Object.freeze({
  single: 1,
  "fixed-small": 2,
  "fixed-three": 3,
  "fixed-group": 5,
});

const CHOICE_KEYS = Object.freeze([
  "choice",
  "count",
  "documentId",
  "label",
  "mode",
  "profileId",
  "recipeId",
  "revision",
]);

function materializeChoice(choice, label, profileId, mode, count) {
  const profile = summonProfilesById[profileId];
  assert(profile, `unknown profile ${profileId}`);
  return {
    choice,
    label,
    profileId: profile.profileId,
    revision: profile.revision,
    documentId: profile.documentId,
    recipeId: profile.recipeId,
    mode,
    count,
  };
}

export const spiritualWeaponPool = deepFreeze({
  poolId: "spiritual-weapon-forms",
  choices: [
    materializeChoice("greataxe", "Greataxe", "spiritual-weapon-greataxe", "single", 1),
    materializeChoice("greatsword", "Greatsword", "spiritual-weapon-greatsword", "single", 1),
    materializeChoice("halberd", "Halberd", "spiritual-weapon-halberd", "single", 1),
    materializeChoice("maul", "Maul", "spiritual-weapon-maul", "single", 1),
    materializeChoice("spear", "Spear", "spiritual-weapon-spear", "single", 1),
    materializeChoice("trident", "Trident", "spiritual-weapon-trident", "single", 1),
  ],
});

export const flamingSpherePool = deepFreeze({
  poolId: "flaming-sphere",
  choices: [
    materializeChoice("flaming-sphere", "Flaming Sphere", "flaming-sphere", "single", 1),
  ],
});

export const conjureMinorElementalsPool = deepFreeze({
  poolId: "conjure-minor-elementals",
  choices: [
    materializeChoice("azer", "Azer", "azer", "single", 1),
    materializeChoice("ice-mephit", "Ice Mephit", "ice-mephit", "fixed-small", 2),
    materializeChoice("mud-mephit", "Mud Mephit", "mud-mephit", "fixed-small", 2),
  ],
});

export const conjureWoodlandBeingsPool = deepFreeze({
  poolId: "conjure-woodland-beings",
  choices: [
    materializeChoice("dryad", "Dryad", "dryad", "single", 1),
  ],
});

function materializeConjureElementalChoice(choice, label, profileId) {
  const profile = summonProfilesById[profileId];
  assert(profile, `unknown Conjure Elemental profile ${profileId}`);
  return {
    choice,
    label,
    profileId: profile.profileId,
    revision: profile.revision,
    documentId: profile.documentId,
    recipeId: profile.recipeId,
    mode: "single",
    count: 1,
  };
}

// Spell-private pool; integrated into the canonical pool export below.
export const conjureElementalPool = deepFreeze({
  poolId: "conjure-elemental",
  choices: [
    materializeConjureElementalChoice(
      "air-elemental",
      "Air Elemental",
      "air-elemental",
    ),
    materializeConjureElementalChoice(
      "earth-elemental",
      "Earth Elemental",
      "earth-elemental",
    ),
    materializeConjureElementalChoice(
      "fire-elemental",
      "Fire Elemental",
      "fire-elemental",
    ),
    materializeConjureElementalChoice(
      "water-elemental",
      "Water Elemental",
      "water-elemental",
    ),
  ],
});

function validateConjureElementalPool() {
  assert(conjureElementalPool.poolId === "conjure-elemental", "Conjure Elemental pool id drifted");
  assert(
    JSON.stringify(conjureElementalPool.choices.map(choiceSignature))
      === JSON.stringify([
        ["air-elemental", "Air Elemental", "air-elemental", "single", 1],
        ["earth-elemental", "Earth Elemental", "earth-elemental", "single", 1],
        ["fire-elemental", "Fire Elemental", "fire-elemental", "single", 1],
        ["water-elemental", "Water Elemental", "water-elemental", "single", 1],
      ]),
    "Conjure Elemental choices must remain four named single/count 1 profiles",
  );
  for (const [index, choice] of conjureElementalPool.choices.entries()) {
    assert(
      JSON.stringify(Object.keys(choice).sort()) === JSON.stringify([...CHOICE_KEYS].sort()),
      `Conjure Elemental choice ${index} has an open or incomplete shape`,
    );
    assert(
      choice.revision === summonProfilesById[choice.profileId]?.revision
        && choice.documentId === summonProfilesById[choice.profileId]?.documentId
        && choice.recipeId === summonProfilesById[choice.profileId]?.recipeId,
      `Conjure Elemental choice ${index} drifted from its immutable profile`,
    );
  }
}

validateConjureElementalPool();

export const createUndeadPool = deepFreeze({
  poolId: "create-undead",
  choices: [
    materializeChoice("one-ghoul", "One Ghoul", "ghoul", "single", 1),
    materializeChoice("two-ghouls", "Two Ghouls", "ghoul", "fixed-small", 2),
    materializeChoice("three-ghouls", "Three Ghouls", "ghoul", "fixed-three", 3),
  ],
});

export const PLANAR_ALLY_POOL = deepFreeze({
  poolId: "planar-ally",
  choices: [
    materializeChoice("cambion", "Cambion", "cambion", "single", 1),
    materializeChoice("deva", "Deva", "deva", "single", 1),
    materializeChoice("djinni", "Djinni", "djinni", "single", 1),
  ],
});

const rawPools = [
  spiritualWeaponPool,
  flamingSpherePool,
  conjureMinorElementalsPool,
  conjureWoodlandBeingsPool,
  conjureElementalPool,
];

const FROZEN_POOL_CHOICES = deepFreeze({
  "spiritual-weapon-forms": [
    ["greataxe", "Greataxe", "spiritual-weapon-greataxe", "single", 1],
    ["greatsword", "Greatsword", "spiritual-weapon-greatsword", "single", 1],
    ["halberd", "Halberd", "spiritual-weapon-halberd", "single", 1],
    ["maul", "Maul", "spiritual-weapon-maul", "single", 1],
    ["spear", "Spear", "spiritual-weapon-spear", "single", 1],
    ["trident", "Trident", "spiritual-weapon-trident", "single", 1],
  ],
  "flaming-sphere": [
    ["flaming-sphere", "Flaming Sphere", "flaming-sphere", "single", 1],
  ],
  "conjure-minor-elementals": [
    ["azer", "Azer", "azer", "single", 1],
    ["ice-mephit", "Ice Mephit", "ice-mephit", "fixed-small", 2],
    ["mud-mephit", "Mud Mephit", "mud-mephit", "fixed-small", 2],
  ],
  "conjure-woodland-beings": [
    ["dryad", "Dryad", "dryad", "single", 1],
  ],
  "conjure-elemental": [
    ["air-elemental", "Air Elemental", "air-elemental", "single", 1],
    ["earth-elemental", "Earth Elemental", "earth-elemental", "single", 1],
    ["fire-elemental", "Fire Elemental", "fire-elemental", "single", 1],
    ["water-elemental", "Water Elemental", "water-elemental", "single", 1],
  ],
  "danse-macabre": [
    ["skeleton", "Five Skeletons", "skeleton", "fixed-group", 5],
    ["zombie", "Five Zombies", "zombie", "fixed-group", 5],
  ],
  "create-undead": [
    ["one-ghoul", "One Ghoul", "ghoul", "single", 1],
    ["two-ghouls", "Two Ghouls", "ghoul", "fixed-small", 2],
    ["three-ghouls", "Three Ghouls", "ghoul", "fixed-three", 3],
  ],
  "planar-ally": [
    ["cambion", "Cambion", "cambion", "single", 1],
    ["deva", "Deva", "deva", "single", 1],
    ["djinni", "Djinni", "djinni", "single", 1],
  ],
});

function choiceSignature(choice) {
  return [choice.choice, choice.label, choice.profileId, choice.mode, choice.count];
}

function validatePools(pools) {
  assert(pools.length === 8, "exactly eight summon pools are required");
  const poolIds = new Set();
  const referencedProfilePools = new Map();

  for (const [poolIndex, pool] of pools.entries()) {
    const path = `pools[${poolIndex}]`;
    const poolKeys = Object.keys(pool).sort();
    assert(
      JSON.stringify(poolKeys) === JSON.stringify(["choices", "poolId"]),
      `${path} must contain only poolId and choices`,
    );
    assert(typeof pool.poolId === "string" && pool.poolId.length > 0, `${path}.poolId is required`);
    assert(!poolIds.has(pool.poolId), `${path}.poolId must be unique`);
    poolIds.add(pool.poolId);
    assert(Array.isArray(pool.choices) && pool.choices.length > 0, `${path}.choices must be non-empty`);

    const frozenChoices = FROZEN_POOL_CHOICES[pool.poolId];
    assert(frozenChoices, `${path}.poolId is not an approved root summon pool`);
    assert(
      JSON.stringify(pool.choices.map(choiceSignature)) === JSON.stringify(frozenChoices),
      `${path}.choices drifted from the frozen root pool contract`,
    );

    const choices = new Set();
    for (const [choiceIndex, choice] of pool.choices.entries()) {
      const choicePath = `${path}.choices[${choiceIndex}]`;
      assert(
        JSON.stringify(Object.keys(choice).sort()) === JSON.stringify([...CHOICE_KEYS].sort()),
        `${choicePath} has an open or incomplete shape`,
      );
      assert(typeof choice.choice === "string" && choice.choice.length > 0, `${choicePath}.choice is required`);
      assert(typeof choice.label === "string" && choice.label.length > 0, `${choicePath}.label is required`);
      assert(Object.hasOwn(CARDINALITY_BY_MODE, choice.mode), `${choicePath}.mode is unsupported`);
      assert(
        choice.count === CARDINALITY_BY_MODE[choice.mode],
        `${choicePath}.count must match its closed ${choice.mode} mode`,
      );
      assert(!choices.has(choice.choice), `${choicePath}.choice must be unique in its pool`);
      choices.add(choice.choice);
      const previousPoolId = referencedProfilePools.get(choice.profileId);
      assert(
        previousPoolId === undefined || previousPoolId === pool.poolId,
        `${choicePath}.profileId appears in two pools`,
      );
      referencedProfilePools.set(choice.profileId, pool.poolId);

      const profile = summonProfilesById[choice.profileId];
      assert(profile, `${choicePath}.profileId is unknown`);
      assert(profile.summonUsage === "pool-choice", `${choicePath}.profileId is not a root pool-choice profile`);
      assert(choice.revision === profile.revision, `${choicePath}.revision drifted`);
      assert(choice.documentId === profile.documentId, `${choicePath}.documentId drifted`);
      assert(choice.recipeId === profile.recipeId, `${choicePath}.recipeId drifted`);
    }
  }

  const poolChoiceProfiles = summonProfiles.filter(profile => profile.summonUsage === "pool-choice");
  assert(
    referencedProfilePools.size === poolChoiceProfiles.length
      && poolChoiceProfiles.every(profile => referencedProfilePools.has(profile.profileId)),
    "every pool-choice profile must be referenced by exactly one root pool choice",
  );

  const nativeActivityProfiles = summonProfiles.filter(profile => profile.summonUsage === "native-activity");
  assert(
    nativeActivityProfiles.every(profile => !referencedProfilePools.has(profile.profileId)),
    "native-activity profiles must not appear in root pools",
  );
  assert(
    JSON.stringify(nativeActivityProfiles.map(profile => profile.profileId)) === JSON.stringify(["wood-woad"]),
    "native-activity profile allowlist must contain only Wood Woad",
  );
}

function materializeDanseMacabreChoice(choice, label, profileId) {
  const profile = summonProfilesById[profileId];
  assert(profile, `unknown Danse Macabre profile ${profileId}`);
  return {
    choice,
    label,
    profileId: profile.profileId,
    revision: profile.revision,
    documentId: profile.documentId,
    recipeId: profile.recipeId,
    mode: "fixed-group",
    count: 5,
  };
}

// Spell-private pool; integrated into the canonical pool export below.
export const danseMacabrePool = deepFreeze({
  poolId: "danse-macabre",
  choices: [
    materializeDanseMacabreChoice(
      "skeleton",
      "Five Skeletons",
      "skeleton",
    ),
    materializeDanseMacabreChoice(
      "zombie",
      "Five Zombies",
      "zombie",
    ),
  ],
});

function validateDanseMacabrePool() {
  assert(danseMacabrePool.poolId === "danse-macabre", "Danse Macabre pool id drifted");
  assert(
    JSON.stringify(danseMacabrePool.choices.map(choiceSignature))
      === JSON.stringify([
        ["skeleton", "Five Skeletons", "skeleton", "fixed-group", 5],
        ["zombie", "Five Zombies", "zombie", "fixed-group", 5],
      ]),
    "Danse Macabre choices must remain two homogeneous fixed groups of five",
  );
  for (const [index, choice] of danseMacabrePool.choices.entries()) {
    assert(
      JSON.stringify(Object.keys(choice).sort()) === JSON.stringify([...CHOICE_KEYS].sort()),
      `Danse Macabre choice ${index} has an open or incomplete shape`,
    );
    assert(
      choice.revision === summonProfilesById[choice.profileId]?.revision
        && choice.documentId === summonProfilesById[choice.profileId]?.documentId
        && choice.recipeId === summonProfilesById[choice.profileId]?.recipeId,
      `Danse Macabre choice ${index} drifted from its immutable profile`,
    );
  }
}

validateDanseMacabrePool();

const integratedPools = [
  ...rawPools,
  danseMacabrePool,
  createUndeadPool,
  PLANAR_ALLY_POOL,
];
validatePools(integratedPools);

export const summonPools = deepFreeze(integratedPools);

export const summonPoolsById = deepFreeze(Object.fromEntries(
  summonPools.map(pool => [pool.poolId, pool]),
));
