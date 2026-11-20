import {
  COMPILER_MIGRATION_LOG,
  acceptance,
  cleanRoomSpell,
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

// L2 重写批（2024，M1 审计 A 桶 desc-diff-flag）：删去「耳聋目标自动豁免成功」与
// 「目标须能听见你」前提；3d6 心灵伤害、半伤、升环 +1d6 与反应逃离不变。
// 来源：5R 玩家手册2024 1环.htm#Dissonant_Whispers。
const dissonantWhispers = cleanRoomSpell({
  id: "dissonant-whispers",
  contract: spellContract({
    ruleset: "2024",
    level: 1,
    school: "enc",
    components: {
      verbal: true,
      somatic: false,
      material: false,
    },
    lifetime: spellLifetime(instant()),
  }),
  emission: { contentVersion: 1 },
  support: {
    level: "simplified",
    omissions: [
      "豁免失败后的反应移动由 DM 执行",
      "目标须能听见你、以及 2014 的「耳聋目标自动豁免成功」在 2024 均已删除，因此不设置听觉资格或耳聋自动成功分支",
      "目标可见性由 DM 在声明目标时确认",
    ],
  },
  fragments: [
    graphFragment({
      id: "dissonant-whispers-graph",
      actions: [publicAction("cast", "不谐低语 Dissonant Whispers")],
      rules: [
        rule({
          id: "cast-dissonant-whispers",
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
              ability: ["wis"],
              target: "target:cast",
              onSave: "half",
            }),
            operation("damage", {
              id: "psychic-damage",
              target: "target:cast",
              formula: perSlotAboveBase(
                dice(3, 6),
                dice(1, 6),
              ),
              damageTypes: ["psychic"],
              onSave: "half",
            }),
          ],
        }),
      ],
    }),
  ],
  accepted: acceptance(COMPILER_MIGRATION_LOG, [
    "action 选择一个 60 ft 内由 DM 确认可见的 creature 进行 Wisdom save，并只消耗一个法术位",
    "失败目标承受完整 3d6 psychic damage，成功目标承受一半",
    "每升一环增加 1d6 psychic damage",
    "不创建悬空效果，豁免失败后的反应移动保留给 DM",
    "2024 不再要求目标能听见施法者，也不再有耳聋目标自动豁免成功",
  ], { status: "compiler-passed" }),
});

export default dissonantWhispers;
