import {
  QA_LOG,
  acceptance,
  cleanRoomEffect,
  cleanRoomSpell,
  concentration,
  consume,
  duration,
  eventTarget,
  graphFragment,
  operation,
  predicate,
  publicAction,
  rule,
  selected,
  spellContract,
  trigger,
  whileSpellActive,
} from "@arcanedesk/spell-compiler/dsl";

// L3 新写批（无 2014 recipe）：5R 玩家手册2024/法术详述/4环.htm#Polymorph。
// 自动化等级：Wis 豁免 + 失败标记自动化；野兽资料卡替换、临时生命值与提前结束由 DM 手动执行。
const polymorph = cleanRoomSpell({
  id: "polymorph",
  contract: spellContract({
    ruleset: "2024",
    level: 4,
    school: "trs",
    components: {
      verbal: true,
      somatic: true,
      material: true,
    },
    lifetime: concentration(duration(1, "hours")),
  }),
  emission: { contentVersion: 1 },
  support: {
    level: "simplified",
    omissions: [
      "野兽形态的选择（CR 不超过目标 CR，无 CR 时不超过其等级）与目标资料卡替换由 DM 手动完成；目标保留阵营、性格、生物类型、生命值与生命骰",
      "目标获得等于野兽形态生命值的临时生命值、法术结束时失去，以及无剩余临时生命值时提前结束，均需 DM 手动应用与判定",
      "变形期间不能说话、不能施法、只能做新形态生理结构允许的动作，装备融入且无法使用，均由 DM 与玩家手动处理",
      "目标是否可见由 visible-to-source 谓词表达，但 DM 仍需在声明目标时确认资格",
    ],
  },
  fragments: [
    graphFragment({
      id: "polymorph-graph",
      actions: [publicAction("cast", "变形术 Polymorph")],
      artifacts: [
        cleanRoomEffect("polymorph", {
          host: "actor",
          scope: "source-target",
          reapply: "replace",
          name: "Polymorph",
          markerOnly: true,
          lifecycle: whileSpellActive(),
        }),
      ],
      rules: [
        rule({
          id: "cast-polymorph",
          on: trigger("action-used", { actionId: "cast" }),
          targets: [
            selected("target:cast", {
              min: 1,
              max: 1,
              range: 60,
              kind: "creature",
              predicates: [predicate("visible-to-source")],
            }),
          ],
          do: [
            consume(),
            operation("saving-throw", {
              id: "initial-save",
              ability: ["wis"],
              target: "target:cast",
              onSave: "none",
            }),
          ],
        }),
        rule({
          id: "initial-save-failed",
          on: trigger("operation-outcome", {
            operationId: "initial-save",
            outcome: "failure",
          }),
          targets: [eventTarget("target:failed")],
          do: [
            operation("apply-artifact", {
              id: "cast:apply-marker",
              artifactId: "polymorph",
              target: "target:failed",
            }),
          ],
        }),
      ],
    }),
  ],
  accepted: acceptance(QA_LOG, [
    "施法选择一个 60 ft 内对施法者可见的 creature，并只消耗一个四环或更高法术位，建立最长一小时的专注",
    "目标进行感知豁免对抗施法者法术豁免 DC；成功则无任何变化，失败获得本来源的 Polymorph 标记",
    "标记不替换数据、不授予临时生命值、不施加状态、不阻止说话或施法",
    "野兽形态选取、资料卡替换、临时生命值及其耗尽提前结束均由 DM 手动执行",
    "同一来源对同一目标重施时 replace；专注结束或显式清理时移除本次来源标记",
  ], { status: "compiler-passed" }),
});

export default polymorph;
