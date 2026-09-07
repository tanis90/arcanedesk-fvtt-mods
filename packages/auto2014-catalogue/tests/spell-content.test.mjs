import assert from 'node:assert/strict';
import test from 'node:test';
import {createSpellContentTools} from '../src/spell-content.mjs';

function options() {
  return {moduleId: 'original', actorStudioModuleId: 'original-studio', maxPreparedSpellLevel: 3,
    supportedSpellcastingClasses: ['original-caster'],
    actorStudioSubclassSpellLists: {'original-subclass': {level: 2, lists: ['original-caster']}},
    arcaneOwnedSpellDescriptionIds: ['original-replacement']};
}

test('bilingual composition preserves both supplied HTML descriptions and mechanics', () => {
  const tools = createSpellContentTools(options());
  const doc = {_id: 'original-spell', type: 'spell', name: '练习Practice', system: {
    description: {value: '<p>Original English practice.</p>', chat: 'Keep chat'},
    activities: {practice: {type: 'utility'}}, identifier: 'practice'}};
  const mechanics = JSON.stringify(doc.system.activities);
  tools.applyBilingualSpellText(doc, new Map([[doc._id, {name: '练习', description: '<p>原创练习。</p>'}]]));
  assert.equal(doc.name, '练习 Practice');
  assert.equal(doc.system.description.value, '<p>原创练习。</p>\n<hr />\n<h4>English</h4>\n<p>Original English practice.</p>');
  assert.equal(doc.system.description.chat, 'Keep chat');
  assert.equal(JSON.stringify(doc.system.activities), mechanics);
  assert.equal(doc._id, 'original-spell');
  assert.equal(tools.bilingualName('', ' Practice '), 'Practice');
  assert.equal(tools.bilingualName('练习 Practice', 'Practice'), '练习 Practice');
  assert.equal(tools.bilingualDescription('<p>A</p>', '<p>A</p>'), '<p>A</p>');
  assert.equal(tools.bilingualDescription('', '<p>A</p>'), '<p>A</p>');
});

test('explicit complete-card replacements and absent translations retain existing behavior', () => {
  const tools = createSpellContentTools(options());
  const translation = new Map([['original-replacement', {name: '完整', description: '<p>Original complete card.</p>'}]]);
  const doc = {_id: 'original-replacement', type: 'spell', name: 'Complete', system: {description: {value: '<p>Old original text.</p>'}}};
  tools.applyBilingualSpellText(doc, translation);
  assert.equal(doc.system.description.value, '<p>Original complete card.</p>');
  for (const unchanged of [
    {_id: 'missing', type: 'spell', name: 'Missing'},
    {_id: 'original-replacement', type: 'feat', name: 'Feature'}
  ]) {
    const before = structuredClone(unchanged);
    tools.applyBilingualSpellText(unchanged, translation);
    assert.deepEqual(unchanged, before);
  }
  const empty = {_id: 'original-replacement', type: 'spell', name: 'Empty', system: {description: {value: ''}}};
  tools.applyBilingualSpellText(empty, translation);
  assert.equal(empty.system.description.value, ''); // Preserve the existing two-description guard.
});

test('source identity remaps respect the caller level cap and rewrite nested references', () => {
  const tools = createSpellContentTools(options());
  const originals = [{_id: 'original-new', system: {identifier: 'practice', level: 3}},
    {_id: 'original-high', system: {identifier: 'advanced', level: 4}},
    {_id: 'original-invalid', system: {identifier: 'invalid', level: 'unknown'}}, {}];
  const remaps = tools.officialSpellIdRemaps([
    {_id: 'original-old', system: {identifier: 'practice'}},
    {_id: 'old-high', system: {identifier: 'advanced'}},
    {_id: 'old-invalid', system: {identifier: 'invalid'}}
  ], tools.officialSpellIdentifierMap(originals));
  assert.deepEqual([...remaps], [['original-old', 'original-new']]);
  const ids = new Set();
  tools.addReferencedSpellId(ids, 'original-old', remaps);
  tools.addReferencedSpellId(ids, '', remaps);
  assert.deepEqual([...ids], ['original-new']);
  const doc = {reference: ['Compendium.original.spells.Item.original-old', {text: 'original-old'}], nil: null};
  assert.equal(tools.remapSpellReferences(doc, remaps), doc);
  assert.deepEqual(doc, {reference: ['Compendium.original.spells.Item.original-new', {text: 'original-new'}], nil: null});
});

test('class assignments include aliases, exclude unsupported lists and preserve unrelated flags', () => {
  const tools = createSpellContentTools(options());
  const sources = new Map([
    ['OriginalOne', {_id: 'OriginalOne', identifier: 'LegacyPractice', system: {identifier: 'Practice', level: 1}}],
    ['OriginalHigh', {_id: 'OriginalHigh', system: {level: 4}}]
  ]);
  const {lists, assignments} = tools.extractClassSpellLists([
    {type: 'spells', system: {identifier: 'original-caster', spells: ['Compendium.original.Item.OriginalOne', 'Compendium.original.Item.OriginalHigh', 'Compendium.original.Item.missing']}},
    {type: 'spells', system: {identifier: 'unsupported', spells: ['OriginalOne']}}
  ], sources);
  assert.deepEqual([...lists.get('original-caster')], ['OriginalOne']);
  assert.equal(lists.size, 1);
  const doc = {system: {identifier: 'LEGACYPRACTICE', classes: {extra: true}}, flags: {original: {keep: true}}};
  tools.annotateActorStudioSpellClasses(doc, assignments);
  assert.deepEqual(doc.system.classes, {extra: true, value: 'original-caster'});
  assert.deepEqual(doc.flags.original, {keep: true, spellClasses: ['original-caster']});
  const missing = {};
  tools.annotateActorStudioSpellClasses(missing, assignments);
  assert.equal(missing.system.classes.value, 'arcane-hidden');
});

test('configuration is snapshotted and subclass list output cannot mutate it', () => {
  const config = options();
  const tools = createSpellContentTools(config);
  config.supportedSpellcastingClasses.length = 0;
  config.actorStudioSubclassSpellLists['original-subclass'].lists.length = 0;
  const doc = {system: {identifier: 'original-caster'}};
  tools.annotateClassSpellList(doc);
  assert.deepEqual(doc.flags['original-studio'].spellLists, ['original-caster']);
  const child = {system: {identifier: 'original-subclass'}};
  tools.annotateSubclassSpellList(child);
  child.flags['original-studio'].spellLists.lists.length = 0;
  tools.annotateSubclassSpellList(child);
  assert.deepEqual(child.flags['original-studio'].spellLists, {level: 2, lists: ['original-caster']});
  assert.throws(() => createSpellContentTools({...options(), maxPreparedSpellLevel: 10}), /level/);
  assert.throws(() => createSpellContentTools({...options(), arcaneOwnedSpellDescriptionIds: null}), /identities/);
});
