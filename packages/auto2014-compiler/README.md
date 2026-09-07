# Auto 2014 compiler

The content-independent DSL, compiler, runtime profile and Foundry Item emitter used by Arcane Auto 2014.
This is a source library, not a complete Foundry module. Runtime hooks, the spell catalogue and compendiums
are not included in this package yet. No rulebook descriptions, translations, artwork or donor data are bundled.

The maintainer's full build consumes these same source files. A private migration check compares all generated
packs and runtime artifacts with the previous complete build. Public tests use an original synthetic fixture.

```js
import {compileSpellAutomation, emitSpellAutomationItem} from '@arcanedesk/auto2014-compiler';
// recipe is authored using ./dsl; contentItem supplies legally available presentation content.
const compiled = compileSpellAutomation(contentItem, recipe, {documentIdentity, packaging});
const generatedItem = emitSpellAutomationItem(contentItem, compiled);
```

In clean-room mode, the recipe and fixed runtime profile determine mechanics. Content is imported through
explicit ContentRef fields. Changing description or artwork changes the content hash, not the execution-plan hash.
Treat generated Items as new content; this API does not merge them into existing player Actors or promise to
preserve arbitrary Actor customizations. It must not be used as a blanket in-place upgrade tool.

Some exported legacy QA reference constants identify internal historical receipts. They do not certify a new
recipe, and those receipts are not dependencies needed to import or test this package.

The version follows the existing compiler version (0.9.0). No npm registry publication is implied.
