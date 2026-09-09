# Spells 2014

Developers and agents: read [法术开发必读](DEVELOPMENT.md) before changing spell automation.

The root entry exports 187 level 0–6 spell definitions (20 cantrips and the
167 existing level 1–6 spells) and three
registered scripts. Author definitions in `src/spells/<id>/definition.mjs`; Harm,
Banishing Smite and Toll the Dead also own `script.js` in that directory. `./spells/<id>` loads
one definition. `./scripts` reads the registered script artifacts for packaging.
The old catalogue re-exports the same definitions, including cantrips.
This development scope is larger than the published v0.1.0 module; migration
does not by itself certify the cantrips in the standalone Foundry host.
The root entry uses Node to verify/read script files at build time. Browser hosts
consume precompiled plans and the side-effect-free subpaths below.

Browser-safe source matching and presentation extraction:
`previewSpellSources` requires a catalogue and checks rules, level and identity.
A matched source does not certify runtime readiness. No source or Actor is mutated.

`./binding` exports `bindSpellContent` for precompiled plans. It returns rejected,
unbound or bound and requires explicit target/resource identities. Bound means
data binding succeeded; the Foundry host must verify resources before generating
a usable pack. Source macros, effects and activities are never copied.

`./compendium` prepares deterministic owned Item writes and handles acknowledged
versus uncertain outcomes without blind retries. `./foundry-compendiums` wraps
Foundry v13 public document APIs. `./generator-dialog` provides the native source,
preview, confirmation and result dialogs; the host must provide a real runtime
availability checker. None of these entries register hooks on import.

## Cantrip runtime acceptance

Toll the Dead and Dancing Lights completed their declared runtime acceptance in
QA-A on Foundry 13.351 / dnd5e 5.3.3. Final executable candidate: `e67ff8f`,
module 0.2.0, ZIP SHA256
`4c55c7ad49d5396c9c5a64a4fd7653cad844c2845dcc5b130845543610235c31`.
The test stack used Midi-QOL 13.0.63, DAE 13.0.28, Times Up 13.1.9,
socketlib 1.1.3, libWrapper 1.13.5.1, Active Auras 0.12.7,
Aura Effects 1.5.2 and ATL v1.1.1. Context execution used SDK `edb0bfe`.
These are tested versions, not a claim of compatibility with every version.

- **Toll the Dead:** real Wisdom saves, healthy d8 / wounded d12, effective
  maximum HP and temporary HP boundaries, four character-level tiers, zero
  spell-slot use, rejected invalid script versions, and ordinary-player UI use.
  The script changes dice faces before the native damage roll; it does not roll
  or apply damage itself. Visibility remains a declared DM decision.
- **Dancing Lights:** UI and Context native placement, counts 1–4, accurate
  skipped/partial receipts, no Combatants or spell-slot use, actual dim light,
  movement and walls, owner/non-owner control, explicit GM control assignment,
  multiple sources, recast, expiry and concentration cleanup. Manual merging
  keeps the same Tokens at one position; native dragging separates them again.
  No tokens are copied or recreated. GM placement and the documented manual
  distance, layout, shape and action-economy decisions remain part of the scope.

The final executable has entry evidence for all 20 cantrips. Seventeen had a
final 34-case UI/Context regression; Eldritch Blast, Light and Dancing Lights
had final Context specialty cases, with UI specialty evidence on earlier
recorded candidates. This distinction preserves the actual coverage history.
The other eighteen definitions retain their historical acceptance metadata.

The same candidate generated 139 spells from `dnd5e.spells`, including 16 of
the supported cantrips. Repeat generation preserved IDs; every generated
cantrip description matched its source, and source/existing-Actor hashes stayed
unchanged. A native drag copied generated Fire Bolt into an original empty
character with its description and Activities intact. Blade Ward, Booming Blade
TCE, Thorn Whip and Toll the Dead used original fixtures for runtime QA; this is
not DDB Importer or third-party text-source certification.

Acceptance records describe tested behavior, not publication or production
deployment. Source acceptance metadata changes require a rebuild and comparison
against this tested executable before promoting a new package.
