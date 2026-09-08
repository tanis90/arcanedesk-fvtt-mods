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

const shatter = cleanRoomSpell({
  id: "shatter",
  contract: spellContract({
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
  emission: { contentVersion: 2 },
  support: {
    level: "simplified",
    omissions: [
      "无机材质生物的 Constitution save 劣势由 DM 处理",
      "区域内未被穿戴或携带的非魔法物件伤害由 DM 处理",
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
    "DM 在 60 ft 内放置 10-ft-radius 瞬时区域",
    "模板成员进行 Constitution save，失败承受 3d8 thunder damage，成功承受一半",
    "每升一环增加 1d8 thunder damage，并且只消耗一个法术位",
    "该瞬时区域参与真实 workflow，不留下持续模板",
  ], { status: "compiler-runtime-passed" }),
});

export default shatter;
