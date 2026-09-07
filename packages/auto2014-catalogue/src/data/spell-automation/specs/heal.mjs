import {
  acceptance,
  cleanRoomSpell,
  constant,
  consume,
  graphFragment,
  instant,
  operation,
  perSlotAboveBase,
  predicate,
  publicAction,
  rule,
  selected,
  spellContract,
  spellLifetime,
  trigger,
} from "../dsl.mjs";

const L6_RUNTIME_QA_RECEIPT =
  "docs/foundry-automation/notes/spell-level-6-runtime-qa-2026-09-02.md";

const heal = cleanRoomSpell({
  id: "heal",
  contract: spellContract({
    ruleset: "2014",
    level: 6,
    school: "evo",
    components: {
      verbal: true,
      somatic: true,
      material: false,
    },
    lifetime: spellLifetime(instant()),
  }),
  emission: { contentVersion: 1 },
  support: {
    level: "simplified",
    omissions: [
      "DM 在调用 Cast 前确认目标不是 undead 或 construct；不满足时不要调用 Action，首波不实现对无效 creature type 施法并浪费法术位的语义",
      "成功施法后由 DM 移除目标的全部 disease；自动化只精确移除结构化 blinded 与 deafened status",
    ],
  },
  fragments: [
    graphFragment({
      id: "heal-graph",
      actions: [
        publicAction("cast", "医疗术 Heal"),
      ],
      rules: [
        rule({
          id: "cast-heal",
          on: trigger("action-used", { actionId: "cast" }),
          targets: [
            selected("target:cast", {
              min: 1,
              max: 1,
              range: 60,
              kind: "creature",
              predicates: [predicate("visible-to-source")],
            }),
          ],
          do: [
            consume(),
            operation("healing", {
              id: "cast:healing",
              target: "target:cast",
              formula: perSlotAboveBase(
                constant(70),
                constant(10),
              ),
              healingTypes: ["healing"],
            }),
            operation("remove-statuses", {
              id: "cast:remove-blinded-deafened",
              target: "target:cast",
              statuses: ["blinded", "deafened"],
            }),
          ],
        }),
      ],
    }),
  ],
  accepted: acceptance(L6_RUNTIME_QA_RECEIPT, [
    "Cast 是 selected-targets public Activity；选择 60 ft 内一个由 DM 确认为可见、非 undead 且非 construct 的 creature，并只消耗一个六环或更高法术位",
    "六环恢复 70 HP，每高于六环一环再恢复 10 HP；治疗不超过目标 hit point maximum，非目标 HP 保持不变",
    "同一次真实 workflow 精确移除目标现存的 structured blinded 与 deafened status；无关 status、无关 mechanical changes 与非目标保持不变",
    "undead/construct 资格是执行前 DM precondition；disease 是成功施法后的 DM cleanup，不冒充 runtime 已自动处理",
    "该瞬时法术不建立专注、持续 Effect、Template 或其他残留 Artifact",
  ], { status: "compiler-runtime-passed" }),
});

export default heal;
