import test from 'node:test';
import assert from 'node:assert/strict';
import {createAdvancementTools} from '../src/advancement.mjs';
const rewriteUuid=uuid=>uuid.replace('Compendium.original.items.','Compendium.prepared.items.');
const grant=(level,id)=>({_id:`grant${level}`,type:'ItemGrant',level,configuration:{optional:true,spell:{original:true},items:[{uuid:`Compendium.original.items.Item.${id}`} ]}});

test('shared progression preserves selected grants through level 20 and caller content',()=>{
  const tools=createAdvancementTools({rewriteUuid});
  const progression=Array.from({length:20},(_,i)=>grant(i+1,`original${i+1}`));
  const before=structuredClone(progression);
  const doc={name:'Original training class',system:{description:{value:'Original class description'},startingEquipment:['original'],advancement:progression}};
  const allowedIds=new Set(Array.from({length:20},(_,i)=>`original${i+1}`));
  tools.filterClassAdvancement(doc,{levelCap:20,allowedIds});
  assert.equal(doc.system.advancement.length,20);
  assert.deepEqual(progression,before);
  assert.equal(doc.system.description.value,'Original class description');
  assert.deepEqual(doc.system.startingEquipment,[]);
  for(const [i,a] of doc.system.advancement.entries()){
    assert.equal(a._id,`grant${i+1}`);assert.equal(a.configuration.optional,false);assert.equal(a.configuration.spell,null);
    assert.equal(a.configuration.items[0].uuid,`Compendium.prepared.items.Item.original${i+1}`);
  }
  const subclass={system:{advancement:before}};
  tools.filterSubclassAdvancement(subclass,{levelCap:6,allowedIds:new Set(['original1','original6','original20'])});
  assert.deepEqual(subclass.system.advancement.map(a=>a.level),[1,6]);
});

test('collection uses explicit exclusion policy, optional overrides and choice levels',()=>{
  const excluded=new Set(['excluded']);const tools=createAdvancementTools({rewriteUuid,excludedFeatureIds:excluded});excluded.clear();
  const doc={system:{advancement:[grant(1,'excluded'),grant(7,'later'),{type:'ItemChoice',configuration:{choices:{3:{count:1}},pool:[{uuid:'Compendium.original.items.Item.choice'}]}}]}};
  assert.deepEqual([...tools.collectAdvancementItemIds(doc,6)],[]);
  assert.deepEqual([...tools.collectAdvancementItemIds(doc,6,new Set(['excluded']))],['excluded']);
  assert.deepEqual([...tools.collectAdvancementItemChoicePoolIds(doc,2)],[]);
  assert.deepEqual([...tools.collectAdvancementItemChoicePoolIds(doc,6)],['choice']);
});

test('class and subclass policies retain their existing distinct advancement types',()=>{
  const tools=createAdvancementTools({rewriteUuid});
  const types=['HitPoints','AbilityScoreImprovement','Trait','ItemChoice','ScaleValue','Subclass','Unknown'];
  const doc={system:{advancement:types.map(type=>({type,level:1,configuration:{}}))}};
  const sub=structuredClone(doc);tools.filterClassAdvancement(doc,{levelCap:20,allowedIds:new Set()});tools.filterSubclassAdvancement(sub,{levelCap:20,allowedIds:new Set()});
  assert.deepEqual(doc.system.advancement.map(a=>a.type),types.slice(0,6));
  assert.deepEqual(sub.system.advancement.map(a=>a.type),['Trait','ItemChoice','ScaleValue']);
  const limits={system:{advancement:[{type:'ScaleValue',title:'Original title',configuration:{identifier:'spells-known'}}]}};
  tools.normalizeActorStudioSpellLimitAdvancements(limits);assert.equal(limits.system.advancement[0].title,'Spells Known');
  assert.throws(()=>createAdvancementTools({}),/mapper/);
});

test('explicit grant profiles keep complete progression and avoid duplicate grants',()=>{
  const tools=createAdvancementTools({rewriteUuid,uuidFor:(pack,id)=>`Compendium.prepared.${pack}.Item.${id}`});
  const original=grant(3,'original3');
  const doc={system:{description:{value:'Original subclass prose'},advancement:[original,grant(10,'excluded'),{type:'Trait',level:1,configuration:{original:true}},{type:'ItemChoice',level:1,configuration:{}}]}};
  const profile={levelCap:6,allowedFeatureIds:['original3'],grants:[
    {id:'newGrant3',level:3,title:'Original early grant',itemIds:['original3']},
    {id:'newGrant20',level:20,title:'Original final grant',itemIds:['original20'],packName:'spells'}
  ]};const before=structuredClone(profile);
  tools.applyGrantProfile(doc,profile);
  assert.deepEqual(doc.system.advancement.map(a=>a._id??a.type),['grant3','Trait','newGrant20']);
  assert.equal(doc.system.advancement[2].configuration.items[0].uuid,'Compendium.prepared.spells.Item.original20');
  assert.equal(doc.system.description.value,'Original subclass prose');assert.deepEqual(profile,before);
  const once=structuredClone(doc);tools.applyGrantProfile(doc,profile);assert.deepEqual(doc,once);
  assert.equal(original.configuration.optional,true);
  assert.throws(()=>tools.applyGrantProfile(doc,{levelCap:6}),/Invalid grant profile/);assert.deepEqual(doc,once);
  assert.throws(()=>createAdvancementTools({rewriteUuid}).applyGrantProfile(doc,profile),/reference builder/);assert.deepEqual(doc,once);
});
