import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source=fs.readFileSync(new URL('../packages/auto2014-runtime/src/automation.js',import.meta.url),'utf8');
function harness(){
 const opened=[];
 const token={id:'light',actorLink:false,flags:{'arcane-dnd5e-2014-automation':{
  nativeSummon:{requestId:'request',sourceActorUuid:'Actor.source',profileId:'light-profile'},
 }}};
 const actor={isToken:true,token,flags:{'arcane-spells-2014':{carrier:{recipeId:'light-only',profileId:'light-profile'}}}};
 token.actor=actor;token.parent={tokens:new Map([[token.id,token]])};
 const context={MODULE_ID:'arcane-dnd5e-2014-automation',game:{user:{isGM:true}},
  foundry:{applications:{apps:{DocumentOwnershipConfig:class {
   constructor({document}){opened.push(document);}async render(force){assert.equal(force,true);}
  }}}},ui:{notifications:{warn(){}}}};
 vm.createContext(context);
 for(const name of ['nativeSummonProvenance','nativeLightCarrierOwnershipActor','addNativeLightCarrierOwnershipControl']){
  const start=source.indexOf(`function ${name}(`);assert(start>=0);
  vm.runInContext(source.slice(start,source.indexOf('\n}',start)+2),context);
 }
 return {context,actor,token,opened,sheet:{actor}};
}

test('GM light control opens native ownership for only the synthetic Actor and deduplicates the menu',async()=>{
 const h=harness(),controls=[];
 h.context.addNativeLightCarrierOwnershipControl(h.sheet,controls);
 h.context.addNativeLightCarrierOwnershipControl(h.sheet,controls);
 assert.equal(controls.length,1);assert.equal(controls[0].label,'Configure light control');
 await controls[0].onClick();assert.deepEqual(h.opened,[h.actor]);
 assert.equal(h.actor.ownership,undefined,'Opening the dialog must not assign permissions');
 assert(source.includes('Hooks.on("getHeaderControlsActorSheetV2", addNativeLightCarrierOwnershipControl);'));
});

test('ordinary players, base Actors, linked Tokens, stale Tokens and non-carriers have no control',()=>{
 for(const mutate of [h=>h.context.game.user.isGM=false,h=>h.actor.isToken=false,
  h=>h.token.actorLink=true,h=>h.token.parent.tokens.clear(),h=>h.token.actor={},
  h=>delete h.actor.flags['arcane-spells-2014'].carrier,
  h=>delete h.token.flags['arcane-dnd5e-2014-automation'].nativeSummon,
  h=>h.actor.flags['arcane-spells-2014'].carrier.profileId='other']){
  const h=harness();mutate(h);const controls=[];
  h.context.addNativeLightCarrierOwnershipControl(h.sheet,controls);assert.equal(controls.length,0);
 }
});

test('an already rendered control rechecks GM authority and Token lifetime before opening',async()=>{
 for(const mutate of [h=>h.context.game.user.isGM=false,h=>h.token.parent.tokens.clear(),h=>h.sheet.actor={}]){
  const h=harness(),controls=[];h.context.addNativeLightCarrierOwnershipControl(h.sheet,controls);
  mutate(h);await controls[0].onClick();assert.deepEqual(h.opened,[]);
 }
});
