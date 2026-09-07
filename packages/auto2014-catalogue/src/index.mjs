import {composeSpellItem} from '@arcanedesk/auto2014-compiler';
import {spellAutomationSpecs,spellAutomationCompiledIds} from './data/spell-automation/registry.mjs';
import {assertRegisteredPerSpellScript} from './data/spell-automation/scripts/registry.mjs';
export {spellAutomationSpecs,spellAutomationCompiledIds};
export {summonProfileIdentities} from './data/summon-automation/identities.mjs';
export {perSpellScriptRegistry,readPerSpellScriptSource} from './data/spell-automation/scripts/registry.mjs';
const compiledIds=new Set(spellAutomationCompiledIds);

// Exact identifier matching; never guess from a translated display name.
export function composeRegisteredSpell(contentItem,emissionOptions={}) {
  const id=contentItem?.system?.identifier;
  if(!compiledIds.has(id))throw new Error(`No compiled spell recipe registered for ${id ?? '(missing identifier)'}`);
  const definition=spellAutomationSpecs[id];
  assertRegisteredPerSpellScript(definition);
  const result=composeSpellItem(contentItem,definition,emissionOptions);
  // Match the complete module's final animation metadata policy. A disabled,
  // uncustomized AutoAnimations placeholder must not survive pack assembly.
  const animation=result.item.flags?.autoanimations;
  if(animation?.isEnabled===false && animation.isCustomized!==true)delete result.item.flags.autoanimations;
  return result;
}
