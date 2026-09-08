import {
  acceptance,
  allAttackRolls,
  cleanRoomEffect,
  cleanRoomSpell,
  consume,
  dice,
  duration,
  eventTarget,
  firstOf,
  graphFragment,
  grantAttackAdvantage,
  operation,
  perSlotAboveBase,
  publicAction,
  rule,
  selected,
  spellContract,
  spellLifetime,
  trigger,
  untilTrigger,
} from "@arcanedesk/spell-compiler/dsl";

const guidingBolt = cleanRoomSpell({
  id: "guiding-bolt",
  contract: spellContract({
    ruleset: "2014",
    level: 1,
    school: "evo",
    components: {
      verbal: true,
      somatic: true,
      material: false,
    },
    lifetime: spellLifetime(duration(1, "rounds")),
  }),
  emission: { contentVersion: 6 },
  support: { level: "full", omissions: [] },
  fragments: [
    graphFragment({
      id: "guiding-bolt-graph",
      actions: [publicAction("cast", "光导箭 Guiding Bolt")],
      artifacts: [
        cleanRoomEffect("guiding-bolt", {
          host: "actor",
          scope: "source-target",
          reapply: "replace",
          name: "Guiding Bolt",
          modifiers: [
            grantAttackAdvantage(allAttackRolls()),
          ],
          lifecycle: firstOf(
            untilTrigger(trigger("attack-targeted", { subject: "effect-target" })),
            untilTrigger(trigger("turn-end", { subject: "source" })),
          ),
        }),
      ],
      rules: [
        rule({
          id: "cast-guiding-bolt",
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
            operation("attack-roll", {
              id: "cast:attack",
              target: "target:cast",
              attack: {
                source: "spellcasting",
                range: "ranged",
              },
            }),
            operation("damage", {
              id: "cast:damage",
              target: "target:cast",
              formula: perSlotAboveBase(
                dice(4, 6),
                dice(1, 6),
              ),
              damageTypes: ["radiant"],
            }),
          ],
        }),
        rule({
          id: "apply-guiding-bolt-on-hit",
          on: trigger("operation-outcome", {
            operationId: "cast:attack",
            outcome: "hit",
          }),
          targets: [eventTarget("hit-target")],
          do: [
            operation("apply-artifact", {
              id: "hit:apply-guiding-bolt",
              artifactId: "guiding-bolt",
              target: "hit-target",
            }),
          ],
        }),
      ],
    }),
  ],
  accepted: acceptance(
    "docs/foundry-automation/notes/法术编译器clean-room实施计划.md",
    [
      "120 ft 内单一声明目标进行 ranged spell attack",
      "命中造成 4d6 radiant damage，每升一环增加 1d6；暴击翻倍交给 Midi",
      "未命中不造成伤害且不创建 Guiding Bolt effect",
      "命中后目标给予下一次针对它的攻击优势",
      "第一次后续攻击（命中或未命中）或施法者下一回合结束时移除优势",
    ],
    { status: "compiler-runtime-passed" },
  ),
});

export default guidingBolt;
