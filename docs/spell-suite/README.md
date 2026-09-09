# Arcane Spells 2014 — 0.2.0

Version 0.2.0 includes 20 cantrips in addition to the
released 167 level 1–6 spells (187 definitions total). The cantrips have completed
their declared QA-A runtime scope; see the [versioned acceptance summary](../../packages/spells-2014/README.md#cantrip-runtime-acceptance)
for evidence boundaries. The 0.1.0 evidence below applies only to that release.
Download the versioned ZIP from the [0.2.0 release](https://github.com/tanis90/arcanedesk-fvtt-mods/releases/tag/arcane-spells-2014-v0.2.0),
or use the installation manifest below. Existing Actor Items require a separate
replacement or migration; updating the module does not rewrite them.

This suite adds automation to spell content already available in your Foundry
world. It contains 187 level 0–6 definitions, a compiler, spell runtime,
and the Harm, Banishing Smite and Toll the Dead scripts. It preserves each definition's stated
support and omissions. It does not promise every official spell or full automation
for every included spell.

The twentieth cantrip is Dancing Lights, with one native placement action and an
optional 1–4 light count (default four). Its minimal original Actor carrier is
included in `packs/summons`; it does not require a purchased creature source.
Its declared simplified behavior has passed QA-A acceptance.

For Dancing Lights, the GM performs native canvas placement. A normal sheet click
uses four lights with the automated configuration. To choose another count, hold
your Midi-QOL **Roll Toggle** key while clicking the same spell activity, choose
the Summons Profile in the native dialog, then click Cast Spell and place the lights.
QA-A uses `F` for Roll Toggle; check your world's keybindings rather than assuming
the same key. Context callers use the returned `light-count` selection contract.
The selected count changes this cast only. End concentration to remove its lights.

A light is automatically assigned to the caster's sole online non-GM owner. If
there are multiple owners, it initially remains under GM control. To assign a
specific light, the GM opens that light's Token actor sheet, opens the header
menu, and chooses **Configure light control**. Set the intended player's level
to **Owner** in Foundry's native ownership form and save. This changes only that
light, not the shared carrier Actor or other lights. Repeat for each light that
needs a different controller; the chosen player can then drag it on the canvas.

To represent merged lights, move the same cast's existing Tokens to one position
(their native Token configuration can set equal x/y), and change one display name
or image. Split them by dragging those same Tokens apart and restoring that display
setting. Do not copy Tokens or recast to split them. The GM still judges movement,
action cost, layout and out-of-range removal. End concentration to clean up the cast.

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

The spell package is `dist/arcane-spells-2014-0.2.0.zip`. Its SHA256 and size are
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
The development all-spell example compiles 187 definitions. It binds 178 using original
demonstration prose and reports nine as `unbound` because it supplies no summon
Actors. Those are successful compilations with unresolved resources, not runnable
summon spells. The example output is a developer inspection artifact, not a
compendium to install. Its repeated target ID is isolated per example result.

## Install and generate a local compendium

The current target is Foundry 13 (minimum 13.347) with dnd5e 5.3.3. Enable Midi-QOL
and DAE. Spells that require Active Auras or Aura Effects also require those
separate modules; the generator reports missing providers. Aura Effects is the
Foundry module `auraeffects`, and the aura runtime loads its installed helper file
on demand. This is not a bundled dependency.

The cantrip package supports **Active Token Effects** (module ID
`ATL`) as an on-demand dependency for Light. Install it from Foundry Setup's
Add-on Modules catalogue, then enable it in Manage Modules for your world.
ATL v1.1.1 passed standalone Light QA, including dependency disable/restore,
actual lighting, movement, walls and restoration of the original light.
Preview skips dependent spells when ATL is absent or disabled; other spells
remain available. Existing generated lighting Items also refuse to cast if ATL
is later disabled. Dancing Lights uses its included original carrier and native
Token lighting; it does not require ATL.

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
script-contract query, so the spell module rejects unsupported script-dependent
spells in that mode. The verified use path is standalone mode.
This is an explicit compatibility restriction, not a claim of full legacy coexistence.

## Source ownership and API boundaries

| Package | Responsibility |
| --- | --- |
| `automation-contracts` | Runtime profiles, adapter contracts, requirements, hashes and resource binding checks |
| `spell-compiler` | DSL validation, mechanical plans and Foundry Item emission |
| `spell-runtime` | Reviewed spell projection of the shared runtime, bootstrap and installation checks |
| `spells-2014` | 187 definitions, three scripts, content matching/binding and compendium generation |

Author in `packages/spells-2014/src/spells/<id>/definition.mjs`; registered scripts
live alongside their definitions. The legacy catalogue re-exports these sources
and retains 20 cantrips. Do not maintain a separate private spell implementation.
`compileSpellPlan` is a Node build API. Browser code consumes serialized plans via
`@arcanedesk/spells-2014/binding`; it does not load executable DSL or the Node compiler.

The binding result's `executionPlanHash` identifies mechanics and `contentHash`
identifies presentation separately. `bound` means the document binding succeeded;
the host must still check runtime and actual resources before treating it as usable.
