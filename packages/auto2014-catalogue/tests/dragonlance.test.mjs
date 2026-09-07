import test from 'node:test';
import assert from 'node:assert/strict';
import {createDragonlanceTools} from '../src/dragonlance.mjs';
import {createAdvancementTools} from '../src/advancement.mjs';
import {originalCampaignBindings} from './fixtures/dragonlance-bindings.mjs';

const uuidFor = (pack, id) => `Compendium.original.${pack}.Item.${id}`;
function createApi(bindings = originalCampaignBindings()) {
  return createDragonlanceTools({
    moduleId: 'original', uuidFor, bindings,
    backgroundIdentifier: () => 'original-background', featIdentifier: () => 'original-feat',
    collectDeferredBackgroundItems: doc => doc.deferred,
    abilityChoiceAdvancement: createAdvancementTools({rewriteUuid: x => x, uuidFor}).abilityChoiceAdvancement,
  });
}

test('background preserves prose and traits, grants at level zero and defers selected equipment', () => {
  const trait = {_id: 'OriginalTrait', type: 'Trait', configuration: {grants: ['skills:ath']}};
  const doc = {_id: 'TrainingBackground', system: {
    description: {value: 'Original background description.'},
    source: {page: 'original-page'}, advancement: [trait, {type: 'ItemGrant'}], startingEquipment: ['old'],
  }, deferred: [{sourcePack: 'training-gear', id: 'kit'}, {sourcePack: 'unrelated', id: 'other'}]};
  createApi().normalizeDragonlanceBackground(doc);
  assert.equal(doc.system.description.value, 'Original background description.');
  assert.equal(doc.system.source.page, 'original-page');
  assert.equal(doc.system.source.book, 'Original handbook');
  const [grant, copiedTrait] = doc.system.advancement;
  assert.equal(doc.system.advancement.length, 2);
  assert.equal(grant.level, 0);
  assert.equal(grant.configuration.items[0].uuid, uuidFor('dragonlancefeats', 'TrainingFeat'));
  assert.equal(grant.hint, 'Choose the reward earned in training.');
  assert.deepEqual(copiedTrait, trait);
  assert.notEqual(copiedTrait, trait);
  assert.deepEqual(doc.system.startingEquipment, []);
  assert.deepEqual(doc.flags.original.deferredEquipment, [{sourcePack: 'training-gear', id: 'kit'}]);
  assert.throws(() => createApi().normalizeDragonlanceBackground({_id: 'Missing'}), /Missing Dragonlance background feat mapping/);
});

test('configured feat retains prose, builds ASI and resource counters without donor action shells', () => {
  const doc = {_id: 'TrainingFeat', system: {description: {value: 'Original feat description.'},
    activities: {unverified: {type: 'attack'}}, prerequisites: {items: ['original']}}};
  createApi().normalizeDragonlanceFeat(doc);
  assert.equal(doc.system.description.value, 'Original feat description.');
  assert.deepEqual(doc.system.activities, {});
  assert.deepEqual(doc.system.prerequisites, {items: ['original'], level: 4, repeatable: false});
  assert.deepEqual(doc.system.uses, {max: '@prof', spent: 0, recovery: [{period: 'lr', type: 'recoverAll'}]});
  assert.equal(doc.system.advancement[0].title, 'Training improvement');
  assert.deepEqual(doc.system.advancement[0].configuration.locked, ['con', 'int', 'wis', 'cha']);
  assert.equal(doc.flags.original.automation, 'advancement');
  const plain = {_id: 'OriginalPlainFeat'};
  createApi().normalizeDragonlanceFeat(plain);
  assert.equal(plain.system.prerequisites.level, null);
  assert.deepEqual(plain.system.uses, {max: '', spent: null, recovery: []});
  assert.deepEqual(plain.system.advancement, []);
  assert.equal(plain.flags.original.automation, 'builder');
});

test('recursive references use explicit source binding while retaining unrelated references', () => {
  const doc = {nested: ['Compendium.original-source.training-feats.Item.Reward',
    '@Compendium[original-source.training-feats.Reward]{Original reward}',
    '<a data-pack="original-source.training-feats">Original reward</a>',
    'Compendium.other.pack.Item.Reward', null, 4]};
  const api = createApi();
  assert.equal(api.rewriteDragonlanceFeatPackReferences(doc), doc);
  assert.deepEqual(doc.nested, ['Compendium.original.dragonlancefeats.Item.Reward',
    '@Compendium[original.dragonlancefeats.Reward]{Original reward}',
    '<a data-pack="original.dragonlancefeats">Original reward</a>',
    'Compendium.other.pack.Item.Reward', null, 4]);
  assert.deepEqual(api.rewriteDragonlanceFeatPackReferences(doc), doc);
});

test('content configuration is copied and required inputs fail early', () => {
  const input = originalCampaignBindings();
  const api = createApi(input);
  input.backgroundHint = 'Changed externally';
  input.featAsiAbilities[0][1].push('con');
  const doc = {_id: 'TrainingFeat'};
  api.normalizeDragonlanceFeat(doc);
  assert.ok(doc.system.advancement[0].configuration.locked.includes('con'));
  const missing = originalCampaignBindings(); delete missing.backgroundHint;
  assert.throws(() => createApi(missing), /backgroundHint/);
  assert.throws(() => createApi({...originalCampaignBindings(), featAsiAbilities: [['bad', 'invalid']]}), /Invalid mapping/);
});
