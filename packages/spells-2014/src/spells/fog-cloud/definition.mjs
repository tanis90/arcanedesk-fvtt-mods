import {
  acceptance,
  artifact,
  cleanRoomEffect,
  cleanRoomSpell,
  concentration,
  constant,
  consume,
  contentRef,
  duration,
  graphFragment,
  operation,
  perSlotAboveBase,
  placedTemplate,
  publicAction,
  rule,
  spellContract,
  trigger,
  whileArtifact,
  whileSpellActive,
} from "@arcanedesk/spell-compiler/dsl";

const EXPANSION_BATCH =
  "docs/foundry-automation/notes/零至三环新法术扩展批次.md";

const fogRadius = perSlotAboveBase(
  constant(20),
  constant(20),
);

const fogCloud = cleanRoomSpell({
  id: "fog-cloud",
  contract: spellContract({
    ruleset: "2014",
    level: 1,
    school: "con",
    components: {
      verbal: true,
      somatic: true,
      material: false,
    },
    lifetime: concentration(duration(1, "hours")),
  }),
  content: contentRef("fog-cloud"),
  emission: { contentVersion: 1 },
  support: {
    level: "simplified",
    omissions: [
      "区域只建立可见持续模板与成员 marker；heavily obscured 对视线、攻击、可见性前提及特殊感知的机械影响仍由 DM 处理",
      "雾气绕过拐角的体积传播不做独立几何模拟",
      "至少 10 mph 的中等或更强风会提前吹散雾气；当前 runtime 没有结构化环境风速事件，需由 DM 结束该法术",
      "ActiveAuras 0.12.7 的 measured-template membership 只检查 XY；sphere 的垂直边界与不同 elevation 的成员关系由 DM 处理",
    ],
  },
  fragments: [
    graphFragment({
      id: "fog-cloud-zone-graph",
      actions: [publicAction("cast", "放置云雾术 Place Fog Cloud")],
      artifacts: [
        artifact({
          id: "fog-cloud-zone",
          kind: "zone",
          role: "mechanical",
          identity: { scope: "cast", keys: ["castId"] },
          state: {
            anchor: "placed-point",
            shape: { type: "sphere", radius: fogRadius, units: "ft" },
            stationary: true,
          },
          lifecycle: whileSpellActive(),
        }),
        cleanRoomEffect("fog-cloud-membership", {
          host: "actor",
          scope: "source-target",
          reapply: "replace",
          name: "Fog Cloud",
          markerOnly: true,
          lifecycle: whileArtifact("fog-cloud-zone"),
        }),
      ],
      rules: [
        rule({
          id: "cast-fog-cloud",
          on: trigger("action-used", { actionId: "cast" }),
          targets: [
            placedTemplate("target:cast", {
              type: "sphere",
              size: fogRadius,
              range: 120,
              evaluation: "snapshot",
            }),
          ],
          do: [
            consume(),
            operation("create-artifact", {
              id: "cast:create-zone",
              artifactId: "fog-cloud-zone",
              target: "target:cast",
            }),
          ],
        }),
      ],
    }),
  ],
  accepted: acceptance(EXPANSION_BATCH, [
    "DM 在施法者 120 ft 内放置一个持续球形区域；一环半径 20 ft，每升一环半径再增加 20 ft",
    "一次合法施法只消耗一个所声明环位的法术位并建立最长一小时专注，不运行伤害或豁免 workflow",
    "任意阵营 creature 进入与离开区域时动态获得或移除本次施法实例的 Fog Cloud 成员 marker",
    "解除、替换、到期或由 DM 因强风结束法术时删除对应模板及其成员 marker；不同施法来源按 cast identity 隔离",
    "可见模板与成员 marker 不冒充 heavily obscured 的完整视线规则，视线与攻击影响保持明确 omission",
    "成员 marker 只有 XY 保证；sphere 的垂直边界由 DM 处理",
  ], { status: "compiler-runtime-passed" }),
});

export default fogCloud;
