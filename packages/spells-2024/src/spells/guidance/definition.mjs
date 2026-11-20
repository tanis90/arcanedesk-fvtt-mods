import {
  QA_LOG,
  acceptance,
  cleanRoomEffect,
  cleanRoomSpell,
  concentration,
  dice,
  duration,
  graphFragment,
  grantSkillCheckBonus,
  operation,
  publicAction,
  rule,
  selected,
  spellContract,
  trigger,
  whileSpellActive,
} from "@arcanedesk/spell-compiler/dsl";

// L2 重写批（M1.0 审计 A/B 桶 desc-diff-flag）：2024 在施法时选定技能，持续期间每次
// 使用该技能的属性检定都 +1d4；2014 只加一次检定。戏法、专注一分钟、触碰自愿目标不变。
// 5R 锚点：玩家手册2024/法术详述/0环.htm#Guidance。
const skills = [
  { id: "acr", label: "特技 Acrobatics" },
  { id: "ani", label: "驯兽 Animal Handling" },
  { id: "arc", label: "奥秘 Arcana" },
  { id: "ath", label: "运动 Athletics" },
  { id: "dec", label: "欺瞒 Deception" },
  { id: "his", label: "历史 History" },
  { id: "ins", label: "洞悉 Insight" },
  { id: "itm", label: "威吓 Intimidation" },
  { id: "inv", label: "调查 Investigation" },
  { id: "med", label: "医药 Medicine" },
  { id: "nat", label: "自然 Nature" },
  { id: "prc", label: "察觉 Perception" },
  { id: "prf", label: "表演 Performance" },
  { id: "per", label: "游说 Persuasion" },
  { id: "rel", label: "宗教 Religion" },
  { id: "slt", label: "巧手 Sleight of Hand" },
  { id: "ste", label: "隐匿 Stealth" },
  { id: "sur", label: "求生 Survival" },
];

const guidance = cleanRoomSpell({
  id: "guidance",
  contract: spellContract({
    ruleset: "2024",
    level: 0,
    school: "div",
    components: {
      verbal: true,
      somatic: true,
      material: false,
    },
    lifetime: concentration(duration(1, "minutes")),
    primaryActionId: "cast-acr",
  }),
  emission: { contentVersion: 1 },
  support: {
    level: "simplified",
    omissions: [
      "目标是否自愿由 DM 判断；selected-targets 不校验意愿",
      "施法时选定的技能以下列 18 个命名 Cast Action 表达；DSL 的 enum 参数不能给每条规则绑定不同 artifact，因此拆成逐技能 action",
    ],
  },
  fragments: [
    graphFragment({
      id: "guidance-graph",
      actions: skills.map(skill =>
        publicAction(`cast-${skill.id}`, `神导术：${skill.label} Guidance: ${skill.label}`)),
      artifacts: skills.map(skill =>
        cleanRoomEffect(`guidance-${skill.id}`, {
          host: "actor",
          scope: "source-target",
          reapply: "replace",
          name: `Guidance: ${skill.label}`,
          modifiers: [grantSkillCheckBonus(skill.id, dice(1, 4))],
          lifecycle: whileSpellActive(),
        })),
      rules: skills.map(skill =>
        rule({
          id: `cast-guidance-${skill.id}`,
          on: trigger("action-used", { actionId: `cast-${skill.id}` }),
          targets: [
            selected(`target:cast-${skill.id}`, {
              min: 1,
              max: 1,
              range: null,
              units: "touch",
              kind: "creature",
            }),
          ],
          do: [
            operation("apply-artifact", {
              id: `cast:apply-${skill.id}`,
              artifactId: `guidance-${skill.id}`,
              target: `target:cast-${skill.id}`,
            }),
          ],
        })),
    }),
  ],
  accepted: acceptance(QA_LOG, [
    "18 个命名 Cast Action 分别对应一项技能，每个 action 对触碰范围内一个声明目标建立最长一分钟的专注",
    "受术者在使用所选技能的任何属性检定上获得 +1d4，持续期间每次相关检定都生效（2024 口径）",
    "其他技能、攻击检定与豁免不获得该加值",
    "对同一目标换技能重施时，重施会替换专注并清理旧来源的 Guidance effect，不会叠加两个技能加值",
    "解除专注、替换专注或一分钟到期时清理本次来源的 Guidance effect",
    "戏法不消耗法术位",
  ], { status: "compiler-passed" }),
});

export default guidance;
