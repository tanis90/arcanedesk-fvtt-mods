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

`createAdvancementTools` also accepts `uuidFor(packName, documentId)` for `ensureItemGrant` and `applyGrantProfile`.
A grant profile supplies `allowedFeatureIds` (array), `levelCap`, and ordered `grants` with `id`, `level`, `title`,
`itemIds`, and optional `packName` (defaults to `classfeatures`). The source pass retains selected grants,
traits and scales within its cap; the explicit grants then restore the complete caller-declared progression,
including higher levels. The cap intentionally applies only to the source pass, not the explicit grant list.
Existing grants at the same level containing all requested IDs are retained instead of duplicated.
No concrete subclass grant tables or feature descriptions are included in this API.

`applyMartialClassProfile` accepts `allowedFeatureIds`, `levelCap`, ordered `grants`, a caller-owned
`choice` advancement template, `styleIds`, optional `img`, and optional `choiceBasedLevel` (default false).
It preserves HP advancement, filters source grants, restores declared grants, replaces source choices with the
provided choice and mapped style pool, and clears starting equipment. `choiceBasedLevel` infers absent levels
from the first configured choice; otherwise the source level defaults to 1.
`applyStyleSubclassProfile` accepts `allowedFeatureIds`, `levelCap`, `styleIds` and optional `img`;
it rewrites existing choices and retains selected grants, traits and scales without injecting new choices.
Both mutate the supplied document and use the factory's `uuidFor`; profiles and source advancement objects are not mutated.
Concrete class IDs, grant tables, hints and choice titles remain caller inputs.

## Activity interaction contracts

`@arcanedesk/auto2014-catalogue/activities` exports `createActivityTools({moduleId, spellAutomationProfiles})`.
The factory snapshots caller policy. Its helpers infer input/target/range, normalize template interaction flags,
configure automated dialogs, and prepare self-use or creature-target activities. The internal full build uses the same functions.
The policy contains a `version`, optional `defaults`, and optional `spells` keyed by caller identifiers; an individual
spell may override `templateTargets`, `autoTargetType`, `areaBehavior`, `implementation` or per-activity policy.
The source package supplies no concrete spell policy table or content descriptions.

Normalization mutates supplied documents/activities; it does not contact Foundry or execute a workflow.
`normalizeSelfItemUseActivity` preserves the existing Arcane contract: one item use, self targeting,
`consumption.spellSlot = true`, and an existing scaling configuration when present.
Template prompts are enabled only for measured templates outside automation-only activities.
These APIs describe existing build behavior; caller policy remains responsible for correct gameplay decisions.

## Martial feature normalization

`@arcanedesk/auto2014-catalogue/martial-features` exports `createMartialFeatureTools({moduleId, uuidFor, content})`.
It returns `ensureUtilityActivity`, `normalizeFighterAutomation`, `normalizeMonkAutomation` and `normalizeRogueAutomation`.
These preserve existing Arcane mechanics for the matched features; they mutate caller documents but do not run Foundry workflows.
They do not implement every feature of those classes.

`content` supplies `fighterImages` keyed by identifier, `monkImages` and `rogueImages` keyed by document ID,
`monk: {profUseIds, frightenFeatureId, effectId, effectName}`, and
`rogue: {sneakAttackFeatureId, damageActivityId, legacyEffectId}`.
Bindings are snapshotted; concrete source IDs, effect prose and icon mappings are not bundled here.
The internal build uses these same functions with its private bindings. Caller descriptions and spent resource counts are retained.

## Barbarian feature normalization

`@arcanedesk/auto2014-catalogue/barbarian-features` exports `createBarbarianFeatureTools({moduleId, uuidFor, content})`.
It preserves the existing rage, independent rider, resource and manual-fallback handling; it is not a promise that all subclass features are automated.
`content` provides `barbarianFeatureIdentifierById`, `juggernautDocumentIds`, `giantDocumentIds`, `officialImages`,
plus named `ids` and `text` bindings. See the [original fixture](tests/fixtures/barbarian-bindings.mjs) for the complete binding shape.
Private source IDs, rule descriptions and workflow prose are not included in the package.

The returned `normalizeBarbarianAutomation` mutates caller documents and preserves existing manual workflows.
`appendBarbarianWorkflowNote` appends caller prose once; rider helpers do not consume another rage.
Bindings are copied at construction. These functions prepare documents and do not execute Foundry workflows.
Utility Activity creation now lives in the shared activities entry; the martial-features entry retains its existing returned helper.

## Warlock and Ranger adapters

`@arcanedesk/auto2014-catalogue/class-feature-adapters` exports `createClassFeatureAdapters({moduleId, uuidFor, content})`.
Its `normalizeWarlockAutomation` and `normalizeRangerTceFeatureAutomation` methods preserve the existing
Armor of Shadows, source-link repair, Favored Foe, Deft Explorer/Canny and Roving preparation behavior.
They do not implement every feature of either class.

`content` supplies `warlockImages`, `rangerImages`,
`warlock: {pactMagicId, armorOfShadowsId, activityId, activityName, effectName}`, and
`ranger: {favoredFoeFeatureId, deftExplorerFeatureId, cannyFeatureId, rovingFeatureId}`.
Bindings are snapshotted. Concrete private IDs, names and icon maps remain caller inputs.
The malformed classpack link cleanup is limited to the bound Pact Magic document and preserves surrounding text.
Normalization mutates supplied documents; it does not run Foundry workflows or update existing world Actors.
The activities entry also exposes `keepOnlyActivity`, preserving the selected Activity's stable ID.

## Class effect preparation

`@arcanedesk/auto2014-catalogue/class-effects` exports `createClassEffectTools({moduleId, uuidFor, bindings})`.
It returns the existing normalizers for Abjure Enemy, Vow of Enmity, Bardic/Font of Inspiration, Countercharm,
Channel Divinity, Turn Undead, Vigilant Blessing, Twilight Sanctuary, Steps of Night, Dread Ambusher,
Umbral Sight, Divine Smite, fighting-style flags and Aura of Protection cleanup.
This is the existing implemented scope, not full automation coverage for every class feature.

`bindings` supplies `effectIds` and `labels`; see the [original fixture](tests/fixtures/class-effect-bindings.mjs).
The caller's descriptions and source content are not bundled. Inputs are snapshotted, while matched documents are mutated.
Font of Inspiration uses the supplied namespace for its recovery flag; the Arcane internal namespace retains its original output.
These helpers prepare data; live effects and declared riders still rely on the matching runtime.

### Caller-supplied spell content

The `./spell-content` entry exports `createSpellContentTools`. Supply `moduleId`,
`actorStudioModuleId`, `maxPreparedSpellLevel` (0–9), `supportedSpellcastingClasses`
(array), `actorStudioSubclassSpellLists` (identifier to level/lists), and
`arcaneOwnedSpellDescriptionIds` (array of explicit complete-card replacements).
The factory snapshots these bindings. Its methods prepare bilingual names/descriptions,
source identity remaps and class/subclass spell-list annotations on caller-owned documents.
They neither load source packs nor provide translations or redistribution permission.

Descriptions retain supplied HTML; this is not an HTML sanitizer. The existing bilingual
application only updates a description when both translated and existing descriptions are
nonempty. Complete-card replacements use the same guard. Callers must separately validate
required content rather than treating this helper as a completeness check.
`remapSpellReferences` preserves the legacy recursive string replacement behavior, including
text fields; use trusted, deliberate identity maps. Methods mutate supplied documents.

### Document preparation

`./documents` exports `createDocumentTools({moduleId, bindings})` for offline reference
rewriting, metadata preparation and embedded-effect hydration. Bindings contain ordered
`replacements`, ordered `packAliases` pairs, `metadata`, and a `sourceNamespace`.
Literal replacements use `{kind: 'literal', from, to}`; regex replacements use
`{kind: 'regex', pattern, flags, to}`. Literal source/target strings and regex targets
expand `{{moduleId}}`. Supply trusted, reviewed bindings: regexes and broad text
replacements are source-adapter policies, not a sanitizer for arbitrary downloaded inputs.

`cleanEffects` copies donor effects before editing them. Historical behavior is retained:
ID-referenced effects receive metadata/ownership normalization and lose their imported
type/system fields; inline effects retain those fields. Unresolved effect IDs are omitted.
The helper does not remove arbitrary executable fields or certify content rights. Compiled
spells must still use the clean-room composition boundary. No files or worlds are modified.

### Advancement constructors and data recipes

`createAdvancementTools` also returns `innateSpellGrant`, `traitAdvancement`,
`abilityScoreAdvancement` and `abilityChoiceAdvancement`. These retain the existing
2014 preparation templates: innate grants use Charisma without requiring a slot;
ability increases use the existing cap of 1. Caller-provided identities, labels,
choices and pools remain caller content, not bundled source material.

The `./advancement` entry additionally exports `resolveOptionRecipe(value, {references, calls})`.
Plain objects/arrays are copied recursively. `{$reference: name}` reads an explicitly
supplied own property; `{$call: name, args: [...]}` invokes an explicitly supplied own
function; array entries of `{$spread: value}` expand a resolved array. Unknown operations
and unresolved names fail. Only supply reviewed constructors and bindings; this resolver
is not a sandbox for arbitrary functions. Referenced pools retain their identity, matching
existing constructor behavior. There is no dynamic code evaluation or content download.

### Character options

`./character-options` exports `createCharacterOptionTools({moduleId, uuidFor, bindings})`.
It prepares backgrounds, feats and basic equipment using caller-supplied source labels,
identity overrides, static effects and advancement documents. Bindings are snapshotted;
see the original test fixture for the required fields. No rule descriptions, translations,
source pack documents or third-party artwork are supplied by this entry.

Background preparation retains traits and stable feature grants, recording deferred items
for later handling. Feat preparation clears incomplete imported activities and applies only
explicit effects/advancements. Neither operation claims additional combat automation.
Descriptions are preserved. Passive effect origins use the caller's `passiveEffectPack`;
the internal build preserves its historical origin policy during this migration.
`removeEmptyEffects` only tests changes/statuses, retaining the existing narrow cleanup rule.
These mutating preparation helpers do not install modules or update world Actors.

### PHB racial traits

`./phb-racial-traits` exports `createPhbRacialTools({moduleId, bindings, advancementTools, passiveTools})`.
Pass the existing advancement factory's `traitAdvancement`/`innateSpellGrant` and character-option
factory's `setPassiveEffects`/`passiveTransferEffect`; these are shared implementations, not copied adapters.
Bindings contain caller-owned trait IDs, four display labels, three spell identities, an identifier map
and a breath profile map. See the original fixture for the data shape.

The API returns `normalizePhbRacialTrait`, `normalizeDragonbornBreath`, `addResistanceEffect`
and `addBooleanFlagEffect`. Existing resource, scaling and runtime marker policies are preserved;
no rule descriptions, source documents or artwork are bundled. Methods prepare documents offline,
not world Actors. This extraction does not certify new runtime QA or expand automation support.
