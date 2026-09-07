// Original structural fixture. No published monster profile or private content is used.
export function trainingSummonInput() {
  const id='training-orb',recipeId='training-routine',documentId='originalActor001';
  const contracts={schemaVersion:1,
    expectedSummonProfileRecipes:[[id,recipeId]],
    expectedSummonProfileDocuments:[[id,documentId]],
    expectedSummonPoolProfiles:[['training-pool',[id]]],
    expectedSummonRecipeRulesModels:[[recipeId,'bg3-simplified']],
    expectedSummonRecipeActionIds:[[recipeId,['weapon-strike']]],
    // Required v1 table, unused by this legacy-shape fixture.
    expected2014SummonProfiles:[['unused-training-profile',{}]],
  };
  const profile={profileId:id,revision:1,documentId,label:'Original training orb',recipeId,
    rulesModel:'bg3-simplified',summonUsage:'pool-choice',icon:'icons/svg/dice-target.svg',
    baseActor:{actorType:'npc',identifier:id,abilities:{str:10,dex:10,con:10,int:10,wis:10,cha:10},
      proficiencyBonus:0,creature:{category:'spell-entity',size:'tiny'},armorClass:10,
      hitPoints:{current:1,maximum:1},combat:{type:'independent',initiativeBonus:0},
      movement:[{type:'fly',distance:5,units:'ft'}],opportunityAttacks:false,
      defenses:{conditionImmunities:[],damageImmunities:[],damageResistances:[],damageVulnerabilities:[]}},
    prototypeToken:{actorLink:false,dimensions:{width:1,height:1},disposition:0,
      texture:{src:'icons/svg/dice-target.svg',scale:1},light:{brightRadius:0,additionalDimRadius:0,units:'ft'}},
    deltaSlots:[],actionPresentation:[{actionId:'weapon-strike',identifier:'original-practice-tap',label:'Original practice tap',icon:'icons/svg/dice-target.svg'}]};
  const recipe={recipeId,rulesModel:'bg3-simplified',deltaSlots:[],manualRules:['Original fixture: the DM chooses the training target.'],
    actions:[{actionId:'weapon-strike',actionType:'melee-spell-attack',activation:{type:'bonus-action',cost:1},
      target:{kind:'creature',count:1,selection:'explicit',range:{distance:5,units:'ft'}},
      resource:{type:'at-will',consumesSourceSpellSlot:false},opportunityAttackEligible:false,
      attackBonus:{type:'constant',value:0},damage:[{damageType:'force',value:{type:'constant',value:1}}]}]};
  return {contracts,provider:{schemaVersion:1,profiles:[profile],recipes:[recipe],pools:[{poolId:'training-pool',profileIds:[id]}]}};
}
