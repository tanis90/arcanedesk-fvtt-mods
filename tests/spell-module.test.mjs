import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {ClassicLevel} from 'classic-level';
import {buildSpellModuleFiles} from '../tools/build-spell-module.mjs';
import {composeSpellItem} from '@arcanedesk/spell-compiler';
import {spellAutomationSpecs} from '@arcanedesk/spells-2014';
import {createLightCarrierActor} from '@arcanedesk/spells-2014/resources/light-carrier';

const built = await buildSpellModuleFiles();
const code = new TextDecoder().decode(built.files.get('scripts/arcane-spells.js'));

test('packaged light carrier database reopens with the original illumination contract', async () => {
  assert.equal(built.manifest.packs.find(pack => pack.name === 'summons').type, 'Actor');
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'arcane-carrier-read-'));
  let database;
  try {
    for (const [name, bytes] of built.files) {
      if (name.startsWith('packs/summons/')) await fs.writeFile(path.join(directory, path.basename(name)), bytes);
    }
    database = new ClassicLevel(directory, {valueEncoding: 'json', createIfMissing: false});
    await database.open();
    const rows = await database.iterator().all();
    assert.equal(rows.length, 1);
    const [key, actor] = rows[0];
    assert.equal(key, '!actors!arcaneLight00001');
    assert.equal(actor.prototypeToken.light.bright, 0);
    assert.equal(actor.prototypeToken.light.dim, 10);
    assert.equal(actor.prototypeToken.actorLink, false);
    assert.deepEqual(actor.items, []);
    assert.deepEqual(actor.effects, []);
  } finally {
    if (database) await database.close();
    await fs.rm(directory, {recursive: true, force: true});
  }
});
function host() {
  const hooks = new Map(), menus = [], warnings = []; let nextId = 0;
  const add = (name, callback, once) => {const id = ++nextId; hooks.set(id, {name, callback, once}); return id;};
  const game = {ready: false, actors: [], users: [], scenes: [], packs: new Map(),
    system: {id: 'dnd5e', version: '5.3.3'}, release: {generation: 13},
    user: {id: 'originalGM', isGM: true},
    modules: new Map([['arcane-spells-2014', {active: true}], ['midi-qol', {active: true}], ['dae', {active: true}]]),
    settings: {registerMenu: (...args) => menus.push(args)}};
  const context = vm.createContext({game, TextEncoder, TextDecoder, structuredClone,
    libWrapper: {register() {}},
    canvas: {tokens: {placeables: []}}, setTimeout: (...args) => setTimeout(...args).unref(), clearTimeout, queueMicrotask,
    foundry: {utils: {deepClone: structuredClone, randomID: (size = 16) => 'x'.repeat(size)},
      applications: {api: {ApplicationV2: class {}, DialogV2: {}}}, documents: {collections: {CompendiumCollection: {}}}},
    CONFIG: {Item: {documentClass: class {}}},
    Hooks: {on: (name, cb) => add(name, cb, false), once: (name, cb) => add(name, cb, true),
      off: (_name, id) => hooks.delete(id), callAll() {}, call: () => true},
    console: {log() {}, warn: (...args) => warnings.push(args)}});
  return {game, context, menus, hooks, warnings, async emit(name) {
    for (const [id, hook] of [...hooks]) if (hook.name === name) {
      if (hook.once) hooks.delete(id);
      await hook.callback();
    }
    await new Promise(resolve => setImmediate(resolve));
  }};
}

test('candidate browser bundle boots both real scripts and exposes the GM generation menu', async () => {
  const h = host();
  new vm.Script(code).runInContext(h.context);
  assert.equal(h.game.modules.get('arcane-spells-2014').api, undefined);
  await h.emit('init');
  assert.equal(h.menus.length, 1);
  assert.equal(h.menus[0][0], 'arcane-spells-2014');
  assert.equal(h.menus[0][2].restricted, true);
  h.game.ready = true;
  await h.emit('ready');
  const api = h.game.modules.get('arcane-spells-2014').api;
  assert.equal(api.getCoverage().length, 187);
  assert.equal(typeof api.dispatchPerSpellScript, 'function');
  assert.equal(typeof api.finalizeNativeSummonUse, 'function');
  assert.equal(typeof api.cancelNativeSummonUse, 'function');
  assert.equal(api.applyDeclaredDivineSmite, undefined);
  for (const id of ['harm', 'banishing-smite', 'toll-the-dead']) {
    const contract = api.runtime.getScriptContract(id);
    assert.equal(contract.version, 1);
    assert(contract.handlers.length > 0);
  }
  h.game.user.isGM = false;
  await assert.rejects(api.openGenerator(), /Only a GM/);
  assert.deepEqual(h.warnings, []);
});

const FLAG = 'arcane-dnd5e-2014-automation';

test('generator binds its carrier provider to the ready Game rather than the startup Game', async () => {
  const h=host();
  delete h.game.packs;
  new vm.Script(code).runInContext(h.context);
  await h.emit('init');
  const source={collection:'dnd5e.spells',documentName:'Item',title:'Original SRD fixture',
    metadata:{flags:{dnd5e:{sourceBook:'SRD 5.1'}}},getDocuments:async()=>[{toObject:()=>({
      _id:'originalSource01',name:'Original light fixture',type:'spell',
      system:{identifier:'dancing-lights',level:0,source:{rules:'2014'},description:{value:'Original fixture.'}},
    })}]};
  let resourceReads=0;
  const carrier={documentName:'Actor',getDocuments:async()=>{
    resourceReads++;
    return [{id:'arcaneLight00001',toObject:()=>createLightCarrierActor()}];
  }};
  h.context.game={...h.game,ready:true,packs:new Map([
    [source.collection,source],['arcane-spells-2014.summons',carrier],
  ])};
  for(const id of ['times-up','socketlib','lib-wrapper'])h.context.game.modules.set(id,{active:true});
  h.context.crypto={randomUUID:()=> 'original-generation-id'};
  h.context.MidiQOL={completeItemUse:()=>{throw new Error('Preview must not cast a spell');}};
  let preview;
  h.context.foundry.applications.api.DialogV2={
    prompt:async()=>({source:source.collection,rules:'',target:'original-output'}),
    confirm:async config=>{preview=config.content;return false;},
  };
  await h.emit('ready');
  const result=await h.context.game.modules.get('arcane-spells-2014').api.openGenerator();
  assert.equal(result.status,'cancelled',JSON.stringify(result.rows?.filter(row=>row.name==='Original light fixture')));
  assert.match(preview,/1 spells can be generated/);
  assert(resourceReads>=2,'Binding and readiness must inspect the ready resource pack');
});

test('bundled pre-use rejects an existing Light Item when ATL is lost, with a no-commit receipt', async () => {
  const h = host();
  const receipts = [], notices = [];
  h.context.ui = {notifications: {warn: message => notices.push(message)}};
  h.context.Hooks.callAll = (event, value) => receipts.push({event, value});
  new vm.Script(code).runInContext(h.context);
  const preflight = [...h.hooks.values()].find(hook => hook.name === 'dnd5e.preUseActivity'
    && hook.callback.toString().includes('Enable ATL'));
  assert(preflight, 'Real bundled compiler preflight must include the executor guard');
  const source = actor('originalSource');
  const item = spell('light', source), activity = item.system.activities[0];
  const usage = () => ({midiOptions: {workflowOptions: {
    arcaneActionInvocationId: 'originalInvocation', sourceTokenUuid: 'Scene.original.Token.source',
  }}});
  for (const installed of [undefined, {active: false}]) {
    if (installed) h.game.modules.set('ATL', installed); else h.game.modules.delete('ATL');
    const config = usage();
    assert.equal(preflight.callback(activity, config), false);
    assert.equal(config.arcaneActionRejection.code, 'ACTION_MISCONFIGURED');
    assert.match(config.arcaneActionRejection.message, /Enable ATL/);
    assert.equal(receipts.at(-1).value.committed, false);
    assert.equal(receipts.at(-1).value.sourceItemUuid, item.uuid);
  }
  h.game.modules.set('ATL', {active: true});
  const enabled = usage();
  assert.equal(preflight.callback(activity, enabled), true, JSON.stringify(enabled.arcaneActionRejection));
  assert.equal(enabled.arcaneActionRejection, undefined);
  h.game.modules.get('ATL').active = false;
  assert.equal(preflight.callback(activity, usage()), false);
  const bolt = spell('fire-bolt', source);
  h.context.canvas.scene={uuid:'Scene.original'};
  const sourceToken={documentName:'Token',uuid:'Scene.original.Token.source',actor:source,parent:h.context.canvas.scene};
  bolt.system.activities[0].actor=source;
  bolt.system.activities[0].getUsageToken=()=>sourceToken;
  h.context.MidiQOL={checkActivityRange:()=>({result:'normal'})};
  const boltUse = {...usage(), workflow: {targets: new Set([{uuid: 'Scene.original.Token.target'}])}};
  assert.equal(preflight.callback(bolt.system.activities[0], boltUse), true);
  delete item.flags[FLAG].spellAutomation;
  assert.equal(preflight.callback(activity, usage()), true, 'Unowned Items are outside this policy');
  assert.equal(notices.length, 3);
});

function actor(id, hp = 60) {
  return {id, uuid: `Actor.${id}`, documentName: 'Actor', effects: [], items: [], flags: {}, reset() {},
    system: {attributes: {hp: {value: hp, max: hp, temp: 0}}}};
}

test('bundled selected-target range rejection precedes consumption and publishes a no-write receipt',()=>{
  const h=host(),receipts=[];h.context.ui={notifications:{warn(){}}};
  h.context.Hooks.callAll=(event,value)=>receipts.push({event,value});
  new vm.Script(code).runInContext(h.context);
  const preflight=[...h.hooks.values()].find(h=>h.name==='dnd5e.preUseActivity'
    && h.callback.toString().includes('Compiler Activity pre-use rejected')).callback;
  const source=actor('originalSource'),item=spell('guidance',source),activity=item.system.activities[0];
  h.context.canvas.scene={uuid:'Scene.original'};
  const token={documentName:'Token',uuid:'Scene.original.Token.source',actor:source,parent:h.context.canvas.scene};
  activity.actor=source;activity.getUsageToken=()=>token;
  h.context.MidiQOL={checkActivityRange:()=>({result:'fail'})};
  const usage=()=>({workflow:{targets:new Set([{uuid:'Scene.original.Token.target'}])},midiOptions:{workflowOptions:{
    arcaneActionInvocationId:'originalRangeUse',sourceTokenUuid:token.uuid,
  }}});
  const rejected=usage();assert.equal(preflight(activity,rejected),false);
  assert.match(rejected.arcaneActionRejection.message,/allowed range/);
  assert.equal(receipts.at(-1).value.committed,false);
  assert.equal(receipts.at(-1).value.sourceItemUuid,item.uuid);
  assert.deepEqual(source.effects,[]);
  h.context.MidiQOL.checkActivityRange=()=>({result:'normal'});
  assert.equal(preflight(activity,usage()),true);
});

test('bundled async resource check defers a missing carrier to the synchronous rejection gate', async () => {
  const h=host();const receipts=[];
  h.context.ui={notifications:{warn(){},error(){}}};
  h.context.fromUuid=async()=>null;
  h.context.Hooks.callAll=(event,value)=>receipts.push({event,value});
  new vm.Script(code).runInContext(h.context);
  h.game.ready=true;await h.emit('ready');
  const item=spell('dancing-lights',actor('originalSource'));
  const activity=item.system.activities[0];activity.actor=item.actor;activity.id=activity._id;
  const midi=[...h.hooks.values()].find(h=>h.name==='midi-qol.preItemRollV2');
  const native=[...h.hooks.values()].find(h=>h.name==='dnd5e.preUseActivity'
    && h.callback.toString().includes('native summon pre-use rejected'));
  assert(midi);assert(native);
  const usage={create:{summons:true}};
  assert.equal(await midi.callback({workflow:{activity,item,actor:item.actor},usage}),true);
  const cloned=structuredClone(usage);
  assert.equal(native.callback(activity,cloned,{}),false);
  assert.equal(cloned.arcaneActionRejection.code,'ACTION_MISCONFIGURED');
  assert.match(cloned.arcaneActionRejection.message,/Actor resource is missing/);
  assert.equal(receipts.at(-1).value.sourceItemUuid,item.uuid);
  assert.equal(receipts.at(-1).value.requestId,null);
  assert.deepEqual(item.actor.effects,[]);
});
function spell(id, source) {
  const {item} = composeSpellItem({_id: 'originalSpell001', name: 'Original test spell', type: 'spell',
    system: {identifier: id, description: {value: 'Original test description', chat: ''}, source: {rules: '2014'}}}, spellAutomationSpecs[id]);
  item.actor = source; item.parent = source; item.id = item._id; item.documentName = 'Item';
  item.uuid = source.uuid + '.Item.' + item.id; item.isEmbedded = true;
  item.effects = item.effects.map(data => ({...data, toObject: () => structuredClone(data)}));
  item.system.activities = Object.values(item.system.activities).map(data => ({...data, item,
    uuid: item.uuid + '.Activity.' + data._id}));
  return item;
}

test('Booming Blade owned-weapon rejection is a synchronous no-write pre-use result', async () => {
  const h=host(),receipts=[];h.context.ui={notifications:{warn(){}}};
  h.context.Hooks.callAll=(event,value)=>receipts.push({event,value});
  new vm.Script(code).runInContext(h.context);
  const source=actor('originalSource'),item=spell('booming-bladetce',source),activity=item.system.activities[0];
  h.context.canvas.scene={uuid:'Scene.original'};
  const token={documentName:'Token',uuid:'Scene.original.Token.source',actor:source,parent:h.context.canvas.scene};
  activity.actor=source;activity.getUsageToken=()=>token;
  h.context.MidiQOL={checkActivityRange:()=>({result:'normal'})};
  const native=[...h.hooks.values()].find(h=>h.name==='dnd5e.preUseActivity'
    && h.callback.toString().includes('Compiler Activity pre-use rejected')).callback;
  const midi=[...h.hooks.values()].find(h=>h.name==='midi-qol.preItemRollV2').callback;
  const usage=()=>({workflow:{targets:new Set([{uuid:'Scene.original.Token.target'}])},midiOptions:{workflowOptions:{
    arcaneActionInvocationId:'originalWeaponUse',sourceTokenUuid:token.uuid,
  }}});
  const missing=usage();
  assert.equal(await midi({workflow:{activity,item,actor:source},usage:missing}),true);
  assert.equal(native(activity,missing),false);assert.equal(missing.arcaneActionRejection.code,'ACTION_BLOCKED');
  assert.equal(receipts.at(-1).value.committed,false);assert.equal(receipts.at(-1).value.sourceItemUuid,item.uuid);
  const attack={id:'originalAttack',type:'attack',attack:{type:{value:'melee',classification:'weapon'}}};
  const weapon={id:'originalWeapon',name:'Original weapon',type:'weapon',sort:0,system:{equipped:false,activities:[attack]}};
  source.items.push(weapon);assert.equal(native(activity,usage()),false);
  weapon.system.equipped=true;assert.equal(native(activity,usage()),true);
  attack.attack.type.value='ranged';assert.equal(native(activity,usage()),false);
  attack.attack.type.value='melee';assert.equal(native(activity,usage()),true);
  item.flags[FLAG].spellAutomation.runtimePlan.rules.find(r=>r.adapter?.adapter==='owned-weapon-attack-v1' && r.adapter.phase==='cast').operations=[];
  const invalid=usage();assert.equal(native(activity,invalid),false);assert.equal(invalid.arcaneActionRejection.code,'ACTION_MISCONFIGURED');
  assert.equal(receipts.at(-1).value.committed,false);assert.deepEqual(source.effects,[]);
});

for (const spellId of ['shillelagh', 'magic-weapon']) test(`${spellId} defers early Midi abort and rejects missing equipment with a no-write receipt`, async () => {
  const h=host(), receipts=[];
  h.context.ui={notifications:{warn(){}}};
  h.context.Hooks.callAll=(event,value)=>receipts.push({event,value});
  new vm.Script(code).runInContext(h.context);
  const source=actor('originalSource'), item=spell(spellId,source);
  const cast=item.system.activities.find(a=>a.flags?.[FLAG]?.semanticActionId==='cast');
  const enchant=item.system.activities.find(a=>a.type==='enchant');
  enchant.applyEnchantment=()=>{throw Error('Preflight must not apply an enchantment');};
  cast.actor=source;
  const midi=[...h.hooks.values()].find(h=>h.name==='midi-qol.preItemRollV2').callback;
  const native=[...h.hooks.values()].find(h=>h.name==='dnd5e.preUseActivity'
    && h.callback.toString().includes('Compiler Activity pre-use rejected')).callback;
  const usage=()=>({midiOptions:{workflowOptions:{
    arcaneActionInvocationId:'originalEquipmentUse',sourceTokenUuid:'Scene.original.Token.source',
  }}});
  const missing=usage();
  assert.equal(await midi({workflow:{activity:cast,item,actor:source},usage:missing}),true);
  assert.equal(native(cast,missing),false);
  assert.equal(missing.arcaneActionRejection.code,'ACTION_BLOCKED');
  assert.match(missing.arcaneActionRejection.message,/no equipped weapon/);
  assert.equal(receipts.at(-1).value.committed,false);
  assert.equal(receipts.at(-1).value.sourceItemUuid,item.uuid);
  assert.deepEqual(source.effects,[]);

  const weapon={id:'originalClub',uuid:source.uuid+'.Item.originalClub',type:'weapon',
    name:'Original training club',sort:0,effects:[],system:{equipped:false,type:{baseItem:'club'}}};
  source.items.push(weapon);
  assert.equal(native(cast,usage()),false,'Unequipped eligible weapon is still blocked');
  weapon.system.equipped=true;
  assert.equal(native(cast,usage()),true,'Equipping a valid weapon reopens the same Activity');
  assert.deepEqual(weapon.effects,[]);
  assert.deepEqual(source.effects,[]);

  delete enchant.applyEnchantment;
  const invalid=usage();
  assert.equal(native(cast,invalid),false);
  assert.equal(invalid.arcaneActionRejection.code,'ACTION_MISCONFIGURED');
  assert.equal(receipts.at(-1).value.committed,false);
});

test('native damage preparation chooses the Toll die without replacing damage settlement', () => {
  const h = host();
  h.context.ui = {notifications: {warn() {}}};
  new vm.Script(code).runInContext(h.context);
  const hook = [...h.hooks.values()].find(h => h.name === 'dnd5e.preRollDamage'
    && h.callback.toString().includes('Damage die selection rejected')).callback;
  const source = actor('originalSource'), target = {uuid: 'Scene.original.Token.target', actor: actor('originalTarget', 60)};
  const item = spell('toll-the-dead', source), activity = item.system.activities[0];
  const make = number => ({subject: activity, workflow: {id: `original${number}`, item, activity, actor: source, targets: [target]},
    rolls: [{parts: [`${number}d8`, '2'], options: {type: 'necrotic', properties: ['mgc']}}]});
  for (const number of [1, 2, 3, 4]) {
    for (const hp of [60, 59]) {
      target.actor.system.attributes.hp = {value: hp, max: 60, temp: 10};
      const config = make(number), before = structuredClone(config.rolls[0].options);
      assert.equal(hook(config), true, JSON.stringify(config.workflow.__arcaneCompilerRuntimeError));
      assert.equal(config.rolls[0].parts[0], `${number}d${hp === 60 ? 8 : 12}`);
      assert.equal(config.rolls[0].parts[1], '2');
      assert.deepEqual(config.rolls[0].options, before);
      assert.equal(target.actor.system.attributes.hp.value, hp);
      assert.equal(target.actor.system.attributes.hp.temp, 10);
      const receipt = config.workflow.__arcanePerSpellScriptReceipts[0];
      assert.equal(receipt.committed, false);
      assert.equal(receipt.authority, 'damage-roll-caller');
      const chosen = config.rolls[0].parts[0];
      target.actor.system.attributes.hp.value = hp === 60 ? 59 : 60;
      assert.equal(hook(config), true);
      assert.equal(config.rolls[0].parts[0], chosen, 'Repeated same config preserves its snapshot');
      assert.equal(config.workflow.__arcanePerSpellScriptReceipts.length, 1);
    }
  }
  h.game.user.isGM = false;
  assert.equal(hook(make(1)), true, 'Pure local roll preparation does not require a GM');
  target.actor.system.attributes.hp = {value: 60, max: 60, effectiveMax: 70, temp: 0};
  const raisedMaximum = make(1);
  assert.equal(hook(raisedMaximum), true);
  assert.equal(raisedMaximum.rolls[0].parts[0], '1d12');
  target.actor.system.attributes.hp = {value: 50, max: 60, effectiveMax: 50, temp: 0};
  const reducedMaximum = make(1);
  assert.equal(hook(reducedMaximum), true);
  assert.equal(reducedMaximum.rolls[0].parts[0], '1d8');
  delete target.actor.system.attributes.hp.effectiveMax;
  target.actor.system.attributes.hp.value = NaN;
  const invalid = make(1);
  assert.equal(hook(invalid), false);
  assert.equal(invalid.rolls[0].parts[0], '1d8');
  assert.match(invalid.workflow.__arcaneCompilerRuntimeError.message, /valid HP/);
  target.actor.system.attributes.hp.value = 59;
  const handler = item.flags[FLAG].spellAutomation.runtimePlan.script.handlers[0];
  handler.configuration.allowedFaces = [8];
  const invalidOutput = make(1);
  assert.equal(hook(invalidOutput), false);
  assert.equal(invalidOutput.rolls[0].parts[0], '1d8');
  assert.match(invalidOutput.workflow.__arcaneCompilerRuntimeError.message, /invalid synchronous result/);
  handler.configuration.allowedFaces = [8, 12];
  const multiple = make(1); multiple.workflow.targets.push(target);
  assert.equal(hook(multiple), false);
  item.flags[FLAG].spellAutomation.runtimePlan.script.version = 99;
  const preUse = [...h.hooks.values()].find(h => h.name === 'dnd5e.preUseActivity'
    && h.callback.toString().includes('Enable ATL')).callback;
  const rejectedUse = {workflow: {targets: [target]}};
  assert.equal(preUse(activity, rejectedUse), false);
  assert.equal(rejectedUse.arcaneActionRejection.code, 'ACTION_MISCONFIGURED');
  assert.match(rejectedUse.arcaneActionRejection.message, /unavailable or mismatched/);
  const missing = make(1);
  assert.equal(hook(missing), false);
  assert.equal(missing.rolls[0].parts[0], '1d8');
  const bolt = spell('fire-bolt', source);
  assert.equal(hook({subject: bolt.system.activities[0], rolls: []}), true);
});

test('bundled Banishing Smite dispatcher handles threshold, failure, dedupe and GM authority', async () => {
  const h = host(); new vm.Script(code).runInContext(h.context); await h.emit('ready');
  const api = h.game.modules.get('arcane-spells-2014').api;
  const source = actor('originalSource'), target = {actor: actor('originalTarget', 51)};
  const item = spell('banishing-smite', source);
  const handler = item.flags[FLAG].spellAutomation.runtimePlan.script.handlers[0];
  const args = {event: handler.event, item, target, workflow: {id: 'originalWorkflow'},
    damageReceipt: {schema: 'arcane.authoritative-damage-receipt.v1', oldHitPoints: 61, newHitPoints: 51, hitPointDamage: 10}};
  const skipped = await api.dispatchPerSpellScript(args);
  assert.equal(skipped.length, 1); assert.equal(skipped[0].status, 'skipped');
  assert.equal((await api.dispatchPerSpellScript(args)).length, 0);
  target.actor.system.attributes.hp.value = 50;
  const failed = await api.dispatchPerSpellScript({...args, workflow: {id: 'originalFailure'},
    damageReceipt: {...args.damageReceipt, newHitPoints: 50}});
  assert.equal(failed[0].status, 'indeterminate');
  assert.equal(failed[0].details.stage, 'create-concentration');
  assert.equal(failed[0].retry, false);
  const writes = [], dependencies = [];
  source.beginConcentrating = async anchor => {
    assert.equal(anchor.item, item);
    const effect = {id: 'originalConcentration', uuid: source.uuid + '.ActiveEffect.originalConcentration'};
    source.concentration = {effects: [effect], items: [item]};
    writes.push('concentration'); return effect;
  };
  source.endConcentration = async () => {throw new Error('No previous concentration in this fixture');};
  target.actor.createEmbeddedDocuments = async (type, documents) => {
    assert.equal(type, 'ActiveEffect'); assert.equal(documents.length, 1);
    assert.equal(documents[0].origin, item.uuid);
    const effect = {...documents[0], id: 'originalBanished', uuid: target.actor.uuid + '.ActiveEffect.originalBanished',
      async update(value) {writes.push(value);}};
    target.actor.effects.push(effect); writes.push('banished'); return [effect];
  };
  h.game.dnd5e = {registry: {dependents: {track: (...args) => dependencies.push(args)}}};
  const successArgs = {...args, workflow: {id: 'originalSuccess'}, damageReceipt: {...args.damageReceipt, newHitPoints: 50}};
  const resolved = await api.dispatchPerSpellScript(successArgs);
  assert.equal(resolved[0].status, 'resolved', JSON.stringify(resolved));
  assert.equal(resolved[0].committed, true); assert.equal(resolved[0].retry, false);
  assert.equal(writes.filter(value => value === 'concentration').length, 1);
  assert.equal(writes.filter(value => value === 'banished').length, 1);
  assert.equal(dependencies.length, 1);
  const count = writes.length;
  assert.equal((await api.dispatchPerSpellScript(successArgs)).length, 0);
  assert.equal(writes.length, count);
  h.game.user.isGM = false;
  assert.equal((await api.dispatchPerSpellScript({...args, workflow: {id: 'originalPlayer'}})).length, 0);
});

test('bundled Harm real script prepares one bounded transaction through the Midi hook', async () => {
  const h = host(); new vm.Script(code).runInContext(h.context); await h.emit('ready');
  const source = actor('originalSource'), target = {actor: actor('originalTarget', 20), document: {uuid: 'Scene.original.Token.target'}};
  const item = spell('harm', source);
  const activity = item.system.activities.find(entry => entry.type === 'save');
  const workflow = {id: 'originalDamageWorkflow', item, activity, actor: source,
    token: {documentName: 'Token', uuid: 'Scene.original.Token.source'}, failedSaves: new Set([target]), targets: new Set([target])};
  const damageItem = {actorUuid: target.actor.uuid, oldHP: 20, oldTempHP: 0, newTempHP: 0,
    hpDamage: 70, newHP: -50, tempDamage: 0, appliedDamage: 70, calcDamageOptions: {}};
  const hook = [...h.hooks.values()].find(entry => entry.name === 'midi-qol.preTargetDamageApplication');
  const context = {item, workflow, damageItem};
  assert.equal(await hook.callback(target, context), true, JSON.stringify(h.warnings));
  assert.equal(damageItem.newHP, 1); assert.equal(damageItem.hpDamage, 19);
  const envelope = structuredClone(damageItem.flags[FLAG].perSpellDamageTransaction);
  assert.equal(envelope.scriptId, 'harm');
  assert.equal(await hook.callback(target, context), true, JSON.stringify(h.warnings));
  assert.deepEqual(damageItem.flags[FLAG].perSpellDamageTransaction, envelope);
  assert.equal(workflow.__arcanePerSpellDamageTransactionIds.size, 1);
  h.context.fromUuidSync = uuid => uuid === item.uuid ? item : null;
  const preApply = [...h.hooks.values()].find(entry => entry.name === 'dnd5e.preApplyDamage');
  const updates = {'system.attributes.hp.value': -50};
  assert.equal(preApply.callback(target.actor, 70, updates, damageItem.calcDamageOptions), true, JSON.stringify(h.warnings));
  assert.equal(updates['system.attributes.hp.value'], 1);
  const pendingPath = `flags.${FLAG}.perSpellDamageTransactionsPending.${envelope.transactionId}`;
  assert.equal(updates[pendingPath].status, 'pending');
  assert.equal(updates[pendingPath].ordinaryHitPointLoss, 19);
  function applyUpdate(values) {
    for (const [key, value] of Object.entries(values)) {
      const parts = key.split('.'); let object = target.actor;
      for (const part of parts.slice(0, -1)) object = object[part] ??= {};
      object[parts.at(-1)] = structuredClone(value);
    }
  }
  applyUpdate(updates);
  assert.equal(preApply.callback(target.actor, 70, {'system.attributes.hp.value': 1}, damageItem.calcDamageOptions), false);
  const effects = target.actor.effects; effects.get = id => effects.find(effect => effect.id === id);
  let creates = 0, failReceiptWrite = true;
  target.actor.createEmbeddedDocuments = async (type, documents, options) => {
    assert.equal(type, 'ActiveEffect'); assert.equal(options.keepId, true); creates++;
    return documents.map(data => {const effect = {...data, id: data._id, parent: target.actor,
      uuid: target.actor.uuid + '.ActiveEffect.' + data._id}; effects.push(effect); return effect;});
  };
  target.actor.update = async values => {
    if (failReceiptWrite) throw new Error('Original simulated receipt write failure');
    applyUpdate(values);
  };
  const updated = [...h.hooks.values()].find(entry => entry.name === 'updateActor');
  updated.callback(target.actor, updates, {});
  await new Promise(resolve => setImmediate(resolve));
  assert(h.warnings.some(args => args.some(value => String(value).includes('receipt write failure'))));
  assert.equal(creates, 1);
  assert.equal(effects[0].changes[0].value, '-19');
  assert.equal(effects[0].duration.seconds, 3600);
  assert.equal(target.actor.flags[FLAG].perSpellDamageTransactionsPending[envelope.transactionId].status, 'pending');
  failReceiptWrite = false;
  // A fresh runtime has no workflow cache: ready recovery uses persisted Actor receipts.
  const recovered = host(); new vm.Script(code).runInContext(recovered.context);
  recovered.game.actors = [target.actor];
  recovered.context.fromUuidSync = uuid => uuid === item.uuid ? item : null;
  await recovered.emit('ready');
  assert.equal(creates, 1, 'Recovery reuses the already-created effect');
  assert.equal(Object.keys(target.actor.flags[FLAG].perSpellDamageTransactionsPending).length, 0);
  assert.equal(target.actor.flags[FLAG].perSpellDamageTransactionsCompleted[envelope.transactionId].effectApplied, true);
  updated.callback(target.actor, {}, {});
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(creates, 1);
  assert.equal(preApply.callback(target.actor, 70, {'system.attributes.hp.value': 1}, damageItem.calcDamageOptions), false);
  const broken = {...damageItem, flags: {}, calcDamageOptions: {}, hpDamage: 70, newHP: -50};
  assert.equal(await hook.callback(target, {item, workflow: {...workflow, activity: null}, damageItem: broken}), false);
  assert.equal(broken.hpDamage, 0); assert.equal(broken.newHP, 20);
});

test('candidate files are deterministic and declare the sole installed-provider browser import', async () => {
  const again = await buildSpellModuleFiles();
  assert.deepEqual(again.files, built.files);
  assert.deepEqual(built.report.externalImports, ['/modules/auraeffects/scripts/helpers.mjs']);
  for (const entry of built.manifest.esmodules) assert(built.files.has(entry));
  assert(built.files.has('licenses/noble-hashes.txt'));
  assert.equal(JSON.parse(built.files.get('coverage.json')).length, 187);
  assert(![...built.files.keys()].some(name => /private-content|src\/|node_modules|\.mjs$/.test(name)));
});
