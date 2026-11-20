import {
  acceptance,
  allAttackRolls,
  cleanRoomEffect,
  cleanRoomSpell,
  concentration,
  constant,
  consume,
  duration,
  eventTarget,
  firstOf,
  gainAttackDisadvantage,
  grantAbilitySavingThrowDisadvantage,
  grantAttackAdvantage,
  grantStatus,
  graphFragment,
  operation,
  predicate,
  publicAction,
  rule,
  selected,
  setAllMovement,
  spellContract,
  trigger,
  untilTrigger,
  whileSpellActive,
} from "@arcanedesk/spell-compiler/dsl";

// L2 重写批（M1.0 审计 C 桶 recipe-invalid，c-dm）：2024 新增初始感知豁免；成功者仍跳
// 舞至其下回合结束，失败者陷入魅惑并吃满劣势/被攻击优势；重复豁免仍由 DM 结算。
// 5R 锚点：玩家手册2024/法术详述/6环.htm#Otto's_Irresistible_Dance。
const L6_RUNTIME_QA_RECEIPT =
  "docs/foundry-automation/notes/spell-level-6-runtime-qa-2026-09-02.md";

const irresistibleDance = cleanRoomSpell({
  id: "irresistible-dance",
  contract: spellContract({
    ruleset: "2024",
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
      "目标在自己的每个回合可以用一个动作重复感知豁免；DM 使用本来源施法 DC 掷骰，成功时删除本来源 Dance Effect，失败时保持",
      "首波不生成 break Action，也不自动替目标消费 action、掷脱离豁免或删除 Effect",
      "visible-to-source 目前只进入 interaction projection，不由通用 runtime 独立校验视线；DM 负责只声明施法者可见的目标",
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
            grantStatus("charmed"),
            setAllMovement(constant(0)),
            gainAttackDisadvantage(allAttackRolls()),
            grantAbilitySavingThrowDisadvantage(["dex"]),
            grantAttackAdvantage(allAttackRolls()),
          ],
          lifecycle: whileSpellActive(),
        }),
        cleanRoomEffect("irresistible-dance-jig", {
          host: "actor",
          scope: "source-target",
          reapply: "replace",
          name: "Otto's Irresistible Dance: Jig",
          modifiers: [setAllMovement(constant(0))],
          lifecycle: firstOf(
            duration(2, "rounds"),
            untilTrigger(
              trigger("turn-end", {
                subject: "effect-target",
                occurrence: "next-after-created",
              }),
            ),
          ),
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
              id: "failed:apply-dance",
              artifactId: "irresistible-dance",
              target: "target:failed",
            }),
          ],
        }),
        rule({
          id: "initial-save-succeeded",
          on: trigger("operation-outcome", {
            operationId: "initial-save",
            outcome: "success",
          }),
          targets: [eventTarget("target:succeeded")],
          do: [
            operation("apply-artifact", {
              id: "succeeded:apply-jig",
              artifactId: "irresistible-dance-jig",
              target: "target:succeeded",
            }),
          ],
        }),
      ],
    }),
  ],
  accepted: acceptance(L6_RUNTIME_QA_RECEIPT, [
    "Cast 是 selected-targets public Activity，只接受施法者 30 ft 内一个可见 creature，并只消耗一个六环或更高法术位",
    "合法目标先进行一次 Wisdom save；失败立即获得 charmed、speed 0、自身全部 attack rolls 劣势、Dexterity saves 劣势，以及攻击该目标的 attack rolls 优势",
    "豁免成功的目标不会魅惑，但仍须原地跳舞到其下个回合结束（speed 0，2 回合上限兜底）",
    "系统不暴露免费 escape 或 break Action；目标花费自己 action 后的 Wisdom break save 由 DM 结算，成功只删除该次施法来源的 Effect",
    "专注结束、被替换或最长一分钟到期会清理该来源仍存在的 Effect，并恢复其 movement、攻击与豁免修正",
  ], { status: "compiler-passed" }),
});

export default irresistibleDance;
