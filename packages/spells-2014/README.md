# Spells 2014

The root entry exports the 167 existing level 1–6 spell definitions and the two
registered scripts. Author definitions in `src/spells/<id>/definition.mjs`; Harm
and Banishing Smite also own `script.js` in that directory. `./spells/<id>` loads
one definition. `./scripts` reads the registered script artifacts for packaging.
The old catalogue re-exports these definitions; cantrips remain in that catalogue.
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
