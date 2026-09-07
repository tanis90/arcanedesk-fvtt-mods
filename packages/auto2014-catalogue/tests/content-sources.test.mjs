import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {readContentSources} from '../src/content-sources.mjs';

async function fixture(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'arcane-content-sources-'));
  t.after(() => fs.rm(root, {recursive: true, force: true}));
  const manifest = {schemaVersion: 1, sources: {}};
  async function add(name, format, text, file = `${name}.json`) {
    await fs.mkdir(path.dirname(path.join(root, file)), {recursive: true});
    await fs.writeFile(path.join(root, file), text);
    manifest.sources[name] = {path: file, format, sha256: createHash('sha256').update(text).digest('hex')};
  }
  return {root, manifest, add};
}

test('explicit original inputs retain IDs, descriptions, ordering and translation keys without execution', async t => {
  const f = await fixture(t);
  const doc = {_id: 'original00000001', system: {description: {value: '<p>原创输入：星光。</p>', chat: ''}}, flags: {script: 'throw Error("must not execute")'}};
  await f.add('items', 'jsonl', `${JSON.stringify(doc)}\r\n\r\n${JSON.stringify(doc)}\r\n`, 'content/items.jsonl');
  await f.add('official', 'json-documents', JSON.stringify({documents: [doc], metadata: 'caller-owned'}));
  await f.add('translations', 'json-entries', JSON.stringify({entries: {'Original Star': {name: '原创星光', description: '<p>完整翻译</p>'}}}));
  const before = await fs.readdir(f.root);
  const result = await readContentSources(f);
  assert.deepEqual(result.sources.items, [doc, doc]);
  assert.deepEqual(result.sources.official, [doc]);
  assert.deepEqual(result.sources.translations.get('Original Star'), {name: '原创星光', description: '<p>完整翻译</p>'});
  assert.deepEqual(await fs.readdir(f.root), before);
  const reordered = {...f, manifest: {schemaVersion: 1, sources: Object.fromEntries(Object.entries(f.manifest.sources).reverse())}};
  assert.deepEqual((await readContentSources(reordered)).receipt, result.receipt);
  assert.equal(result.receipt.sources.length, 3);
  assert.match(result.receipt.inputSha256, /^[a-f0-9]{64}$/);
});

test('missing, changed or malformed inputs fail without disclosing content', async t => {
  const f = await fixture(t);
  await f.add('items', 'jsonl', '{"_id":"original00000001"}');
  await fs.writeFile(path.join(f.root, 'items.json'), 'PRIVATE_PAYLOAD');
  await assert.rejects(readContentSources(f), /hash mismatch/);
  await f.add('items', 'jsonl', 'PRIVATE_PAYLOAD');
  await assert.rejects(readContentSources(f), error => /Invalid UTF-8 or JSON/.test(error.message) && !error.message.includes('PRIVATE_PAYLOAD'));
  await f.add('items', 'jsonl', Buffer.from([0xff]));
  await assert.rejects(readContentSources(f), /Invalid UTF-8/);
  await f.add('items', 'jsonl', 'null');
  await assert.rejects(readContentSources(f), /document objects/);
  await f.add('items', 'json-documents', '{}');
  await assert.rejects(readContentSources(f), /document objects/);
  await f.add('items', 'json-entries', '{}');
  await assert.rejects(readContentSources(f), /entries object/);
  await fs.unlink(path.join(f.root, 'items.json'));
  await assert.rejects(readContentSources(f), /existing regular file/);
});

test('declarations reject traversal, ambiguous paths, unknown formats and unpinned sources', async t => {
  const f = await fixture(t);
  await f.add('items', 'jsonl', '{}');
  for (const value of ['../items.json', '/items.json', 'C:/items.json', 'a\\items.json', './items.json', 'a//items.json', 'a/CON.json', 'a/b.']) {
    await assert.rejects(readContentSources({...f, manifest: {schemaVersion: 1, sources: {items: {...f.manifest.sources.items, path: value}}}}), /source path/);
  }
  for (const change of [{format: 'javascript'}, {sha256: ''}, {extra: true}]) {
    await assert.rejects(readContentSources({...f, manifest: {schemaVersion: 1, sources: {items: {...f.manifest.sources.items, ...change}}}}), /declaration/);
  }
  await assert.rejects(readContentSources({...f, manifest: {schemaVersion: 1, sources: {items: f.manifest.sources.items, other: {...f.manifest.sources.items, path: 'ITEMS.json'}}}}), /Duplicate/);
});

test('linked inputs and oversized files are refused before parsing', async t => {
  const f = await fixture(t);
  await f.add('items', 'jsonl', '{}', 'data/items.json');
  await fs.symlink(path.join(f.root, 'data'), path.join(f.root, 'alias'), process.platform === 'win32' ? 'junction' : 'dir');
  const linked = {...f.manifest.sources.items, path: 'alias/items.json'};
  await assert.rejects(readContentSources({...f, manifest: {schemaVersion: 1, sources: {items: linked}}}), /without links/);
  const handle = await fs.open(path.join(f.root, 'data/items.json'), 'r+');
  try { await handle.truncate(64 * 1024 * 1024 + 1); } finally { await handle.close(); }
  await assert.rejects(readContentSources(f), /size limit/);
});
