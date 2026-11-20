import {
  QA_LOG,
  acceptance,
  cleanRoomEffect,
  cleanRoomSpell,
  consume,
  duration,
  graphFragment,
  operation,
  predicate,
  publicAction,
  rule,
  selected,
  spellContract,
  spellLifetime,
  trigger,
  whileSpellActive,
} from "@arcanedesk/spell-compiler/dsl";

// L3 新写批（无 2014 recipe）：5R 玩家手册2024/法术详述/3环.htm#Nondetection。
// 自动化等级：utility marker-only——触碰自愿生物获得 8 小时来源标记；预言拦截与地点/物件目标由 DM 执行。
const nondetection = cleanRoomSpell({
  id: "nondetection",
  contract: spellContract({
    ruleset: "2024",
    level: 3,
    school: "abj",
    components: {
      verbal: true,
      somatic: true,
      material: true,
    },
    material: {
      cost: 25,
      consumed: true,
    },
    lifetime: spellLifetime(duration(8, "hours")),
  }),
  emission: { contentVersion: 1 },
  support: {
    level: "simplified",
    omissions: [
      "目标也可以是一处地点或一个物件（各方向不超过 10 ft）：target-kind 只支持 token/creature，地点与物件目标由 DM 手动处理",
      "「不能被任何预言法术选为目标、也不能被魔法探知传感器感测」没有对应的 anti-divination 原语；标记只表示本法术仍在生效，实际拦截由 DM 判定",
      "目标是否自愿由 DM 确认；willing predicate 只记录声明，不替 DM 推断",
      "25 GP 钻石尘耗材只写入 contract material，不自动扣库存",
    ],
  },
  fragments: [
    graphFragment({
      id: "nondetection-graph",
      actions: [publicAction("cast", "回避侦测 Nondetection")],
      artifacts: [
        cleanRoomEffect("nondetection", {
          host: "actor",
          scope: "source-target",
          reapply: "replace",
          name: "Nondetection",
          markerOnly: true,
          lifecycle: whileSpellActive(),
        }),
      ],
      rules: [
        rule({
          id: "cast-nondetection",
          on: trigger("action-used", { actionId: "cast" }),
          targets: [
            selected("target:cast", {
              min: 1,
              max: 1,
              range: null,
              units: "touch",
              kind: "creature",
              predicates: [predicate("willing")],
            }),
          ],
          do: [
            consume(),
            operation("apply-artifact", {
              id: "cast:apply-nondetection",
              artifactId: "nondetection",
              target: "target:cast",
            }),
          ],
        }),
      ],
    }),
  ],
  accepted: acceptance(QA_LOG, [
    "action 触碰一名声明自愿生物，并只消耗一个三环或更高法术位",
    "目标获得持续 8 小时的 Nondetection 标记，不建立专注",
    "同一 source-target 重施替换既有标记，不堆叠；非目标不变",
    "预言法术拦截、魔法探知传感器与地点/物件目标由 DM 按 5R 原文处理",
    "标记不修改目标数值、状态或 HP",
  ], { status: "compiler-passed" }),
});

export default nondetection;
