import {
  acceptance,
  cleanRoomEffect,
  cleanRoomSpell,
  concentration,
  consume,
  dice,
  duration,
  eventTarget,
  graphFragment,
  operation,
  predicate,
  publicAction,
  rule,
  spellContract,
  spellScript,
  spellScriptHandler,
  trigger,
  whileSpellActive,
} from "../dsl.mjs";

const L5_WAVE_I4_QA_RECEIPT =
  "docs/foundry-automation/notes/spell-level-5-wave-i4-qa-2026-08-27.md";

const banishingSmite = cleanRoomSpell({
  id: "banishing-smite",
  contract: spellContract({
    ruleset: "2014",
    level: 5,
    school: "abj",
    components: {
      verbal: true,
      somatic: false,
      material: false,
    },
    lifetime: concentration(duration(1, "minutes")),
    primaryActionId: "declare",
  }),
  emission: { contentVersion: 1 },
  support: {
    level: "simplified",
    omissions: [
      "declared-rider 将 bonus-action 施法声明合并到下一次真实近战武器命中；未命中不耗槽，也不建立命中前的专注窗口",
      "目标是否原生属于当前位面、被放逐到家园位面或无害半位面，以及对应的 incapacitated、Token 隐藏、移动和返回位置由 DM 处理；系统只建立来源绑定的 banished marker",
    ],
  },
  fragments: [
    graphFragment({
      id: "banishing-smite-rider",
      actions: [
        publicAction("declare", "放逐斩 Banishing Smite", {
          activationType: "bonus",
          delivery: "declared-rider",
        }),
      ],
      artifacts: [
        cleanRoomEffect("banished", {
          scope: "source-target",
          reapply: "replace",
          name: "Banishing Smite: Banished",
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
              formula: dice(5, 10),
              damageTypes: ["force"],
            }),
          ],
        }),
      ],
    }),
  ],
  script: spellScript("banishing-smite", {
    version: 1,
    handlers: [
      spellScriptHandler(
        "after-damage-threshold",
        "declared-rider-after-damage",
        {
          runtimeRuleId: "resolve-declared-rider",
          authority: "primary-active-gm",
          dedupe: "workflowUuid + targetUuid",
          cleanupOwner: "source",
          writes: ["artifact:concentration", "artifact:banished"],
        },
      ),
    ],
  }),
  accepted: acceptance(L5_WAVE_I4_QA_RECEIPT, [
    "Declare 是 bonus-action declared rider；只有下一次真实 melee weapon attack 命中时才消耗一个五环法术位，未命中保持法术位、专注与目标状态不变",
    "命中向父武器伤害注入一次 5d10 force damage，暴击扩骰交给 Midi；2014 规则没有 Charisma save，系统不得创建额外豁免",
    "父伤害已真实提交且 authoritative HP receipt 可见后，若本次攻击未减少目标 HP，脚本返回 committed skipped；只有 HP 确实减少后才继续判断 50 HP 阈值",
    "本次攻击减少 HP 且目标剩余 HP 大于 50 时，脚本返回 committed skipped，不建立 marker，也不结束施法者已有的其他 concentration",
    "本次攻击减少 HP 且目标剩余 HP 为 50 或以下时，primary active GM 通过 hidden native Activity anchor 建立带 dnd5e Item/Activity provenance 的 concentration，替换既有 concentration 后再建立 dependentOn 该来源、source-target identity 的 banished marker",
    "handler 以 workflowUuid + targetUuid 去重；来源结束时由 source cleanup owner 清理对应 banished marker，不同施法来源互不清算",
    "父伤害已提交后缺失权威 HP 证据，或分步 world write 发生异常时，只返回 committed partial/indeterminate、retry false，不重放伤害或法术位消耗",
    "命中前专注窗口、位面归属、incapacitated、Token 隐藏/移动与返回位置保持明确 DM omission，marker 不冒充完整跨位面状态",
  ], { status: "compiler-runtime-passed" }),
});

export default banishingSmite;
