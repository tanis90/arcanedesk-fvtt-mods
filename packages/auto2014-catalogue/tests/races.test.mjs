import test from 'node:test';
import assert from 'node:assert/strict';
import {createRaceTools} from '../src/races.mjs';
import {createAdvancementTools} from '../src/advancement.mjs';
import {originalRaceBindings} from './fixtures/race-bindings.mjs';
const bindings = originalRaceBindings();
const uuidFor = (pack, id) => `Compendium.original.${pack}.Item.${id}`;
const tools = createRaceTools({moduleId: 'original', uuidFor, innateSpellGrant: createAdvancementTools({rewriteUuid: x => x, uuidFor}).innateSpellGrant, bindings});
const grant = ids => ({type: 'ItemGrant', configuration: {items: ids.map(id => ({uuid: uuidFor('source', id)}))}});

test('revelation selection replaces only the complete matching grant', () => {
  const keep = grant(['Unrelated']);
  const doc = {_id: 'OriginalAasimar', system: {advancement: [grant(['OriginalRev3', 'OriginalRev1', 'OriginalRev2']), keep]}};
  tools.normalizeRaceAutomation(doc);
  assert.equal(doc.system.advancement[0].type, 'ItemChoice');
  assert.equal(doc.system.advancement[0].level, 3);
  assert.equal(doc.system.advancement[0].title, 'Original revelation');
  assert.deepEqual(doc.system.advancement[0].configuration.pool.map(item => item.uuid), bindings.references.aasimarRevelationTraitIds.map(id => uuidFor('racialtraits', id)));
  assert.equal(doc.system.advancement[1], keep);
});

test('half-elf choice and Kender metadata preserve existing data and caller labels', () => {
  const original = {type: 'ItemChoice', title: 'Original donor variant', configuration: {keep: true}};
  const doc = {_id: 'OriginalHalfElf', system: {advancement: [original], description: {value: 'Original prose'}}};
  tools.normalizeRaceAutomation(doc);
  assert.equal(doc.system.advancement[0].title, 'Original variant');
  assert.equal(doc.system.advancement[0].configuration.pool.length, 2);
  assert.equal(original.title, 'Original donor variant');
  assert.equal(doc.system.description.value, 'Original prose');
  const kender = {_id: 'OriginalKender', system: {type: {keep: true}}};
  tools.normalizeRaceAutomation(kender);
  assert.equal(kender.system.identifier, 'original-kender');
  assert.equal(kender.system.source.book, 'OriginalKenderBook');
  assert.equal(kender.system.type.keep, true);
});

test('derived race keeps complete descriptions, cloned sources and stable spell grants', () => {
  const source = {_id: 'SourceRace', name: 'Source', system: {description: {value: 'Source prose'}, advancement: [
    {type: 'AbilityScoreImprovement', level: 0, configuration: {}},
    grant(['OriginalResistance', 'OriginalInfernal']), grant(['OriginalOldRay']), grant(['OriginalOldArmor']), grant(['OriginalDark'])]}};
  const before = structuredClone(source);
  const doc = tools.createLevistusTieflingRace(source);
  assert.deepEqual(source, before);
  assert.equal(doc._id, 'OriginalLevistus');
  assert.equal(doc.name, 'Original race');
  assert.equal(doc.system.description.value, '<p>Original race prose.</p>');
  assert.deepEqual(doc.system.advancement[0].configuration.fixed, {str: 0, dex: 0, con: 1, int: 0, wis: 0, cha: 2});
  assert.deepEqual(doc.system.advancement[1].configuration.items.map(item => item.uuid), ['OriginalResistance', 'OriginalStygian', 'OriginalSight'].map(id => uuidFor('racialtraits', id)));
  assert.deepEqual(doc.system.advancement.slice(2).map(entry => entry.level), [0, 3, 5]);
  assert.deepEqual(doc.system.advancement.slice(2).map(entry => entry.configuration.items[0].uuid), ['OriginalRay', 'OriginalArmor', 'OriginalDark'].map(id => uuidFor('spells', id)));
  const trait = tools.createStygianLegacyTrait({_id: 'SourceTrait', system: {}});
  assert.equal(trait._id, 'OriginalStygian');
  assert.equal(trait.system.requirements, 'Original requirement');
  assert.equal(trait.system.description.value, '<p>Original trait prose.</p>');
});

test('missing required content is rejected rather than producing an empty description', () => {
  assert.throws(() => createRaceTools({moduleId: 'original', uuidFor, innateSpellGrant: () => {}, bindings: {...bindings, descriptions: {}}}), /description/);
  const doc = {_id: 'Unknown', system: {description: {value: 'Keep'}}}, before = structuredClone(doc);
  tools.normalizeRaceAutomation(doc);
  assert.deepEqual(doc, before);
});
