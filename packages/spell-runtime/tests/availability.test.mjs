import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createRuntimeAvailability} from '../src/availability.mjs';
import {compileSpellPlan} from '@arcanedesk/spell-compiler';
import {spellAutomationSpecs} from '@arcanedesk/spells-2014';
import {describeSpellRequirements} from '@arcanedesk/automation-contracts/requirements';
import dancingLights from '../../spells-2014/src/spells/dancing-lights/definition.mjs';

function fixture() {
  const game = {system: {id: 'dnd5e', version: '5.3.3'}, release: {generation: 13},
    modules: new Map([['midi-qol', {active: true}], ['dae', {active: true}]])};
  const runtime = {mode: 'standalone', adapters: [],
    api: {applyCompilerRuntimePostUse() {}, dispatchPerSpellScript() {}}};
  return {game, runtime, midi: () => ({completeItemUse() {}})};
}
const requirements = {providers: ['arcane-runtime', 'native-active-effect'], adapters: [], scripts: [], resources: []};

test('native carriers require both terminal APIs as well as verified resources', async () => {
  const f = fixture();
  f.runtime.adapters.push('native-summon');
  const check = createRuntimeAvailability({...f, verifyResources: async () => ({valid:true})});
  const required = describeSpellRequirements(compileSpellPlan(dancingLights));
  assert.match((await check(required)).reason, /terminal APIs/);
  f.runtime.api.finalizeNativeSummonUse = () => {};
  assert.equal((await check(required)).available, false);
  f.runtime.api.cancelNativeSummonUse = () => {};
  assert.equal((await check(required)).available, true);
  delete f.runtime.api.finalizeNativeSummonUse;
  assert.equal((await check(required)).available, false);
});

test('real Light lowering requires ATL while non-light cantrips remain available', async () => {
  const f = fixture(); const check = createRuntimeAvailability(f);
  const light = describeSpellRequirements(compileSpellPlan(spellAutomationSpecs.light));
  assert(light.providers.includes('active-token-effects'));
  assert.match((await check(light)).reason, /Enable ATL/);
  const bolt = describeSpellRequirements(compileSpellPlan(spellAutomationSpecs['fire-bolt']));
  assert.equal((await check(bolt)).available, true);
  f.game.modules.set('ATL', {active: false});
  assert.equal((await check(light)).available, false);
  f.game.modules.get('ATL').active = true;
  assert.equal((await check(light)).available, true);
});

test('artifact adapters are checked against their registry and installed runtime', async () => {
  const f = fixture(); const check = createRuntimeAvailability(f);
  const name = 'fatal-damage-interception-v1';
  const declared = {...requirements, adapters: [{site: 'artifacts', configuration: {adapter: name}}]};
  assert.equal((await check(declared)).available, false);
  f.runtime.adapters.push(name);
  assert.equal((await check(declared)).available, true);
  declared.adapters[0].site = 'runtimeRules';
  assert.equal((await check(declared)).available, false);
});

test('aura provider resolves the actual Foundry module ID and remains optional for other spells', async () => {
  const f = fixture(); const check = createRuntimeAvailability(f);
  const aura = {...requirements, providers: ['aura-effects']};
  assert.equal((await check(requirements)).available, true);
  assert.equal((await check(aura)).available, false);
  f.game.modules.set('aura-effects', {active: true});
  assert.equal((await check(aura)).available, false);
  f.game.modules.set('auraeffects', {active: true});
  assert.equal((await check(aura)).available, true);
  f.game.modules.get('auraeffects').active = false;
  assert.equal((await check(aura)).available, false);
});

test('ready installation is distinguished from unsupported platform or missing dependencies', async () => {
  const f = fixture(); const check = createRuntimeAvailability(f);
  assert.equal((await check(requirements)).available, true);
  f.game.modules.get('dae').active = false;
  assert.equal((await check(requirements)).available, false);
  f.game.modules.get('dae').active = true; f.game.release.generation = 14;
  assert.equal((await check(requirements)).available, false);
});

test('missing named adapters and exact script contracts prevent generation', async () => {
  const f = fixture(); const check = createRuntimeAvailability(f);
  assert.equal((await check({...requirements, adapters: [{configuration: {adapter: 'unknown-adapter'}}]})).available, false);
  const scripted = {...requirements, scripts: [{id: 'original', version: 1, handlers: [{id: 'resolve'}]}]};
  assert.equal((await check(scripted)).available, false);
  f.runtime.getScriptContract = () => ({version: 1, handlers: ['resolve']});
  assert.equal((await check(scripted)).available, true);
  f.runtime.getScriptContract = () => ({version: 2, handlers: ['resolve']});
  assert.equal((await check(scripted)).available, false);
});

test('resource metadata alone never certifies actual provider readiness', async () => {
  const f = fixture(); const summoned = {...requirements, resources: [{profileId: 'original-profile', revision: 1}]};
  assert.equal((await createRuntimeAvailability(f)(summoned)).available, false);
  assert.equal((await createRuntimeAvailability({...f, verifyResources: async () => ({valid: false})})(summoned)).available, false);
  assert.equal((await createRuntimeAvailability({...f, verifyResources: async resources => {
    assert.equal(resources[0].profileId, 'original-profile'); return {valid: true};
  }})(summoned)).available, true);
});
