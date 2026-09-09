import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {fileURLToPath} from 'node:url';
import {build} from 'esbuild';
import {buildSpellRuntime} from '@arcanedesk/spell-runtime';
import {compileSpellPlan} from '@arcanedesk/spell-compiler';
import {spellAutomationSpecs, perSpellScriptRegistry, readPerSpellScriptSource} from '@arcanedesk/spells-2014';
import {describeSpellRequirements} from '@arcanedesk/automation-contracts/requirements';
import {writeCompendium} from '@arcanedesk/foundry-pack-builder';
import {createLightCarrierActor} from '../packages/spells-2014/src/resources/light-carrier.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
// Optional Foundry-installed provider; loaded only by the aura runtime path.
const runtimeExternals = ['/modules/auraeffects/scripts/helpers.mjs'];
export async function buildSpellModuleFiles() {
  const moduleRoot = path.join(root, 'modules/arcane-spells-2014');
  const manifest = JSON.parse(await fs.readFile(path.join(moduleRoot, 'module.json'), 'utf8'));
  const definitions = Object.values(spellAutomationSpecs).filter(def => def.contract.level >= 0 && def.contract.level <= 6)
    .sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
  if (definitions.length !== 187 || new Set(definitions.map(def => def.id)).size !== 187) throw new Error('Spell scope differs from cantrip migration count');
  const plans = definitions.map(definition => compileSpellPlan(definition));
  const runtime = await buildSpellRuntime();
  const scriptIds = Object.keys(perSpellScriptRegistry).sort();
  if (JSON.stringify(scriptIds) !== JSON.stringify(['banishing-smite', 'harm', 'toll-the-dead'])) throw new Error('Unexpected per-spell script registry');
  const scripts = 'export function installSpellScripts() {\n'
    + scriptIds.map(id => readPerSpellScriptSource(id).replace(/\r\n/g, '\n')).join('\n') + '\n}\n';
  const generated = {runtime: runtime.source, scripts, plans: 'export default ' + JSON.stringify(plans) + ';'};
  const result = await build({entryPoints: [path.join(moduleRoot, 'src/main.mjs')],
    outfile: 'arcane-spells.js', bundle: true, platform: 'browser', format: 'esm', target: 'es2022',
    // Remove esbuild's source-path comments: hoisted workspace paths differ from
    // a clean public checkout, but must not change the installable artifact.
    write: false, metafile: true, minifyWhitespace: true, legalComments: 'external', logLevel: 'silent', external: runtimeExternals,
    plugins: [{name: 'arcane-generated-inputs', setup(builder) {
      builder.onResolve({filter: /^arcane-generated:/}, args => ({path: args.path.split(':')[1], namespace: 'arcane-generated'}));
      builder.onLoad({filter: /.*/, namespace: 'arcane-generated'}, args => {
        if (!Object.hasOwn(generated, args.path)) throw new Error('Unknown generated input');
        return {contents: generated[args.path], loader: 'js'};
      });
    }}]});
  const inputs = Object.keys(result.metafile.inputs);
  const externalImports = [...new Set(Object.values(result.metafile.outputs)
    .flatMap(output => output.imports.filter(entry => entry.external).map(entry => entry.path)))].sort();
  if (externalImports.some(entry => !runtimeExternals.includes(entry))) throw new Error('Unreviewed browser runtime import');
  if (inputs.some(input => /spell-automation-compiler\.mjs$|auto2014-catalogue|node:|acorn/.test(input))) {
    throw new Error('Build-time compiler or catalogue leaked into module browser imports');
  }
  const files = new Map();
  files.set('module.json', JSON.stringify(manifest, null, 2) + '\n');
  const temporary = await fs.mkdtemp(path.join(os.tmpdir(), 'arcane-light-pack-'));
  try {
    const packPath = path.join(temporary, 'summons');
    await writeCompendium(packPath, 'Actor', [createLightCarrierActor()]);
    for (const name of (await fs.readdir(packPath)).sort()) {
      // LevelDB diagnostic logs contain wall-clock times; neither they nor its
      // empty process lock are required to reopen a closed, compacted pack.
      if (['LOG', 'LOG.old', 'LOCK'].includes(name)) continue;
      files.set('packs/summons/' + name, await fs.readFile(path.join(packPath, name)));
    }
  } finally {
    // This is the exact directory returned by mkdtemp, never a caller path.
    await fs.rm(temporary, {recursive: true, force: true});
  }
  for (const output of result.outputFiles) files.set('scripts/' + path.basename(output.path), output.contents);
  for (const name of ['LICENSE', 'NOTICE']) files.set(name, await fs.readFile(path.join(root, name)));
  const nobleDirectory = path.dirname(fileURLToPath(import.meta.resolve('@noble/hashes/sha2.js')));
  files.set('licenses/noble-hashes.txt', await fs.readFile(path.join(nobleDirectory, 'LICENSE')));
  files.set('coverage.json', JSON.stringify(plans.map(plan => ({id: plan.definitionId, level: plan.contract.level,
    support: plan.support, requirements: describeSpellRequirements(plan)})), null, 2) + '\n');
  return {manifest, files, report: {spells: plans.length, scripts: scriptIds,
    runtimeDeclarations: runtime.report.declarations.length, runtimeAdapters: runtime.report.adapters,
    runtimeHandlers: runtime.report.handlers, browserInputs: inputs, externalImports}};
}
