import {
  QA_LOG,
  acceptance,
  cantripProgression,
  cleanRoomSpell,
  dice,
  graphFragment,
  instant,
  operation,
  pairwiseWithinDistance,
  publicAction,
  rule,
  selected,
  spellContract,
  spellLifetime,
  trigger,
} from "../dsl.mjs";

const acidSplash = cleanRoomSpell({
  id: "acid-splash",
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
      "目标必须能被施法者看见；当前 selected-targets 原语没有通用可见性校验，由 DM 在声明目标时判断",
    ],
  },
  fragments: [
    graphFragment({
      id: "acid-splash-graph",
      actions: [publicAction("cast", "酸液飞溅 Acid Splash")],
      rules: [
        rule({
          id: "cast-acid-splash",
          on: trigger("action-used", { actionId: "cast" }),
          targets: [
            selected("target:cast", {
              min: 1,
              max: 2,
              range: 60,
              kind: "creature",
              predicates: [
                pairwiseWithinDistance(5),
              ],
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
                dice(1, 6),
                dice(1, 6),
              ),
              damageTypes: ["acid"],
              onSave: "none",
            }),
          ],
        }),
      ],
    }),
  ],
  accepted: acceptance(QA_LOG, [
    "action 可选择一个 60 ft 内 creature，或两个彼此相距不超过 5 ft 的 creature",
    "选择两个目标时，preflight 依据 pairwise-within-distance(5 ft) 拒绝不满足邻接条件的输入",
    "每个目标分别进行 Dexterity save；成功不受伤害，失败承受 1d6 acid damage",
    "角色等级 5、11、17 时伤害分别增加至 2d6、3d6、4d6",
    "戏法不消耗法术位",
  ], { status: "compiler-runtime-passed" }),
});

export default acidSplash;
