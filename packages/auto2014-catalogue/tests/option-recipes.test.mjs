import assert from 'node:assert/strict';
import test from 'node:test';
import {resolveOptionRecipe} from '../src/advancement.mjs';

test('recipes preserve explicit constructor calls and shared pools without flattening authoring logic', () => {
  const pool = ['original-a', 'original-b'];
  const result = resolveOptionRecipe({entry: [{$call: 'choice', args: ['original-id', {$reference: 'pool'}]}],
    expanded: ['first', {$spread: {$reference: 'pool'}}]}, {
    references: {pool}, calls: {choice: (id, choices) => ({id, choices})}
  });
  assert.equal(result.entry[0].choices, pool);
  assert.deepEqual(result.expanded, ['first', 'original-a', 'original-b']);
  assert.equal(result.entry[0].id, 'original-id');
});

test('unknown and inherited constructors, missing references and malformed spreads fail closed', () => {
  for (const recipe of [{$call: 'constructor', args: []}, {$call: 'eval', args: ['original text']},
    {$reference: 'missing'}, {$reference: 'toString'}, {$spread: []}, [{$spread: 3}],
    [{$spread: [], extra: true}], {$unknown: true}]) {
    assert.throws(() => resolveOptionRecipe(recipe));
  }
  const original = {nested: {list: ['unchanged']}};
  const result = resolveOptionRecipe(original);
  result.nested.list.push('copy');
  assert.deepEqual(original.nested.list, ['unchanged']);
});
