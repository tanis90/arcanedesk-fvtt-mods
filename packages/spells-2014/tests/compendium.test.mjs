import {test} from 'node:test';
import assert from 'node:assert/strict';
import {fixture} from './original-plan-fixture.mjs';
import {prepareSpellCompendium, createCompendiumWriter, SPELL_MODULE_ID} from '../src/compendium.mjs';

const plans = [fixture('original-one'), fixture('original-two')];
const documents = plans.map((plan, i) => ({_id: `originalSource0${i}`, name: `Original ${i}`, type: 'spell',
  system: {identifier: plan.definitionId, level: 1, source: {rules: '2014'}, description: {value: '<p>Original text.</p>', chat: ''}}}));
const clone = value => structuredClone(value);
function prepare(existing = [], options = {}) {
  return prepareSpellCompendium({documents, plans, sourcePack: 'original.source', targetPack: 'world.original-output',
    existing, generationId: 'generation-one', ...options});
}
function memoryHost(initial = []) {
  const items = new Map(initial.map(item => [item._id, clone(item)]));
  const calls = [];
  return {items, calls, assertCanWrite: async () => {},
    readItem: async (pack, id) => clone(items.get(id) ?? null),
    createItem: async (pack, item) => {assert(!items.has(item._id)); calls.push('create'); items.set(item._id, clone(item));},
    replaceItem: async (pack, item) => {assert(items.has(item._id)); calls.push('update'); items.set(item._id, clone(item));}};
}

test('preview is read-only and repeat generation updates stable owned IDs', async () => {
  const before = JSON.stringify(documents);
  const host = memoryHost(); const write = createCompendiumWriter(host);
  const first = prepare(); assert.equal(first.counts.create, 2);
  assert.equal((await write(first)).status, 'completed');
  const second = prepare([...host.items.values()], {generationId: 'generation-two'});
  assert.equal(second.counts.update, 2);
  assert.equal((await write(second)).status, 'completed');
  assert.equal(host.items.size, 2); assert.deepEqual(host.calls, ['create', 'create', 'update', 'update']);
  assert.equal(JSON.stringify(documents), before);
  assert.throws(() => prepare([...host.items.values()], {generationId: 'generation-two'}), /fresh/);
});

test('DDB definition mapping reaches the generated compendium without importing foreign automation', async () => {
  const imported = clone(documents[0]);
  delete imported.system.identifier; delete imported.system.source.rules;
  imported.name = '原创中文法术';
  imported.flags = {ddbimporter: {definitionId: 900001, is2014: true, is2024: false},
    'midi-qol': {onUseMacroName: 'ForeignMacro'}};
  imported.effects = [{_id: 'foreignEffect001', name: 'Foreign effect'}];
  imported.system.activities = {foreign: {type: 'utility'}};
  imported.system.description.value = '<p>原创测试内容 @UUID[Compendium.original.book.Item.original00000001]</p>';
  const before = clone(imported);
  const batch = prepare([], {documents: [imported], ddbIdentities: {'900001': plans[0].definitionId}});
  assert.equal(batch.writes.length, 1);
  const host = memoryHost(); assert.equal((await createCompendiumWriter(host)(batch)).status, 'completed');
  const item = [...host.items.values()][0];
  assert.equal(item.name, imported.name);
  assert.deepEqual(item.system.description, imported.system.description);
  assert.equal(item.system.activities.foreign, undefined);
  assert(!item.effects.some(effect => effect._id === 'foreignEffect001'));
  assert.notEqual(item.flags['midi-qol']?.onUseMacroName, 'ForeignMacro');
  const receipt = item.flags[SPELL_MODULE_ID].generated;
  assert.equal(receipt.sourceKind, 'ddb-importer'); assert.equal(receipt.sourceDefinitionId, '900001');
  assert.equal(receipt.presentationDependencies.verified, false);
  assert(receipt.presentationDependencies.references.some(entry => entry.kind === 'uuid'));
  assert.deepEqual(imported, before);
});

test('foreign collision and duplicate source identity are excluded before writes', () => {
  const first = prepare();
  const userItem = {_id: first.writes[0].id, name: 'User document', flags: {}};
  const guarded = prepare([userItem]);
  assert.equal(guarded.counts.prepared, 1);
  assert.equal(guarded.rows[0].reason, 'output-ownership-conflict');
  const ambiguous = prepare([], {documents: [documents[0], {...documents[0], _id: 'differentSource1'}]});
  assert.equal(ambiguous.writes.length, 0);
  assert(ambiguous.rows.every(row => row.reason === 'ambiguous-spell'));
});

test('unrelated user items survive and no source pack may be used as output', async () => {
  const userItem = {_id: 'userDocument0001', name: 'User content', system: {description: {value: 'Keep'}}};
  const host = memoryHost([userItem]);
  await createCompendiumWriter(host)(prepare([userItem]));
  assert.deepEqual(host.items.get(userItem._id), userItem);
  assert.throws(() => prepare([], {sourcePack: 'world.original-output'}), /Invalid output/);
});

test('permissions and output drift reject the batch before any write', async () => {
  const host = memoryHost(); host.assertCanWrite = async () => {throw new Error('GM required');};
  await assert.rejects(createCompendiumWriter(host)(prepare()), /GM required/);
  assert.equal(host.calls.length, 0);
  const changed = memoryHost(); const batch = prepare();
  changed.items.set(batch.writes[1].id, {_id: batch.writes[1].id, name: 'Concurrent user document'});
  await assert.rejects(createCompendiumWriter(changed)(batch), /changed since preview/);
  assert.equal(changed.calls.length, 0);
});

test('lost acknowledgement is observed, reported and never retried', async () => {
  const host = memoryHost(); const original = host.createItem;
  host.createItem = async (...args) => {await original(...args); throw new Error('Transport failed after commit');};
  const result = await createCompendiumWriter(host)(prepare());
  assert.equal(result.status, 'partial'); assert.equal(result.written.length, 1);
  assert.equal(result.written[0].recoveredAcknowledgement, true);
  assert.equal(result.remaining, 1); assert.equal(host.calls.length, 1);
});

test('uncertain writes stop with acknowledged progress and can be freshly previewed', async () => {
  const host = memoryHost(); const original = host.createItem;
  host.createItem = async (...args) => {if (host.calls.length === 1) throw new Error('Connection lost'); await original(...args);};
  const result = await createCompendiumWriter(host)(prepare());
  assert.equal(result.status, 'indeterminate'); assert.equal(result.written.length, 1);
  assert.equal(result.remaining, 1); assert.equal(host.calls.length, 1);
  const retry = prepare([...host.items.values()], {generationId: 'fresh-reconciliation'});
  assert.equal(retry.counts.update, 1); assert.equal(retry.counts.create, 1);
});

test('concurrent local generation and malformed batches cannot overwrite a user item', async () => {
  const host = memoryHost(); let release;
  const pending = new Promise(resolve => {release = resolve;});
  host.assertCanWrite = async () => pending;
  const write = createCompendiumWriter(host); const first = write(prepare());
  await assert.rejects(write(prepare()), /already running/);
  release(); await first;
  const malformed = prepare(); delete malformed.writes[0].item.flags[SPELL_MODULE_ID];
  await assert.rejects(write(malformed), /Invalid batch ownership/);
});
