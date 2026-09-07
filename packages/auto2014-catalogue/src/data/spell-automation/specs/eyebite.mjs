import {
  acceptance,
  allAttackRolls,
  cleanRoomEffect,
  cleanRoomSpell,
  concentration,
  consume,
  duration,
  eventTarget,
  gainAttackDisadvantage,
  grantAbilityCheckDisadvantage,
  grantStatus,
  graphFragment,
  operation,
  predicate,
  publicAction,
  requiresSourceArtifact,
  rule,
  selected,
  spellContract,
  trigger,
  whileSpellActive,
} from "../dsl.mjs";

const L6_RUNTIME_QA_RECEIPT =
  "docs/foundry-automation/notes/spell-level-6-runtime-qa-2026-09-02.md";

const allAbilities = ["str", "dex", "con", "int", "wis", "cha"];

const modes = [
  {
    id: "asleep",
    zh: "沉睡",
    en: "Asleep",
    modifiers: [
      grantStatus("unconscious"),
      grantStatus("incapacitated"),
    ],
  },
  {
    id: "panicked",
    zh: "恐慌",
    en: "Panicked",
    modifiers: [grantStatus("frightened")],
  },
  {
    id: "sickened",
    zh: "患病",
    en: "Sickened",
    modifiers: [
      gainAttackDisadvantage(allAttackRolls()),
      grantAbilityCheckDisadvantage(allAbilities),
    ],
  },
];

const actionId = (phase, mode) => `${phase}-${mode.id}`;
const targetId = (phase, mode) => `target:${actionId(phase, mode)}`;
const saveId = (phase, mode) => `${actionId(phase, mode)}:save`;
const effectId = mode => `eyebite-${mode.id}`;

const targetQuery = (phase, mode) => selected(targetId(phase, mode), {
  min: 1,
  max: 1,
  range: 60,
  kind: "creature",
  predicates: [predicate("visible-to-source")],
});

const saveOperation = (phase, mode) => operation("saving-throw", {
  id: saveId(phase, mode),
  ability: ["wis"],
  target: targetId(phase, mode),
  onSave: "none",
});

const failedSaveRule = (phase, mode) => rule({
  id: `${actionId(phase, mode)}-save-failed`,
  on: trigger("operation-outcome", {
    operationId: saveId(phase, mode),
    outcome: "failure",
  }),
  targets: [eventTarget(`target:${actionId(phase, mode)}:failed`)],
  do: [
    operation("apply-artifact", {
      id: `${actionId(phase, mode)}:apply-${mode.id}`,
      artifactId: effectId(mode),
      target: `target:${actionId(phase, mode)}:failed`,
    }),
  ],
});

const eyebite = cleanRoomSpell({
  id: "eyebite",
  contract: spellContract({
    ruleset: "2014",
    level: 6,
    school: "nec",
    components: {
      verbal: true,
      somatic: true,
      material: false,
    },
    lifetime: concentration(duration(1, "minutes")),
    primaryActionId: actionId("cast", modes[0]),
  }),
  emission: { contentVersion: 1 },
  support: {
    level: "simplified",
    omissions: [
      "每个施法者回合至多使用一次 Gaze 由 DM 按 action economy 确认；runtime 不建立每回合次数状态机",
      "对本来源 Eyebite 豁免成功的 creature 在法术期间免疫后续 Gaze；该成功历史由 DM 记录，并在后续调用前排除目标",
      "Asleep 目标受到伤害或被其他 creature 用 action 摇醒时，由 DM 只删除本来源 Eyebite: Asleep Effect；runtime 不自动监听唤醒",
      "Panicked 目标每回合 Dash、沿最安全最短路线远离施法者或无路可走时的行为与移动由 DM 执行",
      "无法从结构化 creature 数据可靠判断的睡眠、frightened 或其他适用性边界由 DM 在调用前确认",
    ],
  },
  fragments: [
    graphFragment({
      id: "eyebite-graph",
      actions: [
        ...modes.map(mode => publicAction(
          actionId("cast", mode),
          `摄心目光：施放—${mode.zh} Eyebite: Cast — ${mode.en}`,
        )),
        ...modes.map(mode => publicAction(
          actionId("gaze", mode),
          `摄心目光：凝视—${mode.zh} Eyebite: Gaze — ${mode.en}`,
          {
            availableWhen: [requiresSourceArtifact("eyebite-source")],
          },
        )),
      ],
      artifacts: [
        cleanRoomEffect("eyebite-source", {
          host: "actor",
          scope: "source",
          reapply: "replace",
          name: "Eyebite",
          markerOnly: true,
          lifecycle: whileSpellActive(),
        }),
        ...modes.map(mode => cleanRoomEffect(effectId(mode), {
          host: "actor",
          scope: "source-target",
          reapply: "replace",
          name: `Eyebite: ${mode.en}`,
          modifiers: mode.modifiers,
          lifecycle: whileSpellActive(),
        })),
      ],
      rules: [
        ...modes.flatMap(mode => [
          rule({
            id: actionId("cast", mode),
            on: trigger("action-used", {
              actionId: actionId("cast", mode),
            }),
            targets: [targetQuery("cast", mode)],
            do: [
              consume(`${actionId("cast", mode)}:consume`),
              operation("apply-artifact", {
                id: `${actionId("cast", mode)}:apply-source`,
                artifactId: "eyebite-source",
                target: "source",
              }),
              saveOperation("cast", mode),
            ],
          }),
          failedSaveRule("cast", mode),
        ]),
        ...modes.flatMap(mode => [
          rule({
            id: actionId("gaze", mode),
            on: trigger("action-used", {
              actionId: actionId("gaze", mode),
            }),
            when: [
              predicate("artifact-exists", {
                artifactId: "eyebite-source",
                subject: "source",
              }),
            ],
            targets: [targetQuery("gaze", mode)],
            do: [saveOperation("gaze", mode)],
          }),
          failedSaveRule("gaze", mode),
        ]),
      ],
    }),
  ],
  accepted: acceptance(L6_RUNTIME_QA_RECEIPT, [
    "角色卡与 Context Exec 暴露 Cast/Gaze × Asleep/Panicked/Sickened 六个稳定 selected-targets public Action；每个只接受 60 ft 内一个可见 creature",
    "任一 Cast Action 只消费一个六环或更高法术位、建立最长 1 分钟专注 source，并进行一次 Wisdom save；成功目标不获得 Effect，失败目标只获得所选模式 Effect",
    "Asleep 失败目标获得 structured unconscious 与 incapacitated；Panicked 失败目标获得 structured frightened；Sickened 失败目标的全部 attack rolls 与六项 ability checks 具有劣势",
    "任一 Gaze Action 仅在同一施法者存在 Eyebite source 时可见和可用，可重复调用且不再消费法术位；错误来源或来源结束后的调用在 world write 前拒绝",
    "每回合一次 Gaze、成功目标对本来源后续免疫、Asleep 唤醒与 Panicked Dash/移动保持明确 DM omission，不被隐藏状态机冒充",
    "结束、替换或到期结束专注时精确清理本来源 source 与全部 Asleep/Panicked/Sickened Effect；不同施法者来源相互隔离，非目标保持不变",
  ], { status: "compiler-runtime-passed" }),
});

export default eyebite;
