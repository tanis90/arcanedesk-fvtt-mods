# Foundry pack builder

Offline Item, Actor and JournalEntry compendium serialization, extracted from the Arcane Auto 2014
generator. Its complete internal build uses this same writer for all 17 packs. This package contains
no rule text, character data or compendium content; documents and assets come from the caller.

```js
import {writeCompendium, writeModule} from '@arcanedesk/foundry-pack-builder';
await writeCompendium('./output/spells', 'Item', callerItems);

await writeModule({
  directory: './output/my-module',
  manifest: {
    id: 'my-module', title: 'My module', version: '1.0.0',
    compatibility: {minimum: '13', verified: '13'},
    scripts: ['scripts/main.js'],
    packs: [{name: 'spells', path: 'packs/spells', type: 'Item', system: 'dnd5e'}],
  },
  documents: {spells: callerItems},
  files: {'scripts/main.js': callerRuntimeSource},
});
```

Outputs must be new or empty directories. Duplicate storage keys, invalid IDs, undeclared packs,
missing manifest assets and paths outside the module are rejected. The builder never opens an existing
database for modification. Use a temporary output directory, validate it, then promote the finished
artifact through your release process. A failed write can leave a partial temporary directory; it must
not be installed. The manifest is written last after all declared files and packs have been generated.

Descriptions and IDs are preserved. Foundry embedded Effects, Actor Items and Journal pages are written
to their expected records while parent records hold ID arrays. Inputs are not modified. Tables are
compacted and databases closed before returning. Logical records are reproducible; LevelDB's physical
files are not promised to be byte-identical across platforms or engine versions.

This is a Node 24 build-time package, not browser code. It uses classic-level 3.0.0 (a separately licensed
dependency installed by npm). It does not execute runtime scripts, fetch licensed content, install modules
into Foundry, update player Actors, or certify compatibility of caller-provided automation. For Auto 2014,
the full class/content provider and release manifest migration remain separate from this generic builder.
