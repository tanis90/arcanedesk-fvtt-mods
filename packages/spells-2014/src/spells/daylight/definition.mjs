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
} from "@arcanedesk/spell-compiler/dsl";

const daylight = cleanRoomSpell({
  id: "daylight",
  contract: spellContract({
    ruleset: "2014",
    level: 3,
    school: "evo",
    components: {
      verbal: true,
      somatic: true,
      material: false,
    },
    lifetime: spellLifetime(duration(1, "hours")),
  }),
  emission: { contentVersion: 2 },
  support: {
    level: "simplified",
    omissions: [
      "持续区域只作为可见范围标记，不创建 Foundry 光源",
      "与 Darkness 等魔法黑暗的解除和压制关系由 DM 处理",
      "把光球附着到物件以及遮盖该物件的规则由 DM 处理",
    ],
  },
  fragments: [
    graphFragment({
      id: "daylight-zone-graph",
      actions: [publicAction("cast", "放置昼明术 Place Daylight")],
      artifacts: [
        artifact({
          id: "daylight-zone",
          kind: "zone",
          role: "mechanical",
          identity: { scope: "cast", keys: ["castId"] },
          state: {
            anchor: "placed-point",
            shape: { type: "sphere", radius: 60, units: "ft" },
            stationary: true,
          },
          lifecycle: whileSpellActive(),
        }),
        cleanRoomEffect("daylight-membership", {
          host: "actor",
          scope: "source-target",
          reapply: "replace",
          name: "Daylight",
          markerOnly: true,
          lifecycle: whileArtifact("daylight-zone"),
        }),
      ],
      rules: [
        rule({
          id: "cast-daylight",
          on: trigger("action-used", { actionId: "cast" }),
          targets: [placedTemplate("target:cast", {
            type: "sphere",
            size: 60,
            range: 60,
            evaluation: "snapshot",
          })],
          do: [
            consume(),
            operation("create-artifact", {
              id: "cast:create-zone",
              artifactId: "daylight-zone",
              target: "target:cast",
            }),
          ],
        }),
      ],
    }),
  ],
  accepted: acceptance(COMPILER_MIGRATION_LOG, [
    "DM 在 60 ft 内放置 60-ft-radius 可见持续区域",
    "施法只消耗一个三环法术位，不建立专注",
    "模板不选择 token，也不触发成员 workflow",
    "持续一小时后清理区域；不创建光源且不自动解除 Darkness",
  ], { status: "compiler-runtime-passed" }),
});

export default daylight;
