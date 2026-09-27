# Arcane Spells 2014 releases

## 0.1.0 — 2026-09-08

First public release of the independent spell suite: compiler, runtime, 167 existing
level 1–6 DSL definitions, Harm and Banishing Smite scripts, and a Foundry UI that
combines automation with spell content already available in the user's world.
No populated rule-text compendium is included. D&D Beyond is not required.

SRD 5.1 on dnd5e 5.3.3 produced 123 automated spells. Repeating generation updated
those entries without changing IDs, source documents or existing Actor Items.
Seven matching spells were skipped for missing summon resources; 189 source
entries had no corresponding definition, including entries outside this release's scope.

Representative live tests covered Magic Missile's independent projectiles,
Hold Person's conditions and expiry, Harm's actual HP-loss and minimum-HP handling
through both character-sheet and Agent execution, Spirit Guardians' turn-start
aura, and Moonbeam's placed template. Concentration cleanup was verified for both
aura/template spells. Fixes include SRD identity mappings, inherited source-book
preservation, artifact-adapter readiness, and standalone shared-flag access.

### Known limits

- Eight definitions in the full suite require summon resources not supplied by
  this module; seven occur in the SRD source intersection. The generator reports them as unready.
- Existing Actor Items do not update when the generated compendium is rebuilt.
- DDB-imported Item field contracts have tests, but live DDB importing is not certified.
- Coexistence with the legacy full Auto 2014 core cannot verify its two script
  contracts; use standalone mode for the tested path.
- Foundry 13 treats an effect start time of exactly zero as unset. Duration expiry
  was verified with positive world time; this upstream edge remains.
- Hold Person can show a missing-data warning for `@item.level-1` while preparing
  an Item. Second-level casting passed; upcast multi-target behavior remains unverified.
- Preserve each definition's support and omissions. These representative tests
  are not a claim of complete combat certification for all 167 definitions.

See the [installation guide](README.md) for tested versions and settings.
