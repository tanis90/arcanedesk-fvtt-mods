const MODULE_ID = "arcane-dice-so-nice-dnd5e-fix";

function patchDnd5eD20DiePreset() {
  const dice3d = game.dice3d;
  const factory = dice3d?.DiceFactory;
  const dd = factory?.get?.("dd");
  const d20 = factory?.get?.("d20");

  if (!dd || !d20) return false;
  if (dd.shape === "d20" && dd.values?.length === 20) return true;

  dd.shape = d20.shape;
  dd.values = [...d20.values];
  dd.labels = [...d20.labels];
  dd.scale = d20.scale;
  dd.mass = d20.mass;
  dd.inertia = d20.inertia;
  dd.valueMap = d20.valueMap ? { ...d20.valueMap } : null;
  dd.geometry = null;
  dd.unloadModel?.();

  console.info(`${MODULE_ID} | Patched Dice So Nice dd preset to use d20 geometry for dnd5e D20Die rolls.`);
  return true;
}

function schedulePatch() {
  if (!game.modules.get("dice-so-nice")?.active) return;

  let attempts = 0;
  const timer = window.setInterval(() => {
    attempts += 1;
    if (patchDnd5eD20DiePreset() || attempts >= 30) {
      window.clearInterval(timer);
    }
  }, 500);
}

Hooks.once("ready", schedulePatch);
Hooks.on("diceSoNiceRollStart", patchDnd5eD20DiePreset);
