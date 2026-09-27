const MODULE_ID = "arcane-common-display-vision";
const COMMON_DISPLAY_MODULE_ID = "monks-common-display";
const PATCH_MARKER = Symbol.for(`${MODULE_ID}.tokenVisionPatched`);
const COMBAT_CHAT_BODY_CLASS = "arcane-display-combat-chat";
const COMBAT_CHAT_STYLE_ID = `${MODULE_ID}-combat-chat-style`;

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

function ensureCombatChatStyle() {
  if (!globalThis.document?.head || document.getElementById(COMBAT_CHAT_STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = COMBAT_CHAT_STYLE_ID;
  style.textContent = `@layer modules {\n  body.hide-chat.${COMBAT_CHAT_BODY_CLASS} #sidebar { display: flex !important; }\n}`;
  document.head.append(style);
}

function combatIsActive() {
  try {
    return Boolean(game.combat?.started);
  } catch (error) {
    console.warn(`${MODULE_ID} | Unable to read combat state.`, error);
    return false;
  }
}

function syncCombatChatVisibility() {
  if (!globalThis.document?.body) return;
  const show = isCommonDisplayUser() && combatIsActive();
  document.body.classList.toggle(COMBAT_CHAT_BODY_CLASS, show);
  if (!show) return;

  try {
    if (ui.sidebar && ui.sidebar.activeTab !== "chat") ui.sidebar.activateTab("chat");
    if (ui.sidebar && !ui.sidebar.expanded) ui.sidebar.toggleExpanded();
  } catch (error) {
    console.warn(`${MODULE_ID} | Unable to focus the chat log for the display player.`, error);
  }
}

Hooks.once("init", () => {
  ensureCombatChatStyle();
  if (patchTokenVision()) {
    console.info(`${MODULE_ID} | Installed the common-display overview visibility override.`);
  }
});

Hooks.once("ready", () => {
  syncCombatChatVisibility();
});

Hooks.on("canvasReady", () => {
  syncCombatChatVisibility();
  if (!isCommonDisplayUser()) return;
  refreshDisplayVisibility();
  console.info(`${MODULE_ID} | Full-scene visibility is active for ${game.user.name}.`);
});

for (const hookName of ["createCombat", "updateCombat", "deleteCombat"]) {
  Hooks.on(hookName, () => {
    syncCombatChatVisibility();
  });
}

Hooks.on("updateSetting", (setting) => {
  if (setting.key !== `${COMMON_DISPLAY_MODULE_ID}.playerdata`) return;
  refreshDisplayVisibility();
  syncCombatChatVisibility();
});

export {
  COMBAT_CHAT_BODY_CLASS,
  combatIsActive,
  ensureCombatChatStyle,
  findGetterOwner,
  isCommonDisplayUser,
  patchTokenVision,
  refreshDisplayVisibility,
  syncCombatChatVisibility
};
