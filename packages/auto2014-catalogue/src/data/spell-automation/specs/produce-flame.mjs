import {
  QA_LOG,
  acceptance,
  cantripProgression,
  cleanRoomSpell,
  dice,
  duration,
  graphFragment,
  operation,
  publicAction,
  rule,
  selected,
  spellContract,
  spellLifetime,
  trigger,
} from "../dsl.mjs";

const produceFlame = cleanRoomSpell({
  id: "produce-flame",
  contract: spellContract({
    ruleset: "2014",
    level: 0,
    school: "con",
    components: {
      verbal: true,
      somatic: true,
      material: false,
    },
    lifetime: spellLifetime(duration(10, "minutes")),
  }),
  emission: { contentVersion: 1 },
  support: {
    level: "simplified",
    omissions: [
      "手中火焰持续十分钟、提供 10 ft 明亮光照与额外 10 ft 微光，以及稍后用动作投掷或用动作熄灭的状态机不托管；公开 action 始终按施法时立即投掷结算",
    ],
  },
  fragments: [
    graphFragment({
      id: "produce-flame-graph",
      actions: [publicAction("cast", "燃火术 Produce Flame")],
      rules: [
        rule({
          id: "cast-produce-flame",
          on: trigger("action-used", { actionId: "cast" }),
          targets: [
            selected("target:cast", {
              min: 1,
              max: 1,
              range: 30,
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
                dice(1, 8),
                dice(1, 8),
              ),
              damageTypes: ["fire"],
            }),
          ],
        }),
      ],
    }),
  ],
  accepted: acceptance(
    QA_LOG,
    [
      "公开 action 简化为对 30 ft 内一个声明 creature 立即投掷火焰，并进行 ranged spell attack",
      "未命中不造成伤害；命中造成 1d8 fire damage，暴击扩骰交给 Midi",
      "角色等级 5、11、17 时伤害分别增加至 2d8、3d8、4d8",
      "戏法不消耗法术位，也不创建持续光源、手持火焰或后续 action",
    ],
    { status: "compiler-runtime-passed" },
  ),
});

export default produceFlame;
