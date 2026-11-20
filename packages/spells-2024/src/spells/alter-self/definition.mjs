import {
  QA_LOG,
  acceptance,
  cleanRoomEffect,
  cleanRoomSpell,
  concentration,
  consume,
  duration,
  graphFragment,
  operation,
  publicAction,
  rule,
  self,
  spellContract,
  trigger,
  whileSpellActive,
} from "@arcanedesk/spell-compiler/dsl";

// L3 新写批（无 2014 recipe）：5R 玩家手册2024/法术详述/2环.htm#Alter_Self。
// 自动化等级：marker-only——三种形态与切换均未自动化，只保留来源标记；细节由 DM 手动应用。
const alterSelf = cleanRoomSpell({
  id: "alter-self",
  contract: spellContract({
    ruleset: "2024",
    level: 2,
    school: "trs",
    components: {
      verbal: true,
      somatic: true,
      material: false,
    },
    lifetime: concentration(duration(1, "hours")),
  }),
  emission: { contentVersion: 1 },
  support: {
    level: "simplified",
    omissions: [
      "水生适应的游泳速度等于自身步行速度；movement 修饰只收常量值，无法引用自身步行速度，需 DM 手动设置",
      "天生武器的徒手打击改为 1d6（挥砍/穿刺/钝击）并使用施法属性调整值：DSL 没有针对徒手打击的 weapon 目标，ownedItem 只作用于装备物品，无法安全表达",
      "改变外貌的身高、体重、声线、肤色与类人特征等纯外观变化由 DM 与玩家描述，不改变任何数据",
      "持续期间以魔法动作切换选项由 DM 手动处理；切换时对应的移动/武器修饰需一并手动调整",
    ],
  },
  fragments: [
    graphFragment({
      id: "alter-self-graph",
      actions: [publicAction("cast", "变身术 Alter Self")],
      artifacts: [
        cleanRoomEffect("alter-self", {
          host: "actor",
          scope: "source",
          reapply: "replace",
          name: "Alter Self",
          markerOnly: true,
          lifecycle: whileSpellActive(),
        }),
      ],
      rules: [
        rule({
          id: "cast-alter-self",
          on: trigger("action-used", { actionId: "cast" }),
          targets: [self("target:cast")],
          do: [
            consume(),
            operation("apply-artifact", {
              id: "cast:apply-marker",
              artifactId: "alter-self",
              target: "source",
            }),
          ],
        }),
      ],
    }),
  ],
  accepted: acceptance(QA_LOG, [
    "self cast 只消耗一个二环或更高法术位，并建立最长一小时的专注",
    "施法后获得本来源的 Alter Self 标记；标记不修改移动速度、不修改徒手打击、不施加状态",
    "水生适应、改变外貌与天生武器三种选项及持续期间的魔法动作切换，均由 DM 按 5R 原文手动应用",
    "同一来源重施时 replace 旧标记；专注中断或到期时移除标记，不清理 DM 手动设置的其他修饰",
    "游泳速度引用步行速度与徒手打击改写保持明确 omission",
  ], { status: "compiler-passed" }),
});

export default alterSelf;
