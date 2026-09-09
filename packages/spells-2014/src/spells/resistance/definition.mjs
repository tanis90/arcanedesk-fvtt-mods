import {
  acceptance,
  allSavingThrows,
  cleanRoomEffect,
  cleanRoomSpell,
  concentration,
  dice,
  duration,
  endSourceWhenLastDependentEnds,
  graphFragment,
  operation,
  optionalRollBonus,
  predicate,
  publicAction,
  rule,
  selected,
  spellContract,
  trigger,
  whileSpellActive,
} from "@arcanedesk/spell-compiler/dsl";

const EXPANSION_BATCH =
  "docs/foundry-automation/notes/零至三环新法术扩展批次.md";

const resistance = cleanRoomSpell({
  id: "resistance",
  contract: spellContract({
    ruleset: "2014",
    level: 0,
    school: "abj",
    components: {
      verbal: true,
      somatic: true,
      material: true,
    },
    lifetime: concentration(duration(1, "minutes")),
  }),
  emission: { contentVersion: 1 },
  support: { level: "full", omissions: [] },
  fragments: [
    graphFragment({
      id: "resistance-graph",
      actions: [publicAction("cast", "抵抗术 Resistance")],
      artifacts: [
        cleanRoomEffect("resistance", {
          host: "actor",
          scope: "source-target",
          reapply: "replace",
          name: "Resistance",
          modifiers: [
            optionalRollBonus(
              allSavingThrows(),
              dice(1, 4),
              {
                uses: 1,
                label: "Resistance (+1d4)",
              },
            ),
          ],
          sourceTermination: endSourceWhenLastDependentEnds(),
          lifecycle: whileSpellActive(),
        }),
      ],
      rules: [
        rule({
          id: "cast-resistance",
          on: trigger("action-used", { actionId: "cast" }),
          targets: [
            selected("target:cast", {
              min: 1,
              max: 1,
              range: null,
              units: "touch",
              kind: "creature",
              predicates: [predicate("willing")],
            }),
          ],
          do: [
            operation("apply-artifact", {
              id: "cast:apply-resistance",
              artifactId: "resistance",
              target: "target:cast",
            }),
          ],
        }),
      ],
    }),
  ],
  accepted: acceptance(EXPANSION_BATCH, [
    "action 只对一个由 DM 声明为 willing 的 touch 生物建立最长一分钟的专注效果；willing predicate 是目标投影元数据，runtime 不会替 DM 推断生物意愿",
    "法术结束前，目标可以在自己选择的一次豁免检定之前或之后选择掷 1d4，并将结果加入该次豁免",
    "关闭或拒绝 optional bonus 不加骰且不消费效果，目标之后的另一项豁免仍可选择使用",
    "只有实际接受并结算 +1d4 时才消费唯一一次使用并结束 Resistance，清理目标效果与来源专注",
    "能力、技能和工具检定以及武器或法术攻击均不会获得提示、加值或消费效果，非目标保持不变",
    "解除或替换专注、持续时间到期以及来源被清理时都会移除目标效果；同一来源重施时 replace 而不叠加",
    "戏法不消耗法术位，取消或拒绝 optional bonus 也不会产生任何资源变化",
  ], { status: "compiler-runtime-passed" }),
});

export default resistance;
