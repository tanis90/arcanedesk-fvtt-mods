import {
  COMPILER_MIGRATION_LOG,
  acceptance,
  cleanRoomEffect,
  cleanRoomSpell,
  constant,
  consume,
  duration,
  graphFragment,
  minimumSenseRange,
  operation,
  publicAction,
  rule,
  selected,
  spellContract,
  spellLifetime,
  trigger,
  whileSpellActive,
} from "@arcanedesk/spell-compiler/dsl";

// L2 重写批（2024，M1 审计 A 桶 desc-diff-flag）：黑暗视觉距离由 60 尺改为 150 尺；
// 触碰一名自愿生物、 eight 小时、不建立专注与 2014 一致。
// 来源：5R 玩家手册2024 2环.htm#Darkvision。
const darkvision = cleanRoomSpell({
  id: "darkvision",
  contract: spellContract({
    ruleset: "2024",
    level: 2,
    school: "trs",
    components: {
      verbal: true,
      somatic: true,
      material: true,
    },
    lifetime: spellLifetime(duration(8, "hours")),
  }),
  emission: { contentVersion: 1 },
  support: {
    level: "simplified",
    omissions: [
      "目标必须是自愿生物；selected-targets 不校验同意意愿，由 DM 在声明目标时确认",
    ],
  },
  fragments: [
    graphFragment({
      id: "darkvision-graph",
      actions: [publicAction("cast", "黑暗视觉 Darkvision")],
      artifacts: [
        cleanRoomEffect("darkvision", {
          host: "actor",
          scope: "source-target",
          reapply: "replace",
          name: "Darkvision",
          modifiers: [
            minimumSenseRange("darkvision", constant(150)),
          ],
          lifecycle: whileSpellActive(),
        }),
      ],
      rules: [
        rule({
          id: "cast-darkvision",
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
              id: "cast:apply-darkvision",
              artifactId: "darkvision",
              target: "target:cast",
            }),
          ],
        }),
      ],
    }),
  ],
  accepted: acceptance(COMPILER_MIGRATION_LOG, [
    "一个 touch 声明目标获得至少 150 ft darkvision（2024 距离）",
    "已有更远 darkvision 的目标不会被降低",
    "效果移除后精确恢复目标原有的 darkvision 距离",
    "效果持续八小时且不建立专注",
    "非目标不变且只消耗一个二环法术位",
  ], { status: "compiler-passed" }),
});

export default darkvision;
