import {
  QA_LOG,
  acceptance,
  cleanRoomEffect,
  cleanRoomSpell,
  concentration,
  consume,
  duration,
  endSourceWhenLastDependentEnds,
  grantStatus,
  graphFragment,
  operation,
  publicAction,
  rule,
  selected,
  spellContract,
  trigger,
  whileSpellActive,
} from "@arcanedesk/spell-compiler/dsl";

const greaterInvisibility = cleanRoomSpell({
  id: "greater-invisibility",
  contract: spellContract({
    ruleset: "2014",
    level: 4,
    school: "ill",
    components: {
      verbal: true,
      somatic: true,
      material: false,
    },
    lifetime: concentration(duration(1, "minutes")),
  }),
  emission: { contentVersion: 1 },
  support: { level: "full", omissions: [] },
  fragments: [
    graphFragment({
      id: "greater-invisibility-graph",
      actions: [
        publicAction("cast", "高等隐形术 Greater Invisibility"),
      ],
      artifacts: [
        cleanRoomEffect("greater-invisibility", {
          host: "actor",
          scope: "source-target",
          reapply: "replace",
          name: "Greater Invisibility",
          modifiers: [grantStatus("invisible")],
          sourceTermination: endSourceWhenLastDependentEnds(),
          lifecycle: whileSpellActive(),
        }),
      ],
      rules: [
        rule({
          id: "cast-greater-invisibility",
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
            operation("apply-artifact", {
              id: "cast:apply-greater-invisibility",
              artifactId: "greater-invisibility",
              target: "target:cast",
            }),
          ],
        }),
      ],
    }),
  ],
  accepted: acceptance(QA_LOG, [
    "action 接触一个声明生物，只消耗一个四环或更高法术位，并建立最长一分钟的专注",
    "目标获得具有独立 source-target identity 的 invisible 效果；目标当时穿戴或携带的物件同样不可见，非目标保持不变",
    "目标进行攻击、施放法术、移动或承受伤害均不会提前清理 invisible 效果或来源专注",
    "解除、替换或到期结束来源专注时精确清理目标效果；目标效果被移除时同步结束已经失去最后 dependent 的来源专注",
  ], { status: "compiler-runtime-passed" }),
});

export default greaterInvisibility;
