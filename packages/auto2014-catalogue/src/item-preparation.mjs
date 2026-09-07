// Preparation policy is explicit caller input; no source content is bundled.
export function createItemPreparationTools({rewriteString, activityTools, bindings: input}) {
  if (typeof rewriteString !== "function") throw new TypeError("Missing reference rewrite helper");
  const {normalizeActivityForFullAutomation, spellActivityUsesMeasuredTemplate, setActivityCreatureTargets, normalizeSpellInteractionContracts} = activityTools ?? {};
  for (const fn of [normalizeActivityForFullAutomation, spellActivityUsesMeasuredTemplate, setActivityCreatureTargets, normalizeSpellInteractionContracts]) {
    if (typeof fn !== "function") throw new TypeError("Missing activity preparation helper");
  }
  const bindings = structuredClone(input);
  for (const key of ["identifiers", "itemUseAliases"]) {
    const map = bindings?.[key];
    if (!map || typeof map !== "object" || Array.isArray(map) || Object.values(map).some(value => typeof value !== "string" || !value)) throw new TypeError("Invalid preparation mapping: " + key);
  }
  if (!Array.isArray(bindings.singleTargetSpellIdentifiers) || bindings.singleTargetSpellIdentifiers.some(id => typeof id !== "string" || !id)) throw new TypeError("Invalid single-target policy");

  function rewriteConsumptionTargets(doc) {
    const activityMap = doc.system?.activities ?? {};
    for (const activity of Object.values(activityMap)) {
      const targets = activity?.consumption?.targets;
      if (!Array.isArray(targets)) continue;
      for (const target of targets) {
        if (target.type === "itemUses" && typeof target.target === "string") {
          const id = target.target.split(".").pop();
          if (Object.hasOwn(bindings.itemUseAliases, id)) target.target = bindings.itemUseAliases[id];
          else target.target = rewriteString(target.target);
        }
      }
    }
  }

  function normalizeIdentifiers(doc) {
    const identifiers = bindings.identifiers;
    const identifier = identifiers[doc._id];
    if (identifier) doc.system.identifier = identifier;
  }

  function normalizeSpellAutomation(doc, compilerOwnedIds) {
    if (doc.type !== "spell") return;
    const identifier = doc.system?.identifier;
    if (compilerOwnedIds.has(identifier)) throw new Error('Compiler-owned spell reached legacy preparation');
    const activities = Object.values(doc.system?.activities ?? {});
    for (const activity of activities) {
      normalizeActivityForFullAutomation(activity);
      if (spellActivityUsesMeasuredTemplate(doc, activity)) activity.target.prompt = true;
    }
    // Preserve the old preparation pass order for non-compiled cards.
    for (const activity of activities) normalizeActivityForFullAutomation(activity);
    for (const activity of activities) normalizeActivityForFullAutomation(activity);
    if (bindings.singleTargetSpellIdentifiers.includes(identifier)) {
      const activity = activities.find(candidate => ["attack", "save", "damage", "utility"].includes(candidate.type)) ?? activities[0];
      if (activity) setActivityCreatureTargets(activity, "1");
    }
    normalizeSpellInteractionContracts(doc, activities);
  }

  return {rewriteConsumptionTargets, normalizeIdentifiers, normalizeSpellAutomation};
}

export function normalizeSpellAnimationMetadata(doc) {
  if (doc.type !== "spell") return;
  const legacy = doc.flags?.autoanimations;
  if (legacy?.isEnabled !== false || legacy?.isCustomized === true) return;
  delete doc.flags.autoanimations;
}
