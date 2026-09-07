import {
  acceptance,
  allAttackRolls,
  cleanRoomEffect,
  cleanRoomSpell,
  concentration,
  constant,
  consume,
  duration,
  gainAttackDisadvantage,
  grantAbilitySavingThrowDisadvantage,
  grantAttackAdvantage,
  graphFragment,
  operation,
  predicate,
  publicAction,
  rule,
  selected,
  setAllMovement,
  spellContract,
  trigger,
  whileSpellActive,
} from "../dsl.mjs";

const L6_RUNTIME_QA_RECEIPT =
  "docs/foundry-automation/notes/spell-level-6-runtime-qa-2026-09-02.md";

const irresistibleDance = cleanRoomSpell({
  id: "irresistible-dance",
  contract: spellContract({
    ruleset: "2014",
    level: 6,
    school: "enc",
    components: {
      verbal: true,
      somatic: false,
      material: false,
    },
    lifetime: concentration(duration(1, "minutes")),
  }),
  emission: { contentVersion: 1 },
  support: {
    level: "simplified",
    omissions: [
      "DM 在 Cast 前确认目标不免疫 charmed；免疫目标不应调用此 Action，自动化不实现对无效目标施法并浪费法术位的分支",
      "目标只能在自己的回合花费一个 action 尝试脱离；DM 使用本来源施法 DC 掷 Wisdom save，成功时只删除本来源的 Irresistible Dance Effect，失败时保持效果",
      "首波不生成 break Action，也不自动替目标消费 action、掷脱离豁免或删除 Effect",
    ],
  },
  fragments: [
    graphFragment({
      id: "irresistible-dance-graph",
      actions: [
        publicAction("cast", "奥图迷舞 Otto's Irresistible Dance"),
      ],
      artifacts: [
        cleanRoomEffect("irresistible-dance", {
          host: "actor",
          scope: "source-target",
          reapply: "replace",
          name: "Otto's Irresistible Dance",
          modifiers: [
            setAllMovement(constant(0)),
            gainAttackDisadvantage(allAttackRolls()),
            grantAbilitySavingThrowDisadvantage(["dex"]),
            grantAttackAdvantage(allAttackRolls()),
          ],
          lifecycle: whileSpellActive(),
        }),
      ],
      rules: [
        rule({
          id: "cast-irresistible-dance",
          on: trigger("action-used", { actionId: "cast" }),
          targets: [
            selected("target:cast", {
              min: 1,
              max: 1,
              range: 30,
              kind: "creature",
              predicates: [predicate("visible-to-source")],
            }),
          ],
          do: [
            consume(),
            operation("apply-artifact", {
              id: "cast:apply-irresistible-dance",
              artifactId: "irresistible-dance",
              target: "target:cast",
            }),
          ],
        }),
      ],
    }),
  ],
  accepted: acceptance(L6_RUNTIME_QA_RECEIPT, [
    "Cast 是 selected-targets public Activity，只接受施法者 30 ft 内一个可见且由 DM 确认为不免疫 charmed 的 creature，并只消耗一个六环或更高法术位",
    "Cast 不生成初始 saving throw；合法目标立即获得 speed 0、自身全部 attack rolls 劣势、Dexterity saves 劣势，以及攻击该目标的 attack rolls 优势",
    "系统不暴露免费 escape 或 break Action，也不会在 Cast 时错误要求 Wisdom save；非目标保持不变",
    "目标花费自己 action 后的 Wisdom break save 由 DM 结算；成功只删除该次施法来源的 Effect，失败不删除，同一目标上的其他来源保持隔离",
    "专注结束、被替换或最长一分钟到期会清理该来源仍存在的 Effect，并恢复其 movement、攻击与豁免修正",
  ], { status: "compiler-runtime-passed" }),
});

export default irresistibleDance;
