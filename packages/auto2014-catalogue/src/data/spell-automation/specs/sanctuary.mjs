import {
  COMPILER_MIGRATION_LOG,
  acceptance,
  cleanRoomEffect,
  cleanRoomSpell,
  consume,
  contentRef,
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
} from "../dsl.mjs";

const sanctuary = cleanRoomSpell({
  id: "sanctuary",
  contract: spellContract({
    ruleset: "2014",
    level: 1,
    school: "abj",
    components: {
      verbal: true,
      somatic: true,
      material: true,
    },
    lifetime: spellLifetime(duration(1, "minutes")),
  }),
  content: contentRef("sanctuary"),
  emission: { contentVersion: 6 },
  support: {
    level: "simplified",
    omissions: [
      "攻击者 Wisdom 豁免与受保护者进行伤害性行为后的终止规则由 DM 处理",
    ],
  },
  fragments: [
    graphFragment({
      id: "sanctuary-marker-graph",
      actions: [
        publicAction("cast", "庇护术 Sanctuary", {
          activationType: "bonus",
        }),
      ],
      artifacts: [
        cleanRoomEffect("sanctuary-marker", {
          host: "actor",
          scope: "source-target",
          reapply: "replace",
          name: "Sanctuary",
          markerOnly: true,
          modifiers: [],
          lifecycle: whileSpellActive(),
        }),
      ],
      rules: [
        rule({
          id: "cast-sanctuary",
          on: trigger("action-used", { actionId: "cast" }),
          targets: [
            selected("target:cast", {
              min: 1,
              max: 1,
              range: 30,
              units: "ft",
              kind: "creature",
            }),
          ],
          do: [
            consume(),
            operation("apply-artifact", {
              id: "cast:apply-marker",
              artifactId: "sanctuary-marker",
              target: "target:cast",
            }),
          ],
        }),
      ],
    }),
  ],
  accepted: acceptance(
    COMPILER_MIGRATION_LOG,
    [
      "bonus action 对 30 ft 内一个声明目标施放并只消耗一个一环法术位",
      "目标获得一个持续一分钟的可见 Sanctuary marker",
      "施法不建立专注",
      "同一 source-target 重复施法替换既有 marker，不堆叠重复效果",
      "不会向 agent 暴露额外 Ward Save 或其他内部 action",
      "攻击限制和效果提前终止继续由 DM 处理",
    ],
    { status: "compiler-runtime-passed" },
  ),
});

export default sanctuary;
