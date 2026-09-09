(() => {
  "use strict";
  const registry = globalThis.ArcaneDnd5e2014SpellScripts;
  if (typeof registry?.register !== "function") throw new Error("Spell script registry unavailable");
  function chooseDie(context) {
    const {hitPoints, baseDie} = context ?? {};
    if (context?.schemaVersion !== 1 || context.event !== "damage-die-selection"
      || !Number.isFinite(hitPoints?.value) || !Number.isFinite(hitPoints?.max)
      || hitPoints.value < 0 || hitPoints.max <= 0
      || !Number.isInteger(baseDie?.number) || baseDie.number < 1
      || baseDie.faces !== 8) throw new Error("Invalid Toll the Dead damage context");
    return {schemaVersion: 1, faces: hitPoints.value < hitPoints.max ? 12 : 8};
  }
  registry.register({id: "toll-the-dead", version: 1, handlers: {"choose-damage-die": chooseDie}});
})();
