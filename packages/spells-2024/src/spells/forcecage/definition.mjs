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

// L3 新写批（无 2014 recipe）：5R 玩家手册2024/法术详述/7环.htm#Forcecage。
// 自动化等级：utility marker-only——笼/盒两种 20/10 ft 立方占位；困住、传送魅力豁免与反解除由 DM 执行。
const forcecage = cleanRoomSpell({
  id: "forcecage",
  contract: spellContract({
    ruleset: "2024",
    level: 7,
    school: "evo",
    components: {
      verbal: true,
      somatic: true,
      material: true,
    },
    material: {
      cost: 1500,
      consumed: true,
    },
    lifetime: concentration(duration(1, "hours")),
    primaryActionId: "cast-cage",
  }),
  emission: { contentVersion: 1 },
  support: {
    level: "simplified",
    omissions: [
      "两个公开 Cast 分别对应笼状（20 ft 立方）与盒状（10 ft 立方）形式；模板只是可见占位，系统不创建 Foundry WallDocument，笼状 1/2 寸栅栏与盒状密封墙都不阻挡移动、视线或法术",
      "5R 的力场监牢是隐形的，而放置模板对所有玩家可见；这是占位指示与隐形设定的偏差，DM 可自行删除或隐藏模板",
      "「所有完全在区域内的生物被牢笼困住、部分在区域内或体型更大的生物被推到区域外」由 DM 手动判定与移动 Token，自动化不施加 restrained 或任何状态",
      "以传送或跨位面旅行离开牢笼时的魅力豁免、失败则浪费该法术或效应，没有可用的传送事件触发器，由 DM 手动结算",
      "牢笼延伸至以太位面从而屏蔽以太旅行的规则、以及「不能被解除魔法解除」，由 DM 判断",
      "价值 1,500 gp 的红宝石尘作为法术耗材：contract 保留费用与 consumed 语义，runtime 不搜索或删除 Actor inventory 中的具体物件",
    ],
  },
  fragments: [
    graphFragment({
      id: "forcecage-graph",
      actions: [
        publicAction("cast-cage", "力场监牢：笼状 Forcecage: Cage"),
        publicAction("cast-box", "力场监牢：盒状 Forcecage: Box"),
      ],
      artifacts: [
        cleanRoomEffect("forcecage-marker", {
          host: "actor",
          scope: "source",
          reapply: "replace",
          name: "Forcecage",
          markerOnly: true,
          modifiers: [],
          lifecycle: whileSpellActive(),
        }),
      ],
      rules: [
        rule({
          id: "cast-forcecage-cage",
          on: trigger("action-used", { actionId: "cast-cage" }),
          targets: [
            placedTemplate("target:cast-cage", {
              type: "cube",
              size: 20,
              range: 100,
              evaluation: "snapshot",
            }),
          ],
          do: [
            consume("cast-cage:consume"),
            operation("apply-artifact", {
              id: "cast-cage:apply-marker",
              artifactId: "forcecage-marker",
              target: "source",
            }),
          ],
        }),
        rule({
          id: "cast-forcecage-box",
          on: trigger("action-used", { actionId: "cast-box" }),
          targets: [
            placedTemplate("target:cast-box", {
              type: "cube",
              size: 10,
              range: 100,
              evaluation: "snapshot",
            }),
          ],
          do: [
            consume("cast-box:consume"),
            operation("apply-artifact", {
              id: "cast-box:apply-marker",
              artifactId: "forcecage-marker",
              target: "source",
            }),
          ],
        }),
      ],
    }),
  ],
  accepted: acceptance(QA_LOG, [
    "两个公开 Cast 分别对应笼状与盒状：DM 在 100 ft 内放置 20 ft 或 10 ft 立方占位，一次施法只消费一个七环或更高法术位",
    "Cast 建立最长一小时的原生专注、source-scoped Forcecage marker 与锚定于落点、不跟随施法者的持续模板",
    "模板只是可见参考，不产生豁免、伤害、状态或 Actor membership；困住与否、推挤与传送离开的结算均由 DM 按 5R 原文执行",
    "解除、替换、到期或手动结束专注时按 cast 清理模板与共用的 Forcecage marker，不影响其他施法来源或 DM 手工建立的障碍",
    "笼状的栅栏间隙、盒状阻隔法术、以太位面屏蔽与不可被解除魔法的性质由 DM 处理",
  ], { status: "compiler-passed" }),
});

export default forcecage;
