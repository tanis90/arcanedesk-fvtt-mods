import {
  QA_LOG,
  acceptance,
  cleanRoomSpell,
  consume,
  dice,
  graphFragment,
  instant,
  operation,
  perSlotAboveBase,
  placedTemplate,
  publicAction,
  rule,
  spellContract,
  spellLifetime,
  trigger,
} from "@arcanedesk/spell-compiler/dsl";

// 2024 重写批（M1.0 审计 A 桶 desc-diff-flag）：豁免劣势对象由「无机物质构成
// 的生物」收窄为构装生物；3d8 雷鸣 / 体质豁免半伤 / 升环 +1d8 不变。
// 5R 锚点：5R 玩家手册2024 2环.htm#Shatter。
const shatter = cleanRoomSpell({
  id: "shatter",
  contract: spellContract({
    ruleset: "2024",
    level: 2,
    school: "evo",
    components: {
      verbal: true,
      somatic: true,
      material: true,
    },
    lifetime: spellLifetime(instant()),
    primaryActionId: "cast",
  }),
  emission: { contentVersion: 3 },
  support: {
    level: "simplified",
    omissions: [
      "构装生物进行该豁免时具有劣势：现有 saving-throw 原语只支持整次豁免的固定 rollMode，无法按目标类型条件化，由 DM 手动处理",
      "区域内未被穿戴或携带的非魔法物件也受该伤害，由 DM 处理",
    ],
  },
  fragments: [
    graphFragment({
      id: "shatter-graph",
      actions: [publicAction("cast", "粉碎音波 Shatter")],
      rules: [
        rule({
          id: "cast-shatter",
          on: trigger("action-used", { actionId: "cast" }),
          targets: [placedTemplate("target:cast", {
            type: "sphere",
            size: 10,
            range: 60,
            evaluation: "snapshot",
          })],
          do: [
            consume(),
            operation("saving-throw", {
              id: "shatter-save",
              ability: ["con"],
              target: "target:cast",
              onSave: "half",
            }),
            operation("damage", {
              id: "shatter-damage",
              target: "target:cast",
              formula: perSlotAboveBase(
                dice(3, 8),
                dice(1, 8),
              ),
              damageTypes: ["thunder"],
              onSave: "half",
            }),
          ],
        }),
      ],
    }),
  ],
  accepted: acceptance(QA_LOG, [
    "DM 在 60 ft 内放置 10-ft-radius 瞬时区域，只消耗一个二环或更高法术位",
    "模板成员进行 Constitution save，失败承受 3d8 thunder damage，成功承受一半",
    "每升一环增加 1d8 thunder damage",
    "2024 的豁免劣势对象只有构装生物（不再是所有无机物质生物），该条件化劣势由 DM 处理",
    "该瞬时区域参与真实 workflow，不留下持续模板",
  ], { status: "compiler-passed" }),
});

export default shatter;
