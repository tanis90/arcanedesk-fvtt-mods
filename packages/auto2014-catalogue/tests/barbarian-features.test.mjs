import test from 'node:test';
import assert from 'node:assert/strict';
import {createBarbarianFeatureTools} from '../src/barbarian-features.mjs';
import {originalBarbarianBindings as bindings} from './fixtures/barbarian-bindings.mjs';
const api=()=>createBarbarianFeatureTools({moduleId:'original',uuidFor:(pack,id)=>`Compendium.original.${pack}.Item.${id}`,content:bindings});
const doc=key=>({_id:bindings.ids[key],img:'original.png',effects:[],system:{description:{value:'Original complete prose.'},activities:{utility:{type:'utility',consumption:{targets:[{type:'itemUses'},{type:'attribute',target:'original'}]}}},uses:{spent:2}}});

test('rage rebuilds base effect while preserving spent uses and original prose',()=>{
 const tools=api(),d=doc('rage');d.effects=[{_id:bindings.ids.base_rage_effect,name:'Original old effect',changes:[{key:'system.traits.size',value:'huge'}]}];tools.normalizeBarbarianAutomation(d);
 assert.equal(d.system.uses.max,'@scale.barbarian.rages');assert.equal(d.system.uses.spent,2);assert.equal(d.effects[0].name,bindings.text.rageName);assert.equal(d.effects[0].duration.rounds,10);
 assert(!d.effects[0].changes.some(c=>c.key==='system.traits.size'));assert.equal(d.effects[0].changes.length,6);assert.equal(d.system.description.value,'Original complete prose.');
});

test('manual fallbacks keep caller notes once and remove misleading limited-use actions',()=>{
 const tools=api();for(const key of ['reckless_attack','relentless_rage']){const d=doc(key);tools.normalizeBarbarianAutomation(d);assert.deepEqual(d.system.activities,{});assert.deepEqual(d.effects,[]);assert(d.system.description.value.startsWith('Original complete prose.'));const once=structuredClone(d);tools.normalizeBarbarianAutomation(d);assert.deepEqual(d,once);}
 const d=doc('intimidating_presence');tools.normalizeBarbarianAutomation(d);assert.deepEqual(d.system.activities.utility.consumption.targets,[{type:'attribute',target:'original'}]);
});

test('rage riders add independent effects without consuming another rage',()=>{
 const tools=api();for(const key of ['totem_spirit_bear','totem_spirit_elk','rage_giant','demiurgic_colossus']){const d=doc(key);tools.normalizeBarbarianAutomation(d);const a=d.system.activities.dnd5eactivity000;assert.deepEqual(a.consumption.targets,[]);assert.equal(d.effects.length,1);assert.equal(d.effects[0].duration.rounds,10);assert.equal(a.effects[0]._id,d.effects[0]._id);}
 const bear=doc('totem_spirit_bear');tools.normalizeBarbarianAutomation(bear);assert.equal(bear.effects[0].changes.length,9);assert(!bear.effects[0].changes.some(c=>c.value==='psychic'));
 const giant=doc('rage_giant');tools.normalizeBarbarianAutomation(giant);assert.equal(giant.effects[0].changes[0].value,'lg');
 assert.throws(()=>createBarbarianFeatureTools({moduleId:'original',uuidFor:()=>'',content:{...bindings,text:{}}}),/binding/);
});
