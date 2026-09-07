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
companion scripts must be packaged and loaded correctly; generated summon profiles also need the
existing actor builder and a full profile provider. Internal profiles/options and subsequent animation normalization still belong
to the complete module build. These limitations must be resolved before a public installable release.

From the repository root on Node 24: `npm ci`, then `npm run verify`.
Verification tests every registered recipe's content boundary, packs the source packages,
installs them offline outside the repository and composes all 186 recipes without private content inputs.
Package checks also reject accidentally including the full summon profile source. Internal tests compare
every reference's profileId, revision, documentId, recipeId and summonUsage with the full provider.

Recipe support and historical acceptance metadata describe the original implementation, including its
manual fallbacks. Successful compilation does not certify a new Foundry setup or establish that every
recipe is fully automated. Installation, matching companion data and runtime QA remain separate gates.
Package versions follow the existing module/compiler baseline; no npm registry release is implied.
