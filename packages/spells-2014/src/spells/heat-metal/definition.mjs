import {
  acceptance,
  allAttackRolls,
  cleanRoomEffect,
  cleanRoomSpell,
  concentration,
  consume,
  contentRef,
  dice,
  duration,
  gainAttackDisadvantage,
  grantAbilityCheckDisadvantage,
  graphFragment,
  operation,
  perSlotAboveBase,
  predicate,
  publicAction,
  requiresSourceArtifact,
  rule,
  selected,
  spellContract,
  trigger,
  whileSpellActive,
} from "@arcanedesk/spell-compiler/dsl";

const EXPANSION_BATCH =
  "docs/foundry-automation/notes/零至三环新法术扩展批次.md";

const singeDamage = perSlotAboveBase(
  dice(2, 8),
  dice(1, 8),
);

const heatMetal = cleanRoomSpell({
  id: "heat-metal",
  contract: spellContract({
    ruleset: "2014",
    level: 2,
    school: "trs",
    components: {
      verbal: true,
      somatic: true,
      material: true,
    },
    lifetime: concentration(duration(1, "minutes")),
  }),
  content: contentRef("heat-metal"),
  emission: { contentVersion: 1 },
  support: {
    level: "simplified",
    omissions: [
      "目标必须持有 manufactured 金属物件，合法性由 DM 判定，CLI 不校验",
      "生物丢下热物件需要 CON save，由 DM 处理",
      "规则中的攻击与属性检定劣势只应在生物受伤后、未能或未选择丢下热物件时生效，并持续到施法者下一回合开始；当前 heat-metal-mark 是随专注存续的长效近似，不实现该条件与逐回合到期",
      "对金属物件本身（非生物）持续加热的效果不在本实现",
    ],
  },
  fragments: [
    graphFragment({
      id: "heat-metal-graph",
      actions: [
        publicAction("cast", "灼热金属 Heat Metal"),
        publicAction("singe", "灼热金属：灼烧 Singe", {
          activationType: "bonus",
          availableWhen: [requiresSourceArtifact("heat-metal-source")],
        }),
      ],
      artifacts: [
        cleanRoomEffect("heat-metal-source", {
          host: "actor",
          scope: "source",
          reapply: "replace",
          name: "Heat Metal",
          modifiers: [],
          lifecycle: whileSpellActive(),
        }),
        cleanRoomEffect("heat-metal-mark", {
          host: "actor",
          scope: "source-target",
          reapply: "replace",
          name: "Heat Metal",
          modifiers: [
            gainAttackDisadvantage(allAttackRolls()),
            grantAbilityCheckDisadvantage([
              "str",
              "dex",
              "con",
              "int",
              "wis",
              "cha",
            ]),
          ],
          lifecycle: whileSpellActive(),
        }),
      ],
      rules: [
        rule({
          id: "cast-heat-metal",
          on: trigger("action-used", { actionId: "cast" }),
          targets: [
            selected("target:cast", {
              min: 1,
              max: 1,
              range: 60,
              kind: "creature",
            }),
          ],
          do: [
            consume(),
            operation("damage", {
              id: "cast:damage",
              target: "target:cast",
              formula: singeDamage,
              damageTypes: ["fire"],
            }),
            operation("apply-artifact", {
              id: "cast:apply-source",
              artifactId: "heat-metal-source",
              target: "source",
            }),
            operation("apply-artifact", {
              id: "cast:apply-mark",
              artifactId: "heat-metal-mark",
              target: "target:cast",
            }),
          ],
        }),
        rule({
          id: "singe-marked-target",
          on: trigger("action-used", { actionId: "singe" }),
          when: [
            predicate("artifact-exists", {
              artifactId: "heat-metal-source",
              subject: "source",
            }),
          ],
          targets: [
            selected("target:singe", {
              min: 1,
              max: 1,
              range: null,
              predicates: [
                predicate("artifact-exists", {
                  artifactId: "heat-metal-mark",
                  subject: "target",
                }),
              ],
            }),
          ],
          do: [
            operation("damage", {
              id: "singe:damage",
              target: "target:singe",
              formula: singeDamage,
              damageTypes: ["fire"],
            }),
          ],
        }),
      ],
    }),
  ],
  accepted: acceptance(EXPANSION_BATCH, [
    "cast 是 action，只消耗一个二环或更高法术位并建立最长一分钟专注；CLI 不校验目标是否持有 manufactured 金属物件，合法性由 DM 判定",
    "目标立刻受到 2d8 fire damage，没有攻击骰也没有豁免，并获得来源绑定的 heat-metal-mark；施法者获得 heat-metal-source marker",
    "heat-metal-mark 当前以随专注存续的长效效果近似所有攻击检定与全部六项属性检定劣势；受伤后未丢下物件才生效以及到施法者下一回合开始到期的规则未自动化",
    "singe 是独立 bonus action，只在施法者持有 heat-metal-source 时可见可用，对一个已被本来源 heat-metal-mark 标记的目标再次造成 fire damage，且不再次消耗法术位；规则不要求目标在后续灼烧时仍位于 60 ft 内",
    "初始伤害与 singe 伤害使用同一 perSlotAboveBase(2d8, 1d8) 公式，每升一环各增加 1d8 fire damage",
    "未被本次来源 heat-metal-mark 标记的目标不能声明为 singe 目标，由 target predicates 在 preflight 拒绝",
    "专注结束或一分钟到期时清理 heat-metal-source 与 heat-metal-mark，singe 随之不再可用",
    "金属物件合法性、丢下物件的 CON save、劣势的条件与逐回合到期，以及对物件本身的持续加热严格保留在 support omissions，不误报为已实现",
  ], { status: "compiler-runtime-passed" }),
});

export default heatMetal;
