import test from 'node:test';
import assert from 'node:assert/strict';
import {createClassFeatureAdapters} from '../src/class-feature-adapters.mjs';
import {originalClassBindings as bindings} from './fixtures/class-feature-bindings.mjs';
const api=()=>createClassFeatureAdapters({moduleId:'original',uuidFor:(pack,id)=>`Compendium.original.${pack}.Item.${id}`,content:bindings});
const doc=id=>({_id:id,img:'original.png',effects:[],system:{description:{value:'Original complete prose.'},activities:{}}});

test('armor adapter creates stable utility and passive armor effect without resource consumption',()=>{
 const tools=api(),d=doc('originalArmor');tools.normalizeWarlockAutomation(d);
 assert.deepEqual(Object.keys(d.system.activities),['originalActivity']);const a=d.system.activities.originalActivity;
 assert.equal(a.type,'utility');assert.equal(a.name,'Original activity');assert.deepEqual(a.consumption.targets,[]);assert.equal(a.consumption.spellSlot,false);assert.equal(a.target.affects.type,'self');
 assert.equal(d.effects.length,1);assert.equal(d.effects[0].name,'Original effect');assert.equal(d.effects[0].transfer,true);assert.equal(d.effects[0].changes[0].value,'mage');
 assert.equal(d.system.description.value,'Original complete prose.');const once=structuredClone(d);tools.normalizeWarlockAutomation(d);assert.deepEqual(d,once);
});

test('pact source cleanup removes the malformed reference while preserving surrounding prose',()=>{
 const d=doc('originalPact');d.system.description.value='Original before @UUID[Compendium.dnd5e_classpack.itempack.original]{Original after';api().normalizeWarlockAutomation(d);
 assert.equal(d.system.description.value,'Original before Original after');const untouched=doc('unmatched');const before=structuredClone(untouched);api().normalizeWarlockAutomation(untouched);assert.deepEqual(untouched,before);
});

test('ranger binds favored foe, removes duplicate advancement and preserves movement behavior',()=>{
 const tools=api(),foe=doc('originalFoe');foe.flags={original:{existing:true}};tools.normalizeRangerTceFeatureAutomation(foe);
 assert.equal(foe.flags.original.existing,true);assert.deepEqual(foe.flags.original.damageScale,{1:'1d4',6:'1d6',14:'1d8'});
 for(const id of ['originalDeft','originalCanny']){const d=doc(id);d.system.advancement=[{type:'Trait'}];tools.normalizeRangerTceFeatureAutomation(d);assert.deepEqual(d.system.advancement,[]);}
 const d=doc('originalRoving');d.effects=[{img:'modules/original/Nicons/original.png'}];tools.normalizeRangerTceFeatureAutomation(d);assert.equal(d.effects[0].img,'icons/svg/book.svg');assert.equal(d.effects[0].transfer,true);assert.equal(d.effects[0].changes.length,3);assert.equal(d.effects[0].changes[1].value,'@attributes.movement.walk');
 assert.throws(()=>createClassFeatureAdapters({moduleId:'original',uuidFor:()=>'',content:{...bindings,ranger:{}}}),/binding|identity/);
});
