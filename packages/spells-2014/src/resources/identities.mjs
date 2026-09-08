// Stable references only; full actor statistics and action recipes are provider inputs.
const identities = [
  {
    "profileId": "spiritual-weapon-greataxe",
    "revision": 1,
    "documentId": "0cbe17aed0120a57",
    "recipeId": "lacerate",
    "summonUsage": "pool-choice"
  },
  {
    "profileId": "spiritual-weapon-greatsword",
    "revision": 1,
    "documentId": "d2807f84a46288b9",
    "recipeId": "lacerate",
    "summonUsage": "pool-choice"
  },
  {
    "profileId": "spiritual-weapon-halberd",
    "revision": 1,
    "documentId": "e8c08dcac1cf6216",
    "recipeId": "lacerate",
    "summonUsage": "pool-choice"
  },
  {
    "profileId": "spiritual-weapon-maul",
    "revision": 1,
    "documentId": "c2dac2b77a03e016",
    "recipeId": "concussive-smash",
    "summonUsage": "pool-choice"
  },
  {
    "profileId": "spiritual-weapon-spear",
    "revision": 1,
    "documentId": "4456638c63285e02",
    "recipeId": "piercing-strike",
    "summonUsage": "pool-choice"
  },
  {
    "profileId": "spiritual-weapon-trident",
    "revision": 1,
    "documentId": "49abc6d31fc8fc95",
    "recipeId": "piercing-strike",
    "summonUsage": "pool-choice"
  },
  {
    "profileId": "flaming-sphere",
    "revision": 1,
    "documentId": "f178c17eabee8641",
    "recipeId": "ram-ablaze",
    "summonUsage": "pool-choice"
  },
  {
    "profileId": "azer",
    "revision": 1,
    "documentId": "2070b3725934ac6b",
    "recipeId": "azer-2014",
    "summonUsage": "pool-choice"
  },
  {
    "profileId": "ice-mephit",
    "revision": 1,
    "documentId": "2027f254998302b3",
    "recipeId": "ice-mephit-2014",
    "summonUsage": "pool-choice"
  },
  {
    "profileId": "mud-mephit",
    "revision": 1,
    "documentId": "151f5d83c9c2d233",
    "recipeId": "mud-mephit-2014",
    "summonUsage": "pool-choice"
  },
  {
    "profileId": "dryad",
    "revision": 1,
    "documentId": "08029d05438a652f",
    "recipeId": "dryad-2014",
    "summonUsage": "pool-choice"
  },
  {
    "profileId": "wood-woad",
    "revision": 1,
    "documentId": "b9f7f2d4d8471238",
    "recipeId": "wood-woad-2014",
    "summonUsage": "native-activity"
  },
  {
    "profileId": "air-elemental",
    "revision": 1,
    "documentId": "bfe3997de7e9c962",
    "recipeId": "air-elemental-2014",
    "summonUsage": "pool-choice"
  },
  {
    "profileId": "earth-elemental",
    "revision": 1,
    "documentId": "1587bccd020849c8",
    "recipeId": "earth-elemental-2014",
    "summonUsage": "pool-choice"
  },
  {
    "profileId": "fire-elemental",
    "revision": 1,
    "documentId": "aa88b3c5ddd4e298",
    "recipeId": "fire-elemental-2014",
    "summonUsage": "pool-choice"
  },
  {
    "profileId": "water-elemental",
    "revision": 1,
    "documentId": "ed79b1dc936dd3d9",
    "recipeId": "water-elemental-2014",
    "summonUsage": "pool-choice"
  },
  {
    "profileId": "skeleton",
    "revision": 1,
    "documentId": "858201b43a0ab498",
    "recipeId": "skeleton-2014",
    "summonUsage": "pool-choice"
  },
  {
    "profileId": "zombie",
    "revision": 1,
    "documentId": "3ea326b215fdc312",
    "recipeId": "zombie-2014",
    "summonUsage": "pool-choice"
  },
  {
    "profileId": "ghoul",
    "revision": 1,
    "documentId": "f4f04b3c6de31f96",
    "recipeId": "ghoul-2014",
    "summonUsage": "pool-choice"
  },
  {
    "profileId": "cambion",
    "revision": 1,
    "documentId": "7126164b5ea26315",
    "recipeId": "cambion-2014",
    "summonUsage": "pool-choice"
  },
  {
    "profileId": "deva",
    "revision": 1,
    "documentId": "24284ef59043f99f",
    "recipeId": "deva-2014",
    "summonUsage": "pool-choice"
  },
  {
    "profileId": "djinni",
    "revision": 1,
    "documentId": "692a056acba1b65a",
    "recipeId": "djinni-2014",
    "summonUsage": "pool-choice"
  }
];
export const summonProfileIdentities = Object.freeze(identities.map(Object.freeze));
export const summonProfileIdentitiesById = Object.freeze(Object.fromEntries(summonProfileIdentities.map(p => [p.profileId,p])));
