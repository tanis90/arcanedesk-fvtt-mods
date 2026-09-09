# Spell compiler

Sole implementation of the Arcane 2014 DSL, compiler and Item emitter.
The legacy `@arcanedesk/auto2014-compiler` package re-exports these APIs.
Build-time compilation runs in Node 24. The `./binding` and `./emitter` subpaths
are browser-safe and can consume precompiled plans without loading the DSL compiler.
Runtime target policy is shared through `@arcanedesk/automation-contracts`.

`compileSpellPlan(definition)` compiles a trusted clean-room DSL without a source
Item. Its JSON-serializable result contains mechanics and a content-reference
contract, but no description or target document identity.

`bindSpellPlan(sourceItem, plan, {documentIdentity, packaging})` attaches caller
content using the existing whitelist and produces the input to
`emitSpellAutomationItem`. Use `extractCleanRoomDocumentIdentity` and
`extractCleanRoomPackaging` for compatible existing-document bindings.
`composeSpellItem` remains the combined convenience entry; it uses the same
implementation. A compiled plan alone does not certify runtime resource readiness.

Public binding supplies `resourceBindings` with a target Item UUID and exact summon
profile revision/recipe/Actor UUID mappings. Missing mappings fail instead of
falling back to internal pack addresses. The host must separately verify that
resource documents exist and satisfy their mechanical contracts.

Entity choice plans can use `enumParameter(id, values, {labels, defaultValue})`
to retain one action with a runtime selection, instead of expanding named actions.
The default must be a declared string value; the parameter must belong to the
entity's creator action and exactly match its ordered profile choices and labels.
The projected `requiredSelections` entry has `required: false` and `defaultValue`;
the entity retains `profile-choice` cardinality and all profiles. Omitting
`defaultValue` preserves existing named-action output.

Item emission retains one native SummonActivity with all profiles, ordered with
the default first. Its version-1 `nativeSummon.selection` maps each typed value to
the native profile ID, exact Actor UUID, resource identity and expected count.
The runtime freezes the selected contract per invocation and checks it again at
placement, Token preparation, post-use and workflow finalization. A supplied typed
value must agree with the native profile; neither path rewrites the source Item.

SDK selection handling is implemented in the companion SDK development tree.
Dancing Lights has QA-A UI/Context acceptance using SDK `edb0bfe`; see the
[versioned acceptance summary](../spells-2014/README.md#cantrip-runtime-acceptance).
That evidence covers the declared consumer and tested versions; a new consumer
still needs its own runtime acceptance.
