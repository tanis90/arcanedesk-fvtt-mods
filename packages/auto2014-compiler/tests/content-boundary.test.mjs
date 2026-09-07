import test from 'node:test';
import assert from 'node:assert/strict';
import {composeSpellItem,compileSpellAutomation,emitSpellAutomationItem,assertEmittedSpellItem,extractCleanRoomDocumentIdentity,extractCleanRoomPackaging} from '../src/index.mjs';
import {cleanRoomSpell,spellContract,spellLifetime,instant,graphFragment,publicAction,rule,trigger,selected,operation,dice,acceptance} from '../src/data/spell-automation/dsl.mjs';
// Original synthetic fixture, not copied from any spell or external pack.
const recipe=cleanRoomSpell({
  id:'arcane-training-pulse',
  contract:spellContract({ruleset:'2014',level:0,school:'evo',components:{verbal:true,somatic:false,material:false},lifetime:spellLifetime(instant())}),
  emission:{contentVersion:1},
  fragments:[graphFragment({id:'training-pulse',actions:[publicAction('cast','Training pulse')],rules:[rule({
    id:'pulse',on:trigger('action-used',{actionId:'cast'}),targets:[selected('target:cast',{min:1,max:1,range:25})],
    do:[operation('saving-throw',{id:'save',ability:['dex'],target:'target:cast',onSave:'none'}),operation('damage',{id:'damage',target:'target:cast',formula:dice(1,4),damageTypes:['force'],onSave:'none'})],
  })]})],
  accepted:acceptance('original synthetic compiler fixture',['Compile one test action; no live Foundry certification'],{status:'pending-runtime'}),
});
function content(description) {
  return {_id:'arcTraining00001',name:'Training pulse',type:'spell',img:'icons/svg/book.svg',system:{identifier:recipe.id,description:{value:description,chat:''},source:{rules:'2014',custom:'Original test fixture'}}};
}
function compile(item,definition=recipe) {
  const compilation=compileSpellAutomation(item,definition,{documentIdentity:extractCleanRoomDocumentIdentity(item),packaging:extractCleanRoomPackaging(item)});
  const emitted=emitSpellAutomationItem(item,compilation); assertEmittedSpellItem(emitted,compilation);
  return {compilation,emitted};
}
test('presentation changes preserve mechanics and input objects',()=>{
  const first=content('<p>Original training text.</p>'),before=structuredClone(first);
  const a=compile(first),b=compile({...content('<p>另一份自有测试描述。</p>'),img:'icons/svg/dice-target.svg'});
  assert.deepEqual(first,before);
  assert.equal(a.compilation.executionPlanHash,b.compilation.executionPlanHash);
  assert.notEqual(a.compilation.contentHash,b.compilation.contentHash);
  assert.deepEqual(a.emitted.system.activities,b.emitted.system.activities);
  assert.equal(b.emitted.system.description.value,'<p>另一份自有测试描述。</p>');
});
test('donor executable fields do not become clean-room mechanics',()=>{
  const original=content('<p>Original test content.</p>'),poisoned=structuredClone(original);
  poisoned.system.activities={unexpected:{type:'damage',damage:{parts:[['100d100','fire']]}}};
  poisoned.effects=[{_id:'unwanted',changes:[{key:'system.attributes.hp.value',value:'0'}]}];
  poisoned.flags={itemacro:{macro:{command:'throw new Error("untrusted donor")'}}};
  const a=compile(original),b=compile(poisoned);
  assert.equal(a.compilation.executionPlanHash,b.compilation.executionPlanHash);
  assert.deepEqual(a.emitted.system.activities,b.emitted.system.activities);
  assert.deepEqual(a.emitted.effects,b.emitted.effects);
  assert.equal(b.emitted.flags.itemacro,undefined);
});
test('a different identifier cannot accidentally receive this recipe',()=>{
  const item=content('Original'); item.system.identifier='another-test-item';
  assert.throws(()=>compile(item),/cannot compile Item/);
});

test('composition retains readable content and stable identity without mutating the source',()=>{
  const input=content('<p>Player-readable original test description.</p>');
  input.system.description.chat='<p>Original chat description.</p>';
  const before=structuredClone(input);
  const {item,compilation}=composeSpellItem(input,recipe);
  assert.deepEqual(input,before);
  assert.equal(item._id,input._id);
  assert.equal(item.name,input.name);
  assert.equal(item.img,input.img);
  assert.deepEqual(item.system.description,input.system.description);
  assert.deepEqual(item,compile(input).emitted);
  assertEmittedSpellItem(item,compilation);
});
