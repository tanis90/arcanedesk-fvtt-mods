import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';

const MAX_FILE_BYTES = 64 * 1024 * 1024;
const MAX_TOTAL_BYTES = 512 * 1024 * 1024;
const formats = new Set(['jsonl', 'json-documents', 'json-entries']);
const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');

function sourcePath(value) {
  if (typeof value !== 'string' || !value || value.length > 2048 || /[\\\x00-\x1f<>:"|?*]/.test(value)) {
    throw Error('Invalid content source path');
  }
  const parts = value.split('/');
  if (parts.some(part => !part || part === '.' || part === '..' || /[. ]$/.test(part) ||
      /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(part))) throw Error('Invalid content source path');
  return parts;
}

function checkedSources(manifest) {
  if (!record(manifest) || manifest.schemaVersion !== 1 || !record(manifest.sources) ||
      Object.keys(manifest).some(key => !['schemaVersion', 'sources'].includes(key))) {
    throw Error('Expected content sources manifest schemaVersion 1');
  }
  const rows = Object.entries(manifest.sources);
  if (!rows.length || rows.length > 128) throw Error('Expected 1–128 content sources');
  const paths = new Set();
  return rows.map(([name, source]) => {
    if (!/^[A-Za-z][A-Za-z0-9_-]{0,127}$/.test(name) || ['constructor', 'prototype', '__proto__'].includes(name) ||
        !record(source) || Object.keys(source).sort().join(',') !== 'format,path,sha256' ||
        !formats.has(source.format) || typeof source.sha256 !== 'string' || !/^[a-f0-9]{64}$/.test(source.sha256)) throw Error('Invalid content source declaration');
    const parts = sourcePath(source.path);
    const folded = source.path.toLowerCase();
    if (paths.has(folded)) throw Error('Duplicate content source path');
    paths.add(folded);
    return {name, path: source.path, format: source.format, sha256: source.sha256, parts};
  });
}

function parseSource(bytes, row) {
  let value;
  try {
    const text = new TextDecoder('utf-8', {fatal: true}).decode(bytes);
    value = row.format === 'jsonl'
      ? text.trim().split(/\n/).filter(line => line.trim()).map(line => JSON.parse(line))
      : JSON.parse(text);
  } catch {
    // Native JSON parser errors can quote caller content. Do not forward them.
    throw Error(`Invalid UTF-8 or JSON in content source ${row.name}`);
  }
  if (row.format === 'json-documents') value = record(value) ? value.documents : null;
  if (row.format === 'json-entries') {
    if (!record(value) || !record(value.entries)) throw Error(`Expected entries object in content source ${row.name}`);
    return new Map(Object.entries(value.entries));
  }
  if (!Array.isArray(value) || value.some(doc => !record(doc))) throw Error(`Expected document objects in content source ${row.name}`);
  return value;
}

/** Read only explicit local inputs. Hashes identify content, not permission to redistribute it. */
export async function readContentSources({root, manifest}) {
  const rows = checkedSources(manifest);
  const base = await fs.realpath(root);
  if (!(await fs.stat(base)).isDirectory()) throw Error('Content root must be a directory');
  const sources = Object.create(null);
  const receipt = [];
  let totalBytes = 0;
  for (const row of rows) {
    let file = base;
    try {
      for (const [index, part] of row.parts.entries()) {
        file = path.join(file, part);
        const stat = await fs.lstat(file);
        if (stat.isSymbolicLink() || (index < row.parts.length - 1 ? !stat.isDirectory() : !stat.isFile())) {
          throw Error('not a regular source');
        }
      }
    } catch {
      throw Error(`Content source ${row.name} must be an existing regular file without links`);
    }
    const resolved = await fs.realpath(file);
    const relative = path.relative(base, resolved);
    if (relative.startsWith(`..${path.sep}`) || relative === '..' || path.isAbsolute(relative)) throw Error('Content source escapes root');
    const handle = await fs.open(file, 'r');
    let bytes;
    try {
      const stat = await handle.stat();
      if (!stat.isFile() || stat.size > MAX_FILE_BYTES || totalBytes + stat.size > MAX_TOTAL_BYTES) throw Error('Content source size limit exceeded');
      const buffer = Buffer.alloc(stat.size + 1);
      let length = 0;
      while (length < buffer.length) {
        const read = await handle.read(buffer, length, buffer.length - length, null);
        if (!read.bytesRead) break;
        length += read.bytesRead;
      }
      if (length !== stat.size) throw Error('Content source changed while reading');
      bytes = buffer.subarray(0, length);
    } finally {
      await handle.close();
    }
    if (sha256(bytes) !== row.sha256) throw Error(`Content source hash mismatch: ${row.name}`);
    const parsed = parseSource(bytes, row);
    sources[row.name] = parsed;
    totalBytes += bytes.length;
    receipt.push({name: row.name, path: row.path, format: row.format, sha256: row.sha256, bytes: bytes.length, count: parsed instanceof Map ? parsed.size : parsed.length});
  }
  receipt.sort((a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0);
  return {sources, receipt: {schemaVersion: 1, sources: receipt, totalBytes, inputSha256: sha256(JSON.stringify(receipt))}};
}
