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
} from "../dsl.mjs";

const blight = cleanRoomSpell({
  id: "blight",
  contract: spellContract({
    ruleset: "2014",
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
      "DM 在施法前确认目标可见且不是 undead/construct；自动化只接受这一普通合格目标前提，不保留对无效目标施法并浪费法术位的语义",
      "plant creature 的首次 Constitution save 劣势与最大伤害由 DM 结算；自动化的普通目标分支只执行正常豁免与正常伤害掷骰",
      "普通植物以及没有 creature Actor/Token 表示的 magical plant，其枯萎或其他规则结果由 DM 叙事并结算",
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
    "action 选择 30 ft 内一个由 DM 确认为可见、非 undead/construct 且不走植物例外的普通 creature，并只消耗一个四环或更高法术位",
    "普通合格目标进行 Constitution save；失败承受 8d8 necrotic damage，成功承受一半",
    "每高一环增加 1d8 necrotic damage；非目标保持不变",
    "plant creature 的豁免劣势与最大伤害，以及普通或非 creature magical plant 的规则结果保持明确 DM omission",
  ], { status: "compiler-runtime-passed" }),
});

export default blight;
