import {test} from 'node:test';
import assert from 'node:assert/strict';
import {describeSourceCompendium, createFoundryCompendiumHost, materializeSourceDocument} from '../src/foundry-compendiums.mjs';
import {SPELL_MODULE_ID} from '../src/compendium.mjs';
import {previewSpellSources} from '../src/sources.mjs';

test('source book inherited from a compendium survives moving to a world pack', () => {
  const original = {system: {source: {book: '', license: 'CC-BY-4.0', rules: '2014'}, description: {value: 'Original fixture'}}};
  const document = {toObject: () => structuredClone(original)};
  const pack = {metadata: {flags: {dnd5e: {sourceBook: 'SRD 5.1'}}}};
  assert.equal(materializeSourceDocument(document, pack).system.source.book, 'SRD 5.1');
  assert.equal(original.system.source.book, '');
  original.system.source.book = 'Explicit original source';
  assert.equal(materializeSourceDocument(document, pack).system.source.book, 'Explicit original source');
  assert.deepEqual(materializeSourceDocument(document, {}), original);
});

test('reviewed SRD document mappings resolve identifier changes without matching names or 2024 content', () => {
  const pack = {documentName: 'Item', collection: 'dnd5e.spells',
    metadata: {flags: {dnd5e: {sourceBook: 'SRD 5.1'}}}};
  const source = describeSourceCompendium(pack, 'dnd5e');
  const identifiers = ['shining-smite', 'enlarge-reduce', 'blindness-deafness'];
  const documents = Object.entries(source.identities).map(([id], index) => ({_id: id,
    name: 'Original translated fixture', type: 'spell',
    system: {identifier: identifiers[index], level: 2, source: {rules: '2014'}}}));
  const catalogue = Object.values(source.identities).map(id => ({id, level: 2}));
  assert.equal(previewSpellSources({documents, catalogue, ...source}).counts.matched, 3);
  const foreign = describeSourceCompendium({...pack, collection: 'world.other'}, 'dnd5e');
  assert.equal(previewSpellSources({documents, catalogue, ...foreign}).counts.matched, 0);
  documents[0].system.source.rules = '2024';
  assert.equal(previewSpellSources({documents, catalogue, ...source}).rows[0].reason, 'conflicting-ruleset');
});

test('SRD 2014 is recognized by system, pack identity and metadata, never label', () => {
  const pack = {documentName: 'Item', collection: 'dnd5e.spells', title: '本地化显示名',
    metadata: {flags: {dnd5e: {sourceBook: 'SRD 5.1'}}}};
  assert.equal(describeSourceCompendium(pack, 'dnd5e').sourceRuleset, '2014');
  for (const variant of [{...pack, collection: 'dnd5e.spells24'}, {...pack, metadata: {}},
    {...pack, collection: 'world.ddb-imported-spells'}]) {
    assert.equal(describeSourceCompendium(variant, 'dnd5e').sourceRuleset, null);
  }
  assert.equal(describeSourceCompendium({...pack, visible: false}, 'dnd5e'), null);
  assert.equal(describeSourceCompendium({...pack, documentName: 'Actor'}, 'dnd5e'), null);
});

function fixture() {
  const data = {_id: 'originalItem0001', flags: {[SPELL_MODULE_ID]: {generated: {schemaVersion: 1, spellId: 'original'}}}};
  const calls = [];
  const pack = {collection: 'world.output', documentName: 'Item', locked: false,
    metadata: {flags: {[SPELL_MODULE_ID]: {generated: 1}}},
    getDocuments: async query => {calls.push({query}); return [{toObject: () => structuredClone(data)}];}};
  const game = {user: {id: 'gm1', isGM: true}, users: [{id: 'gm1', isGM: true, active: true}], packs: new Map([[pack.collection, pack]])};
  const host = createFoundryCompendiumHost({game, CompendiumCollection: {}, ItemClass: {
    createDocuments: async (items, options) => {calls.push({create: items, options}); return [{id: items[0]._id}];},
    updateDocuments: async (items, options) => {calls.push({update: items, options}); return [{id: items[0]._id}];},
  }});
  return {data, calls, pack, game, host};
}

test('adapter uses database reads and pack-only document APIs with stable IDs', async () => {
  const {data, calls, host} = fixture();
  assert.deepEqual(await host.readItem('world.output', data._id), data);
  assert.deepEqual(calls[0].query, {_id__in: [data._id]});
  await host.createItem('world.output', data);
  await host.replaceItem('world.output', data);
  assert.deepEqual(calls.find(call => call.create).options, {pack: 'world.output', keepId: true});
  assert.deepEqual(calls.find(call => call.update).options, {pack: 'world.output', diff: false, recursive: false});
});

test('foreign packs, locked packs, non-GM and secondary GM sessions cannot write', async () => {
  for (const change of [f => {f.game.user.isGM = false;}, f => {f.pack.locked = true;},
    f => {f.pack.metadata.flags = {};}, f => {f.game.users.unshift({id: 'gm0', isGM: true, active: true});}]) {
    const f = fixture(); change(f);
    await assert.rejects(f.host.createItem('world.output', f.data));
    assert(!f.calls.some(call => call.create));
  }
});

test('update refuses a foreign item and treats empty acknowledgements as uncertain', async () => {
  const f = fixture(); f.data.flags = {};
  await assert.rejects(f.host.replaceItem('world.output', f.data), /foreign/);
  assert(!f.calls.some(call => call.update));
  const empty = createFoundryCompendiumHost({game: fixture().game, ItemClass: {createDocuments: async () => []}});
  await assert.rejects(empty.createItem('world.output', {_id: 'originalItem0001'}), /not acknowledged/);
});
