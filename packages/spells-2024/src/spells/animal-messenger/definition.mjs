import {
  QA_LOG,
  acceptance,
  cleanRoomEffect,
  cleanRoomSpell,
  consume,
  duration,
  eventTarget,
  graphFragment,
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

// L3 新写批（无 2014 recipe）：5R 玩家手册2024/法术详述/2环.htm#Animal_Messenger。
// 自动化等级：Cha 豁免 + 失败标记自动化；消息内容、目的地判定与旅途由 DM 叙事执行，升环持续时间不自动延长。
const animalMessenger = cleanRoomSpell({
  id: "animal-messenger",
  contract: spellContract({
    ruleset: "2024",
    level: 2,
    school: "enc",
    components: {
      verbal: true,
      somatic: true,
      material: true,
    },
    ritual: true,
    lifetime: spellLifetime(duration(24, "hours")),
  }),
  emission: { contentVersion: 1 },
  support: {
    level: "simplified",
    omissions: [
      "挑战等级不为 0 的野兽豁免自动成功；runtime 无 CR 谓词，需 DM 直接跳过豁免或按成功处理",
      "微型体型未由谓词校验；beast 类型与可见性已用 predicate 表达，DM 仍需在声明目标时确认目标符合 5R 描述",
      "不超过 25 词的消息内容、曾造访过的目的地、收信人描述、飞行/步行里程与抵达判定均由 DM 叙事处理",
      "升环时每比二环高一环持续时间增加 48 小时：lifetime 只接受固定时长，需 DM 手动延长",
      "仪式施法不消耗法术位；Cast action 不区分仪式版本，以法术位施展时正常扣槽，仪式版本由 DM 手动免扣",
    ],
  },
  fragments: [
    graphFragment({
      id: "animal-messenger-graph",
      actions: [publicAction("cast", "动物信使 Animal Messenger")],
      artifacts: [
        cleanRoomEffect("animal-messenger", {
          host: "actor",
          scope: "source-target",
          reapply: "replace",
          name: "Animal Messenger",
          markerOnly: true,
          lifecycle: whileSpellActive(),
        }),
      ],
      rules: [
        rule({
          id: "cast-animal-messenger",
          on: trigger("action-used", { actionId: "cast" }),
          targets: [
            selected("target:cast", {
              min: 1,
              max: 1,
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
              ability: ["cha"],
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
              id: "cast:apply-marker",
              artifactId: "animal-messenger",
              target: "target:failed",
            }),
          ],
        }),
      ],
    }),
  ],
  accepted: acceptance(QA_LOG, [
    "施法只接受 30 ft 内一只由 DM 确认为可见 beast 的声明目标，并只消耗一个二环或更高法术位",
    "目标以魅力豁免对抗施法者法术豁免 DC；豁免失败获得本来源的 Animal Messenger 标记，成功则不产生任何效果",
    "标记最长持续 24 小时，不建立专注；同一来源对同一目标重施时 replace，不叠加",
    "消息文本、目的地、收信人、旅途与抵达后的传话均由 DM 按 5R 原文处理，自动化不判定送信成功",
    "挑战等级非 0 的野兽自动豁免成功与升环 +48 小时持续时间保持明确 omission",
  ], { status: "compiler-passed" }),
});

export default animalMessenger;
