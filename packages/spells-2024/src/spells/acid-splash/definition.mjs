import {
  QA_LOG,
  acceptance,
  cantripProgression,
  cleanRoomSpell,
  dice,
  graphFragment,
  instant,
  operation,
  placedTemplate,
  publicAction,
  rule,
  spellContract,
  spellLifetime,
  trigger,
} from "@arcanedesk/spell-compiler/dsl";

// L2 重写批（2024，M1 审计 C 桶 recipe-invalid）：不再指定 1 个或相距 5 ft 的 2 个生物，
// 改为 60 ft 内一点为源点的 5 ft 球状区域全员敏捷豁免；学派由咒法改为塑能。
// 来源：5R 玩家手册2024 0环.htm#Acid_Splash。
const acidSplash = cleanRoomSpell({
  id: "acid-splash",
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
  support: {
    level: "simplified",
    omissions: [
      "球状区域的中心点由 DM 在 60 ft 内点击放置；是否真的落在可见空间、被遮挡或处于三维 elevation 由 DM 判断",
      "5-ft 球状模板成员只有 XY 几何保证，离地、跨层与遮挡对成员关系的影响由 DM 处理",
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
            placedTemplate("target:cast", {
              type: "sphere",
              size: 5,
              range: 60,
              evaluation: "snapshot",
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
    "DM 在施法者 60 ft 内放置一个半径 5 ft 的球状快照模板，并由同一 workflow 结算模板内 creature",
    "每个模板内 creature 分别进行 Dexterity save；成功不受伤害，失败承受 1d6 acid damage",
    "角色等级 5、11、17 时伤害分别增加至 2d6、3d6、4d6；戏法不消耗法术位",
    "不再限制最多两个彼此相距 5 ft 的目标，也不再需要近距离目标选择；区域外非目标保持不变",
  ], { status: "compiler-passed" }),
});

export default acidSplash;
