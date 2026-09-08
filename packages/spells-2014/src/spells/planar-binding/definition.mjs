import {
  acceptance,
  cleanRoomEffect,
  cleanRoomSpell,
  consume,
  duration,
  eventTarget,
  graphFragment,
  operation,
  publicAction,
  rule,
  selected,
  spellContract,
  spellLifetime,
  trigger,
  whileSpellActive,
} from "@arcanedesk/spell-compiler/dsl";

const L5_WAVE_I2_QA_RECEIPT =
  "docs/foundry-automation/notes/spell-level-5-wave-i2-qa-2026-08-26.md";

const planarBinding = cleanRoomSpell({
  id: "planar-binding",
  contract: spellContract({
    ruleset: "2014",
    level: 5,
    school: "abj",
    components: {
      verbal: true,
      somatic: true,
      material: true,
    },
    material: {
      cost: 1000,
      consumed: true,
    },
    lifetime: spellLifetime(duration(24, "hours")),
  }),
  emission: { contentVersion: 1 },
  support: {
    level: "simplified",
    omissions: [
      "一小时施法过程及其中断由 DM 追踪；只有 DM 宣布施法完成后才调用本法术的公开 Activity 进行豁免、扣槽与 marker 结算",
      "价值至少 1000 gp 且被法术消耗的珠宝只作为材料契约记录；DM 负责确认并从角色库存或桌面账本扣除",
      "目标必须是 celestial、elemental、fey 或 fiend；系统不自动推断或强制 creature type，由 DM 在声明目标时确认",
      "目标必须在完整一小时施法期间始终位于施法者 60 ft 内；系统只校验结算时的声明目标，不追踪施法过程中的范围",
      "目标服从指令、执行方式、敌对态度与可能扭曲命令的行为由 DM 裁定；marker 不直接控制目标行动",
      "若目标由其他 summon 或 conjuration 法术带来，其原有 duration、专注与 Planar Binding 的协同由 DM 处理",
      "六环十天、七环三十天、八环一百八十天、九环一年零一天的延长持续时间不自动缩放；DM 在成功结算后手动调整本来源 marker 的到期时间",
    ],
  },
  fragments: [
    graphFragment({
      id: "planar-binding-graph",
      actions: [
        publicAction("cast", "异界誓缚 Planar Binding", {
          activationType: "hour",
        }),
      ],
      artifacts: [
        cleanRoomEffect("planar-bound", {
          host: "actor",
          scope: "source-target",
          reapply: "replace",
          name: "Planar Bound",
          markerOnly: true,
          modifiers: [],
          lifecycle: whileSpellActive(),
        }),
      ],
      rules: [
        rule({
          id: "cast-planar-binding",
          on: trigger("action-used", { actionId: "cast" }),
          targets: [
            selected("target:cast", {
              min: 1,
              max: 1,
              range: 60,
              kind: "creature",
            }),
          ],
          do: [
            consume(),
            operation("saving-throw", {
              id: "initial-save",
              ability: ["cha"],
              target: "target:cast",
              onSave: "none",
            }),
          ],
        }),
        rule({
          id: "initial-save-failed",
          on: trigger("operation-outcome", {
            operationId: "initial-save",
            outcome: "failure",
          }),
          targets: [eventTarget("target:failed")],
          do: [
            operation("apply-artifact", {
              id: "apply-planar-bound",
              artifactId: "planar-bound",
              target: "target:failed",
            }),
          ],
        }),
      ],
    }),
  ],
  accepted: acceptance(L5_WAVE_I2_QA_RECEIPT, [
    "DM 宣布一小时施法完成后，角色卡与 Context Exec 调用同一个 hour Cast Activity，并且只接受一个 60 ft 内明确声明的 creature 目标",
    "一次合法施法只消耗一个明确声明的五环或更高法术位，并由真实 dnd5e/Midi workflow 对目标进行一次 Charisma save；材料库存不由系统自动扣除",
    "只有首次豁免失败的目标获得 Planar Bound marker；豁免成功目标、未声明目标及其既有状态保持不变",
    "Planar Bound 是无 status、无 mechanical modifier 的 marker-only Effect，并以 source-target identity 隔离施法来源；同一来源重施只替换自己的 marker",
    "五环结算的 marker 固定持续 24 小时且不建立专注；到期或手动删除只清理本来源 marker，不影响其他施法者的同名实例",
    "六至九环仍只自动建立 24 小时 marker；DM 按十天、三十天、一百八十天或一年零一天手动延长本次来源实例，系统不得把固定 marker 冒充为已完成升环持续时间",
    "目标类型、完整施法期间的 60 ft 范围、命令与态度、召唤 duration 协同均保持明确 HITL 边界，marker 不代表这些开放规则已自动执行",
  ], { status: "compiler-runtime-passed" }),
});

export default planarBinding;
