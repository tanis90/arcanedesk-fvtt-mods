import {
  COMPILER_MIGRATION_LOG,
  acceptance,
  cleanRoomEffect,
  cleanRoomSpell,
  consume,
  dice,
  duration,
  eventTarget,
  grantStatus,
  graphFragment,
  operation,
  predicate,
  publicAction,
  rule,
  spellContract,
  spellLifetime,
  trigger,
  whileSpellActive,
} from "@arcanedesk/spell-compiler/dsl";

const wrathfulSmite = cleanRoomSpell({
  id: "wrathful-smite",
  contract: spellContract({
    ruleset: "2014",
    level: 1,
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
      "目标后续使用动作进行 Wisdom check 解除 frightened 的流程仍由 DM 处理",
      "declared-rider 将 bonus-action 施法声明合并到命中事件；未命中不耗槽，也不建立命中前或命中后的专注窗口",
    ],
  },
  fragments: [
    graphFragment({
      id: "wrathful-smite-rider",
      actions: [
        publicAction("declare", "激愤斩 Wrathful Smite", {
          activationType: "bonus",
          delivery: "declared-rider",
        }),
      ],
      artifacts: [
        cleanRoomEffect("wrathful-fear", {
          scope: "source-target",
          reapply: "replace",
          name: "Wrathful Smite",
          modifiers: [grantStatus("frightened")],
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
            predicate("attack-kind", { value: "melee-weapon" }),
          ],
          targets: [eventTarget("target:hit")],
          do: [
            consume("rider:consume", "on-hit"),
            operation("damage", {
              id: "rider:damage",
              target: "target:hit",
              formula: dice(1, 6),
              damageTypes: ["psychic"],
            }),
            operation("saving-throw", {
              id: "rider:save",
              ability: ["wis"],
              target: "target:hit",
              onSave: "none",
            }),
          ],
        }),
        rule({
          id: "rider-save-failed",
          on: trigger("operation-outcome", {
            operationId: "rider:save",
            outcome: "failure",
          }),
          targets: [eventTarget("target:failed")],
          do: [
            operation("apply-artifact", {
              id: "rider:apply-frightened",
              artifactId: "wrathful-fear",
              target: "target:failed",
            }),
          ],
        }),
      ],
    }),
  ],
  accepted: acceptance(COMPILER_MIGRATION_LOG, [
    "声明 rider 后只在真实近战武器命中时消耗一个法术位",
    "命中只追加一次 1d6 psychic",
    "随后只进行一次 Wisdom save，失败时应用一个包含 frightened 的 Wrathful Smite 效果",
    "豁免 activity 不造成伤害，也不再次消耗法术位",
    "未命中不消耗法术位",
  ], { status: "compiler-runtime-passed" }),
});

export default wrathfulSmite;
