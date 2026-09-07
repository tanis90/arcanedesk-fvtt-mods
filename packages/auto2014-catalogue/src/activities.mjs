/** Interaction contracts for caller-provided activities and policy. No content lookup or Foundry writes. */
export function createActivityTools({moduleId, spellAutomationProfiles: profiles}) {
  if (typeof moduleId !== 'string' || !moduleId) throw Error('A module namespace is required');
  if (!profiles || typeof profiles !== 'object' || Array.isArray(profiles)) throw Error('Interaction profiles must be an object');
  const spellAutomationProfiles = JSON.parse(JSON.stringify(profiles));
  function normalizeActivityForFullAutomation(activity) {
    activity.target ??= {};
    activity.target.prompt = false;
    activity.midiProperties ??= {};
    activity.midiProperties.forceConsumeDialog = "never";
    activity.midiProperties.forceRollDialog = "never";
    activity.midiProperties.forceDamageDialog = "never";
    activity.midiProperties.confirmTargets = "never";
    activity.midiProperties.chooseEffects = false;
    activity.midiProperties.removeChatButtons = "all";
  }

  function spellActivityUsesMeasuredTemplate(doc, activity) {
    const target = activity.target?.override === true
      ? activity.target
      : doc.system?.target;
    return Boolean(target?.template?.type);
  }

  function effectiveSpellActivityTarget(doc, activity) {
    return activity.target?.override === true
      ? activity.target ?? {}
      : doc.system?.target ?? {};
  }

  function effectiveSpellActivityRange(doc, activity) {
    return activity.range?.override === true
      ? activity.range ?? {}
      : doc.system?.range ?? {};
  }

  function inferSpellActivityInput(doc, activity) {
    const target = effectiveSpellActivityTarget(doc, activity);
    const range = effectiveSpellActivityRange(doc, activity);
    const templateType = String(target?.template?.type ?? "").trim();
    const affectsType = String(target?.affects?.type ?? "").trim();
    const rangeUnits = String(range?.units ?? "").trim();
    if (templateType) {
      return rangeUnits === "self" && ["radius", "squareRadius"].includes(templateType)
        ? "self"
        : "placed-template";
    }
    if (affectsType === "self") return "self";
    if (["creature", "ally", "enemy", "token"].includes(affectsType)) return "selected-targets";
    if (rangeUnits === "self") return "self";
    if (["attack", "save", "damage", "heal"].includes(activity.type)) return "selected-targets";
    return "none";
  }

  function spellAutomationProfile(doc) {
    return spellAutomationProfiles.spells?.[doc.system?.identifier] ?? {};
  }

  function inferTemplateTargetPolicy(doc, activity, profile) {
    if (!spellActivityUsesMeasuredTemplate(doc, activity)) return null;
    if (activity.midiProperties?.automationOnly === true) return "none";
    const declared = profile.activities?.[activity._id]?.templateTargets ?? profile.templateTargets;
    if (["workflow", "self", "none"].includes(declared)) return declared;
    const fallback = spellAutomationProfiles.defaults?.templateTargetsByActivityType?.[activity.type];
    return ["workflow", "self", "none"].includes(fallback) ? fallback : "none";
  }

  function normalizeSpellInteractionContracts(doc, activities) {
    const profile = spellAutomationProfile(doc);
    doc.flags ??= {};
    doc.flags[moduleId] ??= {};
    doc.flags[moduleId].spellAutomation = {
      ...(doc.flags[moduleId].spellAutomation ?? {}),
      version: spellAutomationProfiles.version,
      areaBehavior: profile.areaBehavior ?? "native",
      implementation: profile.implementation ?? "native",
    };

    for (const activity of activities) {
      const usesTemplate = spellActivityUsesMeasuredTemplate(doc, activity);
      const templateTargets = inferTemplateTargetPolicy(doc, activity, profile);
      activity.target ??= {};
      activity.target.prompt = usesTemplate && activity.midiProperties?.automationOnly !== true;
      activity.flags ??= {};
      activity.flags[moduleId] ??= {};
      activity.flags[moduleId].interaction = {
        version: spellAutomationProfiles.version,
        input: inferSpellActivityInput(doc, activity),
        ...(usesTemplate ? { templateTargets } : {}),
      };

      if (!usesTemplate) continue;
      activity.midiProperties ??= {};
      activity.midiProperties.autoTargetAction = templateTargets === "workflow" ? "always" : "none";
      const effectiveAffectsType = effectiveSpellActivityTarget(doc, activity)?.affects?.type;
      activity.midiProperties.autoTargetType =
        profile.activities?.[activity._id]?.autoTargetType
        ?? profile.autoTargetType
        ?? (["ally", "enemy"].includes(effectiveAffectsType) ? effectiveAffectsType : null)
        ?? spellAutomationProfiles.defaults?.autoTargetType
        ?? "any";
    }
  }

  function normalizeSelfItemUseActivity(activity) {
    normalizeActivityForFullAutomation(activity);
    activity.range ??= {};
    activity.range.units = "self";
    activity.target ??= {};
    activity.target.prompt = false;
    activity.target.override = true;
    activity.target.affects = {
      ...(activity.target.affects ?? {}),
      count: "",
      type: "self",
      choice: false,
      special: "",
    };
    activity.target.template = {
      count: "",
      contiguous: false,
      type: "",
      size: "",
      width: "",
      height: "",
      units: "",
    };
    activity.consumption ??= {};
    activity.consumption.targets = [{ type: "itemUses", target: "", value: "1", scaling: { mode: "", formula: "" } }];
    activity.consumption.scaling ??= { allowed: false, max: "" };
    activity.consumption.spellSlot = true;
  }

  function setActivityCreatureTargets(activity, count) {
    activity.target ??= {};
    activity.target.prompt = false;
    activity.target.override = true;
    activity.target.affects = {
      ...(activity.target.affects ?? {}),
      count,
      type: "creature",
      choice: false,
    };
  }
  function ensureUtilityActivity(doc, activityId) {
    doc.system ??= {};
    doc.system.activities ??= {};
    if (!doc.system.activities[activityId]) {
      doc.system.activities[activityId] = {
        _id: activityId,
        type: "utility",
        activation: { type: "special", value: null, condition: "", override: false },
        consumption: {
          targets: [{ type: "itemUses", target: "", value: "1", scaling: { mode: "", formula: "" } }],
          scaling: { allowed: false, max: "" },
          spellSlot: true,
        },
        description: { chatFlavor: "" },
        duration: { concentration: false, value: "0", units: "", special: "", override: false },
        effects: [],
        range: { units: "self", special: "", override: false },
        target: {
          template: { count: "", contiguous: false, type: "", size: "", width: "", height: "", units: "" },
          affects: { count: "", type: "self", choice: false, special: "" },
          prompt: false,
          override: true,
        },
        uses: { spent: 0, max: "", recovery: [] },
        sort: 0,
      };
    }
    return doc.system.activities[activityId];
  }
  return Object.freeze({ensureUtilityActivity,normalizeActivityForFullAutomation,spellActivityUsesMeasuredTemplate,effectiveSpellActivityTarget,effectiveSpellActivityRange,inferSpellActivityInput,spellAutomationProfile,inferTemplateTargetPolicy,normalizeSpellInteractionContracts,normalizeSelfItemUseActivity,setActivityCreatureTargets});
}
