(() => {
  "use strict";

  const registry = globalThis.ArcaneDnd5e2014SpellScripts;
  if (!registry || typeof registry.register !== "function") {
    throw new Error("Arcane per-spell script dispatcher is unavailable");
  }

  async function afterDamageThreshold(context) {
    const {
      damageReceipt,
      sourceActor,
      targetActor,
      services,
    } = context ?? {};

    if (!sourceActor || !targetActor || !services) {
      return services?.completion?.("indeterminate", {
        committed: true,
        retry: false,
        details: {
          message: "Banishing Smite could not resolve source actor, target actor, and services",
        },
      }) ?? {
        status: "indeterminate",
        committed: true,
        retry: false,
        details: {
          message: "Banishing Smite could not resolve source actor, target actor, and services",
        },
      };
    }

    const hitPoints = services.readHitPoints(targetActor);
    if (
      damageReceipt?.schema !== "arcane.authoritative-damage-receipt.v1"
      || !Number.isFinite(damageReceipt?.oldHitPoints)
      || !Number.isFinite(damageReceipt?.newHitPoints)
      || !Number.isFinite(damageReceipt?.hitPointDamage)
      || damageReceipt.newHitPoints !== hitPoints
    ) {
      return services.completion("indeterminate", {
        committed: true,
        retry: false,
        details: {
          message: "Banishing Smite could not bind the target to one authoritative damage receipt",
        },
      });
    }

    if (damageReceipt.hitPointDamage <= 0) {
      return services.completion("skipped", {
        committed: true,
        retry: false,
        details: {
          hitPoints,
          hitPointDamage: damageReceipt.hitPointDamage,
          threshold: 50,
          reason: "attack-did-not-reduce-hit-points",
        },
      });
    }

    if (hitPoints > 50) {
      return services.completion("skipped", {
        committed: true,
        retry: false,
        details: {
          hitPoints,
          hitPointDamage: damageReceipt.hitPointDamage,
          threshold: 50,
          reason: "target-above-hit-point-threshold",
        },
      });
    }

    let concentrationEffect;
    try {
      concentrationEffect = await services.createArtifactEffect(
        sourceActor,
        "concentration",
        { replace: true },
      );
    } catch (error) {
      return services.completion("indeterminate", {
        committed: true,
        retry: false,
        details: {
          hitPoints,
          hitPointDamage: damageReceipt.hitPointDamage,
          threshold: 50,
          stage: "create-concentration",
          message: String(error?.message ?? error),
        },
      });
    }

    try {
      const banishedEffect = await services.createArtifactEffect(
        targetActor,
        "banished",
        {
          replace: true,
          dependentOn: concentrationEffect,
        },
      );
      return services.completion("resolved", {
        committed: true,
        retry: false,
        details: {
          hitPoints,
          hitPointDamage: damageReceipt.hitPointDamage,
          threshold: 50,
          concentrationEffectUuid: concentrationEffect?.uuid ?? null,
          banishedEffectUuid: banishedEffect?.uuid ?? null,
        },
      });
    } catch (error) {
      return services.completion("partial", {
        committed: true,
        retry: false,
        details: {
          hitPoints,
          hitPointDamage: damageReceipt.hitPointDamage,
          threshold: 50,
          stage: "create-banished-marker",
          concentrationEffectUuid: concentrationEffect?.uuid ?? null,
          message: String(error?.message ?? error),
        },
      });
    }
  }

  registry.register({
    id: "banishing-smite",
    version: 1,
    handlers: {
      "after-damage-threshold": afterDamageThreshold,
    },
  });
})();
