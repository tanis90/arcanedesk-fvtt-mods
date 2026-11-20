import {
  QA_LOG,
  acceptance,
  cleanRoomEffect,
  cleanRoomSpell,
  consume,
  duration,
  graphFragment,
  operation,
  publicAction,
  rule,
  self,
  spellContract,
  spellLifetime,
  trigger,
  whileSpellActive,
} from "@arcanedesk/spell-compiler/dsl";

// L3 新写批（无 2014 recipe）：5R 玩家手册2024/法术详述/1环.htm#Speak_with_Animals。
// 自动化等级：utility marker-only——施法只产生聊天卡与 10 分钟来源标记，语言理解、对野兽使用影响动作与情报内容由 DM 执行。
const speakWithAnimals = cleanRoomSpell({
  id: "speak-with-animals",
  contract: spellContract({
    ruleset: "2024",
    level: 1,
    school: "div",
    components: {
      verbal: true,
      somatic: true,
      material: false,
    },
    ritual: true,
    lifetime: spellLifetime(duration(10, "minutes")),
  }),
  emission: { contentVersion: 1 },
  support: {
    level: "simplified",
    omissions: [
      "理解野兽语言并与其沟通、对野兽使用影响动作时适用任意技能选项，属于开放式社交裁定；自动化只提供聊天卡与来源标记",
      "野兽能提供何种地点/怪物情报（含过去一日内察觉的内容）由 DM 决定",
      "仪式施法不消耗法术位；Cast action 不区分仪式版本，以法术位施展时正常扣槽，仪式版本由 DM 手动免扣",
    ],
  },
  fragments: [
    graphFragment({
      id: "speak-with-animals-graph",
      actions: [publicAction("cast", "动物交谈 Speak with Animals")],
      artifacts: [
        cleanRoomEffect("speak-with-animals", {
          host: "actor",
          scope: "source",
          reapply: "replace",
          name: "Speak with Animals",
          markerOnly: true,
          lifecycle: whileSpellActive(),
        }),
      ],
      rules: [
        rule({
          id: "cast-speak-with-animals",
          on: trigger("action-used", { actionId: "cast" }),
          targets: [self("target:cast")],
          do: [
            consume(),
            operation("apply-artifact", {
              id: "cast:apply-marker",
              artifactId: "speak-with-animals",
              target: "source",
            }),
          ],
        }),
      ],
    }),
  ],
  accepted: acceptance(QA_LOG, [
    "施法产生聊天卡与一个持续 10 分钟的 Speak with Animals 来源标记，不建立专注",
    "标记只表示法术生效，不对任何生物施加状态、豁免、伤害或技能加值",
    "与野兽沟通、使用影响动作时的技能选项、野兽提供的情报内容均由 DM 按 5R 原文执行",
    "同一来源重施时 replace 旧标记，不叠加；持续时间结束或显式清理时移除标记",
    "以法术位施展时只消耗一个一环法术位；仪式版本由 DM 免扣，不自动区分",
  ], { status: "compiler-passed" }),
});

export default speakWithAnimals;
