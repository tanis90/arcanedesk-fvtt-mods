# Spells 2024

2024-ruleset spell automation definitions for the `arcane-dnd5e-2024-automation`
module. Definitions author in `src/spells/<id>/definition.mjs` with the shared
spell-compiler DSL under `contract.ruleset: "2024"` and compile against
`spells24` source documents with the `arcane-dnd5e-2024` runtime profile.
Content is fully isolated from the 2014 line: no shared recipes, no mapping
layer. The batch order comes from the M1.0 spell audit
(docs/design/auto2024-m1-spell-audit.md in the development source).

The root entry exports `spellAutomationSpecs` / `spellAutomationCompiledIds`.
`./spells/<id>` loads one definition; `./scripts` exposes the per-spell script
registry (currently empty — per-spell scripts remain an escape hatch, not the
default authoring mode).
