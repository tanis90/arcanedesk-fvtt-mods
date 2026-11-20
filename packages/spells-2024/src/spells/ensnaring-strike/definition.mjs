import {
  QA_LOG,
  acceptance,
  cleanRoomEffect,
  cleanRoomSpell,
  concentration,
  consume,
  dice,
  duration,
  eventTarget,
  grantStatus,
  graphFragment,
  operation,
  perSlotAboveBase,
  predicate,
  publicAction,
  rule,
  selected,
  spellContract,
  trigger,
  whileSpellActive,
} from "@arcanedesk/spell-compiler/dsl";

// L2 重写批（2024，M1 审计 C 桶 recipe-invalid）：由「命中前宣告、下次武器命中触发」改为
// 「用武器命中目标后立即以附赠动作施展」；1d6 穿刺/力量豁免/束缚与升环不变。
// 来源：5R 玩家手册2024 1环.htm#Ensnaring_Strike。
const ensnaringStrike = cleanRoomSpell({
  id: "ensnaring-strike",
  contract: spellContract({
    ruleset: "2024",
    level: 1,
    school: "con",
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
      "「在你用武器命中目标后立即可用」的时序与目标资格无法由 DSL 校验：本定义以独立附赠动作 Cast、目标查询使用 spec 距离呈现，由 DM 确认同一回合内刚刚用武器命中该目标",
      "大型或更大体型生物在首次 Strength save 上的优势缺少按目标体型选择 roll mode 的通用契约，由 DM 处理",
      "受束缚者或能触及它的其他生物使用动作进行 Strength（Athletics）检定解除藤蔓，缺少由效果宿主或第三方执行的通用 follow-up Action，由 DM 处理",
      "首次豁免成功时藤蔓立即枯萎、法术结束；本定义在成功分支不建立效果，专注仍由 DM 手动结束",
    ],
  },
  fragments: [
    graphFragment({
      id: "ensnaring-strike-graph",
      actions: [
        publicAction("cast", "捕获打击 Ensnaring Strike", {
          activationType: "bonus",
        }),
      ],
      artifacts: [
        cleanRoomEffect("ensnared", {
          host: "actor",
          scope: "source-target",
          reapply: "replace",
          name: "Ensnaring Strike",
          modifiers: [grantStatus("restrained")],
          lifecycle: whileSpellActive(),
        }),
      ],
      rules: [
        rule({
          id: "cast-ensnaring-strike",
          on: trigger("action-used", { actionId: "cast" }),
          targets: [
            selected("target:cast", {
              min: 1,
              max: 1,
              range: null,
              units: "spec",
              kind: "creature",
            }),
          ],
          do: [
            consume(),
            operation("saving-throw", {
              id: "initial-save",
              ability: ["str"],
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
              id: "failure:apply-ensnared",
              artifactId: "ensnared",
              target: "target:failed",
            }),
          ],
        }),
        rule({
          id: "ensnared-turn-start-damage",
          on: trigger("turn-start", { subject: "effect-target" }),
          when: [
            predicate("artifact-exists", {
              artifactId: "ensnared",
              subject: "effect-target",
            }),
          ],
          targets: [eventTarget("target:ensnared")],
          do: [
            operation("damage", {
              id: "ensnared:piercing-damage",
              target: "target:ensnared",
              formula: perSlotAboveBase(
                dice(1, 6),
                dice(1, 6),
              ),
              damageTypes: ["piercing"],
            }),
          ],
        }),
      ],
    }),
  ],
  accepted: acceptance(QA_LOG, [
    "cast 是一个附赠动作，选择一个施法刚刚用武器命中的 creature 并消耗一个一环或更高法术位（命中前提由 DM 确认）",
    "目标进行 Strength save；失败时获得来源绑定的 restrained，成功时不建立效果",
    "受束缚目标在自己的每个回合开始时承受基础 1d6 piercing，使用的法术位每高一环增加 1d6",
    "施法建立最长一分钟的专注；专注结束时清理 restrained 与后续伤害触发，同一来源重施只替换自己的效果",
    "大型体型优势与动作解除保持明确 omission，不会被普通无条件 save 或自动默认动作冒充",
  ], { status: "compiler-passed" }),
});

export default ensnaringStrike;
