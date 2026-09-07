import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {ClassicLevel} from 'classic-level';
import {encodeCompendium,writeCompendium,writeModule} from '../src/index.mjs';

async function temporary(run){
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'arcane-pack-test-'));
  try{await run(root);}finally{assert.equal(path.dirname(root),os.tmpdir());await fs.rm(root,{recursive:true,force:true});}
}
async function read(directory){
  const db=new ClassicLevel(directory,{valueEncoding:'utf8',createIfMissing:false});
  try{await db.open();return Object.fromEntries(await db.iterator().all());}finally{await db.close();}
}
const effect={_id:'effect01',name:'Original fixture effect',changes:[]};
const item={_id:'item01',name:'Original fixture item',type:'spell',system:{description:{value:'<p>Original caller description.</p>'}},effects:[effect]};
const actor={_id:'actor01',name:'Original fixture actor',type:'npc',items:[item],effects:[{...effect,_id:'actorEffect'}]};
const journal={_id:'journal01',name:'Original fixture journal',pages:[{_id:'page01',type:'text',text:{content:'Original journal content'}}]};

test('Item, Actor and JournalEntry packs preserve documents, embedded identities and caller input',()=>temporary(async root=>{
  const before=structuredClone({item,actor,journal});
  for(const [type,document]of [['Item',item],['Actor',actor],['JournalEntry',journal]]){
    const directory=path.join(root,type);
    const result=await writeCompendium(directory,type,[document]);
    const records=await read(directory);
    assert.equal(Object.keys(records).length,result.records);
    if(type==='Item'){
      assert.deepEqual(JSON.parse(records['!items!item01']),{...item,effects:['effect01']});
      assert.deepEqual(JSON.parse(records['!items.effects!item01.effect01']),effect);
    }else if(type==='Actor'){
      assert.deepEqual(JSON.parse(records['!actors!actor01']),{...actor,items:['item01'],effects:['actorEffect']});
      assert.deepEqual(JSON.parse(records['!actors.items!actor01.item01']),{...item,effects:['effect01']});
      assert.deepEqual(JSON.parse(records['!actors.items.effects!actor01.item01.effect01']),effect);
    }else{
      assert.deepEqual(JSON.parse(records['!journal!journal01']),{...journal,pages:['page01']});
      assert.deepEqual(JSON.parse(records['!journal.pages!journal01.page01']),journal.pages[0]);
    }
    assert((await fs.readdir(directory)).some(file=>/\.(ldb|sst)$/.test(file)),'pack must have compacted tables');
  }
  assert.deepEqual({item,actor,journal},before);
}));

test('malformed or duplicate records fail before creating output',()=>temporary(async root=>{
  const directory=path.join(root,'invalid');
  await assert.rejects(writeCompendium(directory,'Item',[item,item]),/Duplicate/);
  assert.throws(()=>encodeCompendium('Item',[{...item,_id:'bad.id'}]),/storage-safe/);
  assert.throws(()=>encodeCompendium('Item',[{...item,effects:[effect,effect]}]),/Duplicate/);
  assert.throws(()=>encodeCompendium('Unknown',[]),/Unsupported/);
  await assert.rejects(fs.stat(directory),{code:'ENOENT'});
}));

test('existing pack or unrelated files are not overwritten',()=>temporary(async root=>{
  const directory=path.join(root,'pack');
  await writeCompendium(directory,'Item',[item]);
  await assert.rejects(writeCompendium(directory,'Item',[]),/empty/);
  assert.equal(JSON.parse((await read(directory))['!items!item01']).name,item.name);
  const occupied=path.join(root,'occupied');await fs.mkdir(occupied);await fs.writeFile(path.join(occupied,'keep.txt'),'keep');
  await assert.rejects(writeCompendium(occupied,'Item',[]),/empty/);
  assert.equal(await fs.readFile(path.join(occupied,'keep.txt'),'utf8'),'keep');
}));

const manifest={id:'arcane-fixture',title:'Original test module',version:'1.0.0',compatibility:{minimum:'13',verified:'13'},scripts:['scripts/test.js'],packs:[{name:'spells',path:'packs/spells',type:'Item',system:'dnd5e'}]};
test('module assembly includes the exact manifest, scripts and populated packs',()=>temporary(async root=>{
  const directory=path.join(root,'module');
  await writeModule({directory,manifest,documents:{spells:[item]},files:{'scripts/test.js':'// Original fixture\n'}});
  assert.deepEqual(JSON.parse(await fs.readFile(path.join(directory,'module.json'),'utf8')),manifest);
  assert.equal(await fs.readFile(path.join(directory,'scripts/test.js'),'utf8'),'// Original fixture\n');
  assert.equal(JSON.parse((await read(path.join(directory,'packs/spells')))['!items!item01']).system.description.value,item.system.description.value);
}));
test('module paths, missing assets and undeclared content fail before writing',()=>temporary(async root=>{
  const directory=path.join(root,'invalid');
  const valid={directory,manifest,documents:{spells:[item]},files:{'scripts/test.js':''}};
  await assert.rejects(writeModule({...valid,files:{'../outside.txt':''}}),/Invalid module file/);
  await assert.rejects(writeModule({...valid,files:{'packs/spells/override':''}}),/managed output/);
  await assert.rejects(writeModule({...valid,files:{}}),/missing file/);
  await assert.rejects(writeModule({...valid,documents:{spells:[item],extra:[]}}),/undeclared/);
  await assert.rejects(fs.stat(directory),{code:'ENOENT'});
}));
