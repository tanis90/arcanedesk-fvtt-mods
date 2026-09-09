import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

test('documented single and all-spell examples compile without content and protect prior outputs', async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'arcane-spell-example-'));
  const script = new URL('../examples/spell-suite/compile.mjs', import.meta.url);
  const run = (selection, name) => JSON.parse(execFileSync(process.execPath, [fileURLToPath(script), selection, path.join(directory, name)], {encoding: 'utf8', stdio: 'pipe'}));
  try {
    assert.equal(run('fireball', 'one.json').bound, 1);
    const all = run('--all', 'all.json');
    assert.equal(all.compiled, 187); assert.equal(all.bound, 178); assert.equal(all.unbound.length, 9);
    const before = await fs.readFile(path.join(directory, 'one.json'));
    assert.throws(() => run('harm', 'one.json'), /EEXIST/);
    assert.deepEqual(await fs.readFile(path.join(directory, 'one.json')), before);
    const report = JSON.parse(await fs.readFile(path.join(directory, 'all.json'), 'utf8'));
    for (const result of report.results) {
      assert.equal(result.plan.definitionId, result.id);
      if (result.binding.status === 'bound') assert.match(result.binding.item.system.description.value, /Original demonstration text/);
      else assert(result.binding.errors.every(error => error.code === 'missing-summon-profile'));
    }
  } finally {
    assert.equal(path.dirname(directory), os.tmpdir());
    await fs.rm(directory, {recursive: true, force: true});
  }
});
