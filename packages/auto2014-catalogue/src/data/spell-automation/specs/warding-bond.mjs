import {
  COMPILER_MIGRATION_LOG,
  acceptance,
  actualDamage,
  allSavingThrows,
  bonus,
  cleanRoomEffect,
  cleanRoomSpell,
  constant,
  consume,
  duration,
  firstOf,
  grantArmorClassBonus,
  grantResistance,
  graphFragment,
  operation,
  predicate,
  publicAction,
  rule,
  selected,
  spellContract,
  spellLifetime,
  targetQuery,
  trigger,
  untilTrigger,
  whileArtifact,
  whileSpellActive,
} from "../dsl.mjs";

const wardingDamageTypes = [
  "acid",
  "bludgeoning",
  "cold",
  "fire",
  "force",
  "lightning",
  "necrotic",
  "piercing",
  "poison",
  "psychic",
  "radiant",
  "slashing",
  "thunder",
];

const wardingBond = cleanRoomSpell({
  id: "warding-bond",
  contract: spellContract({
    ruleset: "2014",
    level: 2,
    school: "abj",
    components: {
      verbal: true,
      somatic: true,
      material: true,
    },
    material: {
      cost: 100,
      consumed: false,
    },
    lifetime: spellLifetime(duration(1, "hours")),
  }),
  emission: { contentVersion: 6 },
  support: {
    level: "simplified",
    omissions: [
      "双方距离超过 60 ft、再次对任一连接者施放 Warding Bond，以及施法者主动用 action 解散法术的提前结束条件仍由 DM 处理",
    ],
  },
  fragments: [
    graphFragment({
      id: "warding-bond-graph",
      actions: [publicAction("cast", "守护之链 Warding Bond")],
      artifacts: [
        cleanRoomEffect("bond-source", {
          host: "actor",
          scope: "source",
          reapply: "replace",
          name: "Warding Bond Source",
          markerOnly: true,
          lifecycle: firstOf(
            whileSpellActive(),
            untilTrigger(
              trigger("hit-points-depleted", {
                subject: "effect-target",
              }),
            ),
          ),
        }),
        cleanRoomEffect("bonded-target", {
          host: "actor",
          scope: "source-target",
          reapply: "replace",
          name: "Warding Bond",
          modifiers: [
            grantArmorClassBonus(constant(1)),
            bonus(allSavingThrows(), constant(1)),
            ...wardingDamageTypes.map(damageType =>
              grantResistance(damageType)
            ),
          ],
          lifecycle: whileArtifact("bond-source"),
        }),
      ],
      rules: [
        rule({
          id: "cast-bond",
          on: trigger("action-used", { actionId: "cast" }),
          targets: [
            selected("target:cast", {
              min: 1,
              max: 1,
              range: null,
              units: "touch",
              kind: "creature",
            }),
          ],
          do: [
            consume(),
            operation("apply-artifact", {
              id: "cast:apply-source-bond",
              artifactId: "bond-source",
              target: "source",
            }),
            operation("apply-artifact", {
              id: "cast:apply-target-bond",
              artifactId: "bonded-target",
              target: "target:cast",
            }),
          ],
        }),
        rule({
          id: "mirror-post-resistance-damage",
          on: trigger("damage-taken", { subject: "effect-target" }),
          when: [
            predicate("artifact-exists", {
              artifactId: "bonded-target",
              subject: "effect-target",
            }),
            predicate("damage-applied", { minimum: 1 }),
          ],
          targets: [
            targetQuery({
              id: "target:bond-source",
              result: "source",
              origin: {
                type: "artifact",
                artifactId: "bonded-target",
              },
              evaluation: "snapshot",
              cardinality: { min: 1, max: 1 },
            }),
          ],
          do: [
            operation("damage", {
              id: "mirror:damage",
              target: "target:bond-source",
              formula: actualDamage(),
              damageTypes: ["none"],
              mitigation: "none",
            }),
          ],
        }),
      ],
    }),
  ],
  accepted: acceptance(
    COMPILER_MIGRATION_LOG,
    [
      "接触一个声明目标并只消耗一个二环法术位，施法者与目标各获得精确链接的 source/target effect",
      "目标获得恰好 +1 AC、全部 saving throws +1 与 13 种常规伤害抗性",
      "目标受到抗性结算后的实际伤害时，施法者承受同量且不再经过抗性或其他减伤的伤害",
      "镜像伤害不会递归 ping-pong，两个施法来源彼此隔离",
      "施法者降至 0 HP、任一端效果被删除或一小时到期时，链接及另一端效果精确清理",
    ],
    { status: "compiler-runtime-passed" },
  ),
});

export default wardingBond;
