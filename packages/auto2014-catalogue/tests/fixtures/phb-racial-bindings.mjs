export function originalRacialBindings() {
  const ids = Object.fromEntries(['poisonResistance1','poisonResistance2','fireResistance','skillVersatility','keenSenses','weaponTraining','fleetOfFoot','aquaticHeritage','drowMagic','dwarvenToughness','halflingLucky','halflingNimbleness','relentlessEndurance'].map(key => [key, `original-${key}`]));
  return {ids, labels: {skillVersatility: 'Original skills', keenSenses: 'Original senses', weaponTraining: 'Original training', drowMagic: 'Original spell grants'},
    spells: {dancingLightsSpellId: 'OriginalSpell1', faerieFireSpellId: 'OriginalSpell2', officialDarknessSpellId: 'OriginalSpell3'},
    identifiers: {[ids.relentlessEndurance]: 'original-endurance'},
    dragonbornBreath: {OriginalLine: {identifier: 'original-line', damageType: 'acid', shape: 'line', size: '30', width: '5', save: 'dex'},
      OriginalCone: {identifier: 'original-cone', damageType: 'cold', shape: 'cone', size: '15', width: '', save: 'con'}}};
}
