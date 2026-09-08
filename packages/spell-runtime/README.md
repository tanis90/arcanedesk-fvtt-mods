# Spell runtime

Build-time projection of the sole shared runtime implementation.
`buildSpellRuntime()` emits a browser initializer, pruning reviewed non-spell
hook roots and unreachable declarations. The generated source is not editable.
The complete internal runtime remains the source for shared execution functions.
Real Foundry QA is pending; importing the builder never accesses a world.
