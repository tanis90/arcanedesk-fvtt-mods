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

const thornWhip = cleanRoomSpell({
  id: "thorn-whip",
  contract: spellContract({
    ruleset: "2014",
    level: 0,
    school: "trs",
    components: {
      verbal: true,
      somatic: true,
      material: true,
    },
    lifetime: spellLifetime(instant()),
  }),
  emission: { contentVersion: 1 },
  support: {
    level: "simplified",
    omissions: [
      "命中 Large 或更小 creature 后，施法者可以将其朝自己方向拉近至多 10 ft；目标体型、可选距离、阻挡和最终落点由 DM 在画布上裁定",
    ],
  },
  fragments: [
    graphFragment({
      id: "thorn-whip-graph",
      actions: [publicAction("cast", "荆棘之鞭 Thorn Whip")],
      rules: [
        rule({
          id: "cast-thorn-whip",
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
                range: "melee",
              },
            }),
            operation("damage", {
              id: "cast:damage",
              target: "target:cast",
              formula: cantripProgression(
                dice(1, 6),
                dice(1, 6),
              ),
              damageTypes: ["piercing"],
            }),
          ],
        }),
      ],
    }),
  ],
  accepted: acceptance(
    QA_LOG,
    [
      "30 ft 内一个声明目标进行 melee spell attack，且作为戏法不消耗法术位",
      "命中造成 1d6 piercing damage，并在角色 5、11、17 级分别增加至 2d6、3d6、4d6；暴击扩骰交给 Midi",
      "未命中不造成伤害",
      "Large 或更小目标的至多 10 ft 拉近由 DM 裁定，自动化不猜测是否拉动、拉动距离或最终落点",
    ],
    { status: "compiler-runtime-passed" },
  ),
});

export default thornWhip;
