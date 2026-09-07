import test from 'node:test';
import assert from 'node:assert/strict';
import {createClassChoiceTools} from '../src/class-choices.mjs';
import {originalClassChoiceBindings} from './fixtures/class-choice-bindings.mjs';
const bindings = originalClassChoiceBindings();
const uuidFor = (pack, id) => `Compendium.original.${pack}.Item.${id}`;
const tools = createClassChoiceTools({uuidFor, bindings});

test('barbarian cleanup and storm replacement are scoped to the existing class and level', () => {
  const keep = {type: 'ItemChoice', configuration: {choices: {3: {count: 1}}, pool: [{}]}};
  const doc = {system: {identifier: 'barbarian', advancement: [{type: 'ItemChoice', configuration: {}}, keep, {type: 'Trait'}]}};
  tools.removeEmptyBarbarianItemChoices(doc);
  assert.deepEqual(doc.system.advancement, [keep, {type: 'Trait'}]);
  const item = {uuid: uuidFor('source', 'OriginalOld'), optional: true};
  const subclass = {system: {identifier: 'path-of-the-storm-herald', advancement: [{type: 'ItemGrant', level: 10, configuration: {items: [item]}}, {type: 'ItemGrant', level: 3, configuration: {items: [item]}}]}};
  tools.normalizeBarbarianSubclassAdvancement(subclass);
  assert.equal(subclass.system.advancement[0].configuration.items[0].uuid, uuidFor('classfeatures', 'OriginalNew'));
  assert.equal(subclass.system.advancement[0].configuration.items[0].optional, true);
  assert.equal(subclass.system.advancement[1].configuration.items[0], item);
});

test('fighting style choices replace only the selected level and preserve caller pools', () => {
  const other = {type: 'ItemChoice', level: 10, title: 'Fighting Style'};
  const doc = {system: {advancement: [{type: 'ItemChoice', configuration: {choices: {2: {count: 1}}}, title: '战斗风格'}, other]}};
  tools.setFightingStyleChoice(doc, {id: 'OriginalStyle', level: 2, title: 'Original title', hint: 'Original hint', styleIds: ['OriginalStyle1']});
  assert.equal(doc.system.advancement[0], other);
  assert.equal(doc.system.advancement.length, 2);
  assert.equal(doc.system.advancement[1].configuration.pool[0].uuid, uuidFor('classfeatures', 'OriginalStyle1'));
  assert.equal(tools.isFightingStyleChoiceAtLevel(doc.system.advancement[1], 2), true);
});

test('metamagic and affinity choices retain progression and reject duplicate injection', () => {
  const doc = {system: {advancement: []}};
  tools.addSorcererMetamagicChoice(doc);
  tools.addSorcererMetamagicChoice(doc);
  assert.equal(doc.system.advancement.length, 1);
  assert.deepEqual(Object.keys(doc.system.advancement[0].configuration.choices), ['3', '10', '17']);
  assert.equal(doc.system.advancement[0].hint, 'Original metamagicHint');
  const unrelated = {type: 'ItemGrant', level: 1, configuration: {items: [{uuid: uuidFor('spells', 'Unrelated')}]}};
  const affinity = {system: {advancement: [{type: 'ItemGrant', level: 1, configuration: {items: ['OriginalSpell1', 'OriginalLegacySpell'].map(id => ({uuid: uuidFor('spells', id)}))}}, unrelated]}};
  tools.addDivineSoulAffinitySpellChoice(affinity);
  tools.addDivineSoulAffinitySpellChoice(affinity);
  assert.equal(affinity.system.advancement.length, 2);
  assert.equal(affinity.system.advancement[0], unrelated);
  assert.deepEqual(affinity.system.advancement[1].configuration.pool.map(item => item.uuid), ['OriginalSpell1', 'OriginalSpell2'].map(id => uuidFor('spells', id)));
});

test('ranger preparation retains existing grants and adds the level-six improvement', () => {
  const existing = {type: 'ItemGrant', level: 1, configuration: {items: [{uuid: uuidFor('classfeatures', 'OriginalEnemy')}]}};
  const doc = {system: {identifier: 'ranger', advancement: [existing]}};
  tools.addRangerPhbImprovementAdvancements(doc);
  assert.equal(doc.system.advancement[0], existing);
  assert.equal(doc.system.advancement.length, 3);
  assert.equal(doc.system.advancement[1].configuration.items[0].uuid, uuidFor('classfeatures', 'OriginalExplorer'));
  assert.equal(doc.system.advancement[2].level, 6);
  assert.equal(doc.system.advancement[2].configuration.items.length, 2);
});
