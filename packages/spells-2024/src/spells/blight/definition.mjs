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
  predicate,
  publicAction,
  rule,
  selected,
  spellContract,
  spellLifetime,
  trigger,
} from "@arcanedesk/spell-compiler/dsl";

// L2 重写批（2024，M1 审计 A 桶 desc-diff-flag）：植物类生物的豁免改为自动失败，
// 并删去构装/亡灵免疫与「植物劣势且伤害取最大值」；普通植物仍可直接凋谢。
// 来源：5R 玩家手册2024 4环.htm#Blight。
const blight = cleanRoomSpell({
  id: "blight",
  contract: spellContract({
    ruleset: "2024",
    level: 4,
    school: "nec",
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
      "DM 在施法前确认目标可见；自动化只接受这一普通合格目标前提，不保留对无效目标施法并浪费法术位的语义",
      "生物类型为植物的 creature 在本次 Constitution save 中自动失败；当前逐个目标的豁免结果没有按 creature-type 覆写的原语，由 DM 将该目标按失败结算",
      "以非生物的非魔法植物（树木、灌木等）为目标的另一种用法不进行豁免、直接凋谢；没有非 actor 植物目标的稳定选择原语，由 DM 叙事并结算",
    ],
  },
  fragments: [
    graphFragment({
      id: "blight-graph",
      actions: [publicAction("cast", "枯萎术 Blight")],
      rules: [
        rule({
          id: "cast-blight",
          on: trigger("action-used", { actionId: "cast" }),
          targets: [
            selected("target:cast", {
              min: 1,
              max: 1,
              range: 30,
              kind: "creature",
              predicates: [predicate("visible-to-source")],
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
                dice(8, 8),
                dice(1, 8),
              ),
              damageTypes: ["necrotic"],
              onSave: "half",
            }),
          ],
        }),
      ],
    }),
  ],
  accepted: acceptance(QA_LOG, [
    "action 选择 30 ft 内一个由 DM 确认为可见的 creature，并只消耗一个四环或更高法术位",
    "目标进行 Constitution save；失败承受 8d8 necrotic damage，成功承受一半",
    "每高一环增加 1d8 necrotic damage；非目标保持不变",
    "2024 不再排除 undead/construct 目标，因此对任何 creature 都执行正常豁免与伤害",
    "plant creature 的自动豁免失败与非生物植物的直接凋谢保持明确 DM omission",
  ], { status: "compiler-passed" }),
});

export default blight;
