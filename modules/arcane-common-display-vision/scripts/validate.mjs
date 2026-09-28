import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const moduleRoot = path.resolve(import.meta.dirname, "..");
const manifest = JSON.parse(fs.readFileSync(path.join(moduleRoot, "module.json"), "utf8"));

assert.equal(manifest.id, "arcane-common-display-vision");
assert.equal(manifest.compatibility.verified, "13.351");
assert.equal(manifest.relationships.requires[0].id, "monks-common-display");
assert.ok(fs.existsSync(path.join(moduleRoot, manifest.esmodules[0])));

const callbacks = new Map();
globalThis.Hooks = {
  once(name, callback) {
    callbacks.set(name, callback);
  },
  on(name, callback) {
    callbacks.set(name, callback);
  }
};

class MockVisibility {
  get tokenVision() {
    return true;
  }
}

function createClassList() {
  const classes = new Set();
  return {
    toggle(name, force) {
      if (force) classes.add(name);
      else classes.delete(name);
    },
    contains(name) {
      return classes.has(name);
    }
  };
}

const appendedStyles = [];
globalThis.document = {
  head: {
    append(element) {
      appendedStyles.push(element);
    }
  },
  body: { classList: createClassList() },
  getElementById(id) {
    return appendedStyles.find(element => element.id === id) ?? null;
  },
  createElement(tag) {
    return { tag, id: "", textContent: "" };
  }
};

globalThis.ui = {
  sidebar: {
    activeTab: "combat",
    expanded: false,
    activateTab(tab) {
      this.activeTab = tab;
    },
    toggleExpanded() {
      this.expanded = !this.expanded;
    }
  }
};

const playerData = { displayUser: { display: true } };
globalThis.CONFIG = {
  Canvas: {
    groups: {
      visibility: {
        groupClass: MockVisibility
      }
    }
  }
};
globalThis.game = {
  user: { id: "displayUser", name: "TV Display", isGM: false },
  modules: new Map([["monks-common-display", { active: true }]]),
  settings: {
    get() {
      return playerData;
    }
  },
  combat: null
};
globalThis.canvas = { ready: false };

const implementationUrl = `${pathToFileURL(path.join(moduleRoot, manifest.esmodules[0])).href}?validate=${Date.now()}`;
const implementation = await import(implementationUrl);
assert.equal(implementation.patchTokenVision(), true);
assert.equal(new MockVisibility().tokenVision, false);

game.user = { id: "ordinaryPlayer", name: "Player", isGM: false };
assert.equal(new MockVisibility().tokenVision, true);

game.user = { id: "displayUser", name: "TV Display", isGM: true };
assert.equal(new MockVisibility().tokenVision, true);

assert.equal(implementation.patchTokenVision(), false);

game.user = { id: "displayUser", name: "TV Display", isGM: false };

implementation.ensureCombatChatStyle();
assert.equal(appendedStyles.length, 1);
assert.ok(appendedStyles[0].textContent.includes(implementation.COMBAT_CHAT_BODY_CLASS));
assert.ok(appendedStyles[0].textContent.includes("@layer modules"));
implementation.ensureCombatChatStyle();
assert.equal(appendedStyles.length, 1);

implementation.syncCombatChatVisibility();
assert.equal(document.body.classList.contains(implementation.COMBAT_CHAT_BODY_CLASS), false);

game.combat = { started: true };
implementation.syncCombatChatVisibility();
assert.equal(document.body.classList.contains(implementation.COMBAT_CHAT_BODY_CLASS), true);
assert.equal(ui.sidebar.activeTab, "chat");
assert.equal(ui.sidebar.expanded, true);

game.combat = null;
implementation.syncCombatChatVisibility();
assert.equal(document.body.classList.contains(implementation.COMBAT_CHAT_BODY_CLASS), false);

game.combat = { started: true };
game.user = { id: "ordinaryPlayer", name: "Player", isGM: false };
implementation.syncCombatChatVisibility();
assert.equal(document.body.classList.contains(implementation.COMBAT_CHAT_BODY_CLASS), false);

game.user = { id: "displayUser", name: "TV Display", isGM: false };
for (const hookName of ["createCombat", "updateCombat", "deleteCombat"]) {
  assert.ok(callbacks.has(hookName), `missing hook ${hookName}`);
}
document.body.classList.toggle(implementation.COMBAT_CHAT_BODY_CLASS, false);
callbacks.get("updateCombat")();
assert.equal(document.body.classList.contains(implementation.COMBAT_CHAT_BODY_CLASS), true);
game.combat = null;
callbacks.get("deleteCombat")();
assert.equal(document.body.classList.contains(implementation.COMBAT_CHAT_BODY_CLASS), false);

console.log("arcane-common-display-vision validation passed");
