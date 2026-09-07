import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
const root=path.resolve(import.meta.dirname,'..');
test('ZIP fingerprints do not depend on build timezone',()=>{
  const builds=['UTC','Asia/Shanghai'].map(TZ=>{
    execFileSync(process.execPath,['tools/build.mjs'],{cwd:root,env:{...process.env,TZ},stdio:'pipe'});
    return JSON.parse(fs.readFileSync(path.join(root,'dist/artifacts.json'),'utf8'));
  });
  assert.deepEqual(builds[0],builds[1]);
});
