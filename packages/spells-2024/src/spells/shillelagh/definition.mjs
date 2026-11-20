import {
  QA_LOG,
  acceptance,
  cleanRoomEffect,
  cleanRoomSpell,
  duration,
  graphFragment,
  operation,
  ownedItem,
  publicAction,
  rule,
  self,
  spellContract,
  spellLifetime,
  trigger,
  whileSpellActive,
} from "@arcanedesk/spell-compiler/dsl";

// 2024 重写批（M1.0 审计 C 桶 recipe-invalid）：2024 不再把武器视为魔法武器，
// 新增 5/11/17 级伤害骰 d10/d12/2d6 与改为力场伤害的选项。
// 5R 锚点：5R 玩家手册2024 0环.htm#Shillelagh。
const shillelagh = cleanRoomSpell({
  id: "shillelagh",
  contract: spellContract({
    ruleset: "2024",
    level: 0,
    school: "trs",
    components: {
      verbal: true,
      somatic: true,
      material: true,
    },
    material: {
      cost: 0,
      consumed: false,
    },
    lifetime: spellLifetime(duration(1, "minutes")),
  }),
  emission: { contentVersion: 2 },
  support: {
    level: "simplified",
    omissions: [
      "2024 的核心效果（伤害骰变 d8、攻击与伤害改用施法属性、可选力场伤害、5/11/17 级 d10/d12/2d6）未自动化：武器附魔原语强制附带 grant-magical-weapon，而 2024 已删除该条款，无法在不改变规则的前提下附着；由 DM 手动应用",
      "自动选择施法者首件已装备的 club 或 quarterstaff，不在多件合法武器之间询问施法者；不支持触碰其他生物持有的武器",
      "丢掉武器应立即结束法术仍由 DM 处理；重施与到期会清理来源 marker",
    ],
  },
  fragments: [
    graphFragment({
      id: "shillelagh-graph",
      actions: [
        publicAction("cast", "橡棍术 Shillelagh", {
          activationType: "bonus",
        }),
      ],
      artifacts: [
        cleanRoomEffect("shillelagh-source", {
          host: "actor",
          scope: "source",
          reapply: "replace",
          name: "Shillelagh",
          markerOnly: true,
          lifecycle: whileSpellActive(),
        }),
      ],
      rules: [
        rule({
          id: "cast-shillelagh",
          on: trigger("action-used", { actionId: "cast" }),
          targets: [
            self("target:cast"),
            ownedItem("target:weapon", {
              itemType: "weapon",
              equipped: true,
              baseItems: ["club", "quarterstaff"],
              selection: "first-stable",
            }),
          ],
          do: [
            operation("apply-artifact", {
              id: "cast:apply-source",
              artifactId: "shillelagh-source",
              target: "source",
            }),
          ],
        }),
      ],
    }),
  ],
  accepted: acceptance(QA_LOG, [
    "bonus action self cast 不消耗法术位，按 sort、name、id 稳定选择首件已装备的 club 或 quarterstaff；没有合法武器时在任何世界状态变化前拒绝",
    "被选武器只作为施法前置：没有已装备的 club/quarterstaff 时在任何世界状态变化前拒绝",
    "2024 的 d8 伤害骰、施法属性替代、力场伤害选项与 5/11/17 级强化未自动化，保持明确 omission",
    "2024 起武器不再因此被视为魔法武器，本定义也不附着任何武器附魔",
    "同一来源重施 replace source marker；一分钟到期或重施时清理 marker",
  ], { status: "compiler-passed" }),
});

export default shillelagh;
