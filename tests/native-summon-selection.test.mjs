import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {composeSpellItem} from '@arcanedesk/spell-compiler';
import definition from '../packages/spells-2014/src/spells/dancing-lights/definition.mjs';
import {createLightCarrierActor} from '../packages/spells-2014/src/resources/light-carrier.mjs';

const source=fs.readFileSync(new URL('../packages/auto2014-runtime/src/automation.js',import.meta.url),'utf8');
const moduleId='arcane-dnd5e-2014-automation';
function extract(name){
 const start=source.indexOf(`function ${name}(`);
 assert(start>=0,name);
 return source.slice(source.slice(start-6,start)==='async '?start-6:start,source.indexOf('\n}',start)+2);
}
function harness(){
 const {item}=composeSpellItem({_id:'trainingLights01',name:'Original light fixture',type:'spell',
  system:{identifier:'dancing-lights',description:{value:'Original fixture.'}},effects:[],flags:{}},definition);
 const activity=Object.values(item.system.activities)[0];
 const token={uuid:'Scene.training.Token.source',parent:{uuid:'Scene.training'}};
 Object.assign(activity,{id:activity._id,uuid:'Actor.training.Item.light.Activity.cast',
  actor:{uuid:'Actor.training'},item:{uuid:'Actor.training.Item.light'},getUsageToken:()=>token});
 let id=0;
 const records=new Map();
 const context={MODULE_ID:moduleId,NATIVE_SUMMON_CONTROL_VERSION:1,
  NATIVE_SUMMON_MARKER_KEYS:['provider','humanStep','artifactId','choice','profileId','revision','documentId','expectedCount','cleanup','uniqueness'],
  NATIVE_SUMMON_INVOCATIONS:records,
  foundry:{utils:{deepClone:structuredClone,randomID:()=>`training${++id}`,
   setProperty(object,path,value){const keys=path.split('.');const last=keys.pop();for(const key of keys)object=object[key]??={};object[last]=value;},
  }},
  game:{user:{isGM:true},time:{worldTime:0}},canvas:{scene:{uuid:'Scene.training'}},
  ui:{notifications:{warn(){}}},nativeSummonSourceToken:()=>token,
  nativeSummonTokenDocument:value=>value,nativeSummonProvenance:()=>null,
  nativeSummonUniqueActiveOwner:()=> 'player',
  // These tests isolate selection timing. Resource checks use the real helper below.
  assertNativeSummonResourceCheck:()=>true,
  nativeSummonPreparedProvenance:(record,index)=>({choice:record.contract.marker.choice,memberIndex:index}),
 };
 vm.createContext(context);
 vm.runInContext([
  'nativeSummonContract','assertNativeSummonInvocationContract','nativeSummonUseContract',
  'compilerRuntimeSelections','preflightRequiredCompilerSelections',
  'nativeSummonRequestId','nativeSummonSequenceId','nativeSummonActivityUuid',
  'pruneNativeSummonInvocations','prepareNativeSummonUse','guardNativeSummonPlacement',
  'prepareNativeSummonTokenData',
  'finalizeNativeSummonSelection',
 ].map(extract).join('\n'),context);
 return {activity,context,records};
}

function resourceHarness(){
 const result=harness();const {context:c,activity}=result;
 c.NATIVE_SUMMON_RESOURCE_CHECKS=new Map();
 const documents=new Map();
 for(const profile of activity.profiles){
  const data=createLightCarrierActor();
  documents.set(profile.uuid,{documentName:'Actor',id:data._id,uuid:profile.uuid,toObject:()=>data});
 }
 c.fromUuid=async uuid=>documents.get(uuid);
 vm.runInContext(['nativeSummonResourceSignature','assertNativeSummonResourceDocument',
  'prepareNativeSummonResourceCheck','assertNativeSummonResourceCheck'].map(extract).join('\n'),c);
 return {...result,documents};
}

test('resource preflight awaits Actor resolution before allowing the synchronous use gate',async()=>{
 const {context:c,activity,documents}=resourceHarness();const usage={};let resolve;
 c.fromUuid=()=>new Promise(r=>{resolve=r;});
 const pending=c.prepareNativeSummonResourceCheck(activity,usage);
 assert.throws(()=>c.assertNativeSummonResourceCheck(activity,usage),/missing/);
 resolve(documents.values().next().value);await pending;
 c.assertNativeSummonResourceCheck(activity,structuredClone(usage));
});

test('missing pack/document, wrong Actor identity and malformed carrier reject without invocation writes',async()=>{
 for(const mutate of [
  h=>{h.context.fromUuid=async()=>{throw Error('Missing pack');};},
  h=>h.documents.clear(),
  h=>{h.documents.values().next().value.documentName='Item';},
  h=>{h.documents.values().next().value.id='wrong';},
  h=>{h.documents.values().next().value.toObject().prototypeToken.light.dim=0;},
  h=>{h.documents.values().next().value.toObject().items.push({_id:'unexpected'});},
  h=>{h.documents.values().next().value.toObject().flags['arcane-spells-2014'].carrier.revision=2;},
 ]){
  const h=resourceHarness();mutate(h);const usage={create:{summons:true}};
  await h.context.prepareNativeSummonResourceCheck(h.activity,usage);
  assert.throws(()=>h.context.prepareNativeSummonUse(h.activity,usage));
  assert.equal(h.records.size,0);
  assert.equal(usage.summons,undefined);
 }
});

test('resource proof cannot be absent, borrowed, expired, or survive resource and mapping drift',async()=>{
 const {context:c,activity,documents}=resourceHarness();const usage={};
 assert.throws(()=>c.assertNativeSummonResourceCheck(activity,usage));
 await c.prepareNativeSummonResourceCheck(activity,usage);
 c.assertNativeSummonResourceCheck(activity,usage);
 const originalUuid=activity.item.uuid;activity.item.uuid='Actor.other.Item.light';
 assert.throws(()=>c.assertNativeSummonResourceCheck(activity,usage));activity.item.uuid=originalUuid;
 const data=documents.values().next().value.toObject();data.prototypeToken.sight.enabled=true;
 assert.throws(()=>c.assertNativeSummonResourceCheck(activity,usage));data.prototypeToken.sight.enabled=false;
 c.NATIVE_SUMMON_RESOURCE_CHECKS.get(usage.arcaneNativeResourceCheckId).createdAt=0;
 assert.throws(()=>c.assertNativeSummonResourceCheck(activity,usage));
});

test('runtime resolves defaults, every native profile and typed selections without changing the Item',()=>{
 const {activity,context:c}=harness();
 const before=JSON.stringify(activity);
 assert.equal(c.nativeSummonUseContract(activity,{}).expectedCount,4);
 for(const count of [1,2,3,4]){
  const profile=activity.profiles.find(p=>p.count===String(count));
  for(const config of [{summons:{profile:profile._id}},{arcaneSelections:{'light-count':String(count)}},
   {midiOptions:{workflowOptions:{arcaneSelections:{'light-count':String(count)}}},summons:{profile:profile._id}}]){
   const contract=c.nativeSummonUseContract(activity,config);
   assert.equal(contract.expectedCount,count);
   assert.equal(contract.marker.expectedCount,count);
   assert.equal(contract.marker.choice,String(count));
   assert.equal(contract.nativeProfileId,profile._id);
  }
 }
 assert.equal(JSON.stringify(activity),before);
 for(const config of [
  {arcaneSelections:{'light-count':'0'}},{arcaneSelections:{'light-count':2}},
  {arcaneSelections:{'light-count':undefined}},{arcaneSelections:{foreign:'2'}},
  {summons:{profile:'foreign'}},
  {arcaneSelections:{'light-count':'2'},summons:{profile:activity.profiles[0]._id}},
 ]) assert.throws(()=>c.nativeSummonUseContract(activity,config));
});

test('runtime rejects malformed mapping and missing or changed native profiles',()=>{
 for(const mutate of [
  a=>a.profiles.pop(),a=>a.profiles[1].count='4',a=>a.profiles.reverse(),
  a=>a.profiles[1].uuid='Actor.other',
  a=>a.profiles[1].uuid='Compendium.foreign.summons.Actor.arcaneLight00001',
  a=>a.flags[moduleId].nativeSummon.selection.choices[1].nativeProfileId='foreign',
  a=>a.flags[moduleId].nativeSummon.selection.choices[1].value='4',
  a=>a.flags[moduleId].nativeSummon.selection.choices[1].expectedCount=6,
  a=>a.flags[moduleId].nativeSummon.selection.defaultValue='2',
  a=>a.flags[moduleId].nativeSummon.selection.version=2,
  a=>a.flags[moduleId].nativeSummon.selection.extra=true,
 ]){
  const {activity,context:c}=harness();mutate(activity);
  assert.throws(()=>c.nativeSummonContract(activity));
 }
});

test('selected count is frozen through placement and token preparation; drift never adds another member',()=>{
 for(const count of [1,2,3,4]){
  const {activity,context:c,records}=harness();
  const config={create:{summons:true},arcaneSelections:{'light-count':String(count)}};
  assert.equal(c.prepareNativeSummonUse(activity,config),true);
  const profile=activity.profiles.find(p=>p._id===config.summons.profile);
  const record=records.get(config.summons.arcaneNativeRequestId);
  assert.equal(record.contract.expectedCount,count);
  assert.equal(record.combatUuid,null);
  assert.equal(c.guardNativeSummonPlacement(activity,profile,config.summons),true);
  const other=activity.profiles.find(p=>p._id!==profile._id);
  assert.throws(()=>c.guardNativeSummonPlacement(activity,other,config.summons),/drifted/);
  for(let index=0;index<count;index++){
   const data={actorLink:false};
   c.prepareNativeSummonTokenData(activity,profile,data,config.summons);
   assert.equal(data.flags[moduleId].nativeSummon.choice,String(count));
   assert.equal(data.delta.ownership.player,3);
  }
  assert.throws(()=>c.prepareNativeSummonTokenData(activity,profile,{actorLink:false},config.summons),/more Token/);
  assert.equal(record.preparedCount,count);
 }
 const {activity,context:c,records}=harness();
 const config={create:{summons:true},arcaneSelections:{'light-count':'9'}};
 assert.throws(()=>c.prepareNativeSummonUse(activity,config),/invalid typed/);
 assert.equal(records.size,0);
 assert.equal(config.summons,undefined);
});

test('selection preflight permits a declared default but keeps required and invalid values strict',()=>{
 const {activity,context:c}=harness();
 assert.equal(c.preflightRequiredCompilerSelections({},activity,{}),null);
 assert.equal(c.preflightRequiredCompilerSelections({},activity,{workflowOptions:{arcaneSelections:{'light-count':'2'}}}),null);
 assert.ok(c.preflightRequiredCompilerSelections({},activity,{workflowOptions:{arcaneSelections:{'light-count':'9'}}}));
 activity.flags[moduleId].interaction.requiredSelections[0].required=true;
 assert.ok(c.preflightRequiredCompilerSelections({},activity,{}));
});

test('native dialog selection is finalized once at consumption, before placement',()=>{
 for(const count of [1,2,3,4]){
  const {activity,context:c,records}=harness();
  const config={create:{summons:true},summons:{profile:activity.profiles[0]._id}};
  c.prepareNativeSummonUse(activity,config,{configure:true});
  const record=records.get(config.summons.arcaneNativeRequestId);
  assert.equal(record.contract.expectedCount,4);
  const profile=activity.profiles.find(p=>p.count===String(count));
  config.summons.profile=profile._id;
  assert.equal(c.finalizeNativeSummonSelection(activity,config),true);
  assert.equal(record.contract.expectedCount,count);
  assert.equal(c.finalizeNativeSummonSelection(activity,config),true);
  assert.equal(c.guardNativeSummonPlacement(activity,profile,config.summons),true);
  config.summons.profile=activity.profiles.find(p=>p._id!==profile._id)._id;
  assert.throws(()=>c.finalizeNativeSummonSelection(activity,config),/drifted/);
 }
});

test('consumption rejects typed-choice, identity, mapping and post-use drift',()=>{
 for(const mutate of [
  (a,c,r)=>{c.summons.profile='foreign';},
  (a,c,r)=>{a.profiles[1].count='4';},
  (a,c,r)=>{a.actor.uuid='Actor.foreign';},
  (a,c,r)=>{c.summons.arcaneNativeRequestId='foreign';},
  (a,c,r)=>{r.preparedCount=1;},
  (a,c,r)=>{r.postUseSeen=true;},
 ]){
  const {activity,context:c,records}=harness();const config={create:{summons:true}};
  c.prepareNativeSummonUse(activity,config,{configure:true});const record=records.get(config.summons.arcaneNativeRequestId);
  const before=JSON.stringify(record.contract);mutate(activity,config,record);
  assert.throws(()=>c.finalizeNativeSummonSelection(activity,config));
  assert.equal(JSON.stringify(record.contract),before);
 }
 const {activity,context:c,records}=harness();
 const config={create:{summons:true},arcaneSelections:{'light-count':'2'}};
 c.prepareNativeSummonUse(activity,config);
 const record=records.get(config.summons.arcaneNativeRequestId);
 config.arcaneSelections['light-count']='1';config.summons.profile=activity.profiles.find(p=>p.count==='1')._id;
 assert.throws(()=>c.finalizeNativeSummonSelection(activity,config),/drifted/);
 assert.equal(record.contract.expectedCount,2);
});
