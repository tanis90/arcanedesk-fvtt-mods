import {
  COMPILER_MIGRATION_LOG,
  acceptance,
  cleanRoomEffect,
  cleanRoomSpell,
  concentration,
  consume,
  duration,
  grantConditionImmunity,
  grantIncomingAttackDisadvantage,
  graphFragment,
  operation,
  publicAction,
  rule,
  selected,
  spellContract,
  trigger,
  whileSpellActive,
} from "@arcanedesk/spell-compiler/dsl";

const protectedCreatureTypes = [
  "aberration",
  "celestial",
  "elemental",
  "fey",
  "fiend",
  "undead",
];

const protectionFromEvilAndGood = cleanRoomSpell({
  id: "protection-from-evil-and-good",
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
      consumed: true,
    },
    lifetime: concentration(duration(10, "minutes")),
  }),
  emission: { contentVersion: 5 },
  support: {
    level: "simplified",
    omissions: [
      "防止 qualifying creature 附身仍由 DM 裁定",
      "已经被 qualifying creature 魅惑、恐慌或附身的目标获得后续豁免优势仍由 DM 处理",
      "charmed 与 frightened immunity 因 Foundry 无法按效果来源生物类型条件化，当前宽化为对所有来源免疫",
    ],
  },
  fragments: [
    graphFragment({
      id: "protection-from-evil-and-good-graph",
      actions: [
        publicAction("cast", "防护善恶 Protection from Evil and Good"),
      ],
      artifacts: [
        cleanRoomEffect("protected", {
          host: "actor",
          scope: "source-target",
          reapply: "replace",
          name: "Protection from Evil and Good",
          modifiers: [
            grantConditionImmunity("charmed"),
            grantConditionImmunity("frightened"),
            grantIncomingAttackDisadvantage({
              attackerCreatureTypes: protectedCreatureTypes,
            }),
          ],
          lifecycle: whileSpellActive(),
        }),
      ],
      rules: [
        rule({
          id: "cast-protection",
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
              id: "cast:apply-protection",
              artifactId: "protected",
              target: "target:cast",
            }),
          ],
        }),
      ],
    }),
  ],
  accepted: acceptance(
    COMPILER_MIGRATION_LOG,
    [
      "接触一个声明目标并只消耗一个一环法术位",
      "目标获得 charmed 与 frightened immunity，并由专注管理最长 10 分钟",
      "aberration、celestial、elemental、fey、fiend 或 undead 攻击受保护目标时具有劣势",
      "不属于六类来源的攻击不受影响，非目标不变",
      "解除或替换专注后精确清理目标效果",
    ],
    { status: "compiler-runtime-passed" },
  ),
});

export default protectionFromEvilAndGood;
