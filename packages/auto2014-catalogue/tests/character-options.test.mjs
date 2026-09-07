import assert from 'node:assert/strict';
import test from 'node:test';
import {createCharacterOptionTools} from '../src/character-options.mjs';
import {originalOptionBindings} from './fixtures/character-option-bindings.mjs';
const create = bindings => createCharacterOptionTools({moduleId: 'original', uuidFor: (pack, id) => `Compendium.original.${pack}.Item.${id}`, bindings: bindings ?? originalOptionBindings()});

test('background grants keep source identities and defer equipment without changing descriptions', () => {
  const api = create();
  const doc = {_id: 'OriginalBackground', name: 'Original background', system: {
    description: {value: '<p>Original background prose.</p>'}, source: {book: 'Original'}, startingEquipment: ['old'],
    advancement: [{type: 'Trait', configuration: {grants: ['original:trained']}},
      {type: 'ItemGrant', configuration: {items: [{uuid: 'Compendium.source.original-features.Item.OtherFeature'}, {uuid: 'Compendium.source.equipment.Item.OriginalItem'}]}},
      {type: 'ItemChoice', configuration: {pool: [{uuid: 'Compendium.source.equipment.OriginalChoice'}]}}]
  }};
  api.normalizeBackground(doc);
  assert.equal(doc._id, 'OriginalBackground');
  assert.equal(doc.system.identifier, 'original-background');
  assert.equal(doc.system.description.value, '<p>Original background prose.</p>');
  assert.deepEqual(doc.system.advancement[0].configuration.items, [{uuid: 'Compendium.original.backgroundfeatures.Item.OriginalFeature1', optional: false}]);
  assert.equal(doc.system.advancement[0].title, 'Original background feature');
  assert.equal(doc.system.advancement[1].type, 'Trait');
  assert.deepEqual(doc.system.startingEquipment, []);
  assert.deepEqual(doc.flags.original.deferredEquipment, [{sourcePack: 'equipment', id: 'OriginalItem'}, {sourcePack: 'equipment', id: 'OriginalChoice', choice: true}]);
  const source = {system: {advancement: [{configuration: {items: [{uuid: 'Compendium.source.original-features.Item.OriginalFeature2'}]}}]}};
  assert.deepEqual([...api.collectBackgroundFeatureIds(source)], ['OriginalFeature2']);
});

test('explicit skill correction clones traits and feature annotations preserve prose', () => {
  const api = create();
  const trait = {type: 'Trait', configuration: {grants: ['skills:ins', 'skills:ath']}};
  const doc = {_id: 'OriginalCorrect', system: {advancement: [trait]}};
  api.normalizeBackgroundAdvancement(doc);
  assert.deepEqual(doc.system.advancement[1].configuration.grants, ['skills:inv', 'skills:ins']);
  assert.deepEqual(trait.configuration.grants, ['skills:ins', 'skills:ath']);
  const feature = {_id: 'OriginalFeature1', name: 'Original Feature', system: {description: {value: 'Original prose'}}};
  api.normalizeBackgroundFeature(feature);
  assert.equal(feature.system.identifier, 'background-original-feature');
  assert.equal(feature.flags.original.sourcePack, 'original-features');
  assert.equal(feature.system.description.value, 'Original prose');
});

test('feat preparation applies explicit effects and advancements while preserving builder boundaries', () => {
  const bindings = originalOptionBindings(), api = create(bindings);
  const doc = {_id: 'OriginalFeat', name: 'Original Feat', img: 'original.svg', effects: [], system: {
    description: {value: 'Original feat prose'}, activities: {incomplete: {}}, source: {book: 'Original'}, prerequisites: {custom: 'keep'}
  }};
  api.normalizeFeat(doc);
  assert.equal(doc.system.identifier, 'original-feat');
  assert.equal(doc.flags.original.automation, 'static-advancement');
  assert.equal(doc.effects[0].origin, 'Compendium.original.original-passives.Item.OriginalFeat');
  assert.equal(doc.effects[0].transfer, true);
  assert.equal(doc.system.description.value, 'Original feat prose');
  assert.deepEqual(doc.system.activities, {});
  assert.deepEqual(doc.system.prerequisites, {custom: 'keep', repeatable: false});
  doc.system.advancement[0].configuration.grants.push('changed');
  assert.deepEqual(bindings.featAdvancementSpecs.OriginalFeat[0].configuration.grants, ['original:trained']);
  assert.equal(api.featAutomationTier({_id: 'OriginalManual'}), 'declared');
  assert.equal(api.featAutomationTier({_id: 'Unknown'}), 'builder');
});

test('equipment and empty-effect cleanup retain useful effects and identity', () => {
  const api = create();
  const doc = {_id: 'OriginalItem', name: 'Original Item', system: {description: {value: 'Original equipment prose'}},
    effects: [{_id: 'empty'}, {_id: 'changes', changes: [{}]}, {_id: 'status', statuses: ['original']} ]};
  api.normalizeBasicEquipment(doc, 'original-weapons');
  api.removeEmptyEffects(doc);
  assert.equal(doc.system.identifier, 'original-item');
  assert.equal(doc.system.source.book, 'Original');
  assert.equal(doc.flags.original.equipmentPack, 'original-weapons');
  assert.equal(doc.system.description.value, 'Original equipment prose');
  assert.deepEqual(doc.effects.map(effect => effect._id), ['changes', 'status']);
});
