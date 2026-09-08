import {
  COMPILER_MIGRATION_LOG,
  acceptance,
  cleanRoomEffect,
  cleanRoomSpell,
  constant,
  consume,
  contentRef,
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

const darkvision = cleanRoomSpell({
  id: "darkvision",
  contract: spellContract({
    ruleset: "2014",
    level: 2,
    school: "trs",
    components: {
      verbal: true,
      somatic: true,
      material: true,
    },
    lifetime: spellLifetime(duration(8, "hours")),
  }),
  content: contentRef("darkvision"),
  emission: { contentVersion: 2 },
  support: { level: "full", omissions: [] },
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
            minimumSenseRange("darkvision", constant(60)),
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
    "一个 touch 声明目标获得至少 60 ft darkvision",
    "已有更远 darkvision 的目标不会被降低",
    "效果移除后精确恢复目标原有的 darkvision 距离",
    "效果持续八小时且不建立专注",
    "非目标不变且只消耗一个二环法术位",
  ], { status: "compiler-runtime-passed" }),
});

export default darkvision;
