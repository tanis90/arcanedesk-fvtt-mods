import {
  COMPILER_MIGRATION_LOG,
  acceptance,
  artifact,
  cleanRoomEffect,
  cleanRoomSpell,
  consume,
  duration,
  graphFragment,
  operation,
  placedTemplate,
  publicAction,
  rule,
  spellContract,
  spellLifetime,
  trigger,
  whileArtifact,
  whileSpellActive,
} from "../dsl.mjs";

const magicCircle = cleanRoomSpell({
  id: "magic-circle",
  contract: spellContract({
    ruleset: "2014",
    level: 3,
    school: "abj",
    components: {
      verbal: true,
      somatic: true,
      material: true,
    },
    material: {
      cost: 100,
      consumed: true,
    },
    lifetime: spellLifetime(duration(1, "hours")),
  }),
  emission: { contentVersion: 2 },
  support: {
    level: "simplified",
    omissions: [
      "施法时不选择受影响生物类型，法阵方向由 DM 裁定",
      "阻止进入、攻击劣势、魅惑恐慌附身免疫与传送 Charisma save 均由 DM 处理",
      "高环施法延长持续时间以及昂贵材料的消费由 DM 处理",
    ],
  },
  fragments: [
    graphFragment({
      id: "magic-circle-zone-graph",
      actions: [
        publicAction("cast", "放置防护法阵 Place Magic Circle", {
          activationType: "minute",
        }),
      ],
      artifacts: [
        artifact({
          id: "magic-circle-zone",
          kind: "zone",
          role: "mechanical",
          identity: { scope: "cast", keys: ["castId"] },
          state: {
            anchor: "placed-point",
            shape: {
              type: "cylinder",
              radius: 10,
              height: 20,
              units: "ft",
            },
            stationary: true,
          },
          lifecycle: whileSpellActive(),
        }),
        cleanRoomEffect("magic-circle-membership", {
          host: "actor",
          scope: "source-target",
          reapply: "replace",
          name: "Magic Circle",
          markerOnly: true,
          lifecycle: whileArtifact("magic-circle-zone"),
        }),
      ],
      rules: [
        rule({
          id: "cast-magic-circle",
          on: trigger("action-used", { actionId: "cast" }),
          targets: [placedTemplate("target:cast", {
            type: "cylinder",
            size: 10,
            height: 20,
            range: 10,
            evaluation: "snapshot",
          })],
          do: [
            consume(),
            operation("create-artifact", {
              id: "cast:create-zone",
              artifactId: "magic-circle-zone",
              target: "target:cast",
            }),
          ],
        }),
      ],
    }),
  ],
  accepted: acceptance(COMPILER_MIGRATION_LOG, [
    "施法入口为一分钟 utility，不选择 token，也不进行 Charisma save",
    "DM 在 10 ft 内放置 10-ft-radius、20-ft-high cylinder",
    "法阵持续一小时；自动资源只扣一个三环法术位，100 gp consumed material 仅标注而不自动扣库存",
    "模板只作为可见法阵存在，不触发成员 workflow",
  ], { status: "compiler-runtime-passed" }),
});

export default magicCircle;
