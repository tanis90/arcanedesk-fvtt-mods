export function originalClassChoiceBindings() {
  return {ids: {stormLegacy: 'OriginalOld', stormReplacement: 'OriginalNew', favoredEnemy: 'OriginalEnemy', naturalExplorer: 'OriginalExplorer'},
    labels: Object.fromEntries(['metamagicTitle','metamagicHint','affinityTitle','affinityHint','favoredEnemyTitle','naturalExplorerTitle','rangerImprovementTitle'].map(key => [key, `Original ${key}`])),
    references: {sorcererMetamagicIds: ['OriginalMeta1', 'OriginalMeta2'], divineSoulAffinitySpellIds: ['OriginalSpell1', 'OriginalSpell2'],
      divineSoulAffinityChoiceAdvancementId: 'OriginalAffinity', divineSoulAffinitySpellIdSet: ['OriginalSpell1', 'OriginalSpell2', 'OriginalLegacySpell']}};
}
