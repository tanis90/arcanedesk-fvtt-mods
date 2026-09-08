import {bindSpellPlan} from '@arcanedesk/spell-compiler/binding';
import {emitSpellAutomationItem} from '@arcanedesk/spell-compiler/emitter';
import {checkSpellBindings} from '@arcanedesk/automation-contracts/bindings';
import {previewSpellSources, extractSpellPresentation, describePresentationDependencies} from './sources.mjs';

/** Browser entry consuming a precompiled plan and explicit target/resource bindings.
 * The host verifies referenced resource documents before writing a world pack.
 */
export function bindSpellContent({source, plan, target, bindings, sourceRuleset, identities = {}, ddbIdentities = {}}) {
  const preview = previewSpellSources({documents: [source],
    catalogue: [{id: plan.definitionId, level: plan.contract.level}], sourceRuleset, identities, ddbIdentities});
  const match = preview.rows[0];
  if (match.status !== 'matched') return {status: 'rejected', errors: [{code: match.reason}]};
  const check = checkSpellBindings(plan, bindings, target?._id);
  if (!check.valid) return {status: 'unbound', errors: check.errors, requirements: check.requirements};
  const content = extractSpellPresentation(source);
  content.type = 'spell';
  content.system.identifier = plan.definitionId;
  const compilation = bindSpellPlan(content, plan, {documentIdentity: target, resourceBindings: bindings});
  const item = emitSpellAutomationItem(content, compilation);
  return {status: 'bound', item, requirements: check.requirements,
    receipt: {schemaVersion: 1, definitionId: plan.definitionId, executionPlanHash: plan.executionPlanHash,
      contentHash: compilation.contentHash, targetUuid: bindings.documentUuid, sourceId: source._id,
      sourceKind: match.sourceKind ?? 'foundry', sourceDefinitionId: match.definitionId ?? null,
      presentationDependencies: describePresentationDependencies(source)}};
}
