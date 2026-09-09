// Original minimal map carrier. This is not a creature stat block or a combatant.
export const lightCarrierIdentity = Object.freeze({
  profileId: 'dancing-light-carrier', revision: 1,
  documentId: 'arcaneLight00001', recipeId: 'light-only',
});

export const dancingLightsPool = Object.freeze({
  poolId: 'dancing-lights',
  choices: Object.freeze([4, 1, 2, 3].map(count => Object.freeze({
    ...lightCarrierIdentity,
    choice: String(count), label: `${count} light${count === 1 ? '' : 's'}`,
    mode: ['single', 'fixed-small', 'fixed-three', 'fixed-four'][count - 1], count,
  }))),
});

export function createLightCarrierActor() {
  return {
    _id: lightCarrierIdentity.documentId,
    name: 'Arcane light carrier', type: 'npc', img: 'icons/svg/light.svg',
    ownership: {default: 0}, items: [], effects: [],
    flags: {'arcane-spells-2014': {carrier: {...lightCarrierIdentity}}},
    system: {
      details: {type: {value: 'custom', custom: 'Noncombat light carrier'},
        biography: {value: '<p>Map light only. Move this carrier manually; do not select it as a creature target or add it to combat.</p>'}},
      attributes: {movement: {walk: 0, fly: 60, hover: true, units: 'ft'}},
    },
    prototypeToken: {
      name: 'Dancing light', actorLink: false, width: 1, height: 1,
      texture: {src: 'icons/svg/light.svg'},
      sight: {enabled: false},
      light: {bright: 0, dim: 10, angle: 360, color: '#e8dfb5', alpha: 0.3},
      displayBars: 0, disposition: 0,
    },
  };
}

export function createLightCarrierProvider({game}) {
  const packId = 'arcane-spells-2014.summons';
  async function inspect() {
    const pack = game.packs.get(packId);
    if (!game.modules.get('arcane-spells-2014')?.active || pack?.documentName !== 'Actor') return null;
    const documents = await pack.getDocuments({_id__in: [lightCarrierIdentity.documentId]});
    if (documents.length !== 1 || documents[0].id !== lightCarrierIdentity.documentId) return null;
    const data = documents[0].toObject();
    const identity = data.flags?.['arcane-spells-2014']?.carrier;
    const token = data.prototypeToken;
    if (!identity || Object.entries(lightCarrierIdentity).some(([key, value]) => identity[key] !== value)
      || data.type !== 'npc' || token?.actorLink !== false
      || token?.light?.bright !== 0 || token?.light?.dim !== 10
      || token?.sight?.enabled !== false || data.items?.length !== 0 || data.effects?.length !== 0) return null;
    return {uuid: `Compendium.${packId}.Actor.${lightCarrierIdentity.documentId}`,
      revision: lightCarrierIdentity.revision, recipeId: lightCarrierIdentity.recipeId};
  }
  return {
    async bindings() {
      const binding = await inspect();
      return binding ? {[lightCarrierIdentity.profileId]: binding} : {};
    },
    async verify(requirements) {
      if (requirements.some(r => r.profileId !== lightCarrierIdentity.profileId
        || r.revision !== lightCarrierIdentity.revision || r.recipeId !== lightCarrierIdentity.recipeId)) {
        return {valid: false, reason: 'Required summon profile is not supplied by this carrier provider'};
      }
      return await inspect() ? {valid: true} : {valid: false, reason: 'Installed light carrier is missing or differs from its contract'};
    },
  };
}
