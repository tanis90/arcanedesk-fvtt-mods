# Auto 2014 automation catalogue

The sole source of the migrated 186 spell recipes, summon pools/references and two per-spell scripts.
Full summon profiles are provider inputs; the catalogue keeps only 22 immutable reference records.
The complete internal module build stages these same files into its historical relative layout.
The package includes automation recipes, implementation limitations and DM workflow notes.
It does not bundle full spell descriptions, translations, artwork or creature profile data.

```js
import {composeRegisteredSpell} from '@arcanedesk/auto2014-catalogue';
const {item, compilation} = composeRegisteredSpell(contentItem);
```

Packagers can use `perSpellScriptRegistry` for module paths and `readPerSpellScriptSource(id)` for
the corresponding script artifact. This preserves the original CRLF artifact format across platforms
while editable source remains LF. Loading these scripts requires the matching Arcane runtime dispatcher.

The caller supplies an Item with an exact registered system.identifier and content they may use.
Unknown identifiers fail explicitly. Descriptions and stable identity are retained; the trusted recipe
provides clean-room automation. The compiler is a dependency, not a copied private implementation.
No full spell descriptions, translation corpus or compendium database is supplied by this API.

This is offline composition, not a complete module installer or an Actor update API. Runtime and
companion scripts must be packaged and loaded correctly; generated summon profiles also need a
full profile provider and trusted validation data. Composition applies the same disabled-animation
placeholder cleanup used by the complete build. Internal CI reconstructs every registered spell from
the generated compendium and compares every field with this public composition API; missing or
duplicate recipes fail. This checks spell output parity, not completeness of the public installer.
Content acquisition and complete module installation remain to be resolved before a public installable release.

## Summon assembly with caller-provided data

```js
import {createSummonAssembler} from '@arcanedesk/auto2014-catalogue/summons';
const assembler = createSummonAssembler(trustedValidationContracts);
const {actors} = assembler.assembleSummonProvider(providerData);
```

`providerData` has exactly `schemaVersion: 1`, `profiles`, `recipes`, and `pools`; the last three
are arrays. Validation contracts have `schemaVersion: 1` and six nonempty entry-array tables:
`expectedSummonProfileRecipes`, `expectedSummonProfileDocuments`, `expectedSummonPoolProfiles`,
`expectedSummonRecipeRulesModels`, `expectedSummonRecipeActionIds`, and `expected2014SummonProfiles`.
Pool table values are arrays. Duplicate table keys are rejected. The assembler copies the trusted
rules so subsequent caller mutation cannot change an existing instance's acceptance rules.

The package supplies assembly code and compatibility checks, not these full content/validation datasets.
Use independently reviewed validation data; do not generate acceptance rules from candidate content
merely to pass a check. Input data is never imported as JavaScript, fetched, or installed by this API.
Keep restricted datasets and generated outputs within their permitted usage and distribution scope.

The implementation supports the existing Arcane legacy and 2014 simplified action schemas and
retains specific compatibility constraints. It is not a general monster importer or an arbitrary
rules engine. The original training-orb fixture in `tests/fixtures/summon-provider.mjs` demonstrates
the data shape without a published monster stat block. Internal full-content builds use this same
implementation and validate all 22 existing summon Actors. Historical generated labels such as
“Arcane-owned” do not establish rights in caller-provided data.

Actors can be passed to `@arcanedesk/foundry-pack-builder`; assembling them alone does not produce
a complete Auto 2014 installer. Matching runtime, spell definitions, stable references, assets and
module packaging still need to be assembled and verified together.

From the repository root on Node 24: `npm ci`, then `npm run verify`.
Verification tests every registered recipe's content boundary, packs the source packages,
installs them offline outside the repository and composes all 186 recipes without private content inputs.
Package checks also reject accidentally including the full summon profile source. Internal tests compare
every reference's profileId, revision, documentId, recipeId and summonUsage with the full provider.

Recipe support and historical acceptance metadata describe the original implementation, including its
manual fallbacks. Successful compilation does not certify a new Foundry setup or establish that every
recipe is fully automated. Installation, matching companion data and runtime QA remain separate gates.
Package versions follow the existing module/compiler baseline; no npm registry release is implied.

## Shared advancement transforms

The `@arcanedesk/auto2014-catalogue/advancement` entry exports `createAdvancementTools({rewriteUuid, excludedFeatureIds})`.
The caller supplies its reference mapper and optional exclusion IDs; the returned tools collect grant/choice references,
normalize grants, filter class/subclass advancement and normalize Actor Studio spell-limit labels.
The complete internal build uses these same functions. They do not supply class descriptions, class-specific rules or source IDs.

`filterClassAdvancement` and `filterSubclassAdvancement` mutate the supplied document; grant normalization clones its input.
Pass explicit `levelCap` and `allowedIds` (a Set) to preserve the intended content range, including levels 7–20.
Class filtering clears starting equipment as in the existing Arcane build; subclass filtering retains only its supported advancement types.
