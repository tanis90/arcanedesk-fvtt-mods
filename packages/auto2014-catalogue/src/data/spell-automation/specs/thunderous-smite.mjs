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
} from "../dsl.mjs";

const thunderousSmite = cleanRoomSpell({
  id: "thunderous-smite",
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
      "失败豁免后的 10 ft 推离以及 300 ft 可闻声响不自动化，仍由 DM 处理",
      "declared-rider 将 bonus-action 施法声明合并到命中事件；未命中不耗槽，也不建立命中前或命中后的专注窗口",
    ],
  },
  fragments: [
    graphFragment({
      id: "thunderous-smite-rider",
      actions: [
        publicAction("declare", "雷鸣斩 Thunderous Smite", {
          activationType: "bonus",
          delivery: "declared-rider",
        }),
      ],
      artifacts: [
        cleanRoomEffect("thunderous-impact", {
          scope: "source-target",
          reapply: "replace",
          name: "Thunderous Smite",
          modifiers: [grantStatus("prone")],
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
              formula: dice(2, 6),
              damageTypes: ["thunder"],
            }),
            operation("saving-throw", {
              id: "rider:save",
              ability: ["str"],
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
              id: "rider:apply-prone",
              artifactId: "thunderous-impact",
              target: "target:failed",
            }),
          ],
        }),
      ],
    }),
  ],
  accepted: acceptance(COMPILER_MIGRATION_LOG, [
    "声明 rider 后只在真实近战武器命中时消耗一个法术位",
    "命中只追加一次 2d6 thunder",
    "随后只进行一次 Strength save，失败时应用一个包含 prone 的 Thunderous Smite 效果",
    "豁免 activity 不造成伤害，也不再次消耗法术位",
    "未命中不消耗法术位",
  ], { status: "compiler-runtime-passed" }),
});

export default thunderousSmite;
