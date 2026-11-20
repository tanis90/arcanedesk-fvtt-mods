import {
  QA_LOG,
  acceptance,
  cleanRoomEffect,
  cleanRoomSpell,
  concentration,
  consume,
  duration,
  graphFragment,
  operation,
  placedTemplate,
  publicAction,
  rule,
  spellContract,
  trigger,
  whileSpellActive,
} from "@arcanedesk/spell-compiler/dsl";

// L3 新写批（无 2014 recipe）：5R 玩家手册2024/法术详述/5环.htm#Wall_of_Force。
// 自动化等级：utility marker-only——DM 放置 100×10 ft 直线力场占位；不建墙、不挡移动与视线。
const wallOfForce = cleanRoomSpell({
  id: "wall-of-force",
  contract: spellContract({
    ruleset: "2024",
    level: 5,
    school: "evo",
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
      "只实现十块 10×10 ft 墙板首尾相接的 100-ft 直线二维占位；半球/球形（半径 10 ft）、任意倾角、竖直或水平放置与少于十块墙板由 DM 手动调整",
      "模板只是可见的 XY 占位参考；系统不创建 Foundry WallDocument，不阻挡移动、视线或法术，也不体现 1/4 寸厚度与「没有任何事物可通过物理方式穿过」",
      "5R 的力场墙是隐形的，而放置模板对所有玩家可见；这是占位指示与隐形设定的偏差，DM 可自行删除或隐藏模板",
      "力场墙免疫所有伤害、不能被解除魔法解除、但可被解离术立即摧毁：这些交互不由自动化追踪，由 DM 判断并删除占位",
      "法术延伸进以太位面、阻断以太位面穿墙旅行的规则由 DM 处理",
      "力场墙形成时若穿过生物空间，由 DM 决定把该生物推到哪一侧并手动移动 Token",
    ],
  },
  fragments: [
    graphFragment({
      id: "wall-of-force-graph",
      actions: [publicAction("cast", "力场墙 Wall of Force")],
      artifacts: [
        cleanRoomEffect("wall-of-force-source", {
          host: "actor",
          scope: "source",
          reapply: "replace",
          name: "Wall of Force",
          markerOnly: true,
          modifiers: [],
          lifecycle: whileSpellActive(),
        }),
      ],
      rules: [
        rule({
          id: "cast-wall-of-force",
          on: trigger("action-used", { actionId: "cast" }),
          targets: [
            placedTemplate("target:cast", {
              type: "line",
              size: 100,
              width: 10,
              range: 120,
              evaluation: "snapshot",
            }),
          ],
          do: [
            consume(),
            operation("apply-artifact", {
              id: "cast:apply-wall-of-force-source",
              artifactId: "wall-of-force-source",
              target: "source",
            }),
          ],
        }),
      ],
    }),
  ],
  accepted: acceptance(QA_LOG, [
    "public Cast 使用 placed-template 输入；DM 在施法者 120 ft 内放置并定向一条 100×10 ft 的直线占位，一次施法只消费一个五环或更高法术位",
    "Cast 建立最长 10 分钟的原生专注、source-scoped Wall of Force marker 与一条锚定于落点、不跟随施法者的持续模板；不产生豁免、伤害、状态或 Actor membership",
    "占位只是可见参考，不创建 WallDocument、不阻挡移动/视线/法术，也不体现力场墙的免疫、反解除与可被解离术摧毁",
    "解除、替换、到期或手动结束专注时按 cast 精确清理模板与 marker，不影响其他施法来源或 DM 手工建立的墙",
    "半球/球形、任意倾角、10 块墙板的自由排列、厚度、穿模推挤与以太位面阻断均由 DM 处理",
  ], { status: "compiler-passed" }),
});

export default wallOfForce;
