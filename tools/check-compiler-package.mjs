import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
const root=path.resolve(import.meta.dirname,'..');
if(!process.env.npm_execpath) throw Error('Run through npm run pack:check');
const temp=await fs.mkdtemp(path.join(os.tmpdir(),'arcane-compiler-pack-'));
const npm=(args,cwd)=>execFileSync(process.execPath,[process.env.npm_execpath,...args],{cwd,encoding:'utf8',env:{...process.env,npm_config_audit:'false',npm_config_fund:'false'}});
try {
  const packedPackages=JSON.parse(npm(['pack','--workspaces','--ignore-scripts','--json','--pack-destination',temp],root));
  assert.equal(packedPackages.length,4);
  for(const packed of packedPackages) {
    assert(packed.files.some(f=>f.path==='LICENSE'));
    assert(packed.files.some(f=>f.path==='NOTICE'));
    assert(packed.files.every(f=>['README.md','package.json','LICENSE','NOTICE'].includes(f.path)||f.path.startsWith('src/')));
  }
  assert(packedPackages.find(p=>p.name==='@arcanedesk/auto2014-catalogue').files.some(f=>f.path==='src/advancement.mjs'));
  const catalogue=packedPackages.find(p=>p.name==='@arcanedesk/auto2014-catalogue');
  assert(catalogue);
  assert(!catalogue.files.some(f=>f.path.endsWith('/profiles.mjs')),'Full summon profiles must not be published');
  // npm ci caches locked tarballs, not necessarily registry packuments. Preserve
  // the tested dependency graph so the offline install never needs those packuments.
  const manifest=JSON.parse(await fs.readFile(path.join(root,'package.json'),'utf8'));
  const lock=JSON.parse(await fs.readFile(path.join(root,'package-lock.json'),'utf8'));
  const dependencies=Object.fromEntries(packedPackages.map(p=>[p.name,'file:'+p.filename]));
  const isolated={name:'arcane-pack-verification',version:'0.0.0',private:true,type:'module',dependencies,devDependencies:manifest.devDependencies};
  lock.name=isolated.name;lock.version=isolated.version;
  for(const packed of packedPackages){
    const key='node_modules/'+packed.name;
    const link=lock.packages[key];
    assert(link?.link,'Expected workspace lock entry for '+packed.name);
    const workspace=lock.packages[link.resolved];
    assert.equal(workspace.version,packed.version);
    lock.packages[key]={...workspace,resolved:'file:'+packed.filename,integrity:packed.integrity};
  }
  for(const key of Object.keys(lock.packages))if(key!==''&&!key.startsWith('node_modules/'))delete lock.packages[key];
  lock.packages['']={name:isolated.name,version:isolated.version,dependencies,devDependencies:isolated.devDependencies};
  await fs.writeFile(path.join(temp,'package.json'),JSON.stringify(isolated,null,2)+'\n');
  await fs.writeFile(path.join(temp,'package-lock.json'),JSON.stringify(lock,null,2)+'\n');
  npm(['ci','--ignore-scripts','--offline'],temp);
  execFileSync(process.execPath,['--input-type=module','-e','import {compileSpellAutomation} from "@arcanedesk/auto2014-compiler"; import {cleanRoomSpell} from "@arcanedesk/auto2014-compiler/dsl"; import {readRuntimeSource} from "@arcanedesk/auto2014-runtime"; if(typeof compileSpellAutomation!=="function" || typeof cleanRoomSpell!=="function" || !(await readRuntimeSource()).includes("dnd5e.preUseActivity")) throw Error("Missing exports");'],{cwd:temp,stdio:'pipe'});
  execFileSync(process.execPath,['--input-type=module','-e',`import assert from 'node:assert/strict';
import {spellAutomationCompiledIds,composeRegisteredSpell,summonProfileIdentities} from '@arcanedesk/auto2014-catalogue';
assert.equal(spellAutomationCompiledIds.length,186);assert.equal(summonProfileIdentities.length,22);
for(const id of spellAutomationCompiledIds){const input={_id:'catalogueTest001',name:'Original test',type:'spell',img:'icons/svg/book.svg',system:{identifier:id,description:{value:'Original caller text',chat:''},source:{rules:'2014'}}};const {item}=composeRegisteredSpell(input);assert.equal(item._id,input._id);assert.equal(item.system.description.value,input.system.description.value);}`],{cwd:temp,stdio:'pipe'});
  execFileSync(process.execPath,['--input-type=module','-e',`import assert from 'node:assert/strict';
import {writeModule} from '@arcanedesk/foundry-pack-builder';
const result=await writeModule({directory:'probe-module',manifest:{id:'probe-module',version:'1.0.0',packs:[{name:'items',path:'packs/items',type:'Item'}]},documents:{items:[{_id:'originalProbe001',name:'Original probe',effects:[]}]}});
  assert.equal(result.packs[0].records,1);`],{cwd:temp,stdio:'pipe'});
  execFileSync(process.execPath,['--input-type=module','-e',`import assert from 'node:assert/strict';
import {createAdvancementTools} from '@arcanedesk/auto2014-catalogue/advancement';
const doc={system:{advancement:[{type:'ItemGrant',level:20,configuration:{items:[{uuid:'Compendium.original.items.Item.original20'}]}}]}};
createAdvancementTools({rewriteUuid:value=>value}).filterClassAdvancement(doc,{levelCap:20,allowedIds:new Set(['original20'])});
assert.equal(doc.system.advancement.length,1);
createAdvancementTools({rewriteUuid:value=>value,uuidFor:(pack,id)=>'Compendium.original.'+pack+'.Item.'+id}).applyGrantProfile(doc,{levelCap:20,allowedFeatureIds:['original20'],grants:[{id:'originalExtra',level:3,title:'Original grant',itemIds:['original3']}]});
assert.equal(doc.system.advancement.length,2);
const training={system:{advancement:[]}};
const tools=createAdvancementTools({rewriteUuid:value=>value,uuidFor:(pack,id)=>'Compendium.original.'+pack+'.Item.'+id});
tools.applyMartialClassProfile(training,{allowedFeatureIds:[],levelCap:20,grants:[],styleIds:['originalStyle'],choice:{type:'ItemChoice',level:1,configuration:{}}});
assert.equal(training.system.advancement.length,1);
tools.applyStyleSubclassProfile(training,{allowedFeatureIds:[],levelCap:20,styleIds:['originalStyle']});
assert.equal(training.system.advancement[0].configuration.pool.length,1);`],{cwd:temp,stdio:'pipe'});
  execFileSync(process.execPath,['--input-type=module','-e',`import assert from 'node:assert/strict';
import {createActivityTools} from '@arcanedesk/auto2014-catalogue/activities';
const tools=createActivityTools({moduleId:'original-module',spellAutomationProfiles:{version:1}});
const activity={};tools.normalizeSelfItemUseActivity(activity);
assert.equal(activity.target.affects.type,'self');assert.equal(activity.consumption.targets[0].value,'1');`],{cwd:temp,stdio:'pipe'});
  execFileSync(process.execPath,['--input-type=module','-e',`import assert from 'node:assert/strict';
import {createMartialFeatureTools} from '@arcanedesk/auto2014-catalogue/martial-features';
const tools=createMartialFeatureTools({moduleId:'original',uuidFor:(pack,id)=>'Compendium.original.'+pack+'.Item.'+id,content:{fighterImages:{},monkImages:{},rogueImages:{},monk:{profUseIds:[],frightenFeatureId:'originalFear',effectId:'originalEffect',effectName:'Original effect'},rogue:{sneakAttackFeatureId:'originalSneak',damageActivityId:'originalDamage',legacyEffectId:'originalLegacy'}}});
const doc={system:{identifier:'action-surge',activities:{}}};tools.normalizeFighterAutomation(doc);
assert.equal(Object.values(doc.system.activities)[0].type,'utility');assert.equal(doc.system.uses.recovery[0].period,'sr');`],{cwd:temp,stdio:'pipe'});
  await fs.copyFile(path.join(root,'packages/auto2014-catalogue/tests/fixtures/barbarian-bindings.mjs'),path.join(temp,'original-barbarian-fixture.mjs'));
  execFileSync(process.execPath,['--input-type=module','-e',`import assert from 'node:assert/strict';
import {createBarbarianFeatureTools} from '@arcanedesk/auto2014-catalogue/barbarian-features';
import {originalBarbarianBindings as content} from './original-barbarian-fixture.mjs';
const tools=createBarbarianFeatureTools({moduleId:'original',uuidFor:(pack,id)=>'Compendium.original.'+pack+'.Item.'+id,content});
const doc={_id:content.ids.rage,effects:[],system:{activities:{}}};tools.normalizeBarbarianAutomation(doc);
assert.equal(doc.effects[0].changes.length,6);assert.equal(doc.effects[0].name,content.text.rageName);`],{cwd:temp,stdio:'pipe'});
  await fs.copyFile(path.join(root,'packages/auto2014-catalogue/tests/fixtures/summon-provider.mjs'),path.join(temp,'original-summon-fixture.mjs'));
  execFileSync(process.execPath,['--input-type=module','-e',`import assert from 'node:assert/strict';
import {createSummonAssembler} from '@arcanedesk/auto2014-catalogue/summons';
import {writeModule} from '@arcanedesk/foundry-pack-builder';
import {trainingSummonInput} from './original-summon-fixture.mjs';
const input=trainingSummonInput();
const {actors}=createSummonAssembler(input.contracts).assembleSummonProvider(input.provider);
assert.equal(actors.length,1);assert.equal(actors[0]._id,'originalActor001');
const result=await writeModule({directory:'probe-summon-module',manifest:{id:'arcane-dnd5e-2014-automation',version:'0.0.0',packs:[{name:'summons',path:'packs/summons',type:'Actor'}]},documents:{summons:actors}});
  assert.equal(result.packs[0].records,2);`],{cwd:temp,stdio:'pipe'});
  execFileSync(process.execPath,['--input-type=module','-e',`import fs from 'node:fs/promises';
import {createModuleBundle} from '@arcanedesk/foundry-pack-builder';
const bundle=createModuleBundle({manifest:{id:'original-cli-probe',version:'1.0.0',packs:[{name:'items',path:'packs/items',type:'Item'}]},documents:{items:[{_id:'originalCli001',name:'Original CLI probe',effects:[]}]},files:{'original.txt':'Original fixture'}});
await fs.writeFile('probe-bundle.json',JSON.stringify(bundle));`],{cwd:temp,stdio:'pipe'});
  await fs.access(path.join(temp,'node_modules/.bin',process.platform==='win32'?'arcane-build-module.cmd':'arcane-build-module'));
  const cliResult=JSON.parse(execFileSync(process.execPath,[path.join(temp,process.platform==='win32'?'node_modules/@arcanedesk/foundry-pack-builder/src/cli.mjs':'node_modules/.bin/arcane-build-module'),'--input','probe-bundle.json','--out','probe-cli-module'],{cwd:temp,encoding:'utf8'}));
  assert.equal(cliResult.moduleId,'original-cli-probe');
  assert.equal(cliResult.packs[0].records,1);
  console.log(JSON.stringify(packedPackages.map(packed=>({name:packed.name,version:packed.version,files:packed.files.length,packedBytes:packed.size,installedOutsideWorkspace:true}))));
} finally {
  // mkdtemp created this exact directory for this invocation; never remove caller paths.
  assert(path.dirname(temp)===os.tmpdir());
  await fs.rm(temp,{recursive:true,force:true});
}
