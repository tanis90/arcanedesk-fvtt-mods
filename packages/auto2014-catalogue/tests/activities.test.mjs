import test from 'node:test';
import assert from 'node:assert/strict';
import {createActivityTools} from '../src/activities.mjs';
const tools=()=>createActivityTools({moduleId:'original-module',spellAutomationProfiles:{version:1,defaults:{templateTargetsByActivityType:{save:'workflow'}}}});

test('interaction input follows activity overrides before item targeting',()=>{
  const api=tools();const doc={system:{range:{units:'self'},target:{template:{type:'radius'},affects:{type:'self'}}}};
  assert.equal(api.inferSpellActivityInput(doc,{type:'save'}),'self');
  const activity={type:'save',range:{override:true,units:'ft'},target:{override:true,template:{type:'cone'},affects:{type:'enemy'}}};
  assert.equal(api.inferSpellActivityInput(doc,activity),'placed-template');
  activity.target.template.type='';assert.equal(api.inferSpellActivityInput(doc,activity),'selected-targets');
  assert.equal(api.inferSpellActivityInput({system:{}},{type:'utility'}),'none');
});

test('profile policy produces interaction contracts without changing caller policy or prose',()=>{
  const profiles={version:2,defaults:{templateTargetsByActivityType:{save:'workflow'},autoTargetType:'any'},spells:{original:{activities:{declared:{templateTargets:'self',autoTargetType:'ally'}}}}};
  const api=createActivityTools({moduleId:'original-module',spellAutomationProfiles:profiles});
  profiles.defaults.autoTargetType='changed-after-factory';
  const doc={system:{identifier:'original',description:{value:'Original complete description'},range:{units:'ft'},target:{template:{type:'sphere'}}}};
  const activities=[{_id:'fallback',type:'save'},{_id:'declared',type:'save'},{_id:'automatic',type:'save',midiProperties:{automationOnly:true}},{_id:'direct',type:'attack',target:{override:true,affects:{type:'enemy'}}}];
  api.normalizeSpellInteractionContracts(doc,activities);
  assert.equal(activities[0].flags['original-module'].interaction.templateTargets,'workflow');
  assert.equal(activities[0].midiProperties.autoTargetAction,'always');assert.equal(activities[0].midiProperties.autoTargetType,'any');
  assert.equal(activities[1].flags['original-module'].interaction.templateTargets,'self');assert.equal(activities[1].midiProperties.autoTargetType,'ally');
  assert.equal(activities[2].target.prompt,false);assert.equal(activities[2].flags['original-module'].interaction.templateTargets,'none');
  assert.equal(activities[3].target.prompt,false);assert(!Object.hasOwn(activities[3].flags['original-module'].interaction,'templateTargets'));
  assert.equal(doc.system.description.value,'Original complete description');assert.equal(doc.flags['original-module'].spellAutomation.version,2);
});

test('self-use and creature targeting retain explicit resource and dialog policies',()=>{
  const api=tools(),activity={target:{affects:{original:'preserved'}},consumption:{scaling:{allowed:true,max:'2'}}};
  api.normalizeSelfItemUseActivity(activity);
  assert.equal(activity.target.affects.original,'preserved');assert.equal(activity.target.affects.type,'self');assert.equal(activity.target.template.type,'');
  assert.equal(activity.consumption.targets[0].type,'itemUses');assert.equal(activity.consumption.targets[0].value,'1');
  assert.equal(activity.consumption.spellSlot,true);assert.equal(activity.consumption.scaling.max,'2');assert.equal(activity.midiProperties.forceRollDialog,'never');
  api.setActivityCreatureTargets(activity,'3');assert.equal(activity.target.affects.count,'3');assert.equal(activity.target.affects.type,'creature');
  assert.throws(()=>createActivityTools({moduleId:'original'}),/profiles/);
});
