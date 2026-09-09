import test from 'node:test';
import assert from 'node:assert/strict';
import {compileSpellPlan, composeSpellItem, assertEmittedSpellItem} from '@arcanedesk/spell-compiler';
import {cleanRoomSpell,cleanRoomSummonedEntity,spellContract,concentration,duration,
 graphFragment,publicAction,rule,trigger,self,consume,operation,acceptance,
 enumParameter,parameterValue} from '@arcanedesk/spell-compiler/dsl';

function fixture({combat,mode='fixed-four',count=4}={}){
 return cleanRoomSpell({id:'training-light-carrier',
  contract:spellContract({ruleset:'2014',level:0,school:'evo',components:{verbal:true,somatic:true,material:false},lifetime:concentration(duration(1,'minutes'))}),
  emission:{contentVersion:1},
  support:{level:'simplified',omissions:['Placement and layout are manually confirmed for this original fixture.']},
  fragments:[graphFragment({id:'training-carriers',actions:[publicAction('cast','Place training carriers')],
   artifacts:[cleanRoomSummonedEntity('carrier',{combat,pool:{poolId:'training',choices:[{
    choice:'carrier',label:'Training carrier',profileId:'training-carrier',revision:1,
    documentId:'trainingCarrier1',recipeId:'training-empty',mode,count,
   }]},cleanup:{expiry:'concentration-effect',fallback:'dm'}})],
   rules:[rule({id:'place-carriers',on:trigger('action-used',{actionId:'cast'}),targets:[self('target:cast')],
    do:[operation('create-artifact',{id:'create-carriers',artifactId:'carrier',target:'source'})]})],
  })],accepted:acceptance('Original test fixture',[],{status:'pending-runtime'})});
}
const content={_id:'trainingSpell001',name:'Training light carrier',type:'spell',img:'icons/svg/light.svg',
 system:{identifier:'training-light-carrier',description:{value:'<p>Original test fixture.</p>'}},effects:[],flags:{}};

test('noncombat four-carrier entity compiles and emits a closed native placement contract',()=>{
 const definition=fixture({combat:'none'});
 const plan=compileSpellPlan(definition);
 assert.equal(plan.projection.actions.length,1);
 const {item:emitted,compilation}=composeSpellItem(content,definition);
 assertEmittedSpellItem(emitted,compilation);
 const activity=Object.values(emitted.system.activities)[0];
 assert.equal(activity.type,'summon');
 assert.equal(activity.profiles[0].count,'4');
 assert.equal(activity.flags['arcane-dnd5e-2014-automation'].nativeSummon.combat,'none');
 assert.equal(activity.flags['arcane-dnd5e-2014-automation'].nativeSummon.expectedCount,4);
});

test('legacy default preserves marker shape and rejects unsupported combat/count pairs',()=>{
 const legacy=composeSpellItem(content,fixture({mode:'single',count:1})).item;
 assert.equal(Object.values(legacy.system.activities)[0].flags['arcane-dnd5e-2014-automation'].nativeSummon.combat,undefined);
 for(const options of [{combat:'shared'},{combat:false},{combat:'none',count:3},{combat:'none',mode:'single',count:4},{combat:'none',count:0}]){
  assert.throws(()=>compileSpellPlan(fixture(options)));
 }
});

test('cantrip summons never consume slots; leveled summons still require consumption',()=>{
 const cantrip=fixture({combat:'none'});
 cantrip.fragments[0].rules[0].do.unshift(consume());
 assert.throws(()=>compileSpellPlan(cantrip),/level-0.*consume/);
 const leveled=fixture({mode:'single',count:1});
 leveled.contract.level=1;
 assert.throws(()=>compileSpellPlan(leveled),/consumption/);
 leveled.fragments[0].rules[0].do.unshift(consume());
 assert.doesNotThrow(()=>compileSpellPlan(leveled));
});

function selectionFixture(defaultValue = '4') {
 const definition = fixture({combat:'none'});
 const graph = definition.fragments[0];
 const choices = ['4','1','2','3'];
 graph.actions[0].parameters = [enumParameter('count',choices,{
  labels:Object.fromEntries(choices.map(value=>[value,`Training count ${value}`])), defaultValue,
 })];
 graph.artifacts = [cleanRoomSummonedEntity('carrier',{
  combat:'none',selection:parameterValue('count'),
  pool:{poolId:'training',choices:choices.map(value=>({
   choice:value,label:`Training count ${value}`,profileId:'training-carrier',revision:1,
   documentId:'trainingCarrier1',recipeId:'training-empty',
   mode:({1:'single',2:'fixed-small',3:'fixed-three',4:'fixed-four'})[value],count:Number(value),
  }))},cleanup:{expiry:'concentration-effect',fallback:'dm'},
 })];
 return definition;
}

test('default entity selection preserves one action and every profile in the plan',()=>{
 const plan = compileSpellPlan(selectionFixture());
 assert.equal(plan.projection.actions.length,1);
 const action = plan.projection.actions[0];
 assert.equal(action.semanticId,'cast');
 assert.deepEqual(action.bindings,{});
 assert.deepEqual(action.requiredSelections,[{
  id:'count',type:'enum',required:false,defaultValue:'4',
  values:['4','1','2','3'].map(value=>({value,label:`Training count ${value}`})),
 }]);
 assert.deepEqual(action.artifacts[0].state.cardinality,{type:'profile-choice'});
 assert.deepEqual(action.artifacts[0].state.profiles.map(p=>p.cardinality.count),[4,1,2,3]);
 const {item,compilation}=composeSpellItem(content,selectionFixture());
 assertEmittedSpellItem(item,compilation);
 const activities=Object.values(item.system.activities);
 assert.equal(activities.length,1);
 const activity=activities[0];
 assert.deepEqual(activity.profiles.map(profile=>profile.count),['4','1','2','3']);
 assert.equal(activity.consumption.spellSlot,false);
 const marker=activity.flags['arcane-dnd5e-2014-automation'].nativeSummon;
 assert.equal(marker.expectedCount,4);
 assert.equal(marker.selection.defaultValue,'4');
 assert.equal(marker.selection.id,'count');
 assert.deepEqual(marker.selection.choices.map(choice=>choice.nativeProfileId),activity.profiles.map(profile=>profile._id));
 assert.deepEqual(marker.selection.choices.map(choice=>choice.expectedCount),[4,1,2,3]);
 const otherDefault=composeSpellItem(content,selectionFixture('2')).item;
 assert.deepEqual(Object.values(otherDefault.system.activities)[0].profiles.map(profile=>profile.count),['2','4','1','3']);
});

test('summon projection validation rejects altered choices, defaults and native profiles',()=>{
 const {item,compilation}=composeSpellItem(content,selectionFixture());
 for(const mutate of [
  a=>a.profiles.pop(),
  a=>a.profiles.reverse(),
  a=>a.profiles[1].count='4',
  a=>a.profiles[1]._id=a.profiles[0]._id,
  a=>a.profiles[1].uuid='Compendium.foreign.summons.Actor.trainingCarrier1',
  a=>a.profiles[1].level.min=5,
  a=>a.flags['arcane-dnd5e-2014-automation'].nativeSummon.selection.defaultValue='1',
  a=>a.flags['arcane-dnd5e-2014-automation'].nativeSummon.selection.choices[1].expectedCount=4,
  a=>a.flags['arcane-dnd5e-2014-automation'].nativeSummon.selection.choices[1].nativeProfileId='foreign',
  a=>a.flags['arcane-dnd5e-2014-automation'].nativeSummon.selection.version=2,
 ]){
  const altered=structuredClone(item);
  mutate(Object.values(altered.system.activities)[0]);
  assert.throws(()=>assertEmittedSpellItem(altered,compilation));
 }
});

test('default selection rejects invalid defaults, wrong owner and unsupported consumers',()=>{
 for(const value of ['0','5',4,null]) assert.throws(()=>compileSpellPlan(selectionFixture(value)),/defaultValue/);
 const missing = selectionFixture();
 delete missing.fragments[0].actions[0].parameters[0].defaultValue;
 assert.throws(()=>compileSpellPlan(missing),/defaultValue/);
 const wrongOwner = selectionFixture();
 wrongOwner.fragments[0].actions.push(publicAction('other','Other action',{
  parameters:[enumParameter('extra',['x'],{defaultValue:'x'})],
 }));
 wrongOwner.fragments[0].rules.push(rule({id:'other-rule',on:trigger('action-used',{actionId:'other'}),
  targets:[self('target:other')],do:[],
 }));
 assert.throws(()=>compileSpellPlan(wrongOwner),/entity creator/);
 const noEntity = selectionFixture();
 noEntity.fragments[0].artifacts=[];
 noEntity.fragments[0].rules[0].do=[];
 assert.throws(()=>compileSpellPlan(noEntity),/requires one native summon entity/);
 const legacy = selectionFixture();
 const parameter = legacy.fragments[0].actions[0].parameters[0];
 parameter.lowering='named-actions';
 assert.throws(()=>compileSpellPlan(legacy),/defaultValue/);
 delete parameter.defaultValue;
 const plan=compileSpellPlan(legacy);
 assert.equal(plan.projection.actions.length,4);
 assert.ok(plan.projection.actions.every(action=>action.requiredSelections.length===0));
 assert.doesNotThrow(()=>composeSpellItem(content,legacy));
});
