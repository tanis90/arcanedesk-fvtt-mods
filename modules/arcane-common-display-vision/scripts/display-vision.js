const MODULE_ID = "arcane-common-display-vision";
const COMMON_DISPLAY_MODULE_ID = "monks-common-display";
const PATCH_MARKER = Symbol.for(`${MODULE_ID}.tokenVisionPatched`);

function isCommonDisplayUser() {
  if (!globalThis.game?.user || game.user.isGM) return false;
  if (!game.modules.get(COMMON_DISPLAY_MODULE_ID)?.active) return false;

  try {
    const playerData = game.settings.get(COMMON_DISPLAY_MODULE_ID, "playerdata");
    return playerData?.[game.user.id]?.display === true;
  } catch (error) {
    console.warn(`${MODULE_ID} | Unable to read Monk's Common Display player assignment.`, error);
    return false;
  }
}

function findGetterOwner(prototype, property) {
  let current = prototype;
  while (current) {
    const descriptor = Object.getOwnPropertyDescriptor(current, property);
    if (descriptor?.get) return { owner: current, descriptor };
    current = Object.getPrototypeOf(current);
  }
  return null;
}

function patchTokenVision() {
  const VisibilityClass = CONFIG.Canvas.groups.visibility.groupClass;
  const prototype = VisibilityClass?.prototype;
  if (!prototype || prototype[PATCH_MARKER]) return false;

  const located = findGetterOwner(prototype, "tokenVision");
  if (!located) {
    console.error(`${MODULE_ID} | CanvasVisibility.tokenVision getter was not found.`);
    return false;
  }

  const originalGet = located.descriptor.get;
  Object.defineProperty(prototype, "tokenVision", {
    configurable: true,
    enumerable: located.descriptor.enumerable,
    get() {
      if (isCommonDisplayUser()) return false;
      return originalGet.call(this);
    }
  });
  Object.defineProperty(prototype, PATCH_MARKER, {
    configurable: false,
    value: true
  });

  return true;
}

function refreshDisplayVisibility() {
  if (!isCommonDisplayUser() || !globalThis.canvas?.ready) return;

  canvas.perception.update({
    initializeVision: true,
    refreshLighting: true,
    refreshVision: true
  }, true);

  for (const token of canvas.tokens?.placeables ?? []) {
    token.renderFlags.set({ refreshVisibility: true });
  }
}

Hooks.once("init", () => {
  if (patchTokenVision()) {
    console.info(`${MODULE_ID} | Installed the common-display overview visibility override.`);
  }
});

Hooks.on("canvasReady", () => {
  if (!isCommonDisplayUser()) return;
  refreshDisplayVisibility();
  console.info(`${MODULE_ID} | Full-scene visibility is active for ${game.user.name}.`);
});

Hooks.on("updateSetting", (setting) => {
  if (setting.key !== `${COMMON_DISPLAY_MODULE_ID}.playerdata`) return;
  refreshDisplayVisibility();
});

export {
  findGetterOwner,
  isCommonDisplayUser,
  patchTokenVision,
  refreshDisplayVisibility
};
