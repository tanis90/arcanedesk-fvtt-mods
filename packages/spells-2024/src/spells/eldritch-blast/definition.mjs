import {
  QA_LOG,
  acceptance,
  cantripProgression,
  cleanRoomSpell,
  constant,
  dice,
  graphFragment,
  independentProjectiles,
  instant,
  operation,
  publicAction,
  rule,
  selected,
  spellContract,
  spellLifetime,
  trigger,
} from "@arcanedesk/spell-compiler/dsl";

// L2 重写批（2024，M1 审计 A 桶 desc-diff-flag）：射线的目标由「一名生物」放宽为
// 「一名生物或一个物件」，其余射线数量与 1d10 力场伤害与 2014 一致。
// 来源：5R 玩家手册2024 0环.htm#Eldritch_Blast。
const eldritchBlast = cleanRoomSpell({
  id: "eldritch-blast",
  contract: spellContract({
    ruleset: "2024",
    level: 0,
    school: "evo",
    components: {
      verbal: true,
      somatic: true,
      material: false,
    },
    lifetime: spellLifetime(instant()),
  }),
  emission: { contentVersion: 1 },
  support: { level: "full", omissions: [] },
  fragments: [
    graphFragment({
      id: "eldritch-blast-graph",
      actions: [
        publicAction("cast", "魔能爆 Eldritch Blast", {
          resolution: independentProjectiles(
            cantripProgression(constant(1), constant(1)),
          ),
        }),
      ],
      rules: [
        rule({
          id: "cast-eldritch-blast",
          on: trigger("action-used", { actionId: "cast" }),
          targets: [
            selected("target:cast", {
              min: 1,
              max: 1,
              range: 120,
              kind: "creatureOrObject",
            }),
          ],
          do: [
            operation("attack-roll", {
              id: "cast:attack",
              target: "target:cast",
              attack: {
                source: "spellcasting",
                range: "ranged",
              },
            }),
            operation("damage", {
              id: "cast:damage",
              target: "target:cast",
              formula: dice(1, 10),
              damageTypes: ["force"],
            }),
          ],
        }),
      ],
    }),
  ],
  accepted: acceptance(QA_LOG, [
    "DM 只声明一个 120 ft 内的目标时，默认将全部魔能束集中到该目标；agent 不自行选择第二目标",
    "目标可以是 creature 或物件（2024 口径）；选中物件时射线仍按 item 目标结算伤害",
    "角色等级 1、5、11、17 时分别执行 1、2、3、4 个独立 ranged spell attack workflow；每束未命中不造成伤害",
    "每束命中造成 1d10 force damage，命中与暴击分别交给 Midi 结算",
    "只有 DM 明确逐束分配时才读取 optional allocation；字段缺失时必须保持单目标集中策略",
    "戏法不消耗法术位",
  ], { status: "compiler-passed" }),
});

export default eldritchBlast;
