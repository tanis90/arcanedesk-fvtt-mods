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
} from "../dsl.mjs";

const poisonSpray = cleanRoomSpell({
  id: "poison-spray",
  contract: spellContract({
    ruleset: "2014",
    level: 0,
    school: "con",
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
      "目标必须能被施法者看见；当前 selected-targets 原语没有通用可见性谓词，由 DM 在声明目标时判断",
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
              range: 10,
              kind: "creature",
            }),
          ],
          do: [
            operation("saving-throw", {
              id: "cast:save",
              ability: ["con"],
              target: "target:cast",
              onSave: "none",
            }),
            operation("damage", {
              id: "cast:damage",
              target: "target:cast",
              formula: cantripProgression(
                dice(1, 12),
                dice(1, 12),
              ),
              damageTypes: ["poison"],
              onSave: "none",
            }),
          ],
        }),
      ],
    }),
  ],
  accepted: acceptance(QA_LOG, [
    "action 选择一个施法者能看见且位于 10 ft 内的 creature；可见性由 DM 判断",
    "目标进行 Constitution save；成功不受伤害，失败承受 1d12 poison damage",
    "角色等级 5、11、17 时伤害分别增加至 2d12、3d12、4d12",
    "戏法不消耗法术位",
  ], { status: "compiler-runtime-passed" }),
});

export default poisonSpray;
