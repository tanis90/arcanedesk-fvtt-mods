import {
  COMPILER_MIGRATION_LOG,
  acceptance,
  cleanRoomEffect,
  cleanRoomSpell,
  concentration,
  consume,
  duration,
  eventTarget,
  grantStatus,
  graphFragment,
  operation,
  predicate,
  publicAction,
  rule,
  selected,
  spellContract,
  trigger,
  whileSpellActive,
} from "../dsl.mjs";

const hideousLaughter = cleanRoomSpell({
  id: "hideous-laughter",
  contract: spellContract({
    ruleset: "2014",
    level: 1,
    school: "enc",
    components: {
      verbal: true,
      somatic: true,
      material: true,
    },
    lifetime: concentration(duration(1, "minutes")),
  }),
  emission: { contentVersion: 6 },
  support: {
    level: "simplified",
    omissions: [
      "Intelligence 4 或以下生物不受影响仍由 DM 在声明目标时判断",
      "目标处于 prone 时无法自行站起仍由 DM 裁定",
    ],
  },
  fragments: [
    graphFragment({
      id: "hideous-laughter-graph",
      actions: [publicAction("cast", "塔莎狂笑术 Hideous Laughter")],
      artifacts: [
        cleanRoomEffect("hideous-laughter", {
          host: "actor",
          scope: "source-target",
          reapply: "replace",
          name: "Hideous Laughter",
          modifiers: [
            grantStatus("prone"),
            grantStatus("incapacitated"),
          ],
          lifecycle: whileSpellActive(),
        }),
      ],
      rules: [
        rule({
          id: "cast-hideous-laughter",
          on: trigger("action-used", { actionId: "cast" }),
          targets: [
            selected("target:cast", {
              min: 1,
              max: 1,
              range: 30,
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
              id: "apply-hideous-laughter",
              artifactId: "hideous-laughter",
              target: "target:failed",
            }),
          ],
        }),
        rule({
          id: "repeat-save-at-turn-end",
          on: trigger("turn-end", { subject: "effect-target" }),
          when: [
            predicate("artifact-exists", {
              artifactId: "hideous-laughter",
              subject: "effect-target",
            }),
          ],
          targets: [eventTarget("target:laughing")],
          do: [
            operation("saving-throw", {
              id: "repeat-save",
              ability: ["wis"],
              target: "target:laughing",
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
          targets: [eventTarget("target:turn-end-released")],
          do: [
            operation("delete-artifact", {
              id: "remove-after-turn-end-save",
              artifactId: "hideous-laughter",
              target: "target:turn-end-released",
            }),
          ],
        }),
        rule({
          id: "repeat-save-after-damage",
          on: trigger("damage-taken", { subject: "effect-target" }),
          when: [
            predicate("artifact-exists", {
              artifactId: "hideous-laughter",
              subject: "effect-target",
            }),
            predicate("damage-applied", { minimum: 1 }),
          ],
          targets: [eventTarget("target:damaged")],
          do: [
            operation("saving-throw", {
              id: "damage-repeat-save",
              ability: ["wis"],
              target: "target:damaged",
              onSave: "none",
              rollMode: "advantage",
            }),
          ],
        }),
        rule({
          id: "damage-repeat-save-succeeded",
          on: trigger("operation-outcome", {
            operationId: "damage-repeat-save",
            outcome: "success",
          }),
          targets: [eventTarget("target:damage-released")],
          do: [
            operation("delete-artifact", {
              id: "remove-after-damage-save",
              artifactId: "hideous-laughter",
              target: "target:damage-released",
            }),
          ],
        }),
      ],
    }),
  ],
  accepted: acceptance(COMPILER_MIGRATION_LOG, [
    "首次 Wisdom save 失败应用 prone 与 incapacitated",
    "目标回合结束时自动进行免费重复豁免",
    "目标承受真实正伤害后额外进行一次具有优势的 Wisdom save",
    "任一重复豁免成功或专注结束时移除目标效果",
  ], { status: "compiler-runtime-passed" }),
});

export default hideousLaughter;
