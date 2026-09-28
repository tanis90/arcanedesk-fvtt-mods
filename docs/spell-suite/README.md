# Arcane Spells 2014 — 0.1.0

This suite adds automation to spell content already available in your Foundry
world. It contains 167 existing level 1–6 definitions, a compiler, spell runtime,
and the Harm and Banishing Smite scripts. It preserves each definition's stated
support and omissions. It does not promise every official spell or full automation
for every included spell.

Version 0.1.0 passed offline checks and an isolated Foundry world test: 123 spells
generated from SRD 5.1, with source text preserved and stable IDs on regeneration.
Representative casting, effects, concentration and template tests passed. This
does not certify combat behavior for every definition. See [release notes](CHANGELOG.md).

## Build from source

Use Node 24 and run from the public repository root:

```sh
npm ci
npm run verify
```

The spell candidate is `dist/arcane-spells-2014-0.1.0.zip`. Its SHA256 and size are
in `dist/artifacts.json`. The ZIP contains `module.json` at its root, a browser
script, `coverage.json`, and licenses. It contains no source spell descriptions
or populated spell compendium. `coverage.json` lists the actual spell IDs,
support/omissions, providers, script contracts and summon resource requirements.

## Compile and bind original example content

These commands run offline and do not require Foundry or a D&D Beyond account:

```sh
node examples/spell-suite/compile.mjs fireball dist/example-fireball.json
node examples/spell-suite/compile.mjs --all dist/example-all.json
```

Use a new output filename on subsequent runs; existing files are protected.
Each result includes its mechanical plan, requirements, and binding result.
The all-spell example compiles 167 definitions. It binds 159 using original
demonstration prose and reports eight as `unbound` because it supplies no summon
Actors. Those are successful compilations with unresolved resources, not runnable
summon spells. The example output is a developer inspection artifact, not a
compendium to install. Its repeated target ID is isolated per example result.

## Install and generate a local compendium

The current target is Foundry 13 (minimum 13.347) with dnd5e 5.3.3. Enable Midi-QOL
and DAE. Spells that require Active Auras or Aura Effects also require those
separate modules; the generator reports missing providers. Aura Effects is the
Foundry module `auraeffects`, and the aura runtime loads its installed helper file
on demand. This is not a bundled dependency.

The tested stack is Foundry 13.351, dnd5e 5.3.3, Midi-QOL 13.0.63, DAE 13.0.28,
Times Up 13.1.9, socketlib 1.1.3, libWrapper 1.13.5.1, Active Auras 0.12.7 and
Aura Effects 1.5.2. Enable Times Up for duration expiry and both aura providers
for the tested aura/template paths. Install their required dependencies separately.

In Foundry Setup → Add-on Modules → Install Module, paste this manifest URL:

```text
https://raw.githubusercontent.com/tanis90/arcanedesk-fvtt-mods/main/modules/arcane-spells-2014/module.json
```

For manual ZIP installation, use step 1 below; after installation continue at step 2.

1. With the server stopped, extract the versioned ZIP to
   `Data/modules/arcane-spells-2014/`, so `module.json` is directly inside that folder.
2. Start the server and enable **Arcane Spells — 2014** and its dependencies in
   the selected dnd5e world.
3. As GM, open Configure Settings and choose **Generate Arcane spell compendium**.
4. Select the system's SRD 5.1 / 2014 spells. The generator recognizes that source
   from pack identity and metadata; it does not infer 2014 from a display name.
5. Preview matches, unsupported entries, conflicts and missing dependencies.
   Only ready entries are included in the generated count. Confirm generation.
6. Open the resulting world compendium and drag a generated spell onto a
   character. Its source description is retained; its Activity and automated
   Effects come from Arcane's definition. Cast through that Activity.
7. Repeat generation using the same source and output name. Owned entries keep
   their IDs and are updated rather than duplicated. Existing characters are not
   upgraded: use a fresh test character/item to test the changed compendium.

Only the first active GM by user ID performs writes. Output must be an unlocked
Arcane-owned world Item compendium. A same-named user compendium or a foreign
Item collision is rejected. Sources and existing Actors are never rewritten.
If a write fails, read the actual completed/uncertain result and preview again;
do not assume the whole batch was rolled back.

The module does not overwrite your automation settings. For the tested automatic
damage/effect flow, enable Midi-QOL macros and actor macros, automatic hit/save
checks, automatic item-effect application/removal, and automatic damage application.
The QA settings used `allowUseMacro=true`, `allowActorUseMacro=true`,
`autoItemEffects=applyRemove`, `autoCheckHit=all`, `autoCheckSaves=all`,
`autoApplyDamage=yesCard`, `autoCompleteWorkflow=true`, `waitForDamageApplication=true`.
Enable Times Up and passive-effect updates. Active Auras was tested with
combat-only and wall blocking disabled, measurement and vertical Euclidean distance
enabled. Other settings may require GM interaction; verify them in a test world first.

## Content sources and boundaries

SRD 2014 is the default no-account path. It covers the intersection of its content
and this suite's 167 definitions, not the whole suite. Imported compendiums may
also be selected, including content already imported with DDB Importer. The suite
does not log in, read cookies, download books, or run DDB import operations.

The binding API checks `system.identifier`, spell level and 2014 rules. For sources
without reliable identifiers it accepts an explicit source-document-ID to spell-ID
map. A translated display name alone never authorizes a match, and a DDB Legacy
flag does not prove 2014. Source Effects, Activities and macros are discarded;
name, description, image and source metadata are taken from the caller.

The adapter checks DDB's `is2014`/`is2024` flags against the Item's rules and any
explicit source selection. Conflicts are rejected. API callers may provide
`ddbIdentities: {"<definitionId>": "<spell-id>"}` alongside document-ID mappings;
conflicting mappings are rejected too. Normal imported identifiers work without
a custom map. The field contract was checked against the pinned
[DDBSpell parser](https://github.com/MrPrimate/ddb-importer/blob/0816333dce5e9491181a620e1e405f6d4fc54a49/src/parser/spells/DDBSpell.ts).
Tests use invented content and IDs; no account or purchased book is needed.

Descriptions can contain links and image paths referring to their source package.
Keep those sources available. Retaining the text does not copy or repair all its
resources. User content and generated world compendiums are local outputs and
must not be committed to the public repository.

Binding receipts and generated ownership metadata include
`presentationDependencies` with literal UUID/Compendium, image, HTML `src` and
`href` references. `verified: false` means these references have not been resolved;
the inventory neither fetches them nor claims to enumerate every possible CSS or
embedded-script dependency. It does not alter the caller's description.

Summon profile bindings require matching profile/revision/recipe contracts and
Actor UUIDs. UUID syntax alone does not verify an Actor's statistics. The current
generator UI reports these spells as unbound. The source API accepts explicit
profile bindings; a consuming host must verify actual resources. This candidate
does not include a general summon-content importer or provider-selection UI.

When the existing complete Auto 2014 module is active, it owns runtime hooks.
The spell module does not initialize another core. The old core has no read-only
script-contract query, so the current candidate rejects the two script-dependent
spells in that mode. The verified use path is standalone mode.
This is an explicit compatibility restriction, not a claim of full legacy coexistence.

## Source ownership and API boundaries

| Package | Responsibility |
| --- | --- |
| `automation-contracts` | Runtime profiles, adapter contracts, requirements, hashes and resource binding checks |
| `spell-compiler` | DSL validation, mechanical plans and Foundry Item emission |
| `spell-runtime` | Reviewed spell projection of the shared runtime, bootstrap and installation checks |
| `spells-2014` | 167 definitions, two scripts, content matching/binding and compendium generation |

Author in `packages/spells-2014/src/spells/<id>/definition.mjs`; the two scripts
live alongside their definitions. The legacy catalogue re-exports these sources
and retains 19 cantrips. Do not maintain a separate private spell implementation.
`compileSpellPlan` is a Node build API. Browser code consumes serialized plans via
`@arcanedesk/spells-2014/binding`; it does not load executable DSL or the Node compiler.

The binding result's `executionPlanHash` identifies mechanics and `contentHash`
identifies presentation separately. `bound` means the document binding succeeded;
the host must still check runtime and actual resources before treating it as usable.
