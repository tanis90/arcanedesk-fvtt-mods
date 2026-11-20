import {
  QA_LOG,
  acceptance,
  cleanRoomEffect,
  cleanRoomSpell,
  concentration,
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

// L4 移植批（非 SRD，spells24 无源文档）：G 桶 + 2014 recipe blade-ward。
// 5R 锚点 0环.htm#Blade_Ward。与 2014 差异：机制整体替换——2014 的武器伤害抗性改为"专注 1 分钟内对你的每次攻击检定 -1d4"。
// 自动化等级：marker-only——专注与来源标记自动化；攻击检定 -1d4 由 DM 手工扣减。
const bladeWard = cleanRoomSpell({
  id: "blade-ward",
  contract: spellContract({
    ruleset: "2024",
    level: 0,
    school: "abj",
    components: {
      verbal: true,
      somatic: true,
      material: false,
    },
    lifetime: concentration(duration(1, "minutes")),
  }),
  emission: { contentVersion: 1 },
  support: {
    level: "marker-only",
    omissions: [
      "5R 要求每个对你发动攻击检定的生物在该次检定上承受 1d4 减值；DSL 只有 grant-incoming-attack-disadvantage（劣势），没有「来袭攻击检定减 1d4」的骰值修饰，故不自动施加修正，由 DM 在攻击检定上手工减 1d4",
      "戏法为自身距离、不选择目标：公开 Cast 只产生聊天卡与自身标记，不改变任何 Actor 的数值或状态",
      "标记只表达专注存续；对攻击检定的实际扣减、以及多个来源叠加时的处理均保持 manual",
    ],
  },
  fragments: [
    graphFragment({
      id: "blade-ward-graph",
      actions: [publicAction("cast", "剑刃防护 Blade Ward")],
      artifacts: [
        cleanRoomEffect("blade-ward", {
          host: "actor",
          scope: "source",
          reapply: "replace",
          name: "Blade Ward",
          markerOnly: true,
          modifiers: [],
          lifecycle: whileSpellActive(),
        }),
      ],
      rules: [
        rule({
          id: "cast-blade-ward",
          on: trigger("action-used", { actionId: "cast" }),
          targets: [self("target:cast")],
          do: [
            operation("apply-artifact", {
              id: "cast:apply-blade-ward",
              artifactId: "blade-ward",
              target: "source",
            }),
          ],
        }),
      ],
    }),
  ],
  accepted: acceptance(QA_LOG, [
    "action 施放戏法，不消耗法术位，并在施法者身上建立最长 1 分钟的专注与 Blade Ward 来源标记",
    "施法不选择目标、不进行豁免、不改变任何 Actor 的数值或状态",
    "对你的每次攻击检定减 1d4 由 DM 手工执行；系统不自动修改攻击检定骰，也不冒充劣势",
    "专注结束、被替换或 1 分钟到期时清理本次来源的标记",
    "2014 版的武器伤害抗性在 5R 中已删除，本定义不再授予任何伤害抗性",
  ], { status: "compiler-passed" }),
});

export default bladeWard;
