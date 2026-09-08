import {
  acceptance,
  add,
  cleanRoomSpell,
  constant,
  consume,
  dice,
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

const L6_RUNTIME_QA_RECEIPT =
  "docs/foundry-automation/notes/spell-level-6-runtime-qa-2026-09-02.md";

const disintegrate = cleanRoomSpell({
  id: "disintegrate",
  contract: spellContract({
    ruleset: "2014",
    level: 6,
    school: "trs",
    components: {
      verbal: true,
      somatic: true,
      material: true,
    },
    lifetime: spellLifetime(instant()),
  }),
  emission: { contentVersion: 1 },
  support: {
    level: "simplified",
    omissions: [
      "creature 被该伤害降至 0 HP 后化为灰烬、携带物与魔法物品例外及复活限制由 DM 在伤害结算后处理；runtime 保留 Token，不自动隐藏或删除场景证据",
      "物件目标的直接解离，以及 Huge 或更大物件只解离一个 10-ft cube 的结果由 DM 结算；公开 Action 只接受一个 creature Token",
      "Wall of Force 与其他魔法造物作为目标时的特殊交互由 DM 处理，自动化不把普通 creature 伤害 workflow 冒充为物件或魔法造物解析",
    ],
  },
  fragments: [
    graphFragment({
      id: "disintegrate-graph",
      actions: [
        publicAction("cast", "解离术 Disintegrate"),
      ],
      rules: [
        rule({
          id: "cast-disintegrate",
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
            operation("saving-throw", {
              id: "initial-save",
              ability: ["dex"],
              target: "target:cast",
              onSave: "none",
            }),
            operation("damage", {
              id: "initial-damage",
              target: "target:cast",
              formula: perSlotAboveBase(
                add(dice(10, 6), constant(40)),
                dice(3, 6),
              ),
              damageTypes: ["force"],
              onSave: "none",
            }),
          ],
        }),
      ],
    }),
  ],
  accepted: acceptance(L6_RUNTIME_QA_RECEIPT, [
    "Cast 是 selected-targets public Activity，只接受施法者 60 ft 内一个可见 creature，并只消耗一个明确声明的六环或更高法术位",
    "目标进行 Dexterity save；失败承受 10d6 + 40 force damage，成功不受伤害，非目标保持不变",
    "每高于六环一环增加 3d6 force damage；同一 workflow receipt 不得重复结算伤害",
    "该瞬时法术不建立 Effect、Artifact 或持续状态；即使伤害把目标降至 0 HP，Token 仍保留在场景中",
    "灰烬、装备、复活限制、物件、Wall of Force 与其他魔法造物交互保持明确 DM omission，不被 creature workflow 冒充为已实现",
  ], { status: "compiler-runtime-passed" }),
});

export default disintegrate;
