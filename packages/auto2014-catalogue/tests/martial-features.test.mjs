import test from 'node:test';
import assert from 'node:assert/strict';
import {createMartialFeatureTools} from '../src/martial-features.mjs';
const bindings=()=>({fighterImages:{'second-wind':'icons/svg/book.svg'},monkImages:{},rogueImages:{},monk:{profUseIds:['originalUse'],frightenFeatureId:'originalFear',effectId:'originalEffect',effectName:'Original training fear'},rogue:{sneakAttackFeatureId:'originalSneak',damageActivityId:'originalDamage',legacyEffectId:'originalLegacy'}});
const tools=(content=bindings())=>createMartialFeatureTools({moduleId:'original-module',uuidFor:(pack,id)=>`Compendium.original.${pack}.Item.${id}`,content});
const doc=(id,identifier=id)=>({_id:id,img:'original.png',effects:[],system:{identifier,description:{value:'Original complete prose'},activities:{},uses:{spent:1}}});

test('fighter normalization preserves prose and spent resources while preparing recovery and actions',()=>{
 const api=tools(),d=doc('originalWind','second-wind');d.system.activities.heal={type:'heal'};api.normalizeFighterAutomation(d);
 assert.equal(d.img,'icons/svg/book.svg');assert.equal(d.system.uses.spent,1);assert.equal(d.system.uses.recovery[0].period,'sr');
 assert.equal(d.system.activities.heal.healing.bonus,'@classes.fighter.levels');assert.equal(d.system.activities.heal.activation.type,'bonus');assert.equal(d.system.description.value,'Original complete prose');
 for(const [identifier,period]of [['action-surge','sr'],['indomitable','lr']]){const a=doc('original',identifier);api.normalizeFighterAutomation(a);assert.equal(Object.values(a.system.activities)[0].type,'utility');assert.equal(a.system.uses.recovery[0].period,period);const once=structuredClone(a);api.normalizeFighterAutomation(a);assert.deepEqual(a,once);}
});

test('monk bindings isolate source identity and emit configured fear effect',()=>{
 const input=bindings(),api=tools(input);input.monk.effectName='changed';const d=doc('originalFear');d.system.activities.save={type:'save'};
 api.normalizeMonkAutomation(d);assert.equal(d.effects.length,1);assert.equal(d.effects[0].name,'Original training fear');assert.equal(d.effects[0]._id,'originalEffect');assert.deepEqual(d.effects[0].statuses,['frightened']);assert.equal(d.effects[0].duration.rounds,10);
 assert.equal(d.system.activities.save.effects[0]._id,'originalEffect');assert.deepEqual(d.system.activities.save.save.ability,['wis']);
 const u=doc('originalUse');api.normalizeMonkAutomation(u);assert.equal(u.system.uses.max,'@prof');assert.equal(u.system.uses.spent,1);
});

test('sneak attack retains declared rider and removes legacy macros through supplied bindings',()=>{
 const api=tools(),d=doc('originalSneak');d.system.activities.originalDamage={type:'damage'};d.effects=[{_id:'originalLegacy'},{_id:'macroEffect',changes:[{key:'flags.dnd5e.DamageBonusMacro'}]},{_id:'keep',changes:[]}];d.flags={dae:{macro:'original legacy macro',other:true}};
 api.normalizeRogueAutomation(d);assert.deepEqual(d.effects.map(x=>x._id),['keep']);assert.deepEqual(d.flags.dae,{other:true});assert.equal(d.flags['original-module'].declaredRider.consumesOn,'hit');
 assert.equal(d.system.activities.originalDamage.midiProperties.automationOnly,true);assert.equal(d.system.activities.originalDamage.damage.critical.allow,true);assert.deepEqual(d.system.activities.originalDamage.consumption.targets,[]);
 assert.throws(()=>api.normalizeRogueAutomation(doc('originalSneak')),/configured damage activity/);assert.throws(()=>tools({...bindings(),monk:{profUseIds:[]}}),/binding/);
});
