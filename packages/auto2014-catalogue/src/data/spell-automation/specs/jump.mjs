import {
  acceptance,
  cleanRoomEffect,
  cleanRoomSpell,
  constant,
  consume,
  duration,
  graphFragment,
  operation,
  publicAction,
  rule,
  scaleJumpDistance,
  selected,
  spellContract,
  spellLifetime,
  trigger,
  whileSpellActive,
} from "../dsl.mjs";

const EXPANSION_BATCH =
  "docs/foundry-automation/notes/零至三环新法术扩展批次.md";

const jump = cleanRoomSpell({
  id: "jump",
  contract: spellContract({
    ruleset: "2014",
    level: 1,
    school: "trs",
    components: {
      verbal: true,
      somatic: true,
      material: true,
    },
    lifetime: spellLifetime(duration(1, "minutes")),
  }),
  emission: { contentVersion: 1 },
  support: { level: "full", omissions: [] },
  fragments: [
    graphFragment({
      id: "jump-graph",
      actions: [publicAction("cast", "跳跃术 Jump")],
      artifacts: [
        cleanRoomEffect("jump", {
          host: "actor",
          scope: "source-target",
          reapply: "replace",
          name: "Jump",
          modifiers: [
            scaleJumpDistance(constant(3)),
          ],
          lifecycle: whileSpellActive(),
        }),
      ],
      rules: [
        rule({
          id: "cast-jump",
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
            operation("apply-artifact", {
              id: "cast:apply-jump",
              artifactId: "jump",
              target: "target:cast",
            }),
          ],
        }),
      ],
    }),
  ],
  accepted: acceptance(EXPANSION_BATCH, [
    "一环或更高环位的 action cast 只对一个 touch 声明生物生效，并只消耗一个所声明环位的法术位",
    "目标的跳跃距离精确变为施法前 baseline 的三倍；walk、burrow、climb、fly 与 swim 速度均不改变",
    "升环不会增加目标数量或倍率；任意环位声明两个目标都必须在 workflow、资源消耗和效果创建前拒绝",
    "效果持续一分钟且不建立专注，施法者开始其他专注法术不会移除 Jump",
    "对同一目标重施时 replace 原效果而不会将跳跃距离累乘为九倍",
    "移除或到期后精确恢复目标原本的跳跃距离，非目标所有移动与跳跃数据保持不变",
  ], { status: "compiler-runtime-passed" }),
});

export default jump;
