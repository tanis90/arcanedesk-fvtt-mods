import {
  QA_LOG,
  acceptance,
  allAbilityChecks,
  cleanRoomEffect,
  cleanRoomSpell,
  concentration,
  dice,
  duration,
  endSourceWhenLastDependentEnds,
  graphFragment,
  operation,
  optionalRollBonus,
  publicAction,
  rule,
  selected,
  spellContract,
  trigger,
  whileSpellActive,
} from "../dsl.mjs";

const guidance = cleanRoomSpell({
  id: "guidance",
  contract: spellContract({
    ruleset: "2014",
    level: 0,
    school: "div",
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
      id: "guidance-graph",
      actions: [publicAction("cast", "神导术 Guidance")],
      artifacts: [
        cleanRoomEffect("guidance", {
          host: "actor",
          scope: "source-target",
          reapply: "replace",
          modifiers: [
            optionalRollBonus(
              allAbilityChecks(),
              dice(1, 4),
              {
                uses: 1,
                label: "Guidance (+1d4)",
              },
            ),
          ],
          sourceTermination: endSourceWhenLastDependentEnds(),
          lifecycle: whileSpellActive(),
        }),
      ],
      rules: [
        rule({
          id: "cast-guidance",
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
            operation("apply-artifact", {
              id: "cast:apply-guidance",
              artifactId: "guidance",
              target: "target:cast",
            }),
          ],
        }),
      ],
    }),
  ],
  accepted: acceptance(QA_LOG, [
    "action 为接触范围内一个声明目标建立最长一分钟的专注效果",
    "目标进行普通、技能或工具属性检定后，可以选择为该次检定增加 1d4",
    "只有实际选择该加值时才消耗效果；关闭提示会保留效果",
    "效果只可使用一次，且不会应用于攻击检定或豁免",
    "使用加值、解除专注或替换专注都会清理 Guidance 效果",
    "戏法不消耗法术位",
  ], { status: "compiler-runtime-passed" }),
});

export default guidance;
