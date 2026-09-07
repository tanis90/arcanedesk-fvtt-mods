// Original test content, independent of third-party compendiums.
export function originalCampaignBindings() {
  return {
    book: 'Original handbook', equipmentSourcePack: 'training-gear',
    backgroundTitle: 'Training reward', backgroundHint: 'Choose the reward earned in training.',
    backgroundSourcePack: 'training-backgrounds', campaignSupplement: 'original-training',
    asiTitle: 'Training improvement', featSourcePack: 'training-feats',
    featPackReference: 'original-source.training-feats',
    backgroundFeatIds: [['TrainingBackground', 'TrainingFeat']],
    featAsiAbilities: [['TrainingFeat', ['str', 'dex']]],
    featLevelFourIds: ['TrainingFeat'], featProficiencyUsesIds: ['TrainingFeat'],
  };
}
