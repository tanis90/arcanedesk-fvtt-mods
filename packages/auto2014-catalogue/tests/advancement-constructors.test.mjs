import assert from 'node:assert/strict';
import test from 'node:test';
import {createAdvancementTools, resolveOptionRecipe} from '../src/advancement.mjs';
const tools = createAdvancementTools({rewriteUuid: value => value, uuidFor: (pack, id) => `Compendium.original.${pack}.Item.${id}`});

test('innate grants keep stable identity, caller text and existing charisma/slot policy', () => {
  const grant = tools.innateSpellGrant({id: 'OriginalGrant1', title: 'Original practice', level: 3,
    spellId: 'OriginalSpell1', usesMax: '1', usesPer: 'lr'});
  assert.equal(grant._id, 'OriginalGrant1');
  assert.equal(grant.title, 'Original practice');
  assert.equal(grant.level, 3);
  assert.deepEqual(grant.configuration.items, [{uuid: 'Compendium.original.spells.Item.OriginalSpell1', optional: false}]);
  assert.deepEqual(grant.configuration.spell, {ability: ['cha'], preparation: 'innate', uses: {max: '1', per: 'lr', requireSlot: false}});
});

test('traits and ability constructors retain existing choices, fixed values and locks', () => {
  const trait = tools.traitAdvancement({id: 'OriginalTrait1', title: 'Original training', grants: ['original:trained'], choices: [{count: 1, pool: ['original:a', 'original:b']}]});
  assert.deepEqual(trait.value, {chosen: [], grants: []});
  assert.equal(trait.configuration.allowReplacements, false);
  assert.deepEqual(trait.configuration.choices, [{count: 1, pool: ['original:a', 'original:b']}]);
  const fixed = tools.abilityScoreAdvancement({id: 'OriginalAbility1', title: 'Original increase', fixed: {int: 1}});
  assert.deepEqual(fixed.configuration.fixed, {str: 0, dex: 0, con: 0, int: 1, wis: 0, cha: 0});
  assert.equal(fixed.configuration.points, 0);
  assert.equal(fixed.configuration.cap, 1);
  const choice = tools.abilityChoiceAdvancement('OriginalChoice1', 'Original choice', ['dex', 'str']);
  assert.equal(choice.configuration.points, 1);
  assert.deepEqual(choice.configuration.locked, ['con', 'int', 'wis', 'cha']);
});

test('data recipes consume the actual shared constructors and preserve caller-owned pools', () => {
  const pool = ['original:a', 'original:b'];
  const recipe = [{$call: 'traitAdvancement', args: [{id: 'OriginalRecipe1', title: 'Original recipe', choices: [{count: 1, pool: {$reference: 'pool'}}]}]},
    {$call: 'abilityChoiceAdvancement', args: ['OriginalRecipe2', 'Original ability', ['str', 'con']]}];
  const result = resolveOptionRecipe(recipe, {references: {pool}, calls: tools});
  assert.equal(result[0].configuration.choices[0].pool, pool);
  assert.deepEqual(result[1].configuration.locked, ['dex', 'int', 'wis', 'cha']);
  assert.deepEqual(recipe[0].args[0].choices[0].pool, {$reference: 'pool'});
});
