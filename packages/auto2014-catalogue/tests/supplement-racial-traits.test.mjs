import test from 'node:test';
import assert from 'node:assert/strict';
import {createSupplementRacialTools} from '../src/supplement-racial-traits.mjs';
import {originalSupplementBindings} from './fixtures/supplement-racial-bindings.mjs';
const bindings = originalSupplementBindings();
const tools = createSupplementRacialTools({moduleId: 'original', uuidFor: (pack, id) => `Compendium.original.${pack}.Item.${id}`, bindings});
const document = id => ({_id: id, name: 'Original trait', img: 'original.svg', effects: [], system: {description: {value: 'Original prose'}, uses: {spent: 1}, activities: {first: {_id: 'first'}, extra: {_id: 'extra'}}}});

test('healing keeps spent uses and one ally-facing activity', () => {
  const doc = document('OriginalHeal');
  tools.normalizeAasimarRacialTrait(doc);
  assert.equal(doc.system.identifier, 'original-heal');
  assert.equal(doc.system.uses.spent, 1);
  assert.equal(doc.system.uses.recovery[0].period, 'lr');
  assert.equal(doc.system.activities.first.target.affects.type, 'ally');
  assert.deepEqual(Object.keys(doc.system.activities), ['first']);
  assert.equal(doc.system.description.value, 'Original prose');
});

test('shroud separates timed self revelation from the fear effect applied through a save', () => {
  const doc = document('OriginalShroud');
  tools.normalizeAasimarRacialTrait(doc);
  assert.equal(doc.effects.length, 2);
  assert.equal(doc.effects[0].duration.seconds, 60);
  assert.equal(doc.effects[1].name, 'Original fear');
  assert.deepEqual(doc.effects[1].statuses, ['frightened']);
  assert.deepEqual(doc.effects[1].flags.dae.specialDuration, ['turnEnd', 'combatEnd']);
  const activity = doc.system.activities.first;
  assert.equal(activity.type, 'save');
  assert.equal(activity.activation.type, 'bonus');
  assert.deepEqual(activity.save.ability, ['cha']);
  assert.deepEqual(activity.effects.map(effect => effect._id), ['arcAasimarFear01']);
  assert.equal(activity.target.affects.special, 'Original nearby targets');
  assert.deepEqual(doc.flags.original.declaredRider, {id: 'original-rider', damageType: 'necrotic'});
});

test('radiant forms retain self utility, flight policy and declared rider', () => {
  for (const id of ['OriginalConsume', 'OriginalSoul']) {
    const doc = document(id);
    tools.normalizeAasimarRacialTrait(doc);
    const activity = doc.system.activities.first;
    assert.equal(activity.type, 'utility');
    assert.equal(activity.target.affects.type, 'self');
    assert.equal(activity.consumption.targets[0].type, 'itemUses');
    assert.equal(activity.effects[0]._id, doc.effects[0]._id);
    assert.equal(doc.flags.original.declaredRider.damageType, 'radiant');
    assert.equal(doc.effects[0].transfer, false);
    assert.equal(doc.effects[0].changes.length, id === 'OriginalSoul' ? 1 : 0);
    if (id === 'OriginalSoul') assert.equal(doc.effects[0].changes[0].value, '@attributes.movement.walk');
    assert.equal(doc.system.description.value, 'Original prose');
  }
});

test('kender retains builder resource behavior and does not consume slots', () => {
  for (const [id, max] of [['OriginalFearless', '1'], ['OriginalTaunt', '@prof']]) {
    const doc = document(id);
    tools.normalizeKenderRacialTrait(doc);
    assert.equal(doc.system.uses.max, max);
    assert.equal(doc.system.uses.spent, 0); // Preserve the historical build-time reset.
    assert.equal(doc.flags.original.automation, 'builder');
    assert.equal(doc.system.source.book, 'OriginalBook');
    assert.equal(Object.keys(doc.system.activities).length, 2);
    for (const activity of Object.values(doc.system.activities)) assert.equal(activity.consumption.spellSlot, false);
    if (id === 'OriginalTaunt') assert.equal(doc.system.activities.first.damage.onSave, 'none');
    assert.equal(doc.system.description.value, 'Original prose');
  }
  const unrelated = document('Unknown'), before = structuredClone(unrelated);
  tools.normalizeAasimarRacialTrait(unrelated);
  tools.normalizeKenderRacialTrait(unrelated);
  assert.deepEqual(unrelated, before);
});
