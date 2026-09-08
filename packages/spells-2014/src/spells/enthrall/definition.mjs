import {
  compilerAcceptance,
  cleanRoomEffect,
  cleanRoomSpell,
  consume,
  duration,
  eventTarget,
  grantSkillCheckDisadvantage,
  graphFragment,
  operation,
  predicate,
  publicAction,
  rule,
  selected,
  spellContract,
  spellLifetime,
  trigger,
  whileSpellActive,
} from "@arcanedesk/spell-compiler/dsl";

const EXPANSION_BATCH =
  "docs/foundry-automation/notes/零至三环新法术扩展批次.md";

const enthrall = cleanRoomSpell({
  id: "enthrall",
  contract: spellContract({
    ruleset: "2014",
    level: 2,
    school: "enc",
    components: {
      verbal: true,
      somatic: true,
      material: false,
    },
    lifetime: spellLifetime(duration(1, "minutes")),
  }),
  emission: { contentVersion: 1 },
  support: {
    level: "simplified",
    omissions: [
      "Foundry 无法表达只在感知施法者以外生物时生效的关系型技能劣势；当前保守扩大为效果期间所有 Perception checks 劣势",
      "目标是否能听见施法者、是否免疫 charmed，以及与施法者或其同伴交战时首次豁免具有优势，当前由 DM 在声明目标和掷骰时裁定",
      "目标不再能听见施法者，或施法者 incapacitated / 无法说话时提前结束，当前没有 closed lifecycle predicate；DM 发生这些条件时移除 marker",
    ],
  },
  fragments: [
    graphFragment({
      id: "enthrall-graph",
      actions: [publicAction("cast", "迷魂术 Enthrall")],
      artifacts: [
        cleanRoomEffect("enthralled", {
          host: "actor",
          scope: "source-target",
          reapply: "replace",
          name: "Enthrall",
          modifiers: [grantSkillCheckDisadvantage("prc")],
          lifecycle: whileSpellActive(),
        }),
      ],
      rules: [
        rule({
          id: "cast-enthrall",
          on: trigger("action-used", { actionId: "cast" }),
          targets: [
            selected("target:cast", {
              min: 1,
              max: "any",
              range: 60,
              kind: "creature",
              predicates: [predicate("visible-to-source")],
            }),
          ],
          do: [
            consume(),
            operation("saving-throw", {
              id: "initial-save",
              ability: ["wis"],
              target: "target:cast",
              onSave: "none",
            }),
          ],
        }),
        rule({
          id: "initial-save-failed",
          on: trigger("operation-outcome", {
            operationId: "initial-save",
            outcome: "failure",
          }),
          targets: [eventTarget("target:failed")],
          do: [
            operation("apply-artifact", {
              id: "apply-enthralled",
              artifactId: "enthralled",
              target: "target:failed",
            }),
          ],
        }),
      ],
    }),
  ],
  accepted: compilerAcceptance(EXPANSION_BATCH, [
    "一次施法只消耗一个二环或更高环位，并对 60 ft 内由 DM 确认可见且能听见施法者的声明目标分别请求 Wisdom save",
    "只有首次豁免失败者获得独立 source-target identity 的 Enthrall effect；成功者与非目标不变",
    "效果期间由 Midi 对该目标的 Perception checks 施加劣势；这是对关系型原规则的保守扩大，不影响其他 Wisdom checks",
    "效果最长持续一分钟且不建立专注；到期时精确清理，不删除其他来源的同名效果",
    "charmed 免疫、交战时豁免优势、听觉资格及提前结束条件保持明确 omission",
  ]),
});

export default enthrall;
