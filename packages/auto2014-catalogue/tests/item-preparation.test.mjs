import test from 'node:test';
import assert from 'node:assert/strict';
import {createItemPreparationTools, normalizeSpellAnimationMetadata} from '../src/item-preparation.mjs';
import {createActivityTools} from '../src/activities.mjs';

const bindings = () => ({identifiers: {OriginalItem: 'original-item'},
  itemUseAliases: {OriginalResource: 'original-resource'}, singleTargetSpellIdentifiers: ['original-ward']});
function createApi(input = bindings()) {
  return createItemPreparationTools({bindings: input,
    rewriteString: value => value.replace('Compendium.original-source.', 'Compendium.original-target.'),
    activityTools: createActivityTools({moduleId: 'original', spellAutomationProfiles: {
      version: 1, defaults: {templateTargetsByActivityType: {save: 'workflow'}},
    }}),
  });
}

test('resource aliases affect only item-use string targets and configured identifiers', () => {
  const targets = [
    {type: 'itemUses', target: 'Compendium.original-source.items.Item.OriginalResource'},
    {type: 'itemUses', target: 'Compendium.original-source.items.Item.Other'},
    {type: 'attribute', target: 'Compendium.original-source.items.Item.OriginalResource'},
    {type: 'itemUses', target: 4},
  ];
  const doc = {_id: 'OriginalItem', system: {activities: {use: {consumption: {targets}}}, description: {value: 'Original prose'}}};
  const api = createApi(); api.rewriteConsumptionTargets(doc); api.normalizeIdentifiers(doc);
  assert.equal(targets[0].target, 'original-resource');
  assert.equal(targets[1].target, 'Compendium.original-target.items.Item.Other');
  assert.equal(targets[2].target, 'Compendium.original-source.items.Item.OriginalResource');
  assert.equal(targets[3].target, 4);
  assert.equal(doc.system.identifier, 'original-item');
  assert.equal(doc.system.description.value, 'Original prose');
  const unknown = {_id: 'Unmapped', system: {identifier: 'keep'}};
  api.normalizeIdentifiers(unknown); assert.equal(unknown.system.identifier, 'keep');
});

test('noncompiled cards use the shared interaction policy and explicit single-target list', () => {
  const doc = {type: 'spell', system: {identifier: 'original-ward', description: {value: 'Original full description'},
    target: {affects: {type: 'creature'}, template: {}}, range: {units: 'ft', value: 30},
    activities: {use: {type: 'utility', target: {affects: {count: '3'}}}}}};
  createApi().normalizeSpellAutomation(doc, new Set());
  const activity = doc.system.activities.use;
  assert.equal(activity.target.affects.count, '1');
  assert.equal(activity.target.affects.type, 'creature');
  assert.equal(activity.midiProperties.forceRollDialog, 'never');
  assert.equal(doc.system.description.value, 'Original full description');
  assert.equal(doc.flags.original.spellAutomation.version, 1);
  const untouched = {type: 'feat', system: {activities: {}}};
  const before = structuredClone(untouched);
  createApi().normalizeSpellAutomation(untouched, new Set());
  assert.deepEqual(untouched, before);
});

test('compiler-owned cards fail before any preparation mutation', () => {
  const doc = {type: 'spell', system: {identifier: 'original-compiled', activities: {use: {type: 'utility'}}}};
  const before = structuredClone(doc);
  assert.throws(() => createApi().normalizeSpellAutomation(doc, new Set(['original-compiled'])), /Compiler-owned spell/);
  assert.deepEqual(doc, before);
});

test('animation cleanup preserves customized, enabled and non-spell metadata', () => {
  for (const marker of [{isEnabled: false}, {isEnabled: false, isCustomized: false}]) {
    const doc = {type: 'spell', flags: {autoanimations: marker, original: {keep: true}}};
    normalizeSpellAnimationMetadata(doc);
    assert.deepEqual(doc.flags, {original: {keep: true}});
  }
  for (const marker of [{isEnabled: false, isCustomized: true}, {isEnabled: true}, {}]) {
    const doc = {type: 'spell', flags: {autoanimations: marker}};
    normalizeSpellAnimationMetadata(doc); assert.equal(doc.flags.autoanimations, marker);
  }
  const doc = {type: 'feat', flags: {autoanimations: {isEnabled: false}}};
  const before = structuredClone(doc); normalizeSpellAnimationMetadata(doc); assert.deepEqual(doc, before);
  normalizeSpellAnimationMetadata({type: 'spell'});
});

test('caller mapping changes cannot alter an initialized preparation policy', () => {
  const input = bindings(), api = createApi(input);
  input.identifiers.OriginalItem = 'changed'; input.itemUseAliases.OriginalResource = 'changed';
  const doc = {_id: 'OriginalItem', system: {activities: {use: {consumption: {targets: [{type: 'itemUses', target: 'OriginalResource'}]}}}}};
  api.normalizeIdentifiers(doc); api.rewriteConsumptionTargets(doc);
  assert.equal(doc.system.identifier, 'original-item');
  assert.equal(doc.system.activities.use.consumption.targets[0].target, 'original-resource');
  assert.throws(() => createApi({...bindings(), identifiers: []}), /mapping/);
  assert.throws(() => createApi({...bindings(), singleTargetSpellIdentifiers: null}), /single-target/);
});
