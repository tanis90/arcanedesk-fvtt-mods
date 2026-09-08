import {
  COMPILER_MIGRATION_LOG,
  acceptance,
  cleanRoomEffect,
  cleanRoomSpell,
  concentration,
  constant,
  consume,
  contentRef,
  duration,
  grantArmorClassBonus,
  graphFragment,
  operation,
  publicAction,
  rule,
  selected,
  spellContract,
  trigger,
  whileSpellActive,
} from "@arcanedesk/spell-compiler/dsl";

const shieldOfFaith = cleanRoomSpell({
  id: "shield-of-faith",
  contract: spellContract({
    ruleset: "2014",
    level: 1,
    school: "abj",
    components: {
      verbal: true,
      somatic: true,
      material: true,
    },
    lifetime: concentration(duration(10, "minutes")),
  }),
  content: contentRef("shield-of-faith"),
  emission: { contentVersion: 6 },
  support: { level: "full", omissions: [] },
  fragments: [
    graphFragment({
      id: "shield-of-faith-graph",
      actions: [
        publicAction("cast", "虔诚护盾 Shield of Faith", {
          activationType: "bonus",
        }),
      ],
      artifacts: [
        cleanRoomEffect("shielded", {
          host: "actor",
          scope: "source-target",
          reapply: "replace",
          name: "Shield of Faith",
          modifiers: [grantArmorClassBonus(constant(2))],
          lifecycle: whileSpellActive(),
        }),
      ],
      rules: [
        rule({
          id: "cast-shield-of-faith",
          on: trigger("action-used", { actionId: "cast" }),
          targets: [
            selected("target:cast", {
              min: 1,
              max: 1,
              range: 60,
              units: "ft",
              kind: "creature",
            }),
          ],
          do: [
            consume(),
            operation("apply-artifact", {
              id: "cast:apply-shield",
              artifactId: "shielded",
              target: "target:cast",
            }),
          ],
        }),
      ],
    }),
  ],
  accepted: acceptance(COMPILER_MIGRATION_LOG, [
    "bonus action 对 60 ft 内一个声明目标施放",
    "目标获得恰好 +2 AC",
    "只消耗一个法术位并建立最长 10 分钟的专注",
    "专注或持续时间结束后目标 AC 精确恢复",
    "非目标不变",
  ], { status: "compiler-runtime-passed" }),
});

export default shieldOfFaith;
