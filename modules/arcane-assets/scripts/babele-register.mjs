// Register Chinese compendium-name translations through Babele when that module
// is active and the client language is zh-cn. English is the canonical pack data;
// this only overlays display names at runtime.
const PACKS = ["portraits-doodles", "named-characters", "classical-portraits", "vil-faces"];

Hooks.once("Babele.ready", () => {
  if (!["zh-cn", "zh", "zh-tw"].includes(game.i18n.lang)) return;
  for (const pack of PACKS) {
    Babele.register(`arcane-assets.${pack}`, {
      translations: `modules/arcane-assets/babele/${pack}.json`,
    });
  }
});
