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

// L2 重写批（2024，M1 审计 A 桶 desc-diff-flag）：区域产生的是「日光」（视为阳光），
// 而非 2014 的普通明亮光照；半径、持续时间与物件模式不变。
// 来源：5R 玩家手册2024 3环.htm#Daylight。
const daylight = cleanRoomSpell({
  id: "daylight",
  contract: spellContract({
    ruleset: "2024",
    level: 3,
    school: "evo",
    components: {
      verbal: true,
      somatic: true,
      material: false,
    },
    lifetime: spellLifetime(duration(1, "hours")),
  }),
  emission: { contentVersion: 1 },
  support: {
    level: "simplified",
    omissions: [
      "持续区域只作为可见范围标记，不创建 Foundry 光源，也不把区域标记为 sunlight 光照类型；依赖「阳光」的敏感/弱点由 DM 判断",
      "与三环或更低环阶法术创造的黑暗区域重叠时解除这些造暗法术，由 DM 处理",
      "把日光附着到未被着装或携带的物件、以及用不透明物遮盖物件的规则由 DM 处理",
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
          name: "Daylight (Sunlight)",
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
    "DM 在 60 ft 内放置一个半径 60 ft 的持续区域，该区域产生日光（2024 口径，视为阳光）",
    "施法只消耗一个三环法术位，不建立专注；区域再向外 60 ft 为微光光照由 DM 表现",
    "模板不选择 token，也不触发成员 workflow",
    "持续一小时后清理区域；不创建光源、不自动解除三环或更低的魔法黑暗",
  ], { status: "compiler-passed" }),
});

export default daylight;
