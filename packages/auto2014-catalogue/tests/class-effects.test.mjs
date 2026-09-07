import test from 'node:test';
import assert from 'node:assert/strict';
import {createClassEffectTools} from '../src/class-effects.mjs';
import {originalEffectBindings as bindings} from './fixtures/class-effect-bindings.mjs';
const api=()=>createClassEffectTools({moduleId:'original',uuidFor:(pack,id)=>`Compendium.original.${pack}.Item.${id}`,bindings});
const doc=(identifier,type='utility')=>({_id:'originalDoc',img:'original.png',effects:[],flags:{original:{keep:true}},system:{identifier,description:{value:'Original complete prose'},uses:{spent:2},activities:{originalActivity:{_id:'originalActivity',type}}}});

test('abjure and vow link caller effects with distinct duration and target policies',()=>{
 const tools=api(),a=doc('channel-divinity-abjure-enemy','save');a.effects=[{_id:bindings.effectIds.abjure}];tools.normalizeAbjureEnemyAutomation(a);
 assert.equal(a.effects[0].name,bindings.labels.abjure);assert.deepEqual(a.effects[0].statuses,['frightened']);assert.deepEqual(a.effects[0].flags.dae.specialDuration,['isDamaged']);assert.equal(a.system.activities.originalActivity.effects[0]._id,bindings.effectIds.abjure);
 const v=doc('channel-divinity-vow-of-enmity');v.effects=[{_id:bindings.effectIds.vow}];tools.normalizeVowOfEnmityAutomation(v);
 assert.equal(v.effects[0].flags.original.vowOfEnmity,true);assert.deepEqual(v.effects[0].flags.dae.specialDuration,['combatEnd']);assert.equal(v.system.activities.originalActivity.midiProperties.confirmTargets,'always');assert.equal(v.system.activities.originalActivity.range.value,'10');
});

test('bard resources preserve spending and bind recovery to the supplied namespace',()=>{
 const tools=api(),d=doc('bardic-inspiration');tools.normalizeBardicInspiration(d);assert.equal(d.system.uses.spent,2);assert.equal(d.system.uses.recovery[0].period,'lr');assert.equal(d.system.activities.originalActivity.activation.type,'bonus');
 const font=doc('font-of-inspiration');tools.normalizeFontOfInspiration(font);assert.equal(font.effects[0].changes[0].key,'flags.original.bardicInspirationRecovery');assert.equal(font.effects[0].transfer,true);
 const counter=doc('countercharm');tools.normalizeCountercharm(counter);assert.equal(counter.effects[0].flags.original.countercharm,true);assert.equal(counter.effects[0].duration.rounds,1);assert.deepEqual(counter.system.activities.originalActivity.effects,[]);
});

test('channel and turn undead preserve resource linkage and runtime-owned effect application',()=>{
 const tools=api(),pool=doc('channel-divinity');tools.normalizeChannelDivinity(pool);assert.equal(pool.system.uses.spent,2);assert.equal(pool.system.uses.recovery[0].period,'sr');
 const d=doc('channel-divinity-turn-undead','save');tools.normalizeTurnUndead(d);assert.equal(d.effects[0].flags.original.turnedUndead,true);assert.deepEqual(d.system.activities.originalActivity.effects,[]);assert.equal(d.system.activities.originalActivity.consumption.targets[0].target,'channel-divinity');assert.equal(d.system.activities.originalActivity.target.affects.special,bindings.labels.undeadTarget);
});

test('blessing, sanctuary, flight and sight preserve linkage and transfer semantics',()=>{
 const tools=api(),bless=doc('vigilant-blessing');tools.normalizeVigilantBlessing(bless);assert.equal(bless.system.activities.originalActivity.effects[0]._id,bless.effects[0]._id);
 const twilight=doc('channel-divinity-twilight-sanctuary');tools.normalizeTwilightSanctuary(twilight);assert.deepEqual(twilight.system.activities.originalActivity.effects,[]);assert.equal(twilight.effects[0].flags.original.twilightSanctuary,true);
 const flight=doc('steps-of-night');tools.normalizeStepsOfNight(flight);assert.equal(flight.effects[0].changes[0].value,'30');assert.equal(flight.effects[0].transfer,false);
 const sight=doc('umbral-sight');tools.normalizeUmbralSight(sight);assert.equal(sight.effects[0].changes[0].value,'90');assert.equal(sight.effects[0].transfer,true);
});

test('declared riders and aura cleanup do not duplicate damage or save bonuses',()=>{
 const tools=api(),smite=doc('divine-smite','damage');tools.normalizeDivineSmite(smite);assert.equal(smite.flags.original.declaredRider.consumes,'spell-slot-on-hit');assert.equal(smite.system.activities.originalActivity.consumption.spellSlot,false);assert.equal(smite.system.activities.originalActivity.midiProperties.automationOnly,true);
 const dread=doc('dread-ambusher','damage');tools.normalizeDreadAmbusher(dread);assert.equal(dread.system.uses.spent,0);assert.equal(dread.system.activities.originalActivity.damage.parts[0].denomination,8);
 const style=doc('fighting-style-dueling');tools.normalizeFightingStyleAutomation(style);assert.equal(style.flags.original.automation.style,'dueling');assert.equal(style.flags.original.keep,true);
 const aura=doc('aura-of-protection');aura.effects=[{_id:'old'}];aura.flags.dnd5e={riders:{effect:['old'],other:true}};tools.normalizeAuraOfProtection(aura);assert.deepEqual(aura.effects,[]);assert.deepEqual(aura.flags.dnd5e.riders.effect,[]);assert.equal(aura.flags.dnd5e.riders.other,true);
 for(const normalize of Object.values(tools)){const unrelated=doc('original-unmatched');const before=structuredClone(unrelated);normalize(unrelated);assert.deepEqual(unrelated,before);}
});
