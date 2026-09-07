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
  }
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
console.log("arcane-common-display-vision validation passed");
