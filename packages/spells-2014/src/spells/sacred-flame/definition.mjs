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

const sacredFlame = cleanRoomSpell({
  id: "sacred-flame",
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
      "目标不能从掩护获得 Dexterity save 加值的例外规则仍由 DM 处理；当前 Midi 没有按单个 save activity 忽略全部掩护加值的原生字段",
    ],
  },
  fragments: [
    graphFragment({
      id: "sacred-flame-graph",
      actions: [publicAction("cast", "圣火术 Sacred Flame")],
      rules: [
        rule({
          id: "cast-sacred-flame",
          on: trigger("action-used", { actionId: "cast" }),
          targets: [
            selected("target:cast", {
              min: 1,
              max: 1,
              range: 60,
              kind: "creature",
            }),
          ],
          do: [
            operation("saving-throw", {
              id: "cast:save",
              ability: ["dex"],
              target: "target:cast",
              onSave: "none",
            }),
            operation("damage", {
              id: "cast:damage",
              target: "target:cast",
              formula: cantripProgression(
                dice(1, 8),
                dice(1, 8),
              ),
              damageTypes: ["radiant"],
              onSave: "none",
            }),
          ],
        }),
      ],
    }),
  ],
  accepted: acceptance(QA_LOG, [
    "action 选择一个 60 ft 内 creature 进行 Dexterity save",
    "豁免失败承受 1d8 radiant damage，成功不受伤害",
    "角色等级 5、11、17 时伤害分别增加 1d8",
    "当前只自动结算标准 Dexterity save；Sacred Flame 的掩护例外明确保留给 DM",
    "戏法不消耗法术位",
  ], { status: "compiler-runtime-passed" }),
});

export default sacredFlame;
