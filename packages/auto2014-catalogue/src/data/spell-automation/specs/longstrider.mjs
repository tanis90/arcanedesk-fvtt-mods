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
  graphFragment,
  increaseAllMovement,
  levelsAboveBase,
  operation,
  publicAction,
  rule,
  selected,
  spellContract,
  spellLifetime,
  trigger,
  whileSpellActive,
} from "../dsl.mjs";

const longstrider = cleanRoomSpell({
  id: "longstrider",
  contract: spellContract({
    ruleset: "2014",
    level: 1,
    school: "trs",
    components: {
      verbal: true,
      somatic: true,
      material: true,
    },
    lifetime: spellLifetime(duration(1, "hours")),
  }),
  content: contentRef("longstrider"),
  emission: { contentVersion: 2 },
  support: { level: "full", omissions: [] },
  fragments: [
    graphFragment({
      id: "longstrider-graph",
      actions: [publicAction("cast", "大步奔行 Longstrider")],
      artifacts: [
        cleanRoomEffect("longstrider", {
          host: "actor",
          scope: "source-target",
          reapply: "replace",
          name: "Longstrider",
          modifiers: [
            increaseAllMovement(constant(10)),
          ],
          lifecycle: whileSpellActive(),
        }),
      ],
      rules: [
        rule({
          id: "cast-longstrider",
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
              id: "cast:apply-longstrider",
              artifactId: "longstrider",
              target: "target:cast",
            }),
          ],
        }),
      ],
    }),
  ],
  accepted: acceptance(COMPILER_MIGRATION_LOG, [
    "一环施法对一个 touch 声明目标生效，每升一环可多声明一个目标",
    "每个目标已有的全部移动速度增加 10 ft，不凭空获得原本没有的移动方式",
    "效果持续一小时且不建立专注",
    "`execute-turn` 超过所声明环位目标上限时，在扣除资源和创建效果前拒绝",
    "成功施法只消耗一个所声明环位的法术位",
    "对同一目标重施时 replace 旧效果而不叠加为 +20，移除或到期后精确恢复原移动速度",
  ], { status: "compiler-runtime-passed" }),
});

export default longstrider;
