import {
  QA_LOG,
  acceptance,
  cleanRoomEffect,
  cleanRoomSpell,
  consume,
  duration,
  graphFragment,
  operation,
  publicAction,
  rule,
  selected,
  spellContract,
  spellLifetime,
  trigger,
  whileSpellActive,
} from "@arcanedesk/spell-compiler/dsl";

// L3 新写批（无 2014 recipe）：5R 玩家手册2024/法术详述/8环.htm#Animal_Shapes。
// 自动化等级：marker-only——每个目标获得来源标记；野兽形态替换、临时生命值与再变形由 DM 手动执行。
const animalShapes = cleanRoomSpell({
  id: "animal-shapes",
  contract: spellContract({
    ruleset: "2024",
    level: 8,
    school: "trs",
    components: {
      verbal: true,
      somatic: true,
      material: false,
    },
    lifetime: spellLifetime(duration(24, "hours")),
  }),
  emission: { contentVersion: 1 },
  support: {
    level: "simplified",
    omissions: [
      "目标自愿性由 DM 判断；selected-targets 不校验意愿",
      "每个目标所选野兽（CR 不超过 4、体型不超过大型，且各目标可不同）与资料卡替换由 DM 选取并手动应用，含保留生物类型、生命值、生命骰、阵营、交流能力与智力/感知/魅力",
      "目标获得等于首个形态生命值的临时生命值、法术结束时失去，以及形态期间无法施法、装备融入且不可使用，均需 DM 手动结算",
      "持续期间以魔法动作再次变形、目标以附赠动作提前结束，均由 DM 手动处理；自动化不提供再变形 action",
    ],
  },
  fragments: [
    graphFragment({
      id: "animal-shapes-graph",
      actions: [publicAction("cast", "动物形态 Animal Shapes")],
      artifacts: [
        cleanRoomEffect("animal-shapes", {
          host: "actor",
          scope: "source-target",
          reapply: "replace",
          name: "Animal Shapes",
          markerOnly: true,
          lifecycle: whileSpellActive(),
        }),
      ],
      rules: [
        rule({
          id: "cast-animal-shapes",
          on: trigger("action-used", { actionId: "cast" }),
          targets: [
            selected("target:cast", {
              min: 1,
              max: "any",
              range: 30,
              kind: "creature",
            }),
          ],
          do: [
            consume(),
            operation("apply-artifact", {
              id: "cast:apply-marker",
              artifactId: "animal-shapes",
              target: "target:cast",
            }),
          ],
        }),
      ],
    }),
  ],
  accepted: acceptance(QA_LOG, [
    "施法可一次声明 30 ft 内任意数量的声明目标，并只消耗一个八环或更高法术位",
    "每个声明目标获得本来源的 Animal Shapes 标记，最长持续 24 小时且不建立专注",
    "标记不改变目标数据、不授予临时生命值、不施加状态；形态替换与保留字段由 DM 手动完成",
    "再次变形、目标附赠动作提前结束与法术结束清理临时生命值均由 DM 处理",
    "目标自愿性与各目标野兽形态的合法性保持明确 omission",
  ], { status: "compiler-passed" }),
});

export default animalShapes;
