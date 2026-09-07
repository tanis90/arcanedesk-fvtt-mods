import {
  acceptance,
  cleanRoomEffect,
  cleanRoomSpell,
  concentration,
  constant,
  consume,
  duration,
  eventTarget,
  firstOf,
  grantStatus,
  graphFragment,
  operation,
  placedTemplate,
  publicAction,
  rule,
  setAllMovement,
  spellContract,
  trigger,
  untilTrigger,
  whileSpellActive,
} from "../dsl.mjs";

const hypnoticPattern = cleanRoomSpell({
  id: "hypnotic-pattern",
  contract: spellContract({
    ruleset: "2014",
    level: 3,
    school: "ill",
    components: {
      verbal: false,
      somatic: true,
      material: true,
    },
    lifetime: concentration(duration(1, "minutes")),
  }),
  emission: { contentVersion: 6 },
  support: {
    level: "simplified",
    omissions: [
      "P0 尚无“能看见已放置图纹”的模板成员资格原语；当前对模板内所有 creature 请求豁免，由 DM 排除无法看见图纹的生物",
      "其他生物使用动作摇醒目标需要通用显式交互 Action 与目标 artifact removal；P0 尚未表达，由 DM 处理",
    ],
  },
  fragments: [
    graphFragment({
      id: "hypnotic-pattern-graph",
      actions: [publicAction("cast", "催眠图纹 Hypnotic Pattern")],
      artifacts: [
        cleanRoomEffect("hypnotic-pattern", {
          host: "actor",
          scope: "source-target",
          reapply: "replace",
          name: "Hypnotic Pattern",
          modifiers: [
            grantStatus("charmed"),
            grantStatus("incapacitated"),
            setAllMovement(constant(0)),
          ],
          lifecycle: firstOf(
            whileSpellActive(),
            untilTrigger(trigger("damage-taken", { subject: "effect-target" })),
          ),
        }),
      ],
      rules: [
        rule({
          id: "cast-hypnotic-pattern",
          on: trigger("action-used", { actionId: "cast" }),
          targets: [
            placedTemplate("target:cast", {
              type: "cube",
              size: 30,
              range: 120,
              evaluation: "snapshot",
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
          id: "apply-hypnotic-pattern-on-failed-save",
          on: trigger("operation-outcome", {
            operationId: "initial-save",
            outcome: "failure",
          }),
          targets: [eventTarget("failed-target")],
          do: [
            operation("apply-artifact", {
              id: "apply-hypnotic-pattern",
              artifactId: "hypnotic-pattern",
              target: "failed-target",
            }),
          ],
        }),
      ],
    }),
  ],
  accepted: acceptance(
    "docs/foundry-automation/notes/法术编译器clean-room实施计划.md",
    [
      "DM 在 120 ft 内放置 30-ft cube，并由同一 workflow 快照模板成员",
      "模板成员进行 Wisdom save，失败者获得 charmed、incapacitated 与 speed 0",
      "成功者不获得效果",
      "只消耗一个三环或更高环位并建立最长一分钟的专注",
      "受影响目标受到伤害后自动结束其自身的催眠图纹效果",
      "解除或替换专注会清理仍存在的催眠图纹效果",
      "当前不会自动过滤无法看见图纹的模板成员；DM 在目标声明或豁免前排除这些生物",
    ],
    { status: "compiler-runtime-passed" },
  ),
});

export default hypnoticPattern;
