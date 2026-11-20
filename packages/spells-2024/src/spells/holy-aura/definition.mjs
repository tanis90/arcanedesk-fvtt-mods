import {
  QA_LOG,
  acceptance,
  cleanRoomEffect,
  cleanRoomFollowingAura,
  cleanRoomSpell,
  concentration,
  consume,
  duration,
  grantAbilitySavingThrowAdvantage,
  grantIncomingAttackDisadvantage,
  graphFragment,
  operation,
  publicAction,
  rule,
  self,
  spellContract,
  trigger,
  whileSpellActive,
} from "@arcanedesk/spell-compiler/dsl";

// L3 新写批（无 2014 recipe）：5R 玩家手册2024/法术详述/8环.htm#Holy_Aura。
// 自动化等级：自身 30 ft 光环 + 成员全豁免优势/受击劣势；邪魔亡灵命中后的反击由 DM 结算。
const allCreatureTypes = [
  "aberration",
  "beast",
  "celestial",
  "construct",
  "dragon",
  "elemental",
  "fey",
  "fiend",
  "giant",
  "humanoid",
  "monstrosity",
  "ooze",
  "plant",
  "undead",
];

const holyAura = cleanRoomSpell({
  id: "holy-aura",
  contract: spellContract({
    ruleset: "2024",
    level: 8,
    school: "abj",
    components: {
      verbal: true,
      somatic: true,
      material: true,
    },
    material: {
      cost: 1000,
      consumed: false,
    },
    lifetime: concentration(duration(1, "minutes")),
  }),
  emission: { contentVersion: 1 },
  support: {
    level: "simplified",
    omissions: [
      "「你可以指定若干生物」简化为按阵营动态纳入：光环自动作用于施法者自身与同阵营 token；中立生物不获益、敌对生物不受益，具体指定名单由 DM 调整（与 pass-without-trace / spirit-guardians 同口径）",
      "邪魔或亡灵以近战攻击命中受术者时，攻击者必须进行体质豁免、失败目盲至其下一回合结束：攻击事件不暴露攻击者 token 绑定，无法接线，由 DM 结算",
      "非标准生物类型（actor.raceOrType 不在 14 种标准类型内）的攻击不会被识别为劣势，由 DM 处理",
      "离开 30 ft 光环时成员收益按光环成员资格动态移除；但「法术持续期间」与「在光环内时」的边界由 DM 用光环模板确认",
      "1000 GP 圣物箱不消耗；material 只写入 contract，不自动扣库存",
    ],
  },
  fragments: [
    graphFragment({
      id: "holy-aura-graph",
      actions: [publicAction("cast", "圣洁灵光 Holy Aura")],
      artifacts: [
        cleanRoomEffect("holy-aura", {
          host: "actor",
          scope: "source",
          reapply: "replace",
          name: "Holy Aura",
          modifiers: [
            grantAbilitySavingThrowAdvantage([
              "str",
              "dex",
              "con",
              "int",
              "wis",
              "cha",
            ]),
            grantIncomingAttackDisadvantage({
              attackerCreatureTypes: allCreatureTypes,
            }),
          ],
          lifecycle: whileSpellActive(),
        }),
        cleanRoomFollowingAura("holy-aura-visual", {
          sourceArtifactId: "holy-aura",
          radius: 30,
          recipientPolicy: "same-disposition",
          includeSelf: true,
          color: "#f5d76e",
          opacity: 0.15,
        }),
      ],
      rules: [
        rule({
          id: "cast-holy-aura",
          on: trigger("action-used", { actionId: "cast" }),
          targets: [self("target:cast")],
          do: [
            consume(),
            operation("apply-artifact", {
              id: "cast:apply-holy-aura",
              artifactId: "holy-aura",
              target: "source",
            }),
          ],
        }),
      ],
    }),
  ],
  accepted: acceptance(QA_LOG, [
    "self cast 只消耗一个八环法术位，并建立最长 1 分钟专注",
    "30-ft 圆形光环跟随施法者，动态纳入施法者自身与同阵营 token；中立、敌对与超距 token 不受影响",
    "每个光环成员在进行任意豁免检定时具有优势，且其他生物对其进行的攻击检定具有劣势",
    "离开光环时自动移除该成员的收益，重新进入时恢复一个来源绑定副本",
    "解除专注、替换或一分钟到期时清理本来源标记、光环与全部成员副本；不同施法来源相互隔离",
    "邪魔/亡灵近战命中后的体质豁免与目盲、指定生物名单与非标准生物类型保持明确 omission，由 DM 结算",
    "1000 GP 圣物箱不消耗，只写入 contract material",
  ], { status: "compiler-passed" }),
});

export default holyAura;
