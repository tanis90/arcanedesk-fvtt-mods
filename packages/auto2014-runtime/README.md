# Auto 2014 runtime source

Canonical runtime source used by the Arcane Auto 2014 module. The internal complete module build reads this
exact file, rather than maintaining a second implementation. The initial extraction is byte-identical to the
previous module runtime; its SHA256 is `8b7bdd083a1919b999a4b4d0d31e30af6b229f64c2ae10fb0b570eef51968778`.

```js
import {readRuntimeSource} from '@arcanedesk/auto2014-runtime';
const source = await readRuntimeSource();
```

This package supplies source for a Foundry module build. It is not a standalone installable module or an SDK
transport. Do not execute it in Node or inject it repeatedly into a running world. It depends on Foundry's Hooks,
the dnd5e/Midi-QOL environment and the module's corresponding Activity/Effect contracts.

It includes rules execution and adapters, but no compendium data, rulebook descriptions, artwork or world state.
Some integration paths refer to stable Arcane pack UUIDs; the matching content providers and module packaging
are still being separated. Missing catalogues are not replaced by privately hosted content downloads.

Public tests cover script parsing and hook registration, not a new complete live-world QA certification.
The version tracks the existing Auto 2014 module baseline. No npm registry publication is implied.
