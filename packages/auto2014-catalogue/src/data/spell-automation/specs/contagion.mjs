import {
  acceptance,
  cleanRoomEffect,
  cleanRoomSpell,
  consume,
  duration,
  eventTarget,
  grantAbilityCheckDisadvantage,
  grantAbilitySavingThrowDisadvantage,
  grantStatus,
  graphFragment,
  operation,
  outcomeRace,
  predicate,
  publicAction,
  rule,
  selected,
  spellContract,
  spellLifetime,
  trigger,
  whileSpellActive,
} from "../dsl.mjs";

const L5_WAVE_I4_QA_RECEIPT =
  "docs/foundry-automation/notes/spell-level-5-wave-i4-qa-2026-08-27.md";

const diseaseModes = [
  {
    id: "blinding-sickness",
    name: "致盲症 Blinding Sickness",
    modifiers: [
      grantStatus("blinded"),
      grantAbilityCheckDisadvantage(["wis"]),
      grantAbilitySavingThrowDisadvantage(["wis"]),
    ],
  },
  {
    id: "filth-fever",
    name: "污秽热 Filth Fever",
    modifiers: [
      grantAbilityCheckDisadvantage(["str"]),
      grantAbilitySavingThrowDisadvantage(["str"]),
    ],
  },
  {
    id: "flesh-rot",
    name: "腐肉症 Flesh Rot",
    modifiers: [],
  },
  {
    id: "mindfire",
    name: "心火症 Mindfire",
    modifiers: [
      grantAbilityCheckDisadvantage(["int"]),
      grantAbilitySavingThrowDisadvantage(["int"]),
    ],
  },
  {
    id: "seizure",
    name: "癫痫症 Seizure",
    modifiers: [
      grantAbilityCheckDisadvantage(["dex"]),
      grantAbilitySavingThrowDisadvantage(["dex"]),
    ],
  },
  {
    id: "slimy-doom",
    name: "黏液死疫 Slimy Doom",
    modifiers: [
      grantAbilityCheckDisadvantage(["con"]),
      grantAbilitySavingThrowDisadvantage(["con"]),
    ],
  },
];

function actionId(mode) {
  return `cast-${mode.id}`;
}

function pendingArtifactId(mode) {
  return `contagion-${mode.id}-pending`;
}

function diseaseArtifactId(mode) {
  return `contagion-${mode.id}-disease`;
}

function repeatSaveRuleId(mode) {
  return `repeat-save-${mode.id}`;
}

const contagion = cleanRoomSpell({
  id: "contagion",
  contract: spellContract({
    ruleset: "2014",
    level: 5,
    school: "nec",
    components: {
      verbal: true,
      somatic: true,
      material: false,
    },
    lifetime: spellLifetime(duration(7, "days")),
    primaryActionId: actionId(diseaseModes[0]),
  }),
  emission: { contentVersion: 1 },
  support: {
    level: "simplified",
    omissions: [
      "2014 RAW 在第三次失败后选择疾病；为保持角色卡 UI 与 Context Exec 的确定调用合同，本实现把选择提前为六个命名 Cast Action，共享 independent-terminal outcome-race runtime 只应用施法时已经声明的疾病",
      "Filth Fever 的 Strength checks 与 Strength saves 劣势自动化；仅限使用 Strength 的 attack rolls 劣势由 DM 处理，不宽化为全部攻击劣势",
      "Flesh Rot 的所有伤害 vulnerability 由 DM 处理；疾病 Artifact 只作为可见、来源绑定的 marker，不冒充 vulnerability",
      "Mindfire 的 Intelligence checks 与 Intelligence saves 劣势自动化；战斗中按 Confusion 行为表行动由 DM 处理",
      "Seizure 的 Dexterity checks 与 Dexterity saves 劣势自动化；仅限使用 Dexterity 的 attack rolls 劣势由 DM 处理，不宽化为全部攻击劣势",
      "Slimy Doom 的 Constitution checks 与 Constitution saves 劣势自动化；受伤后 stunned 到目标下一回合结束的触发由 DM 处理",
    ],
  },
  fragments: [
    graphFragment({
      id: "contagion-graph",
      actions: diseaseModes.map(mode => publicAction(
        actionId(mode),
        `疫病术：${mode.name}`,
      )),
      artifacts: diseaseModes.flatMap(mode => {
        const attackOperationId = `${actionId(mode)}:attack`;
        return [
          cleanRoomEffect(pendingArtifactId(mode), {
            host: "actor",
            scope: "source-target",
            reapply: "replace",
            name: `Contagion Pending: ${mode.name}`,
            modifiers: [grantStatus("poisoned")],
            outcomeRace: outcomeRace({
              profile: "independent-terminal",
              entry: {
                operationId: attackOperationId,
                beginOn: "hit",
              },
              repeatSaveRuleId: repeatSaveRuleId(mode),
              successThreshold: 3,
              failureThreshold: 3,
              failureArtifactId: diseaseArtifactId(mode),
              naturalExpiryArtifactId: null,
            }),
            lifecycle: whileSpellActive(),
          }),
          cleanRoomEffect(diseaseArtifactId(mode), {
            host: "actor",
            scope: "source-target",
            reapply: "replace",
            name: `Contagion Disease: ${mode.name}`,
            ...(mode.modifiers.length === 0 ? { markerOnly: true } : {}),
            modifiers: mode.modifiers,
            lifecycle: whileSpellActive(),
          }),
        ];
      }),
      rules: diseaseModes.flatMap(mode => {
        const castActionId = actionId(mode);
        const castTargetId = `target:${castActionId}`;
        const attackOperationId = `${castActionId}:attack`;
        const pendingId = pendingArtifactId(mode);
        const repeatRuleId = repeatSaveRuleId(mode);
        return [
          rule({
            id: castActionId,
            on: trigger("action-used", { actionId: castActionId }),
            targets: [
              selected(castTargetId, {
                min: 1,
                max: 1,
                range: 5,
                kind: "creature",
              }),
            ],
            do: [
              consume(`${castActionId}:consume`),
              operation("attack-roll", {
                id: attackOperationId,
                target: castTargetId,
                attack: {
                  source: "spellcasting",
                  range: "melee",
                },
              }),
            ],
          }),
          rule({
            id: `${castActionId}-hit`,
            on: trigger("operation-outcome", {
              operationId: attackOperationId,
              outcome: "hit",
            }),
            targets: [eventTarget(`target:${mode.id}-hit`)],
            do: [
              operation("apply-artifact", {
                id: `${castActionId}:apply-pending`,
                artifactId: pendingId,
                target: `target:${mode.id}-hit`,
              }),
            ],
          }),
          rule({
            id: repeatRuleId,
            on: trigger("turn-end", { subject: "effect-target" }),
            when: [
              predicate("artifact-exists", {
                artifactId: pendingId,
                subject: "effect-target",
              }),
            ],
            targets: [eventTarget(`target:${mode.id}-pending`)],
            do: [
              operation("saving-throw", {
                id: `${mode.id}:repeat-save`,
                ability: ["con"],
                target: `target:${mode.id}-pending`,
                onSave: "none",
              }),
            ],
          }),
        ];
      }),
    }),
  ],
  accepted: acceptance(L5_WAVE_I4_QA_RECEIPT, [
    "角色卡与 Context Exec 暴露 Blinding Sickness、Filth Fever、Flesh Rot、Mindfire、Seizure 与 Slimy Doom 六个命名 selected-targets Cast Action；每个只接受 5 ft 内一个 creature",
    "每个 Cast 只消耗一个五环或更高法术位并执行真实 melee spell attack；miss 仍消耗本次施法位但不应用任何 Contagion Effect，hit 只应用所选疾病对应的 source-target poisoned pending Effect",
    "每个 pending Effect 最长持续七天，并在其目标自己的每个回合结束时使用来源施法 DC 进行一次不消耗法术位的 Constitution save；第一次或第二次成功不会提前删除 poisoned",
    "共享 independent-terminal outcome-race runtime 在每个来源与目标的 pending Effect 上独立记录 successes 与 failures；第三次成功删除 pending 并终止，第三次失败先创建施法时声明的 disease Artifact、再删除 pending，终局后不再进行重复豁免",
    "共享 runtime 以 sourceEffectUuid + targetUuid + targetTurn 去重，并由 primary active GM 作为唯一写入 authority；成功、失败、阶段与最后目标回合都保存在 outcome-race state，同一回合重复 dispatch 不重复累计",
    "Blinding Sickness 自动应用 blinded 及 Wisdom checks/saves 劣势；其他五种疾病只应用 support 中明确列出的可表达 modifiers，未覆盖的攻击劣势、vulnerability、Confusion 行为和受伤 stunned 不会被伪造",
    "第三次失败的疾病创建与 pending 删除是共享 runtime 拥有的有序终局写入；任一步结果不确定时只返回 partial 或 indeterminate 且 retry=false，不重放已经提交的豁免、疾病或清理",
    "同一目标上的不同施法来源以 source-target provenance 隔离；到期、手动删除或终局转换只清理对应来源实例，非目标及其他来源保持不变；QA-A 必须重新验证共享 runtime 下的同回合重复 workflow 与非对称双来源终局互不串写",
  ], { status: "pending-runtime" }),
});

export default contagion;
