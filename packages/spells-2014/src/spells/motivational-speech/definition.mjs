import {
  COMPILER_MIGRATION_LOG,
  acceptance,
  allAttackRolls,
  cleanRoomEffect,
  cleanRoomSpell,
  constant,
  consume,
  duration,
  eventTarget,
  firstOf,
  gainAttackAdvantage,
  grantAbilitySavingThrowAdvantage,
  graphFragment,
  operation,
  perSlotAboveBase,
  predicate,
  publicAction,
  rule,
  selected,
  spellContract,
  spellLifetime,
  targetQuery,
  temporaryHitPointsFromArtifact,
  trigger,
  untilTrigger,
  whileSpellActive,
} from "@arcanedesk/spell-compiler/dsl";

const motivationalSpeech = cleanRoomSpell({
  id: "motivational-speech",
  contract: spellContract({
    ruleset: "2014",
    level: 3,
    school: "enc",
    components: {
      verbal: true,
      somatic: false,
      material: false,
    },
    lifetime: spellLifetime(duration(1, "hours")),
  }),
  emission: { contentVersion: 6 },
  support: {
    level: "simplified",
    omissions: [
      "whether each declared target can hear the speaker remains under DM adjudication",
      "Foundry temporary HP has no native source identity; replacement by another source or a non-damage update to zero remains under DM adjudication",
    ],
  },
  fragments: [
    graphFragment({
      id: "motivational-speech-graph",
      actions: [
        publicAction("cast", "励志演讲 Motivational Speech", {
          activationType: "minute",
        }),
      ],
      artifacts: [
        cleanRoomEffect("motivated", {
          host: "actor",
          scope: "source-target",
          reapply: "replace",
          name: "Motivational Speech",
          modifiers: [
            grantAbilitySavingThrowAdvantage(["wis"]),
          ],
          lifecycle: firstOf(
            whileSpellActive(),
            untilTrigger(
              trigger("temporary-hit-points-depleted", {
                artifactId: "motivated",
              }),
            ),
          ),
        }),
        cleanRoomEffect("inspired-attack", {
          host: "actor",
          scope: "source-target",
          reapply: "replace",
          name: "Motivational Speech: Inspired Attack",
          modifiers: [
            gainAttackAdvantage(allAttackRolls()),
          ],
          lifecycle: duration(1, "hours"),
        }),
      ],
      rules: [
        rule({
          id: "cast-motivational-speech",
          on: trigger("action-used", { actionId: "cast" }),
          targets: [selected("target:cast", { max: 5, range: 60 })],
          do: [
            consume(),
            operation("apply-artifact", {
              id: "cast:apply-motivated",
              artifactId: "motivated",
              target: "target:cast",
            }),
            operation("grant-temporary-hp", {
              id: "cast:temporary-hp",
              target: "target:cast",
              formula: perSlotAboveBase(constant(5), constant(5)),
            }),
          ],
        }),
        rule({
          id: "grant-inspired-attack-after-hit",
          on: trigger("operation-outcome", {
            operationId: "external:attack-roll",
            outcome: "hit",
          }),
          when: [
            predicate("artifact-exists", {
              artifactId: "motivated",
              subject: "attack-target",
            }),
            temporaryHitPointsFromArtifact("motivated", {
              subject: "attack-target",
            }),
          ],
          targets: [eventTarget("target:hit-creature")],
          do: [
            operation("apply-artifact", {
              id: "hit:apply-inspired-attack",
              artifactId: "inspired-attack",
              target: "target:hit-creature",
            }),
          ],
        }),
        rule({
          id: "consume-inspired-attack-after-hit",
          on: trigger("operation-outcome", {
            operationId: "external:attack-roll",
            outcome: "hit",
          }),
          when: [
            predicate("artifact-exists", {
              artifactId: "inspired-attack",
              subject: "attack-source",
            }),
          ],
          targets: [
            targetQuery({
              id: "target:attacker",
              result: "tokens",
              origin: { type: "event-binding", name: "attacker" },
              evaluation: "snapshot",
              cardinality: { min: 1, max: 1 },
              predicates: [],
            }),
          ],
          do: [
            operation("delete-artifact", {
              id: "attack:consume-inspired-attack-on-hit",
              artifactId: "inspired-attack",
              target: "target:attacker",
            }),
          ],
        }),
        rule({
          id: "consume-inspired-attack-after-miss",
          on: trigger("operation-outcome", {
            operationId: "external:attack-roll",
            outcome: "miss",
          }),
          when: [
            predicate("artifact-exists", {
              artifactId: "inspired-attack",
              subject: "attack-source",
            }),
          ],
          targets: [
            targetQuery({
              id: "target:attacker",
              result: "tokens",
              origin: { type: "event-binding", name: "attacker" },
              evaluation: "snapshot",
              cardinality: { min: 1, max: 1 },
              predicates: [],
            }),
          ],
          do: [
            operation("delete-artifact", {
              id: "attack:consume-inspired-attack-on-miss",
              artifactId: "inspired-attack",
              target: "target:attacker",
            }),
          ],
        }),
        rule({
          id: "remove-motivation-when-temporary-hp-depleted",
          on: trigger("temporary-hit-points-depleted", {
            artifactId: "motivated",
          }),
          targets: [eventTarget("target:depleted-creature")],
          do: [
            operation("delete-artifact", {
              id: "depleted:remove-motivated",
              artifactId: "motivated",
              target: "target:depleted-creature",
            }),
          ],
        }),
      ],
    }),
  ],
  accepted: acceptance(
    COMPILER_MIGRATION_LOG,
    [
      "一分钟施法对 60 ft 内一至五个声明目标生效，并只消耗一个所声明环位的法术位",
      "每个目标获得 5 temporary HP，每升一环再增加 5，并在最长一小时内获得 Wisdom saving throw advantage",
      "仍受本法术影响的目标被真实攻击命中后，获得下一次 attack roll 的优势",
      "该目标下一次真实 attack roll 无论命中或未命中都只消费一次 inspired-attack",
      "本法术提供的 temporary HP 耗尽时，只移除该目标的 Motivational Speech 主效果",
    ],
    { status: "compiler-runtime-passed" },
  ),
});

export default motivationalSpeech;
