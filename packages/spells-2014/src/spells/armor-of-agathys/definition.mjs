import {
  acceptance,
  castLevel,
  cleanRoomEffect,
  cleanRoomSpell,
  constant,
  consume,
  duration,
  firstOf,
  graphFragment,
  multiply,
  operation,
  predicate,
  publicAction,
  rule,
  self,
  spellContract,
  spellLifetime,
  targetQuery,
  temporaryHitPointsFromArtifact,
  trigger,
  untilTrigger,
  whileSpellActive,
} from "@arcanedesk/spell-compiler/dsl";

const I2B_QA_LOG =
  "docs/foundry-automation/notes/spell-combat-test-cases-1-3.md";

const armorOfAgathys = cleanRoomSpell({
  id: "armor-of-agathys",
  contract: spellContract({
    ruleset: "2014",
    level: 1,
    school: "abj",
    components: {
      verbal: true,
      somatic: true,
      material: true,
    },
    material: {
      cost: 0,
      consumed: false,
    },
    lifetime: spellLifetime(duration(1, "hours")),
  }),
  emission: { contentVersion: 7 },
  support: {
    level: "simplified",
    omissions: [
      "其他来源以相同或更高数值覆盖本法术的 temporary HP 时，Foundry 不能可靠暴露剩余 temporary HP 的来源；此时反伤效果的提前清理由 DM 裁定",
    ],
  },
  fragments: [
    graphFragment({
      id: "armor-of-agathys-graph",
      actions: [publicAction("cast", "艾嘉西斯之铠 Armor of Agathys")],
      artifacts: [
        cleanRoomEffect("armor-source", {
          host: "actor",
          scope: "source",
          reapply: "replace",
          name: "Armor of Agathys",
          markerOnly: true,
          lifecycle: firstOf(
            whileSpellActive(),
            untilTrigger(
              trigger("temporary-hit-points-depleted", {
                artifactId: "armor-source",
              }),
            ),
          ),
        }),
      ],
      rules: [
        rule({
          id: "cast-armor",
          on: trigger("action-used", { actionId: "cast" }),
          targets: [self("target:cast")],
          do: [
            consume(),
            operation("apply-artifact", {
              id: "cast:apply-armor",
              artifactId: "armor-source",
              target: "source",
            }),
            operation("healing", {
              id: "cast:temporary-hp",
              target: "source",
              formula: multiply(constant(5), castLevel()),
              healingTypes: ["temphp"],
            }),
          ],
        }),
        rule({
          id: "retaliate-on-melee-hit",
          on: trigger("operation-outcome", {
            operationId: "external:attack-roll",
            outcome: "hit",
          }),
          when: [
            predicate("artifact-exists", {
              artifactId: "armor-source",
              subject: "attack-target",
            }),
            predicate("attack-kind", { value: "melee" }),
            temporaryHitPointsFromArtifact("armor-source", {
              subject: "attack-target",
            }),
          ],
          targets: [
            targetQuery({
              id: "target:attacker",
              result: "tokens",
              origin: { type: "event-binding", name: "attacker" },
              evaluation: "snapshot",
              cardinality: { min: 1, max: 1 },
            }),
          ],
          do: [
            operation("damage", {
              id: "retaliation:cold",
              target: "target:attacker",
              formula: multiply(constant(5), castLevel()),
              damageTypes: ["cold"],
            }),
          ],
        }),
      ],
    }),
  ],
  accepted: acceptance(
    I2B_QA_LOG,
    [
      "施法者只消耗一个所声明环位的法术位，并获得 5 × 施法环位的 temporary HP",
      "本法术的 temporary HP 存续时，真实近战命中者承受 5 × 施法环位的 cold damage",
      "长触及近战攻击同样触发反伤；miss、ranged attack 与非攻击伤害不触发",
      "本法术的 temporary HP 耗尽或一小时结束后停止反伤",
      "法术不建立专注，重复施放只保留当前来源 marker",
    ],
    { status: "compiler-runtime-passed" },
  ),
});

export default armorOfAgathys;
