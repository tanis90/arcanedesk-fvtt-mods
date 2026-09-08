(() => {
  "use strict";

  const SCRIPT_ID = "harm";
  const SCRIPT_VERSION = 1;
  const HANDLER_ID = "resolve-typed-damage-transaction";
  const registrationApi = globalThis.ArcaneDnd5e2014SpellScripts;

  if (
    registrationApi?.schemaVersion !== 1
    || typeof registrationApi.register !== "function"
  ) {
    throw new Error("Harm requires Arcane per-spell script registry v1");
  }

  function configuration(handler) {
    const value = handler?.configuration;
    const keys = value && typeof value === "object" && !Array.isArray(value)
      ? Object.keys(value).sort()
      : [];
    if (
      JSON.stringify(keys) !== JSON.stringify([
        "durationSeconds",
        "minimumHitPoints",
        "reductionBasis",
        "reductionOutcome",
        "schemaVersion",
      ])
      || value.schemaVersion !== 1
      || value.minimumHitPoints !== 1
      || value.reductionOutcome !== "failure"
      || value.reductionBasis !== "ordinary-hit-point-loss"
      || value.durationSeconds !== 60 * 60
    ) {
      throw new Error("Harm typed damage configuration is invalid");
    }
    return value;
  }

  function resolveTypedDamageTransaction(context) {
    if (
      context?.schemaVersion !== 2
      || context.event !== "typed-damage-transaction"
      || !["prepare", "pre-apply", "settle", "recover"].includes(
        context.phase,
      )
      || context.plan?.id !== SCRIPT_ID
      || context.handler?.id !== HANDLER_ID
      || typeof context.services?.resolveTypedDamageTransaction !== "function"
    ) {
      throw new Error("Harm received an invalid typed damage context");
    }
    return context.services.resolveTypedDamageTransaction(
      context,
      configuration(context.handler),
    );
  }

  registrationApi.register({
    id: SCRIPT_ID,
    version: SCRIPT_VERSION,
    handlers: {
      [HANDLER_ID]: resolveTypedDamageTransaction,
    },
  });
})();
