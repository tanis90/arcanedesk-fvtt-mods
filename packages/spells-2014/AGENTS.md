# Spell development entry

Before adding, migrating, reviewing, fixing or testing spell automation, read
[法术开发必读](DEVELOPMENT.md). It is the canonical development SOP for this
package and its compiler, contracts, runtime and content-binding changes.

Author each spell in `src/spells/<id>/definition.mjs`, with an explicitly registered
`script.js` alongside it only when needed. During cantrip migration, inspect the
existing catalogue definition first; never create a second editable implementation.
Follow the repository root rules for verification, export and deployment.
