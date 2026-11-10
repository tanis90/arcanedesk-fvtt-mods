import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

// CN mirror publisher for the arcane-package OSS bucket (Beijing).
// Contract: apps/desktop/distribution/oss-mirror-contract.md (arcanedesk repo).
//
// Single-writer split (P7.1): index.json is written only by tanis90/arcanedesk-ops.
// This module publishes immutable package objects under packages/<id>/<version>/
// and a receipt packages/_receipts/<id>/<version>.json that the ops reconcile
// merges into index.json. Never add an index.json PUT here.
//
//   - immutable objects upload with x-oss-forbid-overwrite.
//   - a receipt is written once per version and records the zip/manifest hashes,
//     the public URLs and the source commit the ops reconcile needs.
//   - removal stays a manual arcanedesk-ops operation; this tool only adds and verifies.
//
// CLI: node tools/oss-mirror-publish.mjs add --id <id> --version <v> \
//          --zip <path> --manifest <module.json>
//      node tools/oss-mirror-publish.mjs verify

export const BUCKET = 'arcane-package';
export const BASE_URL = 'https://arcane-package.oss-cn-beijing.aliyuncs.com';
export const INDEX_KEY = 'index.json';
export const INDEX_URL = `${BASE_URL}/${INDEX_KEY}`;
export const RECEIPT_PREFIX = 'packages/_receipts';
export const RECEIPT_SCHEMA_VERSION = 1;
const OBJECT_CACHE_CONTROL = 'public, max-age=31536000, immutable';

const sha256 = buffer => createHash('sha256').update(buffer).digest('hex');

export function ossUrls(id, version) {
  return {
    zipUrl: `${BASE_URL}/packages/${id}/${version}/${id}-${version}.zip`,
    manifestUrl: `${BASE_URL}/packages/${id}/${version}/module.json`,
  };
}

// Mirror manifests must point download/manifest back at this bucket so Foundry
// "install by URL" stays on the mirror end to end.
export function rewriteManifest(manifest, id, version) {
  const urls = ossUrls(id, version);
  return {...manifest, download: urls.zipUrl, manifest: urls.manifestUrl};
}

export function receiptKey(id, version) {
  return `${RECEIPT_PREFIX}/${id}/${version}.json`;
}

export function receiptUrl(id, version) {
  return `${BASE_URL}/${receiptKey(id, version)}`;
}

function publishedTimestamp() {
  return `${new Date().toISOString().slice(0, 19)}+00:00`;
}

// The receipt is the ops-side work order: everything index.json needs for this
// version, plus provenance, written once per version (immutable path).
export function buildReceipt({id, version, zipBuffer, manifest, manifestBytes = null, source}) {
  if (manifest.id !== id) throw new Error(`manifest id "${manifest.id}" != "${id}"`);
  if (String(manifest.version) !== String(version)) {
    throw new Error(`manifest version "${manifest.version}" != "${version}"`);
  }
  if (!source || typeof source !== 'object') throw new Error('buildReceipt requires a source object');
  const urls = ossUrls(id, version);
  const uploadedManifestBytes = manifestBytes
    ?? Buffer.from(`${JSON.stringify(rewriteManifest(manifest, id, version), null, 2)}\n`, 'utf8');
  return {
    schemaVersion: RECEIPT_SCHEMA_VERSION,
    kind: 'module',
    id,
    version,
    group: 'arcane',
    bytes: zipBuffer.length,
    sha256: sha256(zipBuffer),
    zipUrl: urls.zipUrl,
    manifestUrl: urls.manifestUrl,
    manifestSha256: sha256(uploadedManifestBytes),
    source,
    publishedAt: publishedTimestamp(),
    indexWriter: 'tanis90/arcanedesk-ops',
  };
}

// Read the zip central directory to assert module.json sits at the archive root
// (the mirror unpacking convention).
export function zipRootEntries(buffer) {
  const eocdSig = 0x06054b50;
  let eocd = -1;
  for (let i = buffer.length - 22; i >= Math.max(0, buffer.length - 66000); i -= 1) {
    if (buffer.readUInt32LE(i) === eocdSig) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error('zip: end-of-central-directory not found');
  const count = buffer.readUInt16LE(eocd + 10);
  let offset = buffer.readUInt32LE(eocd + 16);
  const names = [];
  for (let i = 0; i < count; i += 1) {
    if (buffer.readUInt32LE(offset) !== 0x02014b50) throw new Error('zip: central directory signature mismatch');
    const nameLength = buffer.readUInt16LE(offset + 28);
    names.push(buffer.toString('utf8', offset + 46, offset + 46 + nameLength));
    offset += 46 + nameLength + buffer.readUInt16LE(offset + 30) + buffer.readUInt16LE(offset + 32);
  }
  return names;
}

export async function createClient(env = process.env) {
  const {default: OSS} = await import('ali-oss');
  return new OSS({
    accessKeyId: env.OSS_ACCESS_KEY_ID,
    accessKeySecret: env.OSS_ACCESS_KEY_SECRET,
    bucket: BUCKET,
    region: env.OSS_REGION || 'oss-cn-beijing',
    endpoint: env.OSS_ENDPOINT,
  });
}

export async function putImmutable(client, key, buffer, contentType) {
  try {
    await client.put(key, buffer, {
      headers: {'x-oss-forbid-overwrite': 'true', 'Cache-Control': OBJECT_CACHE_CONTROL},
      mime: contentType,
    });
  } catch (error) {
    // Idempotent replays: retrying a publish whose objects already landed must not
    // fail. OSS rejects any re-put to an existing key (forbid-overwrite), and its
    // ETag is not reliably the content MD5 (chunked uploads get a UUID), so compare
    // by size via HEAD and then by full content hash via GET.
    if (error?.code === 'FileAlreadyExists' || error?.status === 409) {
      const head = await client.head(key);
      const storedLength = Number(head?.res?.headers?.['content-length']);
      if (storedLength === buffer.length) {
        const stored = await client.get(key);
        if (sha256(stored.content) === sha256(buffer)) return;
      }
      throw new Error(`immutable object exists with different bytes: ${key}`);
    }
    throw error;
  }
}

async function fetchJson(url, {method = 'GET', headers} = {}) {
  // OSS answers a gzip-capable HEAD with Content-Encoding: gzip and no Content-Length,
  // which makes Node report -1 instead of the stored object size. Read-back checks
  // raw bytes, so every HEAD must opt out of transport compression.
  const requestHeaders = method === 'HEAD' ? {...headers, 'Accept-Encoding': 'identity'} : headers;
  const res = await fetch(url, {method, headers: requestHeaders, cache: 'no-store', signal: AbortSignal.timeout(30000)});
  if (method === 'HEAD') return {status: res.status, length: Number(res.headers.get('content-length') ?? -1)};
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`GET ${url} -> HTTP ${res.status}`);
  return res.json();
}

const HEAD_READ_OPTIONS = {method: 'HEAD', headers: {'Accept-Encoding': 'identity'}};

// Post-upload read-back over the public read path: objects must be there with the
// exact size, and the manifest must carry the id/version the receipt claims.
async function assertLanded(receipt, fetchJsonImpl = fetchJson) {
  const [zip, man] = await Promise.all([
    fetchJsonImpl(receipt.zipUrl, HEAD_READ_OPTIONS),
    fetchJsonImpl(receipt.manifestUrl, HEAD_READ_OPTIONS),
  ]);
  if (zip.status !== 200) throw new Error(`${receipt.id}@${receipt.version}: zip HEAD -> HTTP ${zip.status}`);
  if (zip.length !== receipt.bytes) {
    throw new Error(`${receipt.id}@${receipt.version}: zip content-length ${zip.length} != ${receipt.bytes}`);
  }
  if (man.status !== 200) throw new Error(`${receipt.id}@${receipt.version}: manifest HEAD -> HTTP ${man.status}`);
  const live = await fetchJsonImpl(receipt.manifestUrl);
  if (!live || live.id !== receipt.id || String(live.version) !== String(receipt.version)) {
    throw new Error(`${receipt.id}@${receipt.version}: manifest id/version mismatch after upload`);
  }
}

// Publish objects then the receipt. A receipt is the commit point: replaying the
// same bytes is idempotent, while different bytes on the same immutable path are
// rejected (publish a new version instead).
export async function publishReceipt(client, {receipt, zipBuffer, manifestBytes, fetchJsonImpl = fetchJson}) {
  if (sha256(zipBuffer) !== receipt.sha256) {
    throw new Error(`${receipt.id}@${receipt.version}: zip bytes do not match the receipt sha256`);
  }
  if (sha256(manifestBytes) !== receipt.manifestSha256) {
    throw new Error(`${receipt.id}@${receipt.version}: manifest bytes do not match the receipt manifestSha256`);
  }
  const existing = await fetchJsonImpl(receiptUrl(receipt.id, receipt.version));
  if (existing) {
    if (existing.sha256 !== receipt.sha256) {
      throw new Error(`${receipt.id}@${receipt.version}: receipt exists with different bytes — paths are immutable, publish a new version`);
    }
    await assertLanded(existing, fetchJsonImpl);
    return 'already-published';
  }
  if (!zipRootEntries(zipBuffer).includes('module.json')) {
    throw new Error(`${receipt.id}: module.json not at zip root`);
  }
  const dir = `packages/${receipt.id}/${receipt.version}`;
  await putImmutable(client, `${dir}/${receipt.id}-${receipt.version}.zip`, zipBuffer, 'application/zip');
  await putImmutable(client, `${dir}/module.json`, manifestBytes, 'application/json');
  await assertLanded(receipt, fetchJsonImpl);
  await putImmutable(client, receiptKey(receipt.id, receipt.version),
    Buffer.from(`${JSON.stringify(receipt, null, 2)}\n`, 'utf8'), 'application/json');
  return 'published';
}

// Anonymous read-path audit over the public bucket: every index entry must HEAD 200
// with matching bytes, its manifest must carry the right id/version, and deep ids get
// a full download + sha256 recheck.
export async function verifyMirror({deep = [], index = null, fetchImpl = fetch} = {}) {
  const resolved = index ?? await (await fetchImpl(INDEX_URL, {cache: 'no-store'})).json();
  const problems = [];
  const seenIds = new Set();
  for (const entry of resolved.packages) {
    if (seenIds.has(entry.id)) problems.push(`duplicate index entry for id ${entry.id} (the consumer requires one current version per id)`);
    seenIds.add(entry.id);
  }
  for (const entry of resolved.packages) {
    for (const [url, expectedBytes] of [[entry.zipUrl, entry.bytes], [entry.manifestUrl, null]]) {
      const res = await fetchImpl(url, {method: 'HEAD', cache: 'no-store'});
      if (!res.ok) problems.push(`${entry.id}@${entry.version}: HEAD ${url} -> HTTP ${res.status}`);
      else if (expectedBytes !== null && Number(res.headers.get('content-length')) !== expectedBytes) {
        problems.push(`${entry.id}@${entry.version}: content-length ${res.headers.get('content-length')} != ${expectedBytes}`);
      }
    }
    const manifest = await (await fetchImpl(entry.manifestUrl, {cache: 'no-store'})).json();
    if (manifest.id !== entry.id || String(manifest.version) !== String(entry.version)) {
      problems.push(`${entry.id}@${entry.version}: manifest id/version mismatch`);
    }
    if (deep.includes(entry.id)) {
      const zip = Buffer.from(await (await fetchImpl(entry.zipUrl, {cache: 'no-store'})).arrayBuffer());
      if (createHash('sha256').update(zip).digest('hex') !== entry.sha256) {
        problems.push(`${entry.id}@${entry.version}: deep sha256 mismatch`);
      }
    }
  }
  if (problems.length) throw new Error(`verification failed: ${problems.length} problem(s)\n${problems.join('\n')}`);
  return resolved.packages.length;
}

async function main() {
  const [command, ...rest] = process.argv.slice(2);
  const args = {};
  for (let i = 0; i < rest.length; i += 2) args[rest[i]?.replace(/^--/, '')] = rest[i + 1];
  if (command === 'verify') {
    console.log(`verified ${await verifyMirror()} packages`);
    return;
  }
  if (command === 'add') {
    const {id, version, zip, manifest} = args;
    const zipBuffer = await readFile(zip);
    const manifestObject = JSON.parse(await readFile(manifest, 'utf8'));
    const manifestBytes = Buffer.from(`${JSON.stringify(rewriteManifest(manifestObject, id, version), null, 2)}\n`, 'utf8');
    const source = {
      repo: process.env.GITHUB_REPOSITORY || 'tanis90/arcanedesk-fvtt-mods',
      commit: process.env.GITHUB_SHA || 'local',
      workflow: process.env.GITHUB_WORKFLOW || 'local',
      runId: process.env.GITHUB_RUN_ID || 'local',
    };
    const receipt = buildReceipt({id, version, zipBuffer, manifest: manifestObject, manifestBytes, source});
    const client = await createClient();
    const status = await publishReceipt(client, {receipt, zipBuffer, manifestBytes});
    console.log(`${status}: ${receipt.id}@${receipt.version} (${receipt.bytes} bytes, sha256 ${receipt.sha256})`);
    console.log(`receipt: ${receiptUrl(receipt.id, receipt.version)}`);
    return;
  }
  throw new Error(`unknown command: ${command ?? '(none)'} — expected add | verify`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => { console.error(`error: ${error.message}`); process.exit(1); });
}
