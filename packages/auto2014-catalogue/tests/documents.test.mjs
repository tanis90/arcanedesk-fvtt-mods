import assert from 'node:assert/strict';
import test from 'node:test';
import {createDocumentTools} from '../src/documents.mjs';
import {originalDocumentBindings} from './fixtures/document-bindings.mjs';
const tools = () => createDocumentTools({moduleId: 'original-target', bindings: originalDocumentBindings()});

test('ordered rewrites preserve visible text and deep document identities', () => {
  const api = tools();
  const doc = {_id: 'Original001', system: {description: {value: 'Original prose @UUID[unavailable]{Original label}'},
    refs: ['Compendium.original-source.entries.Item.Original001', {img: 'modules/original-source/practice.svg'}]}};
  assert.equal(api.rewriteDeep(doc), doc);
  assert.equal(doc._id, 'Original001');
  assert.equal(doc.system.description.value, 'Original prose Original label');
  assert.deepEqual(doc.system.refs, ['Compendium.original-target.features.Item.Original001', {img: 'modules/original-target/practice.svg'}]);
  assert.equal(api.rewriteUuid('Compendium.original-source.practice.Original001'), 'Compendium.original-target.spells.Item.Original001');
  assert.equal(api.rewriteUuid('Compendium.other.pack.Item.Keep001'), 'Compendium.other.pack.Item.Keep001');
  assert.equal(api.packNameForUuid(null), null);
});

test('reference collection handles embedded, bare and nested UUIDs without other namespaces', () => {
  const api = tools();
  const value = ['Compendium.original-source.entries.Item.Original001',
    {text: '@UUID[Compendium.original-source.practice.Original002]{Practice} Compendium.other.entries.Item.Other001'}, null];
  assert.deepEqual([...api.collectCompendiumUuids(value)], [
    'Compendium.original-source.entries.Item.Original001', 'Compendium.original-source.practice.Original002']);
  assert.deepEqual([...api.collectReferencedIdsByPack({system: {advancement: value}}, 'spells')], ['Original002']);
});

test('effect hydration preserves the distinct historical paths and leaves donor records unchanged', () => {
  const api = tools();
  const stored = {_id: 'OriginalEffect1', type: 'base', system: {old: true}, folder: 'private-folder',
    _stats: {keep: 'yes'}, changes: [{key: 'original.value', value: 'modules/original-source/practice.svg'}]};
  const inline = {_id: 'OriginalEffect2', type: 'base', system: {keep: true}, folder: 'keep-inline-folder'};
  const donors = new Map([['OriginalEffect1', stored]]);
  const before = structuredClone(stored);
  const doc = {_id: 'Original001', effects: ['OriginalEffect1', 'missing', inline], system: {activities: {
    practice: {effects: ['OriginalEffect1', {_id: 'OriginalEffect2'}, null, 3], appliedEffects: ['OriginalEffect1', 'missing']}, empty: null
  }}};
  api.cleanEffects(doc, donors, 'features');
  assert.deepEqual(stored, before);
  assert.equal(inline.origin, undefined);
  assert.equal(doc.effects.length, 2);
  assert.equal(doc.effects[0].type, undefined);
  assert.equal(doc.effects[0].system, undefined);
  assert.equal(doc.effects[0].folder, undefined);
  assert.deepEqual(doc.effects[0].ownership, {default: 2});
  assert.equal(doc.effects[0]._stats.keep, 'yes');
  assert.equal(doc.effects[0]._stats.systemId, 'original-system');
  assert.equal(doc.effects[0].origin, api.uuidFor('features', doc._id));
  assert.equal(doc.effects[1].folder, 'keep-inline-folder');
  assert.deepEqual(doc.effects[1].system, {keep: true});
  assert.deepEqual(doc.system.activities.practice.effects, [{_id: 'OriginalEffect1'}, {_id: 'OriginalEffect2'}]);
  assert.deepEqual(doc.system.activities.practice.appliedEffects, ['OriginalEffect1']);
});

test('spell effects keep their ActiveEffect type/system and activity references hydrate', () => {
  const api = tools();
  const donor = {_id: 'OriginalEffect1', type: 'enchantment', system: {enchantment: {mode: 'override'}},
    changes: [{key: 'original.value', value: '1'}]};
  const doc = {_id: 'OriginalSpell', type: 'spell', effects: [], system: {activities: {
    original: {_id: 'act0000000000001', effects: [{_id: 'OriginalEffect1'}], appliedEffects: []}
  }}};
  const result = api.cleanEffects(doc, new Map([['OriginalEffect1', donor]]), 'spells');
  assert.deepEqual([...result.unresolvedEffectIds], []);
  assert.equal(doc.effects.length, 1);
  assert.equal(doc.effects[0].type, 'enchantment');
  assert.deepEqual(doc.effects[0].system, {enchantment: {mode: 'override'}});
  assert.equal(doc.effects[0].origin, api.uuidFor('spells', doc._id));
  assert.deepEqual(doc.system.activities.original.effects, [{_id: 'OriginalEffect1'}]);
});

test('missing effect policies drop, defer or refuse dangling activity references', () => {
  const api = tools();
  const spell = () => ({_id: 'OriginalSpell', type: 'spell', effects: [], system: {activities: {
    original: {_id: 'act0000000000001', effects: ['AbsentEffect0001']}
  }}});
  const dropped = spell();
  assert.deepEqual([...api.cleanEffects(dropped, new Map(), 'spells', {missingEffectPolicy: 'drop'}).unresolvedEffectIds], []);
  assert.deepEqual(dropped.system.activities.original.effects, [{_id: 'AbsentEffect0001'}]);
  const deferred = spell();
  assert.deepEqual([...api.cleanEffects(deferred, new Map(), 'spells', {missingEffectPolicy: 'defer'}).unresolvedEffectIds], ['AbsentEffect0001']);
  assert.throws(
    () => api.cleanEffects(spell(), new Map(), 'spells', {missingEffectPolicy: 'throw'}),
    /Missing effect AbsentEffect0001/,
  );
});

test('reviewed stale references are removed only for the exact item/activity/effect triple', () => {
  const api = tools();
  const make = () => ({_id: 'OriginalSpell', type: 'spell', effects: [], system: {activities: {
    original: {_id: 'act0000000000001', effects: ['StaleEffect000001']},
    other: {_id: 'act0000000000002', effects: ['StaleEffect000001']},
  }}});
  const stale = new Map([['OriginalSpell:act0000000000001:StaleEffect000001', {reason: 'donor removed it'}]]);
  const doc = make();
  api.cleanEffects(doc, new Map(), 'spells', {missingEffectPolicy: 'defer', staleReferences: stale});
  assert.deepEqual(doc.system.activities.original.effects, []);
  assert.deepEqual(doc.system.activities.other.effects, [{_id: 'StaleEffect000001'}]);
  const untouched = make();
  api.cleanEffects(untouched, new Map(), 'spells', {missingEffectPolicy: 'defer'});
  assert.deepEqual(untouched.system.activities.original.effects, [{_id: 'StaleEffect000001'}]);
});

test('bindings are explicit snapshots and replacement order is retained', () => {
  const bindings = originalDocumentBindings();
  bindings.replacements = [{kind: 'literal', from: 'first', to: 'second'}, {kind: 'literal', from: 'second', to: 'third'}];
  const api = createDocumentTools({moduleId: 'original-target', bindings});
  bindings.replacements.length = 0;
  assert.equal(api.rewriteString('first'), 'third');
  const doc = {folder: 'remove', ownership: {default: 0}, _stats: {keep: true}};
  api.pruneObject(doc);
  assert.equal(doc.folder, undefined);
  assert.deepEqual(doc.ownership, {default: 2});
  assert.equal(doc._stats.keep, true);
  assert.throws(() => createDocumentTools({moduleId: 'original', bindings: {...bindings, sourceNamespace: 'invalid.namespace'}}), /namespace/);
  assert.throws(() => createDocumentTools({moduleId: 'original', bindings: {...bindings, replacements: [{kind: 'literal', from: '', to: ''}]}}), /operation/);
});
