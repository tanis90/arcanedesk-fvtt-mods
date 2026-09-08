import {
  acceptance,
  add,
  cleanRoomSpell,
  constant,
  consume,
  dice,
  graphFragment,
  instant,
  levelsAboveBase,
  operation,
  publicAction,
  rule,
  selected,
  spellContract,
  spellLifetime,
  trigger,
} from "@arcanedesk/spell-compiler/dsl";

const L6_RUNTIME_QA_RECEIPT =
  "docs/foundry-automation/notes/spell-level-6-runtime-qa-2026-09-02.md";

const chainLightning = cleanRoomSpell({
  id: "chain-lightning",
  contract: spellContract({
    ruleset: "2014",
    level: 6,
    school: "evo",
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
      "DM 在 Cast 前声明一个施法者 150 ft 内的可见 creature 为 primary，并确认每个 secondary 均位于 primary 30 ft 内；runtime 不自动搜索、排序或校验 primary-centered geometry",
      "2014 规则允许物件成为目标；当前 selected-targets 与 Dexterity save 自动化只结算 creature tokens，物件目标由 DM 手工处理",
    ],
  },
  fragments: [
    graphFragment({
      id: "chain-lightning-graph",
      actions: [
        publicAction("cast", "连锁闪电 Chain Lightning"),
      ],
      rules: [
        rule({
          id: "cast-chain-lightning",
          on: trigger("action-used", { actionId: "cast" }),
          targets: [
            selected("target:cast", {
              min: 1,
              max: add(constant(4), levelsAboveBase()),
              range: null,
              units: "spec",
              kind: "creature",
            }),
          ],
          do: [
            consume(),
            operation("saving-throw", {
              id: "initial-save",
              ability: ["dex"],
              target: "target:cast",
              onSave: "half",
            }),
            operation("damage", {
              id: "initial-damage",
              target: "target:cast",
              formula: dice(10, 8),
              damageTypes: ["lightning"],
              onSave: "half",
            }),
          ],
        }),
      ],
    }),
  ],
  accepted: acceptance(L6_RUNTIME_QA_RECEIPT, [
    "Cast 是 selected-targets public Activity；六环最多声明四个 creature，每高一环再增加一个目标；DM 另行确认 primary 对施法者可见且在 150 ft 内",
    "同一个 creature 只能进入一次目标集合；重复 target identity 不得造成第二次 save、damage 或资源消耗",
    "所有合法选中目标分别进行 Dexterity save；失败承受 10d8 lightning damage，成功承受一半，非目标保持不变",
    "升环只增加一个可选 secondary，不增加伤害骰；一次施法只消耗一个明确声明的六环或更高法术位",
    "primary 声明及 primary 到 secondary 的 30 ft 几何是执行前 DM precondition；runtime 不自动搜索、弹 chooser 或静默增删目标",
    "该瞬时法术不建立专注、Effect、Template 或其他持久 Artifact",
  ], { status: "compiler-runtime-passed" }),
});

export default chainLightning;
