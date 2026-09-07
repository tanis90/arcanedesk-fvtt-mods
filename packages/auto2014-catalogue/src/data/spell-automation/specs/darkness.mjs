import {
  COMPILER_MIGRATION_LOG,
  acceptance,
  artifact,
  cleanRoomEffect,
  cleanRoomSpell,
  concentration,
  consume,
  contentRef,
  duration,
  graphFragment,
  operation,
  placedTemplate,
  publicAction,
  rule,
  spellContract,
  trigger,
  whileArtifact,
  whileSpellActive,
} from "../dsl.mjs";

const darkness = cleanRoomSpell({
  id: "darkness",
  contract: spellContract({
    ruleset: "2014",
    level: 2,
    school: "evo",
    components: {
      verbal: true,
      somatic: false,
      material: true,
    },
    lifetime: concentration(duration(10, "minutes")),
  }),
  content: contentRef("darkness"),
  emission: { contentVersion: 6 },
  support: {
    level: "simplified",
    omissions: [
      "区域只保留可见的持续模板；魔法黑暗的视觉、攻击与照明压制仍由 DM 处理",
      "把黑暗附着到物件以及遮盖该物件的规则仍由 DM 处理",
    ],
  },
  fragments: [
    graphFragment({
      id: "darkness-zone-graph",
      actions: [publicAction("cast", "放置黑暗术 Place Darkness")],
      artifacts: [
        artifact({
          id: "darkness-zone",
          kind: "zone",
          role: "mechanical",
          identity: { scope: "cast", keys: ["castId"] },
          state: {
            anchor: "placed-point",
            shape: { type: "sphere", radius: 15, units: "ft" },
            stationary: true,
          },
          lifecycle: whileSpellActive(),
        }),
        cleanRoomEffect("darkness-membership", {
          name: "Darkness",
          markerOnly: true,
          lifecycle: whileArtifact("darkness-zone"),
        }),
      ],
      rules: [
        rule({
          id: "cast-darkness",
          on: trigger("action-used", { actionId: "cast" }),
          targets: [placedTemplate("target:cast", {
            type: "sphere",
            size: 15,
            range: 60,
            evaluation: "snapshot",
          })],
          do: [
            consume(),
            operation("create-artifact", {
              id: "cast:create-zone",
              artifactId: "darkness-zone",
              target: "target:cast",
            }),
          ],
        }),
      ],
    }),
  ],
  accepted: acceptance(COMPILER_MIGRATION_LOG, [
    "DM 在 60 ft 内放置 15-ft-radius 持续区域",
    "施法消耗一个二环法术位并建立专注",
    "替换或取消专注时清理 Darkness 模板",
    "放置区域本身不对模板成员运行伤害或豁免 workflow",
  ], { status: "compiler-runtime-passed" }),
});

export default darkness;
