import {
  QA_LOG,
  acceptance,
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
} from "@arcanedesk/spell-compiler/dsl";

// L2 重写批（2024，M1 审计 A 桶 desc-diff-flag）：删去「智力 4 以上自动豁免成功」与
// 「目标须能看见并听见你」前提；仍是一只可见 beast、感知豁免、24 小时魅惑。
// 来源：5R 玩家手册2024 1环.htm#Animal_Friendship。
const animalFriendship = cleanRoomSpell({
  id: "animal-friendship",
  contract: spellContract({
    ruleset: "2024",
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
      "目标必须是施法者可见的 beast；creature-type 与可见性谓词只表达契约，由 DM 在声明目标时确认资格",
      "目标被施法者或其盟友伤害时提前结束魅惑，需要可靠的伤害来源阵营关系；当前由 DM 清理对应效果",
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
  accepted: acceptance(QA_LOG, [
    "一环对一个由 DM 确认为可见 beast 的 30 ft 内声明目标进行 Wisdom save，每升一环可多声明一个目标",
    "升环声明多个目标时，每个目标只需各自在施法者 30 ft 内；本法术不附加目标彼此距离限制",
    "只有首次豁免失败的目标获得来源绑定的 charmed 效果；成功目标和未声明目标不改变",
    "一次合法施法只消耗一个所声明环位的法术位，多个目标不会重复扣槽",
    "效果最长持续 24 小时，固定持续时间结束或显式清理时只移除本次来源的 Animal Friendship 效果",
    "2024 不再有「Int 4+ 自动成功」与「能看见并听见施法者」前提，因此不对这两项设置豁免或资格过滤",
    "自动化不擅自决定目标资格、盟友伤害提前结束或魅惑后的行为",
  ], { status: "compiler-passed" }),
});

export default animalFriendship;
