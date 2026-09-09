import test from 'node:test';
import assert from 'node:assert/strict';
import {compileSpellPlan, composeSpellItem, assertEmittedSpellItem} from '@arcanedesk/spell-compiler';
import definition from '../src/spells/dancing-lights/definition.mjs';
import {createLightCarrierActor, createLightCarrierProvider, lightCarrierIdentity} from '../src/resources/light-carrier.mjs';

test('Dancing Lights compiles native noncombat carriers with no slot consumption',()=>{
 const plan=compileSpellPlan(definition);
 assert.equal(plan.contract.level,0);
 assert.equal(plan.contract.lifetime.concentration,true);
 assert.equal(plan.acceptance.status,'compiler-runtime-passed');
 assert.equal(plan.acceptance.source,'packages/spells-2014/README.md#cantrip-runtime-acceptance');
 const {item,compilation}=composeSpellItem({_id:'trainingLights01',name:'Original light fixture',type:'spell',
  system:{identifier:'dancing-lights',description:{value:'<p>Original test text.</p>'}},effects:[],flags:{}},definition);
 assertEmittedSpellItem(item,compilation);
 const actions=Object.values(item.system.activities);
 assert.equal(actions.length,1);
 assert.deepEqual(actions[0].profiles.map(p=>Number(p.count)),[4,1,2,3]);
 assert.equal(actions[0].flags['arcane-dnd5e-2014-automation'].nativeSummon.selection.defaultValue,'4');
 for(const action of actions){
  assert.equal(action.type,'summon');
  assert.equal(action.flags['arcane-dnd5e-2014-automation'].nativeSummon.combat,'none');
  assert.equal(action.consumption.spellSlot,false);
  assert.equal(action.flags['arcane-dnd5e-2014-automation'].nativeSummon.documentId,lightCarrierIdentity.documentId);
 }
});

test('installed carrier provider verifies actual documents before returning bindings',async()=>{
 let data=createLightCarrierActor();
 const game={modules:new Map([['arcane-spells-2014',{active:true}]]),packs:new Map([
  ['arcane-spells-2014.summons',{documentName:'Actor',getDocuments:async()=>[{id:data._id,toObject:()=>structuredClone(data)}]}],
 ])};
 const provider=createLightCarrierProvider({game});
 const requirements=[lightCarrierIdentity];
 assert.equal((await provider.verify(requirements)).valid,true);
 assert.equal((await provider.bindings())[lightCarrierIdentity.profileId].uuid,
  `Compendium.arcane-spells-2014.summons.Actor.${lightCarrierIdentity.documentId}`);
 for(const mutate of [
  d=>d.prototypeToken.light.dim=20,
  d=>d.prototypeToken.actorLink=true,
  d=>d.flags['arcane-spells-2014'].carrier.revision=2,
  d=>d.items.push({_id:'untrustedItem001'}),
 ]){
  data=createLightCarrierActor();mutate(data);
  assert.equal((await provider.verify(requirements)).valid,false);
  assert.deepEqual(await provider.bindings(),{});
 }
 data=createLightCarrierActor();
 assert.equal((await provider.verify([{...lightCarrierIdentity,profileId:'foreign'}])).valid,false);
 game.modules.get('arcane-spells-2014').active=false;
 assert.deepEqual(await provider.bindings(),{});
});

test('original light resource is independent, non-linked and has only dim illumination',()=>{
 const first=createLightCarrierActor();const second=createLightCarrierActor();
 assert.match(first._id,/^[A-Za-z0-9]{16}$/);
 assert.equal(first.prototypeToken.actorLink,false);
 assert.equal(first.prototypeToken.light.bright,0);
 assert.equal(first.prototypeToken.light.dim,10);
 assert.equal(first.prototypeToken.sight.enabled,false);
 assert.deepEqual(first.items,[]);assert.deepEqual(first.effects,[]);
 first.prototypeToken.light.dim=100;
 assert.equal(second.prototypeToken.light.dim,10);
 assert.equal(definition.fragments[0].rules[0].do.length,1);
});
