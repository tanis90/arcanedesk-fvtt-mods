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
  assert.equal(packedPackages.length,3);
  for(const packed of packedPackages) {
    assert(packed.files.some(f=>f.path==='LICENSE'));
    assert(packed.files.some(f=>f.path==='NOTICE'));
    assert(packed.files.every(f=>['README.md','package.json','LICENSE','NOTICE'].includes(f.path)||f.path.startsWith('src/')));
  }
  const catalogue=packedPackages.find(p=>p.name==='@arcanedesk/auto2014-catalogue');
  assert(catalogue);
  assert(!catalogue.files.some(f=>f.path.endsWith('/profiles.mjs')),'Full summon profiles must not be published');
  await fs.writeFile(path.join(temp,'package.json'),'{"private":true,"type":"module"}\n');
  npm(['install','--ignore-scripts','--offline',...packedPackages.map(p=>path.join(temp,p.filename))],temp);
  execFileSync(process.execPath,['--input-type=module','-e','import {compileSpellAutomation} from "@arcanedesk/auto2014-compiler"; import {cleanRoomSpell} from "@arcanedesk/auto2014-compiler/dsl"; import {readRuntimeSource} from "@arcanedesk/auto2014-runtime"; if(typeof compileSpellAutomation!=="function" || typeof cleanRoomSpell!=="function" || !(await readRuntimeSource()).includes("dnd5e.preUseActivity")) throw Error("Missing exports");'],{cwd:temp,stdio:'pipe'});
  execFileSync(process.execPath,['--input-type=module','-e',`import assert from 'node:assert/strict';
import {spellAutomationCompiledIds,composeRegisteredSpell,summonProfileIdentities} from '@arcanedesk/auto2014-catalogue';
assert.equal(spellAutomationCompiledIds.length,186);assert.equal(summonProfileIdentities.length,22);
for(const id of spellAutomationCompiledIds){const input={_id:'catalogueTest001',name:'Original test',type:'spell',img:'icons/svg/book.svg',system:{identifier:id,description:{value:'Original caller text',chat:''},source:{rules:'2014'}}};const {item}=composeRegisteredSpell(input);assert.equal(item._id,input._id);assert.equal(item.system.description.value,input.system.description.value);}`],{cwd:temp,stdio:'pipe'});
  console.log(JSON.stringify(packedPackages.map(packed=>({name:packed.name,version:packed.version,files:packed.files.length,packedBytes:packed.size,installedOutsideWorkspace:true}))));
} finally {
  // mkdtemp created this exact directory for this invocation; never remove caller paths.
  assert(path.dirname(temp)===os.tmpdir());
  await fs.rm(temp,{recursive:true,force:true});
}
