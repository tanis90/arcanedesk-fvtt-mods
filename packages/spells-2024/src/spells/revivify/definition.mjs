import {
  QA_LOG,
  acceptance,
  cleanRoomSpell,
  constant,
  consume,
  graphFragment,
  instant,
  operation,
  publicAction,
  rule,
  selected,
  spellContract,
  spellLifetime,
  trigger,
} from "@arcanedesk/spell-compiler/dsl";

// L3 新写批（无 2014 recipe）：5R 玩家手册2024/法术详述/3环.htm#Revivify。
// 自动化等级：触碰 + 恢复 1 HP + 移除 dead/unconscious；死亡时间与死因资格由 DM 确认。
const revivify = cleanRoomSpell({
  id: "revivify",
  contract: spellContract({
    ruleset: "2024",
    level: 3,
    school: "nec",
    components: {
      verbal: true,
      somatic: true,
      material: true,
    },
    material: {
      cost: 300,
      consumed: true,
    },
    lifetime: spellLifetime(instant()),
  }),
  emission: { contentVersion: 1 },
  support: {
    level: "simplified",
    omissions: [
      "无法查询目标的死亡时间与死因：「死亡不超过一分钟」与「非老死」由 DM 在声明目标时确认",
      "「不能恢复失去的身体部位」是叙事限制，系统不建模身体部位，由 DM 处理",
      "复活以「治疗 1 HP + 移除 dead/unconscious 状态」表达；死亡记录与其他死亡相关标记由 DM 复核",
      "300 GP 钻石耗材只写入 contract material，不自动扣库存",
    ],
  },
  fragments: [
    graphFragment({
      id: "revivify-graph",
      actions: [publicAction("cast", "回生术 Revivify")],
      rules: [
        rule({
          id: "cast-revivify",
          on: trigger("action-used", { actionId: "cast" }),
          targets: [
            selected("target:cast", {
              min: 1,
              max: 1,
              range: null,
              units: "touch",
              kind: "creature",
            }),
          ],
          do: [
            consume(),
            operation("healing", {
              id: "cast:healing",
              target: "target:cast",
              formula: constant(1),
              healingTypes: ["healing"],
            }),
            operation("remove-statuses", {
              id: "cast:remove-dead",
              target: "target:cast",
              statuses: ["dead", "unconscious"],
            }),
          ],
        }),
      ],
    }),
  ],
  accepted: acceptance(QA_LOG, [
    "action 触碰一名声明生物并只消耗一个三环或更高法术位",
    "目标恢复 1 HP，并移除其 dead 与 unconscious 状态，从而以 1 点生命值回生",
    "治疗不超过目标的 hit point maximum；非目标 HP 与状态保持不变",
    "死亡时间在 1 分钟内、非老死、身体部位完整由 DM 在声明目标时确认",
    "该瞬时法术不建立专注、持续 Effect 或模板",
    "300 GP 钻石耗材只写入 contract material，不自动扣库存",
  ], { status: "compiler-passed" }),
});

export default revivify;
