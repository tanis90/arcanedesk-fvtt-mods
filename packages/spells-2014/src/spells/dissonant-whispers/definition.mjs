import {
  COMPILER_MIGRATION_LOG,
  acceptance,
  cleanRoomSpell,
  consume,
  contentRef,
  dice,
  graphFragment,
  instant,
  operation,
  perSlotAboveBase,
  publicAction,
  rule,
  selected,
  spellContract,
  spellLifetime,
  trigger,
} from "@arcanedesk/spell-compiler/dsl";

const dissonantWhispers = cleanRoomSpell({
  id: "dissonant-whispers",
  contract: spellContract({
    ruleset: "2014",
    level: 1,
    school: "enc",
    components: {
      verbal: true,
      somatic: false,
      material: false,
    },
    lifetime: spellLifetime(instant()),
  }),
  content: contentRef("dissonant-whispers"),
  emission: { contentVersion: 6 },
  support: {
    level: "simplified",
    omissions: ["豁免失败后的反应移动由 DM 执行"],
  },
  fragments: [
    graphFragment({
      id: "dissonant-whispers-graph",
      actions: [publicAction("cast", "不谐低语 Dissonant Whispers")],
      rules: [
        rule({
          id: "cast-dissonant-whispers",
          on: trigger("action-used", { actionId: "cast" }),
          targets: [selected("target:cast", { max: 1, range: 60 })],
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
  accepted: acceptance(
    COMPILER_MIGRATION_LOG,
    [
      "action 选择一个 60 ft 内声明目标进行 Wisdom save，并只消耗一个法术位",
      "失败目标承受完整 3d6 psychic damage，成功目标承受一半",
      "每升一环增加 1d6 psychic damage",
      "不创建悬空效果，豁免失败后的反应移动保留给 DM",
    ],
    { status: "compiler-runtime-passed" },
  ),
});

export default dissonantWhispers;
