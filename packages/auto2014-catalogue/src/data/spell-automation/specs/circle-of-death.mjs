import {
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
} from "../dsl.mjs";

const L6_RUNTIME_QA_RECEIPT =
  "docs/foundry-automation/notes/spell-level-6-runtime-qa-2026-09-02.md";

const circleOfDeath = cleanRoomSpell({
  id: "circle-of-death",
  contract: spellContract({
    ruleset: "2014",
    level: 6,
    school: "nec",
    components: {
      verbal: true,
      somatic: true,
      material: true,
    },
    material: {
      cost: 500,
      consumed: false,
    },
    lifetime: spellLifetime(instant()),
  }),
  emission: { contentVersion: 1 },
  support: {
    level: "simplified",
    omissions: [
      "价值至少 500 gp 且不消耗的黑珍珠粉末施法材料由 DM 在施法前确认；自动化不管理材料持有",
      "60-ft-radius sphere 的高度、elevation 与三维成员关系由 DM 根据场景裁决",
      "墙体、遮蔽与 line-of-effect 对球形区域成员的影响由 DM 调整，二维模板不冒充完整空间裁决",
    ],
  },
  fragments: [
    graphFragment({
      id: "circle-of-death-graph",
      actions: [
        publicAction("cast", "死亡法阵 Circle of Death"),
      ],
      rules: [
        rule({
          id: "cast-circle-of-death",
          on: trigger("action-used", { actionId: "cast" }),
          targets: [
            placedTemplate("target:cast", {
              type: "sphere",
              size: 60,
              range: 150,
              evaluation: "snapshot",
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
                dice(8, 6),
                dice(2, 6),
              ),
              damageTypes: ["necrotic"],
              onSave: "half",
            }),
          ],
        }),
      ],
    }),
  ],
  accepted: acceptance(L6_RUNTIME_QA_RECEIPT, [
    "Cast 是 placed-template public Activity；DM 在施法者 150 ft 内放置一个 60-ft-radius sphere，并由同一 workflow 快照模板内 creature",
    "模板成员进行 Constitution save；失败承受 8d6 necrotic damage，成功承受一半，区域外非目标保持不变",
    "每高于六环一环增加 2d6 necrotic damage，并且一次施法只消耗一个明确声明的六环或更高法术位",
    "该瞬时区域不建立专注、Effect 或持续模板；放置取消不得消费法术位或留下残留 Artifact",
    "昂贵材料、三维球体、墙体、遮蔽与 line-of-effect 保持明确 DM omission，不被二维模板冒充为完整支持",
  ], { status: "compiler-runtime-passed" }),
});

export default circleOfDeath;
