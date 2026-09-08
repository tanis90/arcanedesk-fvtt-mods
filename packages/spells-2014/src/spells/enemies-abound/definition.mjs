import {
  COMPILER_MIGRATION_LOG,
  acceptance,
  cleanRoomEffect,
  cleanRoomSpell,
  concentration,
  consume,
  duration,
  eventTarget,
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

const enemiesAbound = cleanRoomSpell({
  id: "enemies-abound",
  contract: spellContract({
    ruleset: "2014",
    level: 3,
    school: "enc",
    components: {
      verbal: true,
      somatic: true,
      material: false,
    },
    lifetime: concentration(duration(1, "minutes")),
  }),
  emission: { contentVersion: 8 },
  support: {
    level: "marker-only",
    omissions: [
      "frightened 状态免疫者应自动通过首次豁免；当前由 DM 在声明目标时排除或裁定",
      "随机选择攻击目标、借机攻击和 agent 敌友决策变更仍由 DM 裁定",
    ],
  },
  fragments: [
    graphFragment({
      id: "enemies-abound-graph",
      actions: [publicAction("cast", "敌群环绕 Enemies Abound")],
      artifacts: [
        cleanRoomEffect("enemies-abound", {
          host: "actor",
          scope: "source-target",
          reapply: "replace",
          name: "Enemies Abound",
          img: "systems/dnd5e/icons/svg/statuses/marked.svg",
          markerOnly: true,
          modifiers: [],
          lifecycle: whileSpellActive(),
        }),
      ],
      rules: [
        rule({
          id: "cast-enemies-abound",
          on: trigger("action-used", { actionId: "cast" }),
          targets: [
            selected("target:cast", {
              min: 1,
              max: 1,
              range: 120,
              kind: "creature",
            }),
          ],
          do: [
            consume(),
            operation("saving-throw", {
              id: "initial-save",
              ability: ["int"],
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
              id: "apply-enemies-abound",
              artifactId: "enemies-abound",
              target: "target:failed",
            }),
          ],
        }),
        rule({
          id: "repeat-save-after-damage",
          on: trigger("damage-taken", { subject: "effect-target" }),
          when: [
            predicate("artifact-exists", {
              artifactId: "enemies-abound",
              subject: "effect-target",
            }),
            predicate("damage-applied", { minimum: 1 }),
          ],
          targets: [eventTarget("target:damaged")],
          do: [
            operation("saving-throw", {
              id: "damage-repeat-save",
              ability: ["int"],
              target: "target:damaged",
              onSave: "none",
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
              artifactId: "enemies-abound",
              target: "target:damage-released",
            }),
          ],
        }),
      ],
    }),
  ],
  accepted: acceptance(COMPILER_MIGRATION_LOG, [
    "一个 120 ft 内声明目标只进行一次 Intelligence save 并只消耗一个法术位",
    "只有首次豁免失败的目标获得一个来源可追踪且不附加伪状态的 Enemies Abound marker",
    "受影响目标每次承受至少 1 点实际伤害后进行一次不消耗法术位的 Intelligence save",
    "受伤重复豁免成功或专注结束时移除 marker，同一伤害 workflow 对同一来源效果只触发一次",
    "随机攻击目标与借机攻击仍明确交由 DM 裁定",
  ], { status: "compiler-runtime-passed" }),
});

export default enemiesAbound;
