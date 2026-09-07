import test from 'node:test';
import assert from 'node:assert/strict';
import {createPhbRacialTools} from '../src/phb-racial-traits.mjs';
import {createAdvancementTools} from '../src/advancement.mjs';
import {createCharacterOptionTools} from '../src/character-options.mjs';
import {originalOptionBindings} from './fixtures/character-option-bindings.mjs';
import {originalRacialBindings} from './fixtures/phb-racial-bindings.mjs';
const bindings = originalRacialBindings();
const uuidFor = (pack, id) => `Compendium.original.${pack}.Item.${id}`;
const tools = createPhbRacialTools({moduleId: 'original', bindings,
  advancementTools: createAdvancementTools({rewriteUuid: value => value, uuidFor}),
  passiveTools: createCharacterOptionTools({moduleId: 'original', uuidFor, bindings: originalOptionBindings()})});
const document = id => ({_id: id, name: 'Original trait', img: 'original.svg', effects: [], system: {description: {value: 'Original prose'}, activities: {}}});

test('resistance, movement, HP and flag traits use shared passive effects', () => {
  const expected = {poisonResistance1: 'poison', poisonResistance2: 'poison', fireResistance: 'fire',
    fleetOfFoot: '35', aquaticHeritage: '30', dwarvenToughness: '+1', halflingLucky: 'true', halflingNimbleness: 'true'};
  for (const [key, value] of Object.entries(expected)) {
    const doc = document(bindings.ids[key]);
    tools.normalizePhbRacialTrait(doc);
    assert.equal(doc.effects.length, 1);
    assert.equal(doc.effects[0].changes[0].value, value);
    assert.equal(doc.effects[0].transfer, true);
    assert.equal(doc.system.description.value, 'Original prose');
  }
});

test('training and innate grants retain source identities, titles and progression', () => {
  for (const key of ['skillVersatility', 'keenSenses', 'weaponTraining']) {
    const doc = document(bindings.ids[key]);
    tools.normalizePhbRacialTrait(doc);
    assert.equal(doc.system.advancement[0].title, bindings.labels[key]);
    assert.equal(doc.system.advancement[0].type, 'Trait');
  }
  const doc = document(bindings.ids.drowMagic);
  tools.normalizePhbRacialTrait(doc);
  assert.deepEqual(doc.system.advancement.map(entry => entry.level), [0, 3, 5]);
  assert.deepEqual(doc.system.advancement.map(entry => entry.configuration.items[0].uuid), ['OriginalSpell1', 'OriginalSpell2', 'OriginalSpell3'].map(id => uuidFor('spells', id)));
  assert.equal(doc.system.advancement[2].configuration.spell.uses.per, 'lr');
  assert.equal(doc.system.uses.max, '');
});

test('endurance retains spent uses and configures the existing runtime interception', () => {
  const doc = document(bindings.ids.relentlessEndurance);
  doc.system.uses = {spent: 1};
  doc.system.activities = {first: {_id: 'first'}, second: {_id: 'second'}};
  tools.normalizePhbRacialTrait(doc);
  assert.equal(doc.system.identifier, 'original-endurance');
  assert.equal(doc.system.uses.spent, 1);
  assert.equal(doc.flags.original.fatalDamageInterception.minimumHitPoints, 1);
  assert.equal(doc.system.activities.first.midiProperties.removeChatButtons, 'all');
  assert.equal(Object.keys(doc.system.activities).length, 1);
});

test('line and cone breath retain save, template, scaling, resource and activity policies', () => {
  for (const id of ['OriginalLine', 'OriginalCone']) {
    const profile = bindings.dragonbornBreath[id], doc = document(id);
    doc.system.uses = {spent: 1};
    doc.system.activities = {unused: {_id: 'unused', type: 'utility'}, save: {_id: 'save', type: 'save'}};
    assert.equal(tools.normalizeDragonbornBreath(doc), true);
    const activity = doc.system.activities.save;
    assert.equal(doc.system.uses.spent, 1);
    assert.deepEqual(doc.system.uses.recovery.map(entry => entry.period), ['sr', 'lr']);
    assert.equal(activity.target.template.type, profile.shape);
    assert.equal(activity.target.template.width, profile.width);
    assert.deepEqual(activity.save.ability, [profile.save]);
    assert.equal(activity.save.dc.calculation, 'con');
    assert.equal(activity.damage.parts[0].custom.formula, '@scale.dragonborn.breath-weapon');
    assert.deepEqual(activity.damage.parts[0].types, [profile.damageType]);
    assert.equal(activity.consumption.targets[0].type, 'itemUses');
    assert.deepEqual(Object.keys(doc.system.activities), ['save']);
  }
  const unknown = document('Unknown');
  const before = structuredClone(unknown);
  assert.equal(tools.normalizeDragonbornBreath(unknown), false);
  tools.normalizePhbRacialTrait(unknown);
  assert.deepEqual(unknown, before);
});
