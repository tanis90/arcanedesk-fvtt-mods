import {
  COMPILER_MIGRATION_LOG,
  acceptance,
  artifact,
  blockVocalSpell,
  cleanRoomEffect,
  cleanRoomSpell,
  concentration,
  consume,
  duration,
  graphFragment,
  grantStatus,
  operation,
  placedTemplate,
  publicAction,
  rule,
  spellContract,
  trigger,
  whileArtifact,
  whileSpellActive,
} from "@arcanedesk/spell-compiler/dsl";

const silence = cleanRoomSpell({
  id: "silence",
  contract: spellContract({
    ruleset: "2014",
    level: 2,
    school: "ill",
    components: {
      verbal: true,
      somatic: true,
      material: false,
    },
    ritual: true,
    lifetime: concentration(duration(10, "minutes")),
  }),
  emission: { contentVersion: 7 },
  support: {
    level: "simplified",
    omissions: [
      "声音不能产生或穿过区域的非 Item 行为仍由 DM 处理",
      "区域内生物与物体的 thunder immunity 仍由 DM 处理",
    ],
  },
  fragments: [
    graphFragment({
      id: "silence-zone-graph",
      actions: [publicAction("cast", "放置沉默术 Place Silence")],
      artifacts: [
        artifact({
          id: "silence-zone",
          kind: "zone",
          role: "mechanical",
          identity: { scope: "cast", keys: ["castId"] },
          state: {
            anchor: "placed-point",
            shape: { type: "sphere", radius: 20, units: "ft" },
            stationary: true,
          },
          lifecycle: whileSpellActive(),
        }),
        cleanRoomEffect("silence-membership", {
          host: "actor",
          scope: "source-target",
          name: "Silence",
          modifiers: [
            grantStatus("silenced"),
            blockVocalSpell(),
          ],
          lifecycle: whileArtifact("silence-zone"),
        }),
      ],
      rules: [
        rule({
          id: "cast-silence",
          on: trigger("action-used", { actionId: "cast" }),
          targets: [placedTemplate("target:cast", {
            type: "sphere",
            size: 20,
            range: 120,
            evaluation: "snapshot",
          })],
          do: [
            consume(),
            operation("create-artifact", {
              id: "cast:create-zone",
              artifactId: "silence-zone",
              target: "target:cast",
            }),
          ],
        }),
      ],
    }),
  ],
  accepted: acceptance(COMPILER_MIGRATION_LOG, [
    "DM 在 120 ft 内放置 20-ft-radius 持续区域",
    "施法消耗一个二环法术位并建立最长 10 分钟专注",
    "任意阵营 token 进入与离开区域时动态获得或移除可见 silenced 状态",
    "区域内 vocal component 法术在消费资源前被 Midi 阻止，非 vocal 法术不受影响",
    "替换或取消专注时清理模板及其成员效果",
    "重叠 Silence 区域按施法实例独立维持成员效果",
  ], { status: "compiler-runtime-passed" }),
});

export default silence;
