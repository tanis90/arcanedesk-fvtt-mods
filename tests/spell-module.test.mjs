import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {buildSpellModuleFiles} from '../tools/build-spell-module.mjs';
import {composeSpellItem} from '@arcanedesk/spell-compiler';
import {spellAutomationSpecs} from '@arcanedesk/spells-2014';

const built = await buildSpellModuleFiles();
const code = new TextDecoder().decode(built.files.get('scripts/arcane-spells.js'));
function host() {
  const hooks = new Map(), menus = [], warnings = []; let nextId = 0;
  const add = (name, callback, once) => {const id = ++nextId; hooks.set(id, {name, callback, once}); return id;};
  const game = {ready: false, actors: [], users: [], scenes: [], packs: new Map(),
    system: {id: 'dnd5e', version: '5.3.3'}, release: {generation: 13},
    user: {id: 'originalGM', isGM: true},
    modules: new Map([['arcane-spells-2014', {active: true}], ['midi-qol', {active: true}], ['dae', {active: true}]]),
    settings: {registerMenu: (...args) => menus.push(args)}};
  const context = vm.createContext({game, TextEncoder, TextDecoder, structuredClone,
    canvas: {tokens: {placeables: []}}, setTimeout: (...args) => setTimeout(...args).unref(), clearTimeout, queueMicrotask,
    foundry: {utils: {deepClone: structuredClone, randomID: (size = 16) => 'x'.repeat(size)},
      applications: {api: {ApplicationV2: class {}, DialogV2: {}}}, documents: {collections: {CompendiumCollection: {}}}},
    CONFIG: {Item: {documentClass: class {}}},
    Hooks: {on: (name, cb) => add(name, cb, false), once: (name, cb) => add(name, cb, true),
      off: (_name, id) => hooks.delete(id), callAll() {}, call: () => true},
    console: {log() {}, warn: (...args) => warnings.push(args)}});
  return {game, context, menus, hooks, warnings, async emit(name) {
    for (const [id, hook] of [...hooks]) if (hook.name === name) {
      if (hook.once) hooks.delete(id);
      await hook.callback();
    }
    await new Promise(resolve => setImmediate(resolve));
  }};
}

test('candidate browser bundle boots both real scripts and exposes the GM generation menu', async () => {
  const h = host();
  new vm.Script(code).runInContext(h.context);
  assert.equal(h.game.modules.get('arcane-spells-2014').api, undefined);
  await h.emit('init');
  assert.equal(h.menus.length, 1);
  assert.equal(h.menus[0][0], 'arcane-spells-2014');
  assert.equal(h.menus[0][2].restricted, true);
  h.game.ready = true;
  await h.emit('ready');
  const api = h.game.modules.get('arcane-spells-2014').api;
  assert.equal(api.getCoverage().length, 167);
  assert.equal(typeof api.dispatchPerSpellScript, 'function');
  assert.equal(api.applyDeclaredDivineSmite, undefined);
  for (const id of ['harm', 'banishing-smite']) {
    const contract = api.runtime.getScriptContract(id);
    assert.equal(contract.version, 1);
    assert(contract.handlers.length > 0);
  }
  h.game.user.isGM = false;
  await assert.rejects(api.openGenerator(), /Only a GM/);
  assert.deepEqual(h.warnings, []);
});

const FLAG = 'arcane-dnd5e-2014-automation';
function actor(id, hp = 60) {
  return {id, uuid: `Actor.${id}`, documentName: 'Actor', effects: [], items: [], flags: {},
    system: {attributes: {hp: {value: hp, max: hp, temp: 0}}}};
}
function spell(id, source) {
  const {item} = composeSpellItem({_id: 'originalSpell001', name: 'Original test spell', type: 'spell',
    system: {identifier: id, description: {value: 'Original test description', chat: ''}, source: {rules: '2014'}}}, spellAutomationSpecs[id]);
  item.actor = source; item.parent = source; item.id = item._id; item.documentName = 'Item';
  item.uuid = source.uuid + '.Item.' + item.id; item.isEmbedded = true;
  item.effects = item.effects.map(data => ({...data, toObject: () => structuredClone(data)}));
  item.system.activities = Object.values(item.system.activities).map(data => ({...data, item,
    uuid: item.uuid + '.Activity.' + data._id}));
  return item;
}

test('bundled Banishing Smite dispatcher handles threshold, failure, dedupe and GM authority', async () => {
  const h = host(); new vm.Script(code).runInContext(h.context); await h.emit('ready');
  const api = h.game.modules.get('arcane-spells-2014').api;
  const source = actor('originalSource'), target = {actor: actor('originalTarget', 51)};
  const item = spell('banishing-smite', source);
  const handler = item.flags[FLAG].spellAutomation.runtimePlan.script.handlers[0];
  const args = {event: handler.event, item, target, workflow: {id: 'originalWorkflow'},
    damageReceipt: {schema: 'arcane.authoritative-damage-receipt.v1', oldHitPoints: 61, newHitPoints: 51, hitPointDamage: 10}};
  const skipped = await api.dispatchPerSpellScript(args);
  assert.equal(skipped.length, 1); assert.equal(skipped[0].status, 'skipped');
  assert.equal((await api.dispatchPerSpellScript(args)).length, 0);
  target.actor.system.attributes.hp.value = 50;
  const failed = await api.dispatchPerSpellScript({...args, workflow: {id: 'originalFailure'},
    damageReceipt: {...args.damageReceipt, newHitPoints: 50}});
  assert.equal(failed[0].status, 'indeterminate');
  assert.equal(failed[0].details.stage, 'create-concentration');
  assert.equal(failed[0].retry, false);
  const writes = [], dependencies = [];
  source.beginConcentrating = async anchor => {
    assert.equal(anchor.item, item);
    const effect = {id: 'originalConcentration', uuid: source.uuid + '.ActiveEffect.originalConcentration'};
    source.concentration = {effects: [effect], items: [item]};
    writes.push('concentration'); return effect;
  };
  source.endConcentration = async () => {throw new Error('No previous concentration in this fixture');};
  target.actor.createEmbeddedDocuments = async (type, documents) => {
    assert.equal(type, 'ActiveEffect'); assert.equal(documents.length, 1);
    assert.equal(documents[0].origin, item.uuid);
    const effect = {...documents[0], id: 'originalBanished', uuid: target.actor.uuid + '.ActiveEffect.originalBanished',
      async update(value) {writes.push(value);}};
    target.actor.effects.push(effect); writes.push('banished'); return [effect];
  };
  h.game.dnd5e = {registry: {dependents: {track: (...args) => dependencies.push(args)}}};
  const successArgs = {...args, workflow: {id: 'originalSuccess'}, damageReceipt: {...args.damageReceipt, newHitPoints: 50}};
  const resolved = await api.dispatchPerSpellScript(successArgs);
  assert.equal(resolved[0].status, 'resolved', JSON.stringify(resolved));
  assert.equal(resolved[0].committed, true); assert.equal(resolved[0].retry, false);
  assert.equal(writes.filter(value => value === 'concentration').length, 1);
  assert.equal(writes.filter(value => value === 'banished').length, 1);
  assert.equal(dependencies.length, 1);
  const count = writes.length;
  assert.equal((await api.dispatchPerSpellScript(successArgs)).length, 0);
  assert.equal(writes.length, count);
  h.game.user.isGM = false;
  assert.equal((await api.dispatchPerSpellScript({...args, workflow: {id: 'originalPlayer'}})).length, 0);
});

test('bundled Harm real script prepares one bounded transaction through the Midi hook', async () => {
  const h = host(); new vm.Script(code).runInContext(h.context); await h.emit('ready');
  const source = actor('originalSource'), target = {actor: actor('originalTarget', 20), document: {uuid: 'Scene.original.Token.target'}};
  const item = spell('harm', source);
  const activity = item.system.activities.find(entry => entry.type === 'save');
  const workflow = {id: 'originalDamageWorkflow', item, activity, actor: source,
    token: {documentName: 'Token', uuid: 'Scene.original.Token.source'}, failedSaves: new Set([target]), targets: new Set([target])};
  const damageItem = {actorUuid: target.actor.uuid, oldHP: 20, oldTempHP: 0, newTempHP: 0,
    hpDamage: 70, newHP: -50, tempDamage: 0, appliedDamage: 70, calcDamageOptions: {}};
  const hook = [...h.hooks.values()].find(entry => entry.name === 'midi-qol.preTargetDamageApplication');
  const context = {item, workflow, damageItem};
  assert.equal(await hook.callback(target, context), true, JSON.stringify(h.warnings));
  assert.equal(damageItem.newHP, 1); assert.equal(damageItem.hpDamage, 19);
  const envelope = structuredClone(damageItem.flags[FLAG].perSpellDamageTransaction);
  assert.equal(envelope.scriptId, 'harm');
  assert.equal(await hook.callback(target, context), true, JSON.stringify(h.warnings));
  assert.deepEqual(damageItem.flags[FLAG].perSpellDamageTransaction, envelope);
  assert.equal(workflow.__arcanePerSpellDamageTransactionIds.size, 1);
  h.context.fromUuidSync = uuid => uuid === item.uuid ? item : null;
  const preApply = [...h.hooks.values()].find(entry => entry.name === 'dnd5e.preApplyDamage');
  const updates = {'system.attributes.hp.value': -50};
  assert.equal(preApply.callback(target.actor, 70, updates, damageItem.calcDamageOptions), true, JSON.stringify(h.warnings));
  assert.equal(updates['system.attributes.hp.value'], 1);
  const pendingPath = `flags.${FLAG}.perSpellDamageTransactionsPending.${envelope.transactionId}`;
  assert.equal(updates[pendingPath].status, 'pending');
  assert.equal(updates[pendingPath].ordinaryHitPointLoss, 19);
  function applyUpdate(values) {
    for (const [key, value] of Object.entries(values)) {
      const parts = key.split('.'); let object = target.actor;
      for (const part of parts.slice(0, -1)) object = object[part] ??= {};
      object[parts.at(-1)] = structuredClone(value);
    }
  }
  applyUpdate(updates);
  assert.equal(preApply.callback(target.actor, 70, {'system.attributes.hp.value': 1}, damageItem.calcDamageOptions), false);
  const effects = target.actor.effects; effects.get = id => effects.find(effect => effect.id === id);
  let creates = 0, failReceiptWrite = true;
  target.actor.createEmbeddedDocuments = async (type, documents, options) => {
    assert.equal(type, 'ActiveEffect'); assert.equal(options.keepId, true); creates++;
    return documents.map(data => {const effect = {...data, id: data._id, parent: target.actor,
      uuid: target.actor.uuid + '.ActiveEffect.' + data._id}; effects.push(effect); return effect;});
  };
  target.actor.update = async values => {
    if (failReceiptWrite) throw new Error('Original simulated receipt write failure');
    applyUpdate(values);
  };
  const updated = [...h.hooks.values()].find(entry => entry.name === 'updateActor');
  updated.callback(target.actor, updates, {});
  await new Promise(resolve => setImmediate(resolve));
  assert(h.warnings.some(args => args.some(value => String(value).includes('receipt write failure'))));
  assert.equal(creates, 1);
  assert.equal(effects[0].changes[0].value, '-19');
  assert.equal(effects[0].duration.seconds, 3600);
  assert.equal(target.actor.flags[FLAG].perSpellDamageTransactionsPending[envelope.transactionId].status, 'pending');
  failReceiptWrite = false;
  // A fresh runtime has no workflow cache: ready recovery uses persisted Actor receipts.
  const recovered = host(); new vm.Script(code).runInContext(recovered.context);
  recovered.game.actors = [target.actor];
  recovered.context.fromUuidSync = uuid => uuid === item.uuid ? item : null;
  await recovered.emit('ready');
  assert.equal(creates, 1, 'Recovery reuses the already-created effect');
  assert.equal(Object.keys(target.actor.flags[FLAG].perSpellDamageTransactionsPending).length, 0);
  assert.equal(target.actor.flags[FLAG].perSpellDamageTransactionsCompleted[envelope.transactionId].effectApplied, true);
  updated.callback(target.actor, {}, {});
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(creates, 1);
  assert.equal(preApply.callback(target.actor, 70, {'system.attributes.hp.value': 1}, damageItem.calcDamageOptions), false);
  const broken = {...damageItem, flags: {}, calcDamageOptions: {}, hpDamage: 70, newHP: -50};
  assert.equal(await hook.callback(target, {item, workflow: {...workflow, activity: null}, damageItem: broken}), false);
  assert.equal(broken.hpDamage, 0); assert.equal(broken.newHP, 20);
});

test('candidate files are deterministic and declare the sole installed-provider browser import', async () => {
  const again = await buildSpellModuleFiles();
  assert.deepEqual(again.files, built.files);
  assert.deepEqual(built.report.externalImports, ['/modules/auraeffects/scripts/helpers.mjs']);
  for (const entry of built.manifest.esmodules) assert(built.files.has(entry));
  assert(built.files.has('licenses/noble-hashes.txt'));
  assert.equal(JSON.parse(built.files.get('coverage.json')).length, 167);
  assert(![...built.files.keys()].some(name => /private-content|src\/|node_modules|\.mjs$/.test(name)));
});
