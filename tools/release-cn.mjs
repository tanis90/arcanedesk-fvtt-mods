import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {inflateSync} from 'fflate';
import {
  INDEX_URL,
  buildReceipt,
  publishReceipt,
  receiptUrl,
  rewriteManifest,
  verifyMirror,
  zipRootEntries,
} from './oss-mirror-publish.mjs';

// CN mirror release driver. Reads tools/cn-mirror.json (the exhaustive decision table)
// and the live mirror index, decides per module what to do, and publishes immutable
// objects plus receipts.
//
//   node tools/release-cn.mjs plan              → JSON decision list on stdout (exit 1 on alarm)
//   node tools/release-cn.mjs publish-receipts  → publish every pending module (plan must be clean)
//   node tools/release-cn.mjs publish-all       → compatibility alias for publish-receipts
//   node tools/release-cn.mjs audit             → reverse audit + full mirror verification
//
// index.json has one writer: tanis90/arcanedesk-ops. This driver never reads or
// writes it as a publisher; it uploads packages/<id>/<version>/{zip,module.json}
// and packages/_receipts/<id>/<version>.json, then ops reconcile merges the entry.
//
// Decisions:
//   publish         artifact is ahead of the index and no receipt exists yet
//   awaiting-index  receipt exists but index has not caught up — ops reconcile pending
//   noop            index already serves this version and bytes
//   alarm           index is ahead, same version has different bytes, or artifact/receipt is broken
//
// artifact 'build'  : dist/<id>-<version>.zip (npm run build), driver creates the GitHub Release.
// artifact 'release': module ships gitignored local-only assets; driver mirrors the exact
//                     bytes of the maintainer-cut GitHub Release zip for the current version.
//
// Env: GITHUB_TOKEN (release create/download), GITHUB_REPOSITORY (default tanis90/arcanedesk-fvtt-mods),
//      OSS_ACCESS_KEY_ID / OSS_ACCESS_KEY_SECRET (publish only).

const ROOT = path.resolve(import.meta.dirname, '..');
const REPO = process.env.GITHUB_REPOSITORY || 'tanis90/arcanedesk-fvtt-mods';
const API = 'https://api.github.com';
const DIST = path.join(ROOT, 'dist');

function ghHeaders(token, accept = 'application/vnd.github+json') {
  const headers = {Accept: accept, 'User-Agent': 'arcanedesk-mirror-release'};
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

async function gh(pathname, {token = process.env.GITHUB_TOKEN, accept} = {}) {
  const res = await fetch(`${API}${pathname}`, {headers: ghHeaders(token, accept), cache: 'no-store'});
  return res;
}

function versionParts(v) {
  return String(v).split('.').map(n => Number(n) || 0);
}

function compareVersions(a, b) {
  const [x, y] = [versionParts(a), versionParts(b)];
  for (let i = 0; i < 3; i += 1) {
    if (x[i] !== y[i]) return x[i] < y[i] ? -1 : 1;
  }
  return 0;
}

const sha256 = buffer => createHash('sha256').update(buffer).digest('hex');

async function fetchJson(url) {
  const res = await fetch(url, {cache: 'no-store', signal: AbortSignal.timeout(30000)});
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`GET ${url} -> HTTP ${res.status}`);
  return res.json();
}

async function liveIndex() {
  const res = await fetch(INDEX_URL, {cache: 'no-store'});
  if (!res.ok) throw new Error(`index.json GET -> HTTP ${res.status}`);
  return res.json();
}

// Minimal zip reader: central directory → the one entry named module.json → inflate it.
export function readZipModuleJson(buffer) {
  const names = zipRootEntries(buffer); // validates structure
  const index = names.indexOf('module.json');
  if (index < 0) throw new Error('zip: module.json not at root');
  let eocd = -1;
  for (let i = buffer.length - 22; i >= Math.max(0, buffer.length - 66000); i -= 1) {
    if (buffer.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  }
  let offset = buffer.readUInt32LE(eocd + 16);
  for (let i = 0; i < index; i += 1) {
    offset += 46 + buffer.readUInt16LE(offset + 28) + buffer.readUInt16LE(offset + 30) + buffer.readUInt16LE(offset + 32);
  }
  const localOffset = buffer.readUInt32LE(offset + 42);
  if (buffer.readUInt32LE(localOffset) !== 0x04034b50) throw new Error('zip: local header mismatch');
  const method = buffer.readUInt16LE(localOffset + 8);
  const compressedSize = buffer.readUInt32LE(localOffset + 18);
  const nameLength = buffer.readUInt16LE(localOffset + 26);
  const extraLength = buffer.readUInt16LE(localOffset + 28);
  const dataStart = localOffset + 30 + nameLength + extraLength;
  const data = buffer.subarray(dataStart, dataStart + compressedSize);
  const raw = method === 0 ? data : inflateSync(data);
  return JSON.parse(Buffer.from(raw).toString('utf8'));
}

export async function releaseByTag(tag) {
  const res = await gh(`/repos/${REPO}/releases/tags/${tag}`);
  return res.status === 200 ? res.json() : null;
}

export async function downloadAsset(assetUrl, token = process.env.GITHUB_TOKEN) {
  // asset.url is a full https://api.github.com/... URL. It 302-redirects to a signed
  // objects.githubusercontent.com URL which rejects a forwarded Authorization header,
  // so follow the redirect manually and fetch the signed URL anonymously.
  const res = await fetch(assetUrl, {headers: ghHeaders(token, 'application/octet-stream'), redirect: 'manual', cache: 'no-store'});
  const target = res.status === 302 ? res.headers.get('location') : null;
  if (target) {
    const bin = await fetch(target, {cache: 'no-store'});
    if (!bin.ok) throw new Error(`asset download (signed) -> HTTP ${bin.status}`);
    return Buffer.from(await bin.arrayBuffer());
  }
  if (!res.ok) throw new Error(`asset download -> HTTP ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

async function createReleaseWithAsset({id, version, zipPath, token}) {
  const tag = `${id}-v${version}`;
  let release = await releaseByTag(tag);
  if (!release) {
    const created = await fetch(`${API}/repos/${REPO}/releases`, {
      method: 'POST',
      headers: ghHeaders(token),
      body: JSON.stringify({
        tag_name: tag,
        name: `${id} ${version}`,
        body: `Automated release from the arcanedesk-fvtt-mods pipeline. Manifest: modules/${id}/module.json`,
      }),
    });
    if (!created.ok) throw new Error(`release create -> HTTP ${created.status}: ${await created.text()}`);
    release = await created.json();
  }
  const assetName = `${id}-${version}.zip`;
  if (!release.assets.some(a => a.name === assetName)) {
    const uploaded = await fetch(`https://uploads.github.com/repos/${REPO}/releases/${release.id}/assets?name=${encodeURIComponent(assetName)}`, {
      method: 'POST',
      // uploads.github.com requires a JSON Accept; the zip type goes in Content-Type.
      headers: {...ghHeaders(token), 'Content-Type': 'application/zip'},
      body: await readFile(zipPath),
    });
    if (!uploaded.ok) throw new Error(`asset upload -> HTTP ${uploaded.status}: ${await uploaded.text()}`);
  }
  return tag;
}

async function artifactDigest(id, version, artifact, {dist = DIST} = {}) {
  if (artifact === 'release') {
    const release = await releaseByTag(`${id}-v${version}`);
    const assetName = `${id}-${version}.zip`;
    const asset = release?.assets.find(a => a.name === assetName);
    if (!asset) throw new Error(`GitHub release asset ${assetName} missing`);
    const bytes = await downloadAsset(asset.url);
    return {sha256: sha256(bytes), bytes: bytes.length};
  }
  const distPath = path.join(dist, `${id}-${version}.zip`);
  const bytes = await readFile(distPath);
  return {sha256: sha256(bytes), bytes: bytes.length};
}

export async function planFor(table, index, {dist = DIST, probeReceipt = url => fetchJson(url)} = {}) {
  const decisions = [];
  const byId = new Map(index.packages.filter(e => e.group === 'arcane').map(e => [e.id, e]));
  for (const [id, entry] of Object.entries(table.modules)) {
    if (!entry.cnMirror) continue;
    const manifest = JSON.parse(await readFile(path.join(ROOT, 'modules', id, 'module.json'), 'utf8'));
    const version = String(manifest.version);
    const live = byId.get(id);
    const decision = {id, version, artifact: entry.artifact, action: 'noop', reason: ''};

    if (!live || compareVersions(version, live.version) > 0) {
      let receipt = null;
      try {
        receipt = await probeReceipt(receiptUrl(id, version));
      } catch (error) {
        decision.action = 'alarm';
        decision.reason = `receipt probe failed: ${error.message}`;
        decisions.push(decision);
        continue;
      }
      if (receipt) {
        let artifact;
        try {
          artifact = await artifactDigest(id, version, entry.artifact, {dist});
        } catch (error) {
          decision.action = 'alarm';
          decision.reason = `artifact invalid: ${error.message}`;
          decisions.push(decision);
          continue;
        }
        if (receipt.sha256 !== artifact.sha256) {
          decision.action = 'alarm';
          decision.reason = `receipt exists with different bytes (receipt ${receipt.sha256}, artifact ${artifact.sha256}); publish a new version`;
        } else {
          decision.action = 'awaiting-index';
          decision.reason = `receipt ${receiptUrl(id, version)} exists; ops reconcile pending (sha256 ${receipt.sha256})`;
        }
      } else {
        decision.action = 'publish';
        decision.reason = live ? `upgrade ${live.version} -> ${version}` : 'not yet mirrored';
      }
    } else if (compareVersions(version, live.version) < 0) {
      decision.action = 'alarm';
      decision.reason = `index ${live.version} is ahead of source ${version}`;
    } else {
      // same version: bytes must match what the mirror already serves
      let artifactSha = null;
      if (entry.artifact === 'release') {
        const release = await releaseByTag(`${id}-v${version}`);
        const assetName = `${id}-${version}.zip`;
        const asset = release?.assets.find(a => a.name === assetName);
        if (!asset) {
          decision.action = 'alarm';
          decision.reason = `same version ${version} but GitHub release asset ${assetName} missing`;
        } else if (asset.size !== live.bytes) {
          decision.action = 'alarm';
          decision.reason = `same version ${version}: release asset ${asset.size}B != mirror ${live.bytes}B`;
        } else {
          const bytes = await downloadAsset(asset.url);
          artifactSha = sha256(bytes);
        }
      } else {
        const distPath = path.join(dist, `${id}-${version}.zip`);
        try {
          artifactSha = sha256(await readFile(distPath));
        } catch {
          decision.action = 'alarm';
          decision.reason = `same version ${version} but dist artifact missing for byte comparison`;
        }
      }
      if (artifactSha && artifactSha !== live.sha256) {
        decision.action = 'alarm';
        decision.reason = `same version ${version} with different bytes (dist/release sha != mirror sha); bump the version`;
      } else if (artifactSha) {
        decision.reason = `already mirrored at ${version} (bytes identical)`;
      }
    }
    decisions.push(decision);
  }
  return decisions;
}

async function loadArtifact(id, version, artifact) {
  if (artifact === 'build') {
    const zipPath = path.join(DIST, `${id}-${version}.zip`);
    const zipBuffer = await readFile(zipPath);
    return {zipBuffer, zipPath};
  }
  const release = await releaseByTag(`${id}-v${version}`);
  const assetName = `${id}-${version}.zip`;
  const asset = release?.assets.find(a => a.name === assetName);
  if (!asset) throw new Error(`${id}@${version}: GitHub release asset ${assetName} missing — cut the release from a local full build first`);
  const zipBuffer = await downloadAsset(asset.url);
  const zipped = readZipModuleJson(zipBuffer);
  if (zipped.id !== id || String(zipped.version) !== String(version)) {
    throw new Error(`${id}@${version}: release zip manifest mismatch (${zipped.id}@${zipped.version})`);
  }
  return {zipBuffer, zipPath: null};
}

async function main() {
  const command = process.argv[2];
  const table = JSON.parse(await readFile(path.join(ROOT, 'tools/cn-mirror.json'), 'utf8'));
  const token = process.env.GITHUB_TOKEN;

  if (command === 'plan') {
    const decisions = await planFor(table, await liveIndex());
    console.log(JSON.stringify(decisions, null, 2));
    if (decisions.some(d => d.action === 'alarm')) process.exit(1);
    return;
  }

  if (command === 'publish-receipts' || command === 'publish-all') {
    if (command === 'publish-all') {
      console.error('note: publish-all no longer writes index.json; running publish-receipts instead');
    }
    const decisions = await planFor(table, await liveIndex());
    const alarms = decisions.filter(d => d.action === 'alarm');
    if (alarms.length) {
      console.error('refusing to publish while alarms are pending:\n' + alarms.map(a => `  ${a.id}: ${a.reason}`).join('\n'));
      process.exit(1);
    }
    const pending = decisions.filter(d => d.action === 'publish');
    if (!pending.length) {
      for (const d of decisions.filter(d => d.action === 'awaiting-index')) {
        console.log(`awaiting-index: ${d.id}@${d.version} — ${d.reason}`);
      }
      console.log('nothing to publish');
      return;
    }
    const {createClient} = await import('./oss-mirror-publish.mjs');
    const client = await createClient();
    const source = {
      repo: REPO,
      commit: process.env.GITHUB_SHA || 'local',
      workflow: process.env.GITHUB_WORKFLOW || 'mirror-release',
      runId: process.env.GITHUB_RUN_ID || 'local',
    };
    const published = [];
    for (const d of pending) {
      const manifest = JSON.parse(await readFile(path.join(ROOT, 'modules', d.id, 'module.json'), 'utf8'));
      const {zipBuffer, zipPath} = await loadArtifact(d.id, d.version, d.artifact);
      if (d.artifact === 'build' && zipPath) await createReleaseWithAsset({id: d.id, version: d.version, zipPath, token});
      const manifestBytes = Buffer.from(`${JSON.stringify(rewriteManifest(manifest, d.id, d.version), null, 2)}\n`, 'utf8');
      const receipt = buildReceipt({
        id: d.id,
        version: d.version,
        zipBuffer,
        manifest,
        manifestBytes,
        source,
      });
      const status = await publishReceipt(client, {receipt, zipBuffer, manifestBytes});
      published.push({
        id: receipt.id,
        version: receipt.version,
        status,
        bytes: receipt.bytes,
        sha256: receipt.sha256,
        receiptUrl: receiptUrl(receipt.id, receipt.version),
      });
      console.log(`${status}: ${receipt.id}@${receipt.version} (${receipt.bytes} bytes, sha256 ${receipt.sha256})`);
    }
    console.log(JSON.stringify({published, indexWriter: 'tanis90/arcanedesk-ops'}, null, 2));
    return;
  }

  if (command === 'audit') {
    const index = await liveIndex();
    const problems = [];
    const moduleIds = new Set(Object.keys(table.modules));
    for (const entry of index.packages.filter(e => e.group === 'arcane')) {
      if (moduleIds.has(entry.id) && !table.modules[entry.id].cnMirror) {
        problems.push(`${entry.id}@${entry.version}: mirrored on CN but cnMirror is false`);
      }
    }
    const count = await verifyMirror({index});
    if (problems.length) {
      console.error('reverse audit failed:\n' + problems.join('\n'));
      process.exit(1);
    }
    console.log(`audit ok: ${count} packages verified, reverse table check clean`);
    return;
  }

  throw new Error(`unknown command: ${command ?? '(none)'} — expected plan | publish-receipts | publish-all | audit`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => { console.error(`error: ${error.message}`); process.exit(1); });
}
