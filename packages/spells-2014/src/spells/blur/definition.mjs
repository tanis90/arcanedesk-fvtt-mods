import {
  acceptance,
  cleanRoomEffect,
  cleanRoomSpell,
  concentration,
  consume,
  duration,
  grantSightDependentIncomingAttackDisadvantage,
  graphFragment,
  operation,
  publicAction,
  rule,
  self,
  spellContract,
  trigger,
  whileSpellActive,
} from "@arcanedesk/spell-compiler/dsl";

const EXPANSION_BATCH =
  "docs/foundry-automation/notes/零至三环新法术扩展批次.md";

const blur = cleanRoomSpell({
  id: "blur",
  contract: spellContract({
    ruleset: "2014",
    level: 2,
    school: "ill",
    components: {
      verbal: true,
      somatic: false,
      material: false,
    },
    lifetime: concentration(duration(1, "minutes")),
  }),
  emission: { contentVersion: 1 },
  support: { level: "full", omissions: [] },
  fragments: [
    graphFragment({
      id: "blur-graph",
      actions: [publicAction("cast", "朦胧术 Blur")],
      artifacts: [
        cleanRoomEffect("blurred", {
          host: "actor",
          scope: "source",
          reapply: "replace",
          name: "Blur",
          modifiers: [
            grantSightDependentIncomingAttackDisadvantage(),
          ],
          lifecycle: whileSpellActive(),
        }),
      ],
      rules: [
        rule({
          id: "cast-blur",
          on: trigger("action-used", { actionId: "cast" }),
          targets: [self("target:cast")],
          do: [
            consume(),
            operation("apply-artifact", {
              id: "cast:apply-blur",
              artifactId: "blurred",
              target: "source",
            }),
          ],
        }),
      ],
    }),
  ],
  accepted: acceptance(EXPANSION_BATCH, [
    "action 只消耗一个二环或更高法术位，并只在施法者自身建立最长一分钟的 Blur 专注效果",
    "依赖视觉看见施法者的攻击者对施法者进行 melee、ranged、weapon 或 spell attack roll 时具有劣势",
    "不依赖视觉感知目标的攻击者（例如在有效范围内使用 blindsight）不会因 Blur 获得劣势",
    "能够看穿幻术的攻击者（例如在有效范围内使用 truesight）不会因 Blur 获得劣势",
    "Blur 不修改伤害、豁免、能力检定或对非施法者目标的攻击；攻击者的相关感知不覆盖目标位置时仍正常承受劣势",
    "解除、替换或到期结束专注时精确清理效果，之后的攻击不再获得 Blur 劣势",
  ], { status: "compiler-runtime-passed" }),
});

export default blur;
