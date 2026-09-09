import {test} from "node:test";
import assert from "node:assert/strict";
import {previewSpellSources, extractSpellPresentation, describePresentationDependencies} from "../src/sources.mjs";

const catalogue = [{id: "bless", level: 1}, {id: "harm", level: 6}];

test('zero-level sources match without relaxing ruleset or level identity', () => {
  const documents = [{_id: 'originalCantrip1', name: 'Original light', type: 'spell',
    system: {identifier: 'light', level: 0, source: {rules: '2014'}}}];
  const before = structuredClone(documents);
  const options = {documents, catalogue: [{id: 'light', level: 0}]};
  assert.equal(previewSpellSources(options).rows[0].status, 'matched');
  assert.deepEqual(documents, before);
  documents[0].system.level = 1;
  assert.equal(previewSpellSources(options).rows[0].reason, 'conflicting-level');
  documents[0].system.level = 0;
  documents[0].system.source.rules = '2024';
  assert.equal(previewSpellSources(options).rows[0].reason, 'unsupported-or-unknown-ruleset');
  assert.throws(() => previewSpellSources({...options, catalogue: [{id: 'light', level: -1}]}), /Invalid/);
});
const spell = (changes = {}) => ({_id: "original1", name: "原创测试名称", type: "spell",
  system: {identifier: "bless", level: 1, source: {rules: "2014"}}, ...changes});
const preview = (documents, options = {}) => previewSpellSources({documents, catalogue, ...options});

test("matching uses identity and rules, preserves input and is repeatable", () => {
  const documents = [spell()];
  const before = structuredClone(documents);
  assert.equal(preview(documents).rows[0].id, "bless");
  assert.deepEqual(preview(documents), preview(documents));
  assert.deepEqual(documents, before);
});

test('DDB flags and definition IDs support translated content without trusting Legacy or names', () => {
  const input = spell({flags: {ddbimporter: {definitionId: 900001, is2014: true, is2024: false, legacy: true}}});
  delete input.system.source.rules; delete input.system.identifier;
  const before = structuredClone(input);
  const mapping = {ddbIdentities: {'900001': 'bless'}};
  assert.equal(preview([input], mapping).rows[0].matchedBy, 'ddb-definition-id');
  assert.deepEqual(input, before);
  assert.equal(preview([input]).rows[0].status, 'unsupported');
  assert.equal(preview([input], {...mapping, identities: {original1: 'harm'}}).rows[0].reason, 'conflicting-identity');
  input.system.source.rules = '2024';
  assert.equal(preview([input], mapping).rows[0].reason, 'conflicting-ddb-ruleset');
  delete input.system.source.rules; input.flags.ddbimporter.is2024 = true;
  assert.equal(preview([input], mapping).rows[0].reason, 'conflicting-ddb-ruleset');
  input.flags.ddbimporter.is2014 = false;
  assert.equal(preview([input], {...mapping, sourceRuleset: '2014'}).rows[0].reason, 'conflicting-ruleset');
});

test('presentation dependency inventory retains unresolved references without modifying or fetching content', () => {
  const input = spell({img: 'modules/original/icon.webp'});
  input.system.description = {value: '<img src="modules/original/a.webp"><a href=world/original>Example</a> @UUID[Compendium.original.spells.Item.original00000001]',
    chat: '@UUID[Compendium.original.spells.Item.original00000001]'};
  const before = structuredClone(input), report = describePresentationDependencies(input);
  assert.equal(report.verified, false); assert.equal(report.references.length, 4);
  assert(report.references.some(entry => entry.kind === 'asset' && entry.value === 'modules/original/a.webp'));
  assert.deepEqual(input, before);
});

test("unknown rules and newer rules cannot silently become 2014", () => {
  for (const rules of [undefined, "2024"]) {
    const input = spell(); input.system.source = {rules};
    input.flags = {ddbimporter: {isLegacy: true}};
    assert.equal(preview([input]).rows[0].status, "rejected");
  }
  const input = spell(); input.system.source.rules = "2024";
  assert.equal(preview([input], {sourceRuleset: "2014"}).rows[0].reason, "conflicting-ruleset");
  delete input.system.source.rules;
  assert.equal(preview([input], {sourceRuleset: "2014"}).rows[0].status, "matched");
});

test("names never authorize mapping; explicit IDs still require matching level", () => {
  const input = spell(); input.name = "bless"; delete input.system.identifier;
  assert.equal(preview([input]).rows[0].status, "unsupported");
  assert.equal(preview([input], {identities: {original1: "bless"}}).rows[0].status, "matched");
  assert.equal(preview([input], {identities: {original1: "harm"}}).rows[0].reason, "conflicting-level");
  assert.equal(preview([spell()], {identities: {original1: "harm"}}).rows[0].reason, "conflicting-identity");
});

test("ambiguous sources reject all candidates, never choose by order", () => {
  const first = spell(), second = spell({_id: "original2"});
  assert.ok(preview([first, second]).rows.every(row => row.reason === "ambiguous-spell"));
  assert.ok(preview([first, first]).rows.every(row => row.reason === "duplicate-source-id"));
});

test("presentation preserves original text and links without retaining automation", () => {
  const input = spell({img: "caller/icon.webp", effects: [{script: "untrusted"}],
    flags: {"midi-qol": {onUseMacroName: "untrusted"}}});
  input.system.description = {value: "<p>原创夹具 @UUID[Compendium.caller.spells.original1]</p>", chat: "原创聊天"};
  input.system.activities = {foreign: {type: "utility"}};
  input.system.materials = {value: "原创材料", consumed: true};
  const result = extractSpellPresentation(input);
  assert.deepEqual(result.system.description, input.system.description);
  assert.deepEqual(result.system.materials, {value: "原创材料"});
  assert.equal(result.effects, undefined); assert.equal(result.flags, undefined);
  assert.equal(result.system.activities, undefined);
  result.system.description.value = "changed";
  assert.notEqual(result.system.description.value, input.system.description.value);
});
