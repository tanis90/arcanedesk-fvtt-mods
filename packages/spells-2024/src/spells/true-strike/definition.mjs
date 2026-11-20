import {
  QA_LOG,
  acceptance,
  cleanRoomSpell,
  graphFragment,
  instant,
  operation,
  ownedItem,
  publicAction,
  rule,
  selected,
  spellContract,
  spellLifetime,
  trigger,
} from "@arcanedesk/spell-compiler/dsl";

// 2024 重写批（M1.0 审计 C 桶 recipe-invalid）：不再是 30 ft 内下一次攻击优势，
// 改为立即以施法属性发动一次武器攻击并附加光耀伤害（5/11/17 级 +1d6/2d6/3d6）。
// 5R 锚点：5R 玩家手册2024 0环.htm#True_Strike。
const trueStrike = cleanRoomSpell({
  id: "true-strike",
  contract: spellContract({
    ruleset: "2024",
    level: 0,
    school: "div",
    components: {
      verbal: false,
      somatic: true,
      material: true,
    },
    material: {
      cost: 0,
      consumed: false,
    },
    lifetime: spellLifetime(instant()),
    primaryActionId: "strike",
  }),
  emission: { contentVersion: 2 },
  support: {
    level: "simplified",
    omissions: [
      "5R 要求该次武器攻击改用施法属性进行攻击与伤害掷骰；武器属性替换只存在于必须附带 grant-magical-weapon 的附魔原语中，而 2024 并未把武器变为魔法武器，故该条未自动化，攻击按武器原属性结算、由 DM 调整",
      "5R 的附加光耀伤害（5/11/17 级 1d6/2d6/3d6）未自动化：owned-weapon-attack adapter 的命中附加伤害把伤害类型硬编码为 thunder，声明的光耀 rider 会结算成错误类型，因此本定义不附带该伤害，由 DM 手动追加",
      "5R 允许把该次攻击的伤害类型改为光耀；没有替换武器伤害类型的原语",
      "owned-weapon-attack adapter 只支持已装备的近战武器；远程武器与未装备武器无法自动发起该次攻击，由 DM 手动结算",
      "武器必须为施法者熟练且价值 1+CP；系统不校验熟练与武器价值，由 DM 在声明时确认",
    ],
  },
  fragments: [
    graphFragment({
      id: "true-strike-graph",
      actions: [publicAction("strike", "克敌先击 True Strike")],
      rules: [
        rule({
          id: "cast-true-strike",
          on: trigger("action-used", { actionId: "strike" }),
          targets: [
            ownedItem("target:weapon", {
              itemType: "weapon",
              equipped: true,
              attackRange: "melee",
              selection: "first-stable",
            }),
            selected("target:cast", {
              min: 1,
              max: 1,
              range: null,
              kind: "creature",
            }),
          ],
          do: [
            operation("weapon-attack", {
              id: "cast:weapon-attack",
              weapon: "target:weapon",
              target: "target:cast",
            }),
          ],
        }),
      ],
    }),
  ],
  accepted: acceptance(QA_LOG, [
    "action 立即用施法者首件已装备的近战武器对所选目标发起一次武器攻击；戏法不消耗法术位",
    "2024 起不再给予 30 ft 内目标下一次攻击的优势，也不再是专注法术",
    "攻击改用施法属性、附加光耀伤害及可选的光耀伤害类型替换未自动化，保持明确 omission",
    "远程武器与没有可用近战攻击的武器在 world state 变化前拒绝",
  ], { status: "compiler-passed" }),
});

export default trueStrike;
