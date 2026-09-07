import {createActivityTools} from './activities.mjs';

/** Existing barbarian mechanics with private or caller-owned identity and prose bindings. */
export function createBarbarianFeatureTools({moduleId, uuidFor, content: input}) {
  if (typeof uuidFor !== 'function' || !input || typeof input !== 'object') throw Error('Missing barbarian bindings');
  const content = JSON.parse(JSON.stringify(input));
  const requiredIds = ["rage","base_rage_effect","unarmored_defense_barbarian","reckless_attack","relentless_rage","intimidating_presence","totem_spirit_bear","totem_spirit_elk","totem_spirit_eagle","rage_giant","demiurgic_colossus","reckless_abandon","bolstering_magic","infectious_fury","call_the_hunt","zealous_presence","consult_the_spirits","brutal_critical","totemic_attunement_eagle","raging_storm_tundra"];
  const requiredText = ["riderActivation","rageName","recklessNote","relentlessNote","bearName","bearNote","elkName","elkNote","eagleNote","giantName","giantNote","colossusName","colossusNote","abandonActivation","abandonNote","brutalCriticalName","eagleAttunementName","tundraStormName"];
  for (const [values, keys] of [[content.ids, requiredIds], [content.text, requiredText]]) {
    if (!values || keys.some(key => typeof values[key] !== 'string' || !values[key])) throw Error('Missing barbarian identity or text binding');
  }
  for (const map of [content.barbarianFeatureIdentifierById, content.officialImages]) {
    if (!map || typeof map !== 'object' || Array.isArray(map) || Object.values(map).some(value => typeof value !== 'string')) throw Error('Invalid barbarian mapping');
  }
  for (const ids of [content.juggernautDocumentIds, content.giantDocumentIds]) {
    if (!Array.isArray(ids) || ids.some(id => typeof id !== 'string')) throw Error('Invalid barbarian source group');
  }
  const {barbarianFeatureIdentifierById} = content;
  const juggernautDocumentIds = new Set(content.juggernautDocumentIds);
  const giantDocumentIds = new Set(content.giantDocumentIds);
  const {ensureUtilityActivity, normalizeSelfItemUseActivity} = createActivityTools({moduleId, spellAutomationProfiles: {}});
  function setBarbarianFeatureUses(doc, max, period) {
    doc.system.uses ??= {};
    doc.system.uses.max = max;
    doc.system.uses.spent ??= 0;
    doc.system.uses.recovery = period ? [{ period, type: "recoverAll" }] : [];
  }

  function removeBarbarianItemUseConsumption(doc) {
    for (const activity of Object.values(doc.system?.activities ?? {})) {
      activity.consumption ??= {};
      activity.consumption.targets = (activity.consumption.targets ?? [])
        .filter(target => target.type !== "itemUses");
    }
  }

  function appendBarbarianWorkflowNote(doc, text) {
    doc.system.description ??= {};
    const marker = "<strong>Arcane 流程：</strong>";
    if (String(doc.system.description.value ?? "").includes(marker)) return;
    doc.system.description.value = `${doc.system.description.value ?? ""}<p>${marker}${text}</p>`;
  }

  function normalizeBarbarianRageRider(doc, { effectId, effectName, changes, note }) {
    setBarbarianFeatureUses(doc, "", null);
    const activity = ensureUtilityActivity(doc, "dnd5eactivity000");
    normalizeSelfItemUseActivity(activity);
    activity.name = effectName;
    activity.activation = { type: "special", value: 0, condition: content.text.riderActivation, override: false };
    activity.duration = { concentration: false, value: "1", units: "minute", special: "", override: false };
    activity.consumption.targets = [];
    activity.effects = [{ _id: effectId }];
    const effect = {
      _id: effectId,
      name: effectName,
      img: doc.img,
      origin: uuidFor("classfeatures", doc._id),
      disabled: false,
      transfer: false,
      type: "base",
      system: {},
      statuses: [],
      duration: { rounds: 10, turns: null, seconds: null },
      changes,
      flags: {
        dae: {
          selfTarget: false,
          selfTargetAlways: true,
          dontApply: false,
          stackable: "noneName",
          showIcon: true,
          specialDuration: [],
        },
        dnd5e: { riders: { statuses: [] } },
      },
    };
    doc.effects = [effect];
    appendBarbarianWorkflowNote(doc, note);
  }

  function normalizeBarbarianAutomation(doc) {
    const stableIdentifier = barbarianFeatureIdentifierById[doc._id];
    if (stableIdentifier) doc.system.identifier = stableIdentifier;
    if (juggernautDocumentIds.has(doc._id) || doc.system?.identifier === "path-of-the-juggernaut") {
      doc.system.source ??= {};
      doc.system.source.rules = "2014";
    }
    if (giantDocumentIds.has(doc._id) || doc.system?.identifier === "path-of-the-giant") {
      doc.system.source ??= {};
      for (const field of ["custom", "book"]) {
        if (/BPGG/i.test(String(doc.system.source[field] ?? ""))) doc.system.source[field] = "BGG";
      }
    }
    const officialImageById = content.officialImages;
    const officialImage = officialImageById[doc._id];
    if (officialImage) {
      doc.img = officialImage;
      for (const effect of doc.effects ?? []) {
        if (typeof effect.img === "string" && effect.img.includes("/Nicons/")) effect.img = officialImage;
      }
    }
    if (doc._id === content.ids.rage) {
      // Rage: uses scale with the barbarian rages scale value, self-use utility activity.
      // The donor pack reuses this effect id for several subclass-specific Rage variants.
      // Rebuild the PHB base effect explicitly so Path of the Giant state (name, icon, size)
      // cannot leak into every Barbarian created from this item.
      doc.system.identifier = "rage";
      doc.system.uses ??= {};
      doc.system.uses.max = "@scale.barbarian.rages";
      doc.system.uses.spent ??= 0;
      doc.system.uses.recovery = [{ period: "lr", type: "recoverAll" }];
      const effect = doc.effects?.find(candidate => candidate._id === content.ids.base_rage_effect)
        ?? doc.effects?.[0]
        ?? {
          _id: content.ids.base_rage_effect,
          type: "base",
          system: {},
          flags: {},
        };
      effect.name = content.text.rageName;
      effect.img = officialImage;
      effect.origin = uuidFor("classfeatures", doc._id);
      effect.disabled = false;
      effect.transfer = false;
      effect.type = "base";
      effect.system ??= {};
      effect.statuses = [];
      effect.duration = {
        startTime: null,
        seconds: null,
        combat: null,
        rounds: 10,
        turns: null,
        startRound: null,
        startTurn: null,
        type: "turns",
      };
      effect.changes = [
        { key: "system.bonuses.mwak.damage", value: "+@scale.barbarian.rage-damage", mode: 2, priority: 20 },
        { key: "system.traits.dr.value", value: "slashing", mode: 2, priority: 20 },
        { key: "system.traits.dr.value", value: "piercing", mode: 2, priority: 20 },
        { key: "system.traits.dr.value", value: "bludgeoning", mode: 2, priority: 20 },
        { key: "system.abilities.str.check.roll.mode", value: "1", mode: 2, priority: 20 },
        { key: "system.abilities.str.save.roll.mode", value: "1", mode: 2, priority: 20 },
      ];
      effect.flags ??= {};
      effect.flags.dae = {
        ...(effect.flags.dae ?? {}),
        selfTarget: false,
        selfTargetAlways: true,
        dontApply: false,
      };
      effect.flags.dnd5e ??= {};
      effect.flags.dnd5e.riders = { statuses: [] };
      doc.effects = [effect];
      const activity = Object.values(doc.system?.activities ?? {}).find(candidate => candidate.type === "utility");
      if (activity) {
        normalizeSelfItemUseActivity(activity);
        activity.effects = [{ _id: effect._id }];
      }
    }

    if (doc._id === content.ids.unarmored_defense_barbarian) {
      doc.system.identifier = "unarmored-defense-barbarian";
    }

    if (doc._id === content.ids.reckless_attack) {
      // Reckless Attack depends on attack ability, timing, and opponent workflows.
      // A permanent transfer effect makes every attack reckless merely by owning the feature.
      // Keep the official 2014 data-only model and let the player/DM select advantage in the UI.
      setBarbarianFeatureUses(doc, "", null);
      doc.system.activities = {};
      doc.effects = [];
      appendBarbarianWorkflowNote(
        doc,
        content.text.recklessNote,
      );
    }

    if (doc._id === content.ids.relentless_rage) {
      // The DC rises by 5 after every success and resets only on a rest. A one-use item and
      // fixed DC 10 button are both misleading, while the DM can resolve this reliably.
      setBarbarianFeatureUses(doc, "", null);
      doc.system.activities = {};
      doc.effects = [];
      appendBarbarianWorkflowNote(
        doc,
        content.text.relentlessNote,
      );
    }

    if (doc._id === content.ids.intimidating_presence) {
      // Intimidating Presence is at-will in PHB 2014; retain its save/frightened automation
      // but remove the donor's impossible item-use consumption from an unlimited feature.
      setBarbarianFeatureUses(doc, "", null);
      removeBarbarianItemUseConsumption(doc);
    }

    if (doc._id === content.ids.totem_spirit_bear) {
      normalizeBarbarianRageRider(doc, {
        effectId: "arcTotemBear0001",
        effectName: content.text.bearName,
        changes: ["acid", "cold", "fire", "force", "lightning", "necrotic", "poison", "radiant", "thunder"]
          .map(value => ({ key: "system.traits.dr.value", value, mode: 2, priority: 20 })),
        note: content.text.bearNote,
      });
    }

    if (doc._id === content.ids.totem_spirit_elk) {
      normalizeBarbarianRageRider(doc, {
        effectId: "arcTotemElk00001",
        effectName: content.text.elkName,
        changes: [{ key: "system.attributes.movement.walk", value: "15", mode: 2, priority: 20 }],
        note: content.text.elkNote,
      });
    }

    if (doc._id === content.ids.totem_spirit_eagle) {
      appendBarbarianWorkflowNote(
        doc,
        content.text.eagleNote,
      );
    }

    if (doc._id === content.ids.rage_giant) {
      normalizeBarbarianRageRider(doc, {
        effectId: "arcGiantRage0001",
        effectName: content.text.giantName,
        changes: [{ key: "system.traits.size", value: "lg", mode: 5, priority: 20 }],
        note: content.text.giantNote,
      });
    }

    if (doc._id === content.ids.demiurgic_colossus) {
      normalizeBarbarianRageRider(doc, {
        effectId: "arcGiantHuge0001",
        effectName: content.text.colossusName,
        changes: [{ key: "system.traits.size", value: "huge", mode: 5, priority: 20 }],
        note: content.text.colossusNote,
      });
    }

    if (doc._id === content.ids.reckless_abandon) {
      const activity = Object.values(doc.system?.activities ?? {}).find(candidate => candidate.type === "heal");
      if (activity) {
        normalizeSelfItemUseActivity(activity);
        activity.activation = { type: "special", value: 0, condition: content.text.abandonActivation, override: false };
        activity.consumption.targets = [];
        activity.healing ??= {};
        activity.healing.custom = { enabled: true, formula: "max(@abilities.con.mod,1)" };
      }
      appendBarbarianWorkflowNote(
        doc,
        content.text.abandonNote,
      );
    }

    if ([content.ids.bolstering_magic, content.ids.infectious_fury, content.ids.call_the_hunt].includes(doc._id)) {
      setBarbarianFeatureUses(doc, "@prof", "lr");
    }
    if (doc._id === content.ids.zealous_presence) setBarbarianFeatureUses(doc, "1", "lr");
    if (doc._id === content.ids.consult_the_spirits) setBarbarianFeatureUses(doc, "1", "sr");

    if (doc._id === content.ids.brutal_critical) doc.name = content.text.brutalCriticalName;
    if (doc._id === content.ids.totemic_attunement_eagle) doc.name = content.text.eagleAttunementName;
    if (doc._id === content.ids.raging_storm_tundra) doc.name = content.text.tundraStormName;
  }
  return Object.freeze({setBarbarianFeatureUses,removeBarbarianItemUseConsumption,appendBarbarianWorkflowNote,normalizeBarbarianRageRider,normalizeBarbarianAutomation});
}
