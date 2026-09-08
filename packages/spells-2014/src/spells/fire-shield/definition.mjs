import {
  acceptance,
  cleanRoomEffect,
  cleanRoomSpell,
  constant,
  consume,
  contentRef,
  dice,
  duration,
  grantResistance,
  graphFragment,
  minimumTokenLight,
  operation,
  predicate,
  publicAction,
  requiresSourceArtifact,
  rule,
  self,
  spellContract,
  spellLifetime,
  targetQuery,
  trigger,
  whileSpellActive,
} from "@arcanedesk/spell-compiler/dsl";

const I2B_QA_LOG =
  "docs/foundry-automation/notes/spell-combat-test-cases-1-3.md";

function attackerTarget(id) {
  return targetQuery({
    id,
    result: "tokens",
    origin: { type: "event-binding", name: "attacker" },
    evaluation: "snapshot",
    cardinality: { min: 1, max: 1 },
  });
}

const fireShield = cleanRoomSpell({
  id: "fire-shield",
  contract: spellContract({
    ruleset: "2014",
    level: 4,
    school: "evo",
    components: {
      verbal: true,
      somatic: true,
      material: true,
    },
    material: {
      cost: 0,
      consumed: false,
    },
    lifetime: spellLifetime(duration(10, "minutes")),
    primaryActionId: "cast-warm",
  }),
  content: contentRef("fire-shield"),
  emission: { contentVersion: 1 },
  support: {
    level: "simplified",
    omissions: [
      "按冻结裁决省略 RAW 的 5 ft 距离门槛：任何真实 melee attack hit（包括长触及）都会触发反伤；miss、ranged 与非攻击伤害仍不触发",
    ],
  },
  fragments: [
    graphFragment({
      id: "fire-shield-graph",
      actions: [
        publicAction("cast-warm", "火焰护盾：暖焰 Warm Shield"),
        publicAction("cast-chill", "火焰护盾：寒焰 Chill Shield"),
        publicAction("dismiss-warm", "解除火焰护盾：暖焰", {
          availableWhen: [requiresSourceArtifact("fire-shield-warm")],
        }),
        publicAction("dismiss-chill", "解除火焰护盾：寒焰", {
          availableWhen: [requiresSourceArtifact("fire-shield-chill")],
        }),
      ],
      artifacts: [
        cleanRoomEffect("fire-shield-warm", {
          host: "actor",
          scope: "source",
          reapply: "replace",
          name: "Fire Shield: Warm Shield",
          modifiers: [
            grantResistance("cold"),
            minimumTokenLight(constant(10), constant(20)),
          ],
          lifecycle: whileSpellActive(),
        }),
        cleanRoomEffect("fire-shield-chill", {
          host: "actor",
          scope: "source",
          reapply: "replace",
          name: "Fire Shield: Chill Shield",
          modifiers: [
            grantResistance("fire"),
            minimumTokenLight(constant(10), constant(20)),
          ],
          lifecycle: whileSpellActive(),
        }),
      ],
      rules: [
        rule({
          id: "cast-warm-shield",
          on: trigger("action-used", { actionId: "cast-warm" }),
          targets: [self("target:cast-warm")],
          do: [
            consume("cast-warm:consume"),
            operation("delete-artifact", {
              id: "cast-warm:remove-chill",
              artifactId: "fire-shield-chill",
              target: "source",
            }),
            operation("apply-artifact", {
              id: "cast-warm:apply-warm",
              artifactId: "fire-shield-warm",
              target: "source",
            }),
          ],
        }),
        rule({
          id: "cast-chill-shield",
          on: trigger("action-used", { actionId: "cast-chill" }),
          targets: [self("target:cast-chill")],
          do: [
            consume("cast-chill:consume"),
            operation("delete-artifact", {
              id: "cast-chill:remove-warm",
              artifactId: "fire-shield-warm",
              target: "source",
            }),
            operation("apply-artifact", {
              id: "cast-chill:apply-chill",
              artifactId: "fire-shield-chill",
              target: "source",
            }),
          ],
        }),
        rule({
          id: "warm-retaliation-on-melee-hit",
          on: trigger("operation-outcome", {
            operationId: "external:attack-roll",
            outcome: "hit",
          }),
          when: [
            predicate("artifact-exists", {
              artifactId: "fire-shield-warm",
              subject: "attack-target",
            }),
            predicate("attack-kind", { value: "melee" }),
          ],
          targets: [attackerTarget("target:warm-attacker")],
          do: [
            operation("damage", {
              id: "warm-retaliation:fire",
              target: "target:warm-attacker",
              formula: dice(2, 8),
              damageTypes: ["fire"],
            }),
          ],
        }),
        rule({
          id: "chill-retaliation-on-melee-hit",
          on: trigger("operation-outcome", {
            operationId: "external:attack-roll",
            outcome: "hit",
          }),
          when: [
            predicate("artifact-exists", {
              artifactId: "fire-shield-chill",
              subject: "attack-target",
            }),
            predicate("attack-kind", { value: "melee" }),
          ],
          targets: [attackerTarget("target:chill-attacker")],
          do: [
            operation("damage", {
              id: "chill-retaliation:cold",
              target: "target:chill-attacker",
              formula: dice(2, 8),
              damageTypes: ["cold"],
            }),
          ],
        }),
        rule({
          id: "dismiss-warm-shield",
          on: trigger("action-used", { actionId: "dismiss-warm" }),
          targets: [self("target:dismiss-warm")],
          do: [
            operation("delete-artifact", {
              id: "dismiss:remove-warm",
              artifactId: "fire-shield-warm",
              target: "source",
            }),
          ],
        }),
        rule({
          id: "dismiss-chill-shield",
          on: trigger("action-used", { actionId: "dismiss-chill" }),
          targets: [self("target:dismiss-chill")],
          do: [
            operation("delete-artifact", {
              id: "dismiss:remove-chill",
              artifactId: "fire-shield-chill",
              target: "source",
            }),
          ],
        }),
      ],
    }),
  ],
  accepted: acceptance(I2B_QA_LOG, [
    "暖焰与寒焰是两个明确公开 cast Action；每次只消耗一个四环或更高法术位，重施另一模式会精确替换旧模式",
    "暖焰提供 cold resistance 并在真实 melee hit 时对攻击者造成 2d8 fire；寒焰提供 fire resistance 并造成 2d8 cold",
    "反伤由 effect-host-hit-by-attack-v1 在真实攻击 workflow 中结算；miss、ranged 与非攻击伤害不触发，零伤害命中仍触发",
    "按产品简化不检查 5 ft，因此长触及 melee hit 同样触发",
    "两种模式都通过 ATL minimum light 提供 10 ft bright / 20 ft dim，并在效果结束时恢复先前 Token 光照",
    "对应 dismiss Action 只删除当前精确来源效果；到期与重施也精确清理，不影响其他法术效果",
  ], { status: "compiler-runtime-passed" }),
});

export default fireShield;
