import {
  acceptance,
  cleanRoomEffect,
  cleanRoomSpell,
  concentration,
  consume,
  dice,
  duration,
  eventTarget,
  grantAbilityCheckDisadvantage,
  graphFragment,
  operation,
  parameterValue,
  predicate,
  publicAction,
  requiredEnumSelection,
  rule,
  selected,
  spellContract,
  trigger,
  whileSpellActive,
} from "../dsl.mjs";

const EXPANSION_BATCH =
  "docs/foundry-automation/notes/零至三环新法术扩展批次.md";

const abilities = [
  { id: "str", label: "力量 Strength" },
  { id: "dex", label: "敏捷 Dexterity" },
  { id: "con", label: "体质 Constitution" },
  { id: "int", label: "智力 Intelligence" },
  { id: "wis", label: "感知 Wisdom" },
  { id: "cha", label: "魅力 Charisma" },
];

const hex = cleanRoomSpell({
  id: "hex",
  contract: spellContract({
    ruleset: "2014",
    level: 1,
    school: "enc",
    components: {
      verbal: true,
      somatic: true,
      material: true,
    },
    lifetime: concentration(duration(1, "hours")),
    primaryActionId: "cast",
  }),
  emission: { contentVersion: 1 },
  support: {
    level: "simplified",
    omissions: [
      "目标降至 0 HP 后以附赠动作转移诅咒仍由 DM 处理",
      "升环持续时间尚未建模；当前只承诺一环的一小时，三/四环八小时与五环以上二十四小时由 DM 处理",
      "Remove Curse 提前结束诅咒仍由 DM 删除本次来源 Effect 处理",
      "visible-to-source 目前只进入 interaction projection，不由通用 runtime 独立校验视线；DM 负责只声明施法者可见的目标",
      "一次 workflow 同时命中多个目标时不注入 Hex，避免父伤害把 1d6 泄漏到未被本次来源标记的目标；通常的逐目标攻击 workflow 不受影响",
    ],
  },
  fragments: [
    graphFragment({
      id: "hex-graph",
      actions: [
        publicAction("cast", "脆弱诅咒 Hex", {
          activationType: "bonus",
          parameters: [
            requiredEnumSelection(
              "ability",
              abilities.map(ability => ability.id),
              {
                labels: Object.fromEntries(
                  abilities.map(ability => [ability.id, ability.label]),
                ),
              },
            ),
          ],
        }),
      ],
      artifacts: [
        cleanRoomEffect("hex", {
          host: "actor",
          scope: "source-target",
          reapply: "replace",
          name: "Hex",
          modifiers: [
            grantAbilityCheckDisadvantage(parameterValue("ability")),
          ],
          lifecycle: whileSpellActive(),
        }),
      ],
      rules: [
        rule({
          id: "cast-hex",
          on: trigger("action-used", { actionId: "cast" }),
          targets: [
            selected("target:cast", {
              min: 1,
              max: 1,
              range: 90,
              kind: "creature",
              predicates: [predicate("visible-to-source")],
            }),
          ],
          do: [
            consume(),
            operation("apply-artifact", {
              id: "cast:apply-hex",
              artifactId: "hex",
              target: "target:cast",
            }),
          ],
        }),
        rule({
          id: "marked-target-attack-hit",
          on: trigger("operation-outcome", {
            operationId: "external:source-attack",
            outcome: "hit",
          }),
          when: [
            predicate("attack-kind", { value: "attack" }),
            predicate("artifact-exists", {
              artifactId: "hex",
              subject: "attack-target",
            }),
            predicate("artifact-source-matches", {
              artifactId: "hex",
              subject: "attack-target",
              source: "source",
            }),
          ],
          targets: [eventTarget("target:hit")],
          do: [
            operation("damage", {
              id: "hit:hex-necrotic-damage",
              target: "target:hit",
              formula: dice(1, 6),
              damageTypes: ["necrotic"],
              attachment: "triggering-attack",
            }),
          ],
        }),
      ],
    }),
  ],
  accepted: acceptance(EXPANSION_BATCH, [
    "同一个 bonus-action selected-targets action 必须由 DM 明确提供 str、dex、con、int、wis 或 cha；缺失、非法或未知 selection 在 workflow、法术位和专注变化前拒绝",
    "对 90 ft 内一个施法者可见的 creature 只消耗一个一环或更高法术位，并建立最长一小时的来源绑定 Hex Effect",
    "目标只对 DM 声明属性的 ability checks 获得劣势；其他属性检定、saving throws 与 attack rolls 不改变",
    "来源施法者以单目标 weapon attack 或 spell attack 命中自己的标记者时，把基础 1d6 necrotic 注入同一个父伤害 roll",
    "未命中、未标记目标或其他来源施法者的同名 Hex 均不触发附伤；暴击扩骰由 Midi 统一处理",
    "专注结束或一小时到期时清理本次来源的 Hex Effect 与属性检定劣势",
    "转移诅咒、升环时长、Remove Curse 与视线自动校验严格保留在 support omissions，不误报为已实现",
  ], { status: "compiler-runtime-passed" }),
});

export default hex;
