import {
  COMPILER_MIGRATION_LOG,
  acceptance,
  add,
  cleanRoomEffect,
  cleanRoomSpell,
  constant,
  consume,
  contentRef,
  duration,
  eventTarget,
  firstOf,
  graphFragment,
  levelsAboveBase,
  operation,
  publicAction,
  rule,
  selected,
  spellContract,
  spellLifetime,
  trigger,
  untilTrigger,
  whileSpellActive,
} from "../dsl.mjs";

const command = cleanRoomSpell({
  id: "command",
  contract: spellContract({
    ruleset: "2014",
    level: 1,
    school: "enc",
    components: {
      verbal: true,
      somatic: false,
      material: false,
    },
    lifetime: spellLifetime(duration(1, "rounds")),
  }),
  content: contentRef("command"),
  emission: { contentVersion: 6 },
  support: {
    level: "simplified",
    omissions: [
      "具体命令词及目标如何执行命令由 DM 裁定",
      "目标能否听懂施法者语言、是否为不死生物以及命令是否直接有害由 DM 在声明目标时裁定",
      "升环多目标彼此必须相距 30 ft 内的约束由 DM 裁定；CLI 只强制总目标数上限",
    ],
  },
  fragments: [
    graphFragment({
      id: "command-graph",
      actions: [publicAction("cast", "命令术 Command")],
      artifacts: [
        cleanRoomEffect("command", {
          host: "actor",
          scope: "source-target",
          reapply: "replace",
          name: "Command",
          markerOnly: true,
          lifecycle: firstOf(
            whileSpellActive(),
            untilTrigger(trigger("turn-end", { subject: "effect-target" })),
          ),
        }),
      ],
      rules: [
        rule({
          id: "cast-command",
          on: trigger("action-used", { actionId: "cast" }),
          targets: [
            selected("target:cast", {
              min: 1,
              max: add(constant(1), levelsAboveBase()),
              range: 60,
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
              id: "apply-command-marker",
              artifactId: "command",
              target: "target:failed",
            }),
          ],
        }),
      ],
    }),
  ],
  accepted: acceptance(COMPILER_MIGRATION_LOG, [
    "一环对一个 60 ft 内声明目标进行 Wisdom save，每升一环可多声明一个目标",
    "失败目标获得持续到其回合结束的一个 Command marker，成功目标与非目标不获得 marker",
    "Command marker 没有 statuses 或 mechanical changes，命令词的具体行为不由自动化擅自执行",
    "`execute-turn` 超过所声明环位目标上限时，在扣除资源和创建 marker 前拒绝",
    "成功施法只消耗一个所声明环位的法术位；多目标彼此 30 ft 约束继续由 DM 裁定",
  ], { status: "compiler-runtime-passed" }),
});

export default command;
