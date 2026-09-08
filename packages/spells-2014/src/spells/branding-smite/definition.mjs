import {
  COMPILER_MIGRATION_LOG,
  acceptance,
  cleanRoomEffect,
  cleanRoomSpell,
  consume,
  dice,
  duration,
  eventTarget,
  graphFragment,
  operation,
  perSlotAboveBase,
  predicate,
  publicAction,
  rule,
  spellContract,
  spellLifetime,
  trigger,
  whileSpellActive,
} from "@arcanedesk/spell-compiler/dsl";

const brandingSmite = cleanRoomSpell({
  id: "branding-smite",
  contract: spellContract({
    ruleset: "2014",
    level: 2,
    school: "evo",
    components: {
      verbal: true,
      somatic: false,
      material: false,
    },
    lifetime: spellLifetime(duration(1, "minutes")),
    primaryActionId: "declare",
  }),
  emission: { contentVersion: 7 },
  support: {
    level: "simplified",
    omissions: [
      "命中后揭露隐形、5 ft 微光与阻止再次隐形仍由 DM 处理",
      "declared-rider 将 bonus-action 施法声明合并到命中事件；未命中不耗槽，也不建立命中前或命中后的专注窗口",
    ],
  },
  fragments: [
    graphFragment({
      id: "branding-smite-rider",
      actions: [
        publicAction("declare", "印记斩 Branding Smite", {
          activationType: "bonus",
          delivery: "declared-rider",
        }),
      ],
      artifacts: [
        cleanRoomEffect("branding-marker", {
          scope: "source-target",
          reapply: "replace",
          name: "Branding Smite",
          markerOnly: true,
          lifecycle: whileSpellActive(),
        }),
      ],
      rules: [
        rule({
          id: "resolve-declared-rider",
          on: trigger("operation-outcome", {
            operationId: "external:triggering-weapon-attack",
            outcome: "hit",
          }),
          when: [
            predicate("declared"),
            predicate("attack-kind", { value: "weapon" }),
          ],
          targets: [eventTarget("target:hit")],
          do: [
            consume("rider:consume", "on-hit"),
            operation("damage", {
              id: "rider:damage",
              target: "target:hit",
              formula: perSlotAboveBase(
                dice(2, 6),
                dice(1, 6),
              ),
              damageTypes: ["radiant"],
            }),
            operation("apply-artifact", {
              id: "rider:marker",
              artifactId: "branding-marker",
              target: "target:hit",
            }),
          ],
        }),
      ],
    }),
  ],
  accepted: acceptance(COMPILER_MIGRATION_LOG, [
    "声明 rider 后只在真实武器命中时消耗一个声明的二环或更高法术位；近战与远程武器攻击均可触发",
    "命中追加一次基础 2d6 radiant，每升一环增加 1d6；暴击骰交给 Midi",
    "目标获得一个按来源替换的 Branding Smite marker",
    "未命中不消耗法术位",
  ], { status: "compiler-runtime-passed" }),
});

export default brandingSmite;
