import {
  QA_LOG,
  acceptance,
  cleanRoomEffect,
  cleanRoomSpell,
  consume,
  duration,
  grantResistance,
  grantSavingThrowAdvantage,
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

// 2024 重写批（M1.0 审计 A 桶 desc-diff-flag）：2024 直接结束目标的中毒状态
// （不限毒素数量），2014 只中和一种毒素；抗性与豁免优势不变。
// 5R 锚点：5R 玩家手册2024 2环.htm#Protection_from_Poison。
const protectionFromPoison = cleanRoomSpell({
  id: "protection-from-poison",
  contract: spellContract({
    ruleset: "2024",
    level: 2,
    school: "abj",
    components: {
      verbal: true,
      somatic: true,
      material: false,
    },
    lifetime: spellLifetime(duration(1, "hours")),
  }),
  emission: { contentVersion: 7 },
  support: {
    level: "simplified",
    omissions: [
      "目标是否为「被毒素影响」需要 DM 按具体毒源判断；自动化只移除 poisoned 状态，不追踪具体毒素来源或剩余毒素次数",
    ],
  },
  fragments: [
    graphFragment({
      id: "protection-from-poison-graph",
      actions: [publicAction("cast", "防护毒素 Protection from Poison")],
      artifacts: [
        cleanRoomEffect("poison-protection", {
          host: "actor",
          scope: "source-target",
          reapply: "replace",
          name: "Protection from Poison",
          modifiers: [
            grantResistance("poison"),
            grantSavingThrowAdvantage("poison"),
          ],
          lifecycle: whileSpellActive(),
        }),
      ],
      rules: [
        rule({
          id: "cast-protection-from-poison",
          on: trigger("action-used", { actionId: "cast" }),
          targets: [
            selected("target:cast", {
              min: 1,
              max: 1,
              range: null,
              units: "touch",
              kind: "creature",
            }),
          ],
          do: [
            consume(),
            operation("remove-statuses", {
              id: "cast:remove-poisoned",
              target: "target:cast",
              statuses: ["poisoned"],
            }),
            operation("apply-artifact", {
              id: "cast:apply-protection",
              artifactId: "poison-protection",
              target: "target:cast",
            }),
          ],
        }),
      ],
    }),
  ],
  accepted: acceptance(QA_LOG, [
    "action 触碰一个 creature，只消耗一个二环或更高法术位",
    "立即结束目标的中毒状态（2024 口径，不再限于单一毒素）且不删除其他状态或 Active Effect",
    "目标获得持续一小时的 poison damage resistance",
    "目标为避免陷入或结束中毒状态所做的豁免具有优势",
    "不建立专注，效果到期后自动清理；同一来源重施 replace 而不叠加",
  ], { status: "compiler-passed" }),
});

export default protectionFromPoison;
