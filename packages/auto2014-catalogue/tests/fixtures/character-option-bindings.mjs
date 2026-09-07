export function originalOptionBindings() {
  return {
    backgroundFeatureFragment: '.original-features.', skillCorrectionId: 'OriginalCorrect',
    backgroundSourcePack: 'original-backgrounds', backgroundFeatureSourcePack: 'original-features',
    featSourcePack: 'original-feats', equipmentSourcePack: 'original-equipment', equipmentBook: 'Original',
    backgroundFeatureTitle: 'Original background feature', passiveEffectPack: 'original-passives',
    tierOverrides: {OriginalManual: 'declared'}, backgroundIdentifierOverrides: {OriginalBackground: 'original-background'},
    backgroundFeatureOverrides: {OriginalBackground: ['OriginalFeature1']}, featIdentifierOverrides: {OriginalFeat: 'original-feat'},
    featStaticEffectSpecs: {OriginalFeat: {id: 'OriginalEffect1', changes: [{key: 'original.value', value: '2', mode: 2}], flags: {original: true}}},
    featAdvancementSpecs: {OriginalFeat: [{_id: 'OriginalAdvance1', type: 'Trait', configuration: {grants: ['original:trained']}}]}
  };
}
