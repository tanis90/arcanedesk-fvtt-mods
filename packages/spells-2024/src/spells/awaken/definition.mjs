import {
  QA_LOG,
  acceptance,
  action,
  activation,
  cleanRoomEffect,
  cleanRoomSpell,
  consume,
  duration,
  firstOf,
  grantStatus,
  graphFragment,
  instant,
  operation,
  rule,
  selected,
  spellContract,
  spellLifetime,
  trigger,
  untilTrigger,
} from "@arcanedesk/spell-compiler/dsl";

// L3 新写批（无 2014 recipe）：5R 玩家手册2024/法术详述/5环.htm#Awaken。
// 自动化等级：8 小时施法 + 触碰目标获得最长 30 日的 charmed；智力/语言/植物生物化与属性数据由 DM 执行。
const awaken = cleanRoomSpell({
  id: "awaken",
  contract: spellContract({
    ruleset: "2024",
    level: 5,
    school: "trs",
    components: {
      verbal: true,
      somatic: true,
      material: true,
    },
    material: {
      cost: 1000,
      consumed: true,
    },
    lifetime: spellLifetime(instant()),
  }),
  emission: { contentVersion: 1 },
  support: {
    level: "simplified",
    omissions: [
      "目标必须是智力小于等于 3 的野兽或植物（或是并非生物的自然植物）：selected-targets 不校验生物类型与智力，由 DM 在施法前确认",
      "非生物的自然植物不是 token，无法作为 creature 目标；植物生物化的本体处理由 DM 手动执行",
      "目标智力变为 10、习得一门施法者掌握的语言、以及植物获得移动与类似人类的感官（属性数据由 DM 参考怪物图鉴裁定）均无对应原语，由 DM 执行",
      "charmed 的提前结束只表达为「目标受到伤害」，无法区分伤害是否来自你或你的盟友；第三方伤害也会结束，需 DM 复核",
      "8 小时施法不推进世界时间、不追踪施法打断；1000 GP 玛瑙耗材只写入 contract，不自动扣库存",
    ],
  },
  fragments: [
    graphFragment({
      id: "awaken-graph",
      actions: [
        action({
          id: "cast",
          name: "启蒙术 Awaken",
          activation: activation("hour", 8),
          visibility: "public",
        }),
      ],
      artifacts: [
        cleanRoomEffect("awaken-charmed", {
          host: "actor",
          scope: "source-target",
          reapply: "replace",
          name: "Awaken: Charmed",
          modifiers: [grantStatus("charmed")],
          lifecycle: firstOf(
            duration(30, "days"),
            untilTrigger(trigger("damage-taken", { subject: "effect-target" })),
          ),
        }),
      ],
      rules: [
        rule({
          id: "cast-awaken",
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
              id: "cast:apply-charmed",
              artifactId: "awaken-charmed",
              target: "target:cast",
            }),
          ],
        }),
      ],
    }),
  ],
  accepted: acceptance(QA_LOG, [
    "Cast 是 8 小时 Activity，触碰一名声明生物并只消耗一个五环或更高法术位",
    "目标获得来源绑定的 charmed 效果，最长持续 30 日；目标受到伤害时提前结束",
    "同一 source-target 重施替换既有 charmed 效果，不叠加；非目标不变",
    "智力变为 10、习得语言、自然植物转为植物生物及其移动/感官与属性数据由 DM 按 5R 原文执行",
    "非生物自然植物不属于 token 目标，保持明确 omission",
    "1000 GP 玛瑙耗材只写入 contract material，不自动扣库存",
  ], { status: "compiler-passed" }),
});

export default awaken;
