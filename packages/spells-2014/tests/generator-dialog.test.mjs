import {test} from 'node:test';
import assert from 'node:assert/strict';
import {fixture} from './original-plan-fixture.mjs';
import {createSpellGeneratorDialog} from '../src/generator-dialog.mjs';
import {SPELL_MODULE_ID} from '../src/compendium.mjs';

function setup({selection = true, confirm = true, available = true} = {}) {
  const plan = fixture('original-dialog');
  const document = {_id: 'originalSource01', name: '<img onerror="bad">', type: 'spell',
    system: {identifier: plan.definitionId, level: 1, source: {rules: '2014'}, description: {value: 'Original body', chat: ''}}};
  const source = {collection: 'dnd5e.spells', documentName: 'Item', title: 'Original SRD fixture',
    metadata: {flags: {dnd5e: {sourceBook: 'SRD 5.1'}}}, getDocuments: async () => [{toObject: () => structuredClone(document)}]};
  const game = {user: {isGM: true}, system: {id: 'dnd5e'}, packs: new Map([[source.collection, source]])};
  const items = new Map(), calls = [], dialogs = [];
  const host = {assertCanWrite: async () => {}, ensureOutput: async name => {
    calls.push('ensure'); game.packs.set(`world.${name}`, {metadata: {flags: {[SPELL_MODULE_ID]: {generated: 1}}},
      getDocuments: async () => [...items.values()].map(item => ({toObject: () => structuredClone(item)}))});
  }, readItem: async (_pack, id) => structuredClone(items.get(id) ?? null),
  createItem: async (_pack, item) => {calls.push('create'); items.set(item._id, structuredClone(item));},
  replaceItem: async (_pack, item) => {calls.push('update'); items.set(item._id, structuredClone(item));}};
  const Dialog = {prompt: async config => {dialogs.push(config); return config.ok.label === 'Preview'
    ? (selection ? {source: source.collection, rules: '', target: 'original-output'} : null) : null;},
  confirm: async config => {dialogs.push(config); return confirm;}};
  let generation = 0;
  const open = createSpellGeneratorDialog({game, Dialog, host, plans: [plan],
    checkAvailability: async () => ({available, reason: 'Original unavailable reason'}),
    newGenerationId: () => `original-generation-${++generation}`});
  return {open, items, calls, dialogs};
}

test('cancelled selection or preview makes no world writes', async () => {
  for (const options of [{selection: false}, {confirm: false}]) {
    const f = setup(options); assert.equal((await f.open()).status, 'cancelled');
    assert.equal(f.calls.length, 0);
  }
});

test('unavailable runtime reports no writable items and never creates a pack', async () => {
  const f = setup({available: false}); assert.equal((await f.open()).status, 'nothing-to-write');
  assert.equal(f.calls.length, 0);
  assert(f.dialogs.at(-1).content.includes('Original unavailable reason'));
});

test('confirmed UI flow generates then updates, and escapes displayed source names', async () => {
  const f = setup(); assert.equal((await f.open()).status, 'completed');
  assert.equal((await f.open()).status, 'completed');
  assert.deepEqual(f.calls, ['ensure', 'create', 'ensure', 'update']);
  assert.equal(f.items.size, 1);
  const preview = f.dialogs.find(config => config.window.title === 'Review Arcane spell generation');
  assert(preview.content.includes('&lt;img'));
  assert(!preview.content.includes('<img'));
});
