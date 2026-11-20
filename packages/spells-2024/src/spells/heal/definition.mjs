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
} from "@arcanedesk/spell-compiler/dsl";

// L2 重写批（M1.0 审计 C 桶 recipe-invalid，c-dm）：2024 学派改为防护，终结目盲/耳聋/
// 中毒（2014 是疾病），且不再排除构装与亡灵；70 点基础治疗与每环 +10 不变。
// 5R 锚点：玩家手册2024/法术详述/6环.htm#Heal。
const L6_RUNTIME_QA_RECEIPT =
  "docs/foundry-automation/notes/spell-level-6-runtime-qa-2026-09-02.md";

const heal = cleanRoomSpell({
  id: "heal",
  contract: spellContract({
    ruleset: "2024",
    level: 6,
    school: "abj",
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
      "visible-to-source 目前只进入 interaction projection，不由通用 runtime 独立校验视线；DM 负责只声明施法者可见的目标",
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
              id: "cast:remove-blinded-deafened-poisoned",
              target: "target:cast",
              statuses: ["blinded", "deafened", "poisoned"],
            }),
          ],
        }),
      ],
    }),
  ],
  accepted: acceptance(L6_RUNTIME_QA_RECEIPT, [
    "Cast 是 selected-targets public Activity；选择 60 ft 内一个可见 creature，并只消耗一个六环或更高法术位",
    "六环恢复 70 HP，每高于六环一环再恢复 10 HP；治疗不超过目标 hit point maximum，非目标 HP 保持不变",
    "同一次真实 workflow 精确移除目标现存的 structured blinded、deafened 与 poisoned status；无关 status、无关 mechanical changes 与非目标保持不变",
    "2024 不再排除构装与亡灵，也不再有疾病移除条款（改为中毒状态移除）",
    "该瞬时法术不建立专注、持续 Effect、Template 或其他残留 Artifact",
  ], { status: "compiler-passed" }),
});

export default heal;
