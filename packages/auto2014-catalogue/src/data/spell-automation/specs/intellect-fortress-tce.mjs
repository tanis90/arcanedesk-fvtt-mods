import {
  COMPILER_MIGRATION_LOG,
  acceptance,
  add,
  cleanRoomEffect,
  cleanRoomSpell,
  concentration,
  constant,
  consume,
  contentRef,
  duration,
  grantAbilitySavingThrowAdvantage,
  grantResistance,
  graphFragment,
  levelsAboveBase,
  operation,
  publicAction,
  rule,
  selected,
  spellContract,
  trigger,
  whileSpellActive,
} from "../dsl.mjs";

const intellectFortress = cleanRoomSpell({
  id: "intellect-fortress-tce",
  contract: spellContract({
    ruleset: "2014",
    level: 3,
    school: "abj",
    components: {
      verbal: true,
      somatic: false,
      material: false,
    },
    lifetime: concentration(duration(1, "hours")),
  }),
  content: contentRef("intellect-fortress-tce"),
  emission: { contentVersion: 2 },
  support: {
    level: "simplified",
    omissions: [
      "目标是否自愿、目标可见性及升环时所有目标彼此相距不超过 30 ft 的声明合法性由 DM 判断",
    ],
  },
  fragments: [
    graphFragment({
      id: "intellect-fortress-graph",
      actions: [publicAction("cast", "智能壁垒 Intellect Fortress")],
      artifacts: [
        cleanRoomEffect("intellect-fortress", {
          host: "actor",
          scope: "source-target",
          reapply: "replace",
          name: "Intellect Fortress",
          modifiers: [
            grantResistance("psychic"),
            grantAbilitySavingThrowAdvantage(["int", "wis", "cha"]),
          ],
          lifecycle: whileSpellActive(),
        }),
      ],
      rules: [
        rule({
          id: "cast-intellect-fortress",
          on: trigger("action-used", { actionId: "cast" }),
          targets: [
            selected("target:cast", {
              min: 1,
              max: add(constant(1), levelsAboveBase()),
              range: 30,
              units: "ft",
              kind: "creature",
            }),
          ],
          do: [
            consume(),
            operation("apply-artifact", {
              id: "cast:apply-intellect-fortress",
              artifactId: "intellect-fortress",
              target: "target:cast",
            }),
          ],
        }),
      ],
    }),
  ],
  accepted: acceptance(
    COMPILER_MIGRATION_LOG,
    [
      "三环施法对 30 ft 内一个声明目标生效，每升一环可多声明一个目标",
      "每个目标获得 psychic damage resistance",
      "每个目标的 Intelligence、Wisdom 与 Charisma saving throws 获得优势",
      "只消耗一个所声明环位的法术位并建立最长一小时的专注",
      "专注结束时清理全部目标效果",
    ],
    { status: "compiler-runtime-passed" },
  ),
});

export default intellectFortress;
