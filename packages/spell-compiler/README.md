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
