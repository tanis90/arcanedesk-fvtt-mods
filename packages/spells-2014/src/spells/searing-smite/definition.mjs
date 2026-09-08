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

const searingSmite = cleanRoomSpell({
  id: "searing-smite",
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
  emission: { contentVersion: 6 },
  support: {
    level: "simplified",
    omissions: [
      "目标回合开始时的持续火焰伤害、Constitution save、成功结束以及扑灭或浸水结束仍由 DM 处理",
      "declared-rider 将 bonus-action 施法声明合并到命中事件；未命中不耗槽，也不建立命中前或命中后的专注窗口",
    ],
  },
  fragments: [
    graphFragment({
      id: "searing-smite-rider",
      actions: [
        publicAction("declare", "炽焰斩 Searing Smite", {
          activationType: "bonus",
          delivery: "declared-rider",
        }),
      ],
      artifacts: [
        cleanRoomEffect("searing-burn", {
          scope: "source-target",
          reapply: "replace",
          name: "Searing Smite",
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
            predicate("attack-kind", { value: "melee-weapon" }),
          ],
          targets: [eventTarget("target:hit")],
          do: [
            consume("rider:consume", "on-hit"),
            operation("damage", {
              id: "rider:damage",
              target: "target:hit",
              formula: perSlotAboveBase(
                dice(1, 6),
                dice(1, 6),
              ),
              damageTypes: ["fire"],
            }),
            operation("apply-artifact", {
              id: "rider:apply-burn",
              artifactId: "searing-burn",
              target: "target:hit",
            }),
          ],
        }),
      ],
    }),
  ],
  accepted: acceptance(COMPILER_MIGRATION_LOG, [
    "声明 rider 后只在真实近战武器命中时消耗一环或更高法术位",
    "命中追加一次 1d6 fire，并按槽位环级每环增加 1d6",
    "目标获得一个按来源替换的可见灼烧 marker",
    "未命中不消耗法术位",
  ], { status: "compiler-runtime-passed" }),
});

export default searingSmite;
