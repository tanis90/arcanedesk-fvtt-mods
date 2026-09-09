import {test} from 'node:test';
import assert from 'node:assert/strict';
import {compileSpellPlan} from '@arcanedesk/spell-compiler';
import definition from '../src/spells/toll-the-dead/definition.mjs';

test('Toll preserves the native save and scaled d8 base while declaring a closed script hook', () => {
  const plan = compileSpellPlan(definition);
  const handler = plan.projection.perSpellScript.handlers[0];
  assert.equal(handler.semanticActionId, 'cast');
  assert.deepEqual(handler.configuration.allowedFaces, [8, 12]);
  assert.equal(handler.authority, 'damage-roll-caller');
  assert.equal(plan.acceptance.status, 'compiler-runtime-passed');
  assert.equal(plan.acceptance.source, 'packages/spells-2014/README.md#cantrip-runtime-acceptance');
  assert.equal(plan.support.omissions.length, 1);
  assert.equal(plan.projection.actions.length, 1);
  assert.equal(plan.projection.runtimeRules.length, 0, 'Native damage is not replaced by a runtime damage dispatcher');
});

test('damage die script contracts reject undeclared authority, targets, writes and dice', () => {
  for (const mutate of [
    d => {d.script.handlers[0].authority = 'primary-active-gm';},
    d => {d.fragments[0].rules[0].targets[0].cardinality.max = 2;},
    d => {d.script.handlers[0].configuration.allowedFaces = [8, 8];},
    d => {d.script.handlers[0].configuration.allowedFaces = [1];},
    d => {d.script.handlers[0].configuration.extra = true;},
    d => {d.script.handlers[0].runtimeRuleId = 'missing-rule';},
    d => {d.script.handlers[0].writes = ['actor:hit-points'];},
    d => {d.script.handlers[0].artifactId = 'unowned-effect';},
  ]) {
    const candidate = structuredClone(definition); mutate(candidate);
    assert.throws(() => compileSpellPlan(candidate));
  }
});
