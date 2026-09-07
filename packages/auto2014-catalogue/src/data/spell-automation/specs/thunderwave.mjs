import {
  QA_LOG,
  acceptance,
  cleanRoomSpell,
  consume,
  dice,
  eventTarget,
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
} from "../dsl.mjs";

const thunderwave = cleanRoomSpell({
  id: "thunderwave",
  contract: spellContract({
    ruleset: "2014",
    level: 1,
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
      "完全位于区域内且未被固定的物件自动推离 10 ft 仍由 DM 结算",
      "方圆 300 ft 可听见雷鸣的叙事与潜在遭遇后果仍由 DM 结算",
    ],
  },
  fragments: [
    graphFragment({
      id: "thunderwave-graph",
      actions: [
        publicAction("cast", "雷鸣波 Thunderwave"),
      ],
      rules: [
        rule({
          id: "cast-thunderwave",
          on: trigger("action-used", { actionId: "cast" }),
          targets: [
            placedTemplate("target:cast", {
              type: "cube",
              size: 15,
              range: null,
              rangeUnits: "self",
            }),
          ],
          do: [
            consume(),
            operation("saving-throw", {
              id: "initial-save",
              ability: ["con"],
              target: "target:cast",
              onSave: "half",
            }),
            operation("damage", {
              id: "initial-damage",
              target: "target:cast",
              formula: perSlotAboveBase(
                dice(2, 8),
                dice(1, 8),
              ),
              damageTypes: ["thunder"],
              onSave: "half",
            }),
          ],
        }),
        rule({
          id: "thunderwave-save-failed",
          on: trigger("operation-outcome", {
            operationId: "initial-save",
            outcome: "failure",
          }),
          targets: [eventTarget("target:failed")],
          do: [
            operation("move-token", {
              id: "push-failed-target",
              target: "target:failed",
              destination: {
                type: "away-from-source",
                distance: 10,
                units: "ft",
              },
            }),
          ],
        }),
      ],
    }),
  ],
  accepted: acceptance(QA_LOG, [
    "DM 从施法者位置确定一个 15-ft cube，并由同一 workflow 快照模板内 creature",
    "模板成员进行 Constitution save；失败承受 2d8 thunder damage，成功承受一半",
    "每个失败目标在伤害结算后沿远离施法者的方向被推 10 ft，成功者不移动",
    "每升一环增加 1d8 thunder damage，并且一次施法只消耗一个明确声明的法术位",
    "该瞬时区域不建立专注或持续模板；物件推离与 300-ft 可闻声响保持明确 omission",
  ], { status: "compiler-runtime-passed" }),
});

export default thunderwave;
