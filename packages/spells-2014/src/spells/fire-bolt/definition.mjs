import {
  QA_LOG,
  acceptance,
  cantripProgression,
  cleanRoomSpell,
  dice,
  graphFragment,
  instant,
  operation,
  publicAction,
  rule,
  selected,
  spellContract,
  spellLifetime,
  trigger,
} from "@arcanedesk/spell-compiler/dsl";

const fireBolt = cleanRoomSpell({
  id: "fire-bolt",
  contract: spellContract({
    ruleset: "2014",
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
  support: {
    level: "simplified",
    omissions: [
      "2014 规则允许攻击物件，并点燃未被穿戴或携带的可燃物；当前公开目标入口只结算 creature token，物件目标与点燃结果由 DM 处理",
    ],
  },
  fragments: [
    graphFragment({
      id: "fire-bolt-graph",
      actions: [publicAction("cast", "火焰箭 Fire Bolt")],
      rules: [
        rule({
          id: "cast-fire-bolt",
          on: trigger("action-used", { actionId: "cast" }),
          targets: [
            selected("target:cast", {
              min: 1,
              max: 1,
              range: 120,
              kind: "creature",
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
                dice(1, 10),
                dice(1, 10),
              ),
              damageTypes: ["fire"],
            }),
          ],
        }),
      ],
    }),
  ],
  accepted: acceptance(QA_LOG, [
    "120 ft 内一个声明的 creature 进行 ranged spell attack",
    "未命中不造成伤害；命中造成 1d10 fire damage，暴击扩骰交给 Midi",
    "角色等级 5、11、17 时伤害分别增加至 2d10、3d10、4d10",
    "物件攻击以及未穿戴、未携带可燃物的点燃结果保留给 DM",
    "戏法不消耗法术位",
  ], { status: "compiler-runtime-passed" }),
});

export default fireBolt;
