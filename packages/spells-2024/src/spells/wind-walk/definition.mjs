import {
  QA_LOG,
  acceptance,
  cleanRoomEffect,
  cleanRoomSpell,
  constant,
  consume,
  duration,
  excludeSource,
  grantConditionImmunity,
  grantHover,
  grantResistance,
  graphFragment,
  operation,
  predicate,
  publicAction,
  rule,
  selected,
  setMovement,
  spellContract,
  spellLifetime,
  trigger,
  whileSpellActive,
} from "@arcanedesk/spell-compiler/dsl";

// 2024 重写批（M1.0 审计 A 桶 desc-diff-flag）：抗性改为全部钝击/穿刺/挥砍，
// 新增悬浮与免疫倒地；还原期间由失能改为震慑。
// 5R 锚点：5R 玩家手册2024 6环.htm#Wind_Walk。
const cloudFormModifiers = () => [
  setMovement("fly", constant(300)),
  grantResistance("bludgeoning"),
  grantResistance("piercing"),
  grantResistance("slashing"),
  grantHover(),
  grantConditionImmunity("prone"),
];

const windWalk = cleanRoomSpell({
  id: "wind-walk",
  contract: spellContract({
    ruleset: "2024",
    level: 6,
    school: "trs",
    components: {
      verbal: true,
      somatic: true,
      material: true,
    },
    lifetime: spellLifetime(duration(8, "hours")),
  }),
  emission: { contentVersion: 2 },
  support: {
    level: "simplified",
    omissions: [
      "willing 与可见资格由 DM 在调用 Cast 前确认；willing/visible-to-source predicate 只记录声明，不替 DM 推断",
      "cloud form 期间除 Dash 或开始还原外不能执行其他动作，以及还原/恢复 cloud form 各耗时 1 分钟、过渡期间处于震慑状态，均由 DM 执行",
      "法术结束时仍在空中的目标每轮安全下降 60 ft、最多持续 1 分钟；尚未落地后的坠落与伤害由 DM 处理",
      "每个 source/target 效果由 Foundry 独立计时 8 小时；若 DM 因叙事裁决提前结束整次施法，先删除施法者的 source 效果，再删除该次施法涉及的 companion 效果",
    ],
  },
  fragments: [
    graphFragment({
      id: "wind-walk-graph",
      actions: [
        publicAction("cast", "御风而行 Wind Walk", {
          activationType: "minute",
        }),
      ],
      artifacts: [
        cleanRoomEffect("wind-walk-source-cloud-form", {
          host: "actor",
          scope: "source",
          reapply: "replace",
          name: "Wind Walk: Cloud Form",
          modifiers: cloudFormModifiers(),
          lifecycle: whileSpellActive(),
        }),
        cleanRoomEffect("wind-walk-target-cloud-form", {
          host: "actor",
          scope: "source-target",
          reapply: "replace",
          name: "Wind Walk: Cloud Form",
          modifiers: cloudFormModifiers(),
          lifecycle: whileSpellActive(),
        }),
      ],
      rules: [
        rule({
          id: "cast-wind-walk",
          on: trigger("action-used", { actionId: "cast" }),
          targets: [
            selected("target:companions", {
              min: 0,
              max: 10,
              range: 30,
              units: "ft",
              kind: "creature",
              predicates: [
                excludeSource(),
                predicate("visible-to-source"),
                predicate("willing"),
              ],
            }),
          ],
          do: [
            consume(),
            operation("apply-artifact", {
              id: "cast:apply-source-cloud-form",
              artifactId: "wind-walk-source-cloud-form",
              target: "source",
            }),
            operation("apply-artifact", {
              id: "cast:apply-target-cloud-form",
              artifactId: "wind-walk-target-cloud-form",
              target: "target:companions",
            }),
          ],
        }),
      ],
    }),
  ],
  accepted: acceptance(QA_LOG, [
    "Cast 是 1 分钟 selected-targets public Activity；施法者自动获得 Cloud Form，另可选择 0 至 10 名 30 ft 内由 DM 声明确认可见且 willing 的 creature，只消耗一个六环或更高法术位",
    "施法者与每个所选目标分别获得持续最长 8 小时、非专注且来源绑定的 Wind Walk: Cloud Form 效果",
    "2024 的 Cloud Form 提供 300 ft 飞行速度与悬浮、免疫倒地，并对全部钝击/穿刺/挥砍伤害具有抗性（不再限于非魔法武器）",
    "除 Dash 或开始还原外不能行动、各 1 分钟的变形过程与过渡期间震慑，以及法术结束后的安全下降与坠落保持明确 DM omission",
    "施法者不能作为 companion 再次进入所选目标集合；第 11 个额外目标、超出 30 ft 或未被声明为可见且 willing 的目标必须在 world write 前拒绝；0 个额外目标仍对施法者生效",
    "同一来源重施只 replace 施法者自身以及本次再次选中的 source-target 效果；未再次选中的既有目标保留其独立 8 小时效果",
  ], { status: "compiler-passed" }),
});

export default windWalk;
