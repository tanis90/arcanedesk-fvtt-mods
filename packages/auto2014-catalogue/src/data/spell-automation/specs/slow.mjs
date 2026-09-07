import {
  COMPILER_MIGRATION_LOG,
  acceptance,
  abilitySavingThrows,
  bonus,
  cleanRoomEffect,
  cleanRoomSpell,
  concentration,
  constant,
  consume,
  duration,
  eventTarget,
  grantArmorClassBonus,
  graphFragment,
  operation,
  predicate,
  publicAction,
  rule,
  scaleAllMovement,
  selected,
  spellContract,
  trigger,
  whileSpellActive,
} from "../dsl.mjs";

const slow = cleanRoomSpell({
  id: "slow",
  contract: spellContract({
    ruleset: "2014",
    level: 3,
    school: "trs",
    components: {
      verbal: true,
      somatic: true,
      material: true,
    },
    lifetime: concentration(duration(1, "minutes")),
  }),
  emission: { contentVersion: 5 },
  support: {
    level: "simplified",
    omissions: [
      "不能反应、动作与附赠动作二选一、每回合最多一次攻击及延迟施法仍由 DM 裁定",
      "最多六个目标是否位于同一个 40 ft cube 由 DM 在声明目标时判断",
    ],
  },
  fragments: [
    graphFragment({
      id: "slow-graph",
      actions: [publicAction("cast", "缓慢术 Slow")],
      artifacts: [
        cleanRoomEffect("slowed", {
          host: "actor",
          scope: "source-target",
          reapply: "replace",
          name: "Slow",
          modifiers: [
            grantArmorClassBonus(constant(-2)),
            bonus(abilitySavingThrows(["dex"]), constant(-2)),
            scaleAllMovement(constant(0.5)),
          ],
          lifecycle: whileSpellActive(),
        }),
      ],
      rules: [
        rule({
          id: "cast-slow",
          on: trigger("action-used", { actionId: "cast" }),
          targets: [
            selected("target:cast", {
              min: 1,
              max: 6,
              range: 120,
              kind: "creature",
            }),
          ],
          do: [
            consume(),
            operation("saving-throw", {
              id: "initial-save",
              ability: ["wis"],
              target: "target:cast",
              onSave: "none",
            }),
          ],
        }),
        rule({
          id: "initial-save-failed",
          on: trigger("operation-outcome", {
            operationId: "initial-save",
            outcome: "failure",
          }),
          targets: [eventTarget("target:failed")],
          do: [
            operation("apply-artifact", {
              id: "apply-slowed",
              artifactId: "slowed",
              target: "target:failed",
            }),
          ],
        }),
        rule({
          id: "repeat-save-at-turn-end",
          on: trigger("turn-end", { subject: "effect-target" }),
          when: [
            predicate("artifact-exists", {
              artifactId: "slowed",
              subject: "effect-target",
            }),
          ],
          targets: [eventTarget("target:slowed")],
          do: [
            operation("saving-throw", {
              id: "repeat-save",
              ability: ["wis"],
              target: "target:slowed",
              onSave: "none",
            }),
          ],
        }),
        rule({
          id: "repeat-save-succeeded",
          on: trigger("operation-outcome", {
            operationId: "repeat-save",
            outcome: "success",
          }),
          targets: [eventTarget("target:released")],
          do: [
            operation("delete-artifact", {
              id: "remove-slowed",
              artifactId: "slowed",
              target: "target:released",
            }),
          ],
        }),
      ],
    }),
  ],
  accepted: acceptance(COMPILER_MIGRATION_LOG, [
    "最多六个声明目标分别进行 Wisdom save",
    "只有失败目标获得可见 Slow effect",
    "Slow 令 AC 与 Dexterity save -2，并将所有现有移动速度减半",
    "目标回合结束时自动进行免费重复豁免",
    "重复豁免成功或专注结束时移除 Slow",
  ], { status: "compiler-runtime-passed" }),
});

export default slow;
