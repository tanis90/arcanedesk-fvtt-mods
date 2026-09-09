import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {composeSpellItem} from '@arcanedesk/spell-compiler';
import {spellAutomationSpecs} from '@arcanedesk/spells-2014';

const source=fs.readFileSync(new URL('../packages/auto2014-runtime/src/automation.js',import.meta.url),'utf8');
test('owned weapon growth passes separately flavored dice into the real child workflow and cleans its temporary bonus',async()=>{
  const context={Hooks:{on(){},once(){}},console,game:{time:{worldTime:0}},Set,Map};
  vm.createContext(context);
  vm.runInContext(source+'\nglobalThis.applyOwned = applyOwnedWeaponAttackFromUse;',context);
  for(const [level,count] of [[1,0],[5,1],[11,2],[17,3]]){
    const {item}=composeSpellItem({_id:'originalSpell001',name:'Original training spell',type:'spell',
      system:{identifier:'booming-bladetce',source:{rules:'2014'},description:{value:'Original fixture.'}}},spellAutomationSpecs['booming-bladetce']);
    item.uuid='Actor.original.Item.originalSpell001';
    const created=[],removed=[];
    const actor={uuid:'Actor.original',items:[],effects:[],system:{cantripLevel:()=>level},
      async createEmbeddedDocuments(type,data){assert.equal(type,'ActiveEffect');created.push(...data);
        return data.map((d,index)=>({...d,id:'bonus'+index,parent:actor}));},
      async deleteEmbeddedDocuments(type,ids){assert.equal(type,'ActiveEffect');removed.push(...ids);}};
    item.actor=actor;
    const cast=Object.values(item.system.activities)[0];
    const weapon={id:'originalWeapon',uuid:'Actor.original.Item.originalWeapon',type:'weapon',name:'Original weapon',
      system:{equipped:true,activities:[{id:'originalAttack',type:'attack',attack:{type:{classification:'weapon',value:'melee'}}}]}};
    actor.items.push(weapon);
    const target={uuid:'Scene.original.Token.target',actor:{uuid:'Actor.target'}};
    let calls=0;
    context.MidiQOL={completeItemUse:async(used,config)=>{
      calls++;assert.equal(used,weapon);assert.equal(config.midiOptions.activityId,'originalAttack');
      assert.equal(created.length,count?1:0);
      if(count){
        const formula=created[0].changes[0].value;
        const terms=formula.split('+');assert.equal(terms.length,count);
        assert(terms.every(term=>/^1d8\[thunder\]$/.test(term)),formula);
        assert(!formula.includes('2d8'),'Critical expansion belongs to the native workflow');
      }
      return {aborted:true};
    }};
    await context.applyOwned(item,{}, {uuid:'Workflow.original'+level,actor,activity:cast,targets:new Set([target])});
    assert.equal(calls,1);assert.equal(removed.length,count?1:0);
  }
});
