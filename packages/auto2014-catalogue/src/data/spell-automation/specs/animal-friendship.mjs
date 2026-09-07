import {
  compilerAcceptance,
  add,
  cleanRoomEffect,
  cleanRoomSpell,
  constant,
  consume,
  duration,
  eventTarget,
  grantStatus,
  graphFragment,
  levelsAboveBase,
  operation,
  predicate,
  publicAction,
  rule,
  selected,
  spellContract,
  spellLifetime,
  trigger,
  whileSpellActive,
} from "../dsl.mjs";

const EXPANSION_BATCH =
  "docs/foundry-automation/notes/零至三环新法术扩展批次.md";

const animalFriendship = cleanRoomSpell({
  id: "animal-friendship",
  contract: spellContract({
    ruleset: "2014",
    level: 1,
    school: "enc",
    components: {
      verbal: true,
      somatic: true,
      material: true,
    },
    lifetime: spellLifetime(duration(24, "hours")),
  }),
  emission: { contentVersion: 1 },
  support: {
    level: "simplified",
    omissions: [
      "目标必须是施法者可见、能看见并听见施法者且 Intelligence 低于 4 的 beast；当前 creature-type/visible predicates 仅表达契约，CLI 尚不可靠取得全部资格字段，因此由 DM 在声明目标时确认",
      "目标被施法者或其同伴伤害时提前结束魅惑，需要可靠的伤害来源阵营关系；当前由 DM 清理对应效果",
      "charmed 后的开放式社交与行为结果由 DM 裁定",
    ],
  },
  fragments: [
    graphFragment({
      id: "animal-friendship-graph",
      actions: [publicAction("cast", "化兽为友 Animal Friendship")],
      artifacts: [
        cleanRoomEffect("animal-friendship", {
          host: "actor",
          scope: "source-target",
          reapply: "replace",
          name: "Animal Friendship",
          modifiers: [grantStatus("charmed")],
          lifecycle: whileSpellActive(),
        }),
      ],
      rules: [
        rule({
          id: "cast-animal-friendship",
          on: trigger("action-used", { actionId: "cast" }),
          targets: [
            selected("target:cast", {
              min: 1,
              max: add(constant(1), levelsAboveBase()),
              range: 30,
              kind: "creature",
              predicates: [
                predicate("creature-type", { value: "beast" }),
                predicate("visible-to-source"),
              ],
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
              id: "apply-animal-friendship",
              artifactId: "animal-friendship",
              target: "target:failed",
            }),
          ],
        }),
      ],
    }),
  ],
  accepted: compilerAcceptance(EXPANSION_BATCH, [
    "一环对一个由 DM 确认为合格 beast 的 30 ft 内声明目标进行 Wisdom save，每升一环可多声明一个目标",
    "升环声明多个目标时，每个目标只需各自在施法者 30 ft 内；本法术不附加目标彼此距离限制",
    "只有首次豁免失败的目标获得来源绑定的 charmed 效果；成功目标和未声明目标不改变",
    "一次合法施法只消耗一个所声明环位的法术位，多个目标不会重复扣槽",
    "效果最长持续 24 小时，固定持续时间结束或显式清理时只移除本次来源的 Animal Friendship 效果",
    "自动化不擅自决定目标资格、受伤提前结束或魅惑后的行为",
  ]),
});

export default animalFriendship;
