import {
  COMPILER_MIGRATION_LOG,
  acceptance,
  cleanRoomEffect,
  cleanRoomSpell,
  concentration,
  consume,
  contentRef,
  duration,
  eventTarget,
  graphFragment,
  operation,
  publicAction,
  rule,
  selected,
  spellContract,
  trigger,
  whileSpellActive,
} from "../dsl.mjs";

const bestowCurse = cleanRoomSpell({
  id: "bestow-curse",
  contract: spellContract({
    ruleset: "2014",
    level: 3,
    school: "nec",
    components: {
      verbal: true,
      somatic: true,
      material: false,
    },
    lifetime: concentration(duration(1, "minutes")),
  }),
  content: contentRef("bestow-curse"),
  emission: { contentVersion: 5 },
  support: {
    level: "marker-only",
    omissions: [
      "属性检定与豁免劣势、对施法者的攻击劣势、回合动作判定、额外 1d8 伤害及自定义诅咒均未实现；当前 marker 不表示已选择或应用任一具体诅咒",
      "属性诅咒的 required enum input 与 CLI 副作用前强校验仍按既有 TODO 延期；本 spec 不默认或推断属性",
      "4 环及以上的延长持续时间、5 环及以上的免专注规则尚未编译；本批次只承诺已验收的三环一分钟专注生命周期",
    ],
  },
  fragments: [
    graphFragment({
      id: "bestow-curse-graph",
      actions: [
        publicAction("cast", "降咒 Bestow Curse"),
      ],
      artifacts: [
        cleanRoomEffect("bestow-curse", {
          host: "actor",
          scope: "source-target",
          reapply: "replace",
          name: "Bestow Curse",
          markerOnly: true,
          modifiers: [],
          lifecycle: whileSpellActive(),
        }),
      ],
      rules: [
        rule({
          id: "cast-bestow-curse",
          on: trigger("action-used", { actionId: "cast" }),
          targets: [
            selected("target:cast", {
              min: 1,
              max: 1,
              range: null,
              units: "touch",
              kind: "creature",
            }),
          ],
          do: [
            consume(),
            operation("saving-throw", {
              id: "initial-save",
              ability: ["wis"],
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
              id: "apply-bestow-curse",
              artifactId: "bestow-curse",
              target: "target:failed",
            }),
          ],
        }),
      ],
    }),
  ],
  accepted: acceptance(COMPILER_MIGRATION_LOG, [
    "一个 touch 目标只进行一次 Wisdom save 并只消耗一个法术位",
    "只有首次豁免失败的目标获得一个来源可追踪的 Bestow Curse marker",
    "成功目标与非目标不获得 marker",
    "三环专注结束时清理 marker；marker 不代表具体诅咒机械已经实现",
    "没有 required enum 输入时不默认或推断属性，也不宣称已应用某种诅咒",
  ], { status: "compiler-runtime-passed" }),
});

export default bestowCurse;
