import {
  QA_LOG,
  acceptance,
  cleanRoomEffect,
  cleanRoomSpell,
  concentration,
  consume,
  contentRef,
  duration,
  endSourceWhenLastDependentEnds,
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

const stoneskin = cleanRoomSpell({
  id: "stoneskin",
  contract: spellContract({
    ruleset: "2014",
    level: 4,
    school: "abj",
    components: {
      verbal: true,
      somatic: true,
      material: true,
    },
    material: {
      cost: 100,
      consumed: true,
    },
    lifetime: concentration(duration(1, "hours")),
  }),
  content: contentRef("stoneskin"),
  emission: { contentVersion: 1 },
  support: {
    level: "simplified",
    omissions: [
      "目标仅对 nonmagical bludgeoning、piercing 与 slashing damage 获得 resistance 由 DM 结算；Stoneskin marker 不改写 Actor 的全局 resistance traits",
    ],
  },
  fragments: [
    graphFragment({
      id: "stoneskin-graph",
      actions: [publicAction("cast", "石肤术 Stoneskin")],
      artifacts: [
        cleanRoomEffect("stoneskin", {
          host: "actor",
          scope: "source-target",
          reapply: "replace",
          name: "Stoneskin",
          markerOnly: true,
          sourceTermination: endSourceWhenLastDependentEnds(),
          lifecycle: whileSpellActive(),
        }),
      ],
      rules: [
        rule({
          id: "cast-stoneskin",
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
            consume(),
            operation("apply-artifact", {
              id: "cast:apply-stoneskin",
              artifactId: "stoneskin",
              target: "target:cast",
            }),
          ],
        }),
      ],
    }),
  ],
  accepted: acceptance(QA_LOG, [
    "action 接触一个由 DM 声明为自愿的 creature，只消耗一个四环或更高法术位，并建立最长一小时的专注",
    "法术契约保留价值 100 gp 且会被消耗的 diamond dust 材料要求",
    "目标只获得来源绑定的 Stoneskin marker；marker 不改写 Actor 全局 resistance 或 magical bypass traits",
    "DM 只对 nonmagical bludgeoning、piercing 与 slashing damage 应用 resistance；magical damage 与其他伤害类型保持原值",
    "重施时替换同来源 marker 而不叠加；专注解除、替换或到期时精确清理目标 marker",
    "目标效果被移除时同步结束已经失去最后 dependent 的来源专注；非目标与其他施法来源保持不变",
  ], { status: "compiler-runtime-passed" }),
});

export default stoneskin;
