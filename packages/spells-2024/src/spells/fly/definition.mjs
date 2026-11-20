import {
  COMPILER_MIGRATION_LOG,
  acceptance,
  add,
  cleanRoomEffect,
  cleanRoomSpell,
  concentration,
  constant,
  consume,
  duration,
  grantHover,
  graphFragment,
  levelsAboveBase,
  minimumMovement,
  operation,
  publicAction,
  rule,
  selected,
  spellContract,
  trigger,
  whileSpellActive,
} from "@arcanedesk/spell-compiler/dsl";

// L2 重写批（M1.0 审计 A/B 桶 desc-diff-flag）：2024 的 60 尺飞行速度附带悬浮（hover），
// 2014 没有；目标数、专注与「结束时坠落」条款不变。
// 5R 锚点：玩家手册2024/法术详述/3环.htm#Fly。
const fly = cleanRoomSpell({
  id: "fly",
  contract: spellContract({
    ruleset: "2024",
    level: 3,
    school: "trs",
    components: {
      verbal: true,
      somatic: true,
      material: true,
    },
    lifetime: concentration(duration(10, "minutes")),
  }),
  emission: { contentVersion: 1 },
  support: {
    level: "simplified",
    omissions: [
      "目标是否自愿由 DM 判断",
      "法术结束时仍在空中的目标如何坠落及其伤害由 Foundry 场景与 DM 处理",
    ],
  },
  fragments: [
    graphFragment({
      id: "fly-graph",
      actions: [publicAction("cast", "飞行术 Fly")],
      artifacts: [
        cleanRoomEffect("fly", {
          host: "actor",
          scope: "source-target",
          reapply: "replace",
          name: "Fly",
          modifiers: [
            minimumMovement("fly", constant(60)),
            grantHover(),
          ],
          lifecycle: whileSpellActive(),
        }),
      ],
      rules: [
        rule({
          id: "cast-fly",
          on: trigger("action-used", { actionId: "cast" }),
          targets: [
            selected("target:cast", {
              min: 1,
              max: add(constant(1), levelsAboveBase()),
              range: null,
              units: "touch",
              kind: "creature",
            }),
          ],
          do: [
            consume(),
            operation("apply-artifact", {
              id: "cast:apply-fly",
              artifactId: "fly",
              target: "target:cast",
            }),
          ],
        }),
      ],
    }),
  ],
  accepted: acceptance(COMPILER_MIGRATION_LOG, [
    "三环施法对一个 touch 声明目标生效，每升一环可多声明一个目标",
    "每个目标获得至少 60 ft flying speed 并同时获得 hover（2024 口径），原有更高飞行速度不降低",
    "只消耗一个所声明环位的法术位并建立最长十分钟的专注",
    "`execute-turn` 超过所声明环位目标上限时，在扣除资源、建立专注和创建效果前拒绝",
    "对同一目标重施时 replace 旧效果；专注或持续时间结束时清理全部目标并精确恢复原飞行速度与 hover 状态",
    "法术结束后的坠落及坠落伤害结果由 DM 处理",
  ], { status: "compiler-passed" }),
});

export default fly;
