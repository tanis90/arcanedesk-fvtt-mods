import {
  QA_LOG,
  acceptance,
  cantripProgression,
  cleanRoomSpell,
  dice,
  graphFragment,
  instant,
  operation,
  predicate,
  publicAction,
  rule,
  selected,
  spellContract,
  spellLifetime,
  trigger,
} from "@arcanedesk/spell-compiler/dsl";

// 2024 重写批（M1.0 审计 C 桶 recipe-invalid）：由 10 ft 体质豁免改为 30 ft
// 远程法术攻击，学派咒法→死灵，伤害骰仍为 1d12 毒素并按戏法强化增至 4d12。
// 5R 锚点：5R 玩家手册2024 0环.htm#Poison_Spray。
const poisonSpray = cleanRoomSpell({
  id: "poison-spray",
  contract: spellContract({
    ruleset: "2024",
    level: 0,
    school: "nec",
    components: {
      verbal: true,
      somatic: true,
      material: false,
    },
    lifetime: spellLifetime(instant()),
  }),
  emission: { contentVersion: 2 },
  support: {
    level: "simplified",
    omissions: [
      "目标必须能被施法者看见：visible-to-source 只记录 DM 声明的可见性投影，系统不自行做视线/遮挡判定",
    ],
  },
  fragments: [
    graphFragment({
      id: "poison-spray-graph",
      actions: [publicAction("cast", "毒气喷涌 Poison Spray")],
      rules: [
        rule({
          id: "cast-poison-spray",
          on: trigger("action-used", { actionId: "cast" }),
          targets: [
            selected("target:cast", {
              min: 1,
              max: 1,
              range: 30,
              kind: "creature",
              predicates: [predicate("visible-to-source")],
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
              formula: cantripProgression(
                dice(1, 12),
                dice(1, 12),
              ),
              damageTypes: ["poison"],
            }),
          ],
        }),
      ],
    }),
  ],
  accepted: acceptance(QA_LOG, [
    "action 对一个 30 ft 内、由 DM 声明为可见的 creature 进行远程法术攻击；戏法不消耗法术位",
    "未命中不造成伤害；命中造成 1d12 poison damage，暴击扩骰交给 Midi",
    "角色等级 5、11、17 时伤害分别增加至 2d12、3d12、4d12",
    "2024 起不再要求体质豁免，也不再有 10 ft 距离限制",
  ], { status: "compiler-passed" }),
});

export default poisonSpray;
