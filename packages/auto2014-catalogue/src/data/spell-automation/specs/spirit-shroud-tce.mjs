import {
  COMPILER_MIGRATION_LOG,
  acceptance,
  blockHealing,
  castLevel,
  cleanRoomEffect,
  cleanRoomRangeIndicator,
  cleanRoomSpell,
  concentration,
  consume,
  constant,
  decreaseAllMovement,
  dice,
  duration,
  eventTarget,
  firstOf,
  graphFragment,
  operation,
  predicate,
  publicAction,
  rule,
  self,
  spellContract,
  tiers,
  trigger,
  untilTrigger,
  whileSpellActive,
} from "../dsl.mjs";

const modes = [
  {
    id: "cold",
    label: "寒冷 Cold",
    color: "#67e8f9",
  },
  {
    id: "necrotic",
    label: "黯蚀 Necrotic",
    color: "#a78bfa",
  },
  {
    id: "radiant",
    label: "光耀 Radiant",
    color: "#fde047",
  },
];

const shroudDamage = tiers([
  { minimum: 3, value: dice(1, 8) },
  { minimum: 5, value: dice(2, 8) },
  { minimum: 7, value: dice(3, 8) },
  { minimum: 9, value: dice(4, 8) },
], castLevel());

const spiritShroud = cleanRoomSpell({
  id: "spirit-shroud-tce",
  contract: spellContract({
    ruleset: "2014",
    level: 3,
    school: "nec",
    components: {
      verbal: true,
      somatic: true,
      material: false,
    },
    lifetime: concentration(duration(1, "minutes")),
    primaryActionId: "cast:radiant",
  }),
  emission: { contentVersion: 5 },
  support: {
    level: "simplified",
    omissions: [
      "回合开始时可选择任意可见生物的减速简化为 10 ft 内可见敌军全部生效；友军与 neutral 不自动纳入",
    ],
  },
  fragments: [
    graphFragment({
      id: "spirit-shroud-graph",
      actions: modes.map(mode =>
        publicAction(`cast:${mode.id}`, `魂灵环绕：${mode.label}`, {
          activationType: "bonus",
        })
      ),
      artifacts: [
        ...modes.map(mode =>
          cleanRoomEffect(`shroud-source:${mode.id}`, {
            host: "actor",
            scope: "source",
            reapply: "replace",
            name: `Spirit Shroud: ${mode.label}`,
            markerOnly: true,
            lifecycle: whileSpellActive(),
          })
        ),
        ...modes.map(mode =>
          cleanRoomRangeIndicator(`shroud-indicator:${mode.id}`, {
            sourceArtifactId: `shroud-source:${mode.id}`,
            radius: 10,
            color: mode.color,
            opacity: 0.18,
          })
        ),
        cleanRoomEffect("blocked-healing", {
          host: "actor",
          scope: "source-target",
          reapply: "replace",
          name: "Spirit Shroud: Blocked Healing",
          modifiers: [blockHealing()],
          lifecycle: firstOf(
            whileSpellActive(),
            untilTrigger(trigger("turn-start", { subject: "source" })),
          ),
        }),
        cleanRoomEffect("shroud-slowed", {
          host: "actor",
          scope: "source-target",
          reapply: "replace",
          name: "Spirit Shroud: Slowed",
          modifiers: [decreaseAllMovement(constant(10))],
          lifecycle: firstOf(
            whileSpellActive(),
            untilTrigger(trigger("turn-start", { subject: "source" })),
          ),
        }),
      ],
      rules: [
        ...modes.map(mode =>
          rule({
            id: `cast-shroud:${mode.id}`,
            on: trigger("action-used", { actionId: `cast:${mode.id}` }),
            targets: [self(`target:cast:${mode.id}`)],
            do: [
              consume(`cast:consume:${mode.id}`),
              operation("apply-artifact", {
                id: `cast:apply-source:${mode.id}`,
                artifactId: `shroud-source:${mode.id}`,
                target: "source",
              }),
            ],
          })
        ),
        ...modes.map(mode =>
          rule({
            id: `shroud-hit:${mode.id}`,
            on: trigger("operation-outcome", {
              operationId: "external:source-attack",
              outcome: "hit",
            }),
            when: [
              predicate("artifact-exists", {
                artifactId: `shroud-source:${mode.id}`,
                subject: "source",
              }),
              predicate("within-range", {
                distance: 10,
                units: "ft",
                from: "source",
              }),
            ],
            targets: [eventTarget(`target:hit:${mode.id}`)],
            do: [
              operation("damage", {
                id: `hit:shroud-damage:${mode.id}`,
                target: `target:hit:${mode.id}`,
                formula: shroudDamage,
                damageTypes: [mode.id],
                properties: ["magical"],
                attachment: "triggering-attack",
              }),
              operation("apply-artifact", {
                id: `hit:block-healing:${mode.id}`,
                artifactId: "blocked-healing",
                target: `target:hit:${mode.id}`,
              }),
            ],
          })
        ),
        rule({
          id: "shroud-turn-start",
          on: trigger("turn-start", { subject: "creature" }),
          when: [
            predicate("any-artifact-exists", {
              artifactIds: modes.map(mode => `shroud-source:${mode.id}`),
              subject: "source",
            }),
            predicate("opposing-disposition"),
            predicate("within-range", {
              distance: 10,
              units: "ft",
              from: "source",
            }),
            predicate("visible-to-source"),
          ],
          targets: [eventTarget("target:turn")],
          do: [
            operation("apply-artifact", {
              id: "turn:apply-slow",
              artifactId: "shroud-slowed",
              target: "target:turn",
            }),
          ],
        }),
      ],
    }),
  ],
  accepted: acceptance(COMPILER_MIGRATION_LOG, [
    "cold、necrotic、radiant 三个稳定 bonus-action activity 均只给施法者建立一分钟专注；未声明时默认 radiant",
    "10 ft 内真实命中追加 3-4 环 1d8、5-6 环 2d8、7-8 环 3d8、9 环 4d8 对应类型伤害，暴击正常翻倍",
    "被追加伤害命中的目标到施法者下回合开始前不能恢复 HP",
    "10 ft 内开始回合的可见敌军速度 -10 ft；友军与 neutral 默认不受影响",
    "目标效果只由 dnd5e dependentOn 清理，不与 Arcane 手工删除竞争",
  ], { status: "compiler-runtime-passed" }),
});

export default spiritShroud;
