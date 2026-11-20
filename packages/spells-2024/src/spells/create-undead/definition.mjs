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
} from "@arcanedesk/spell-compiler/dsl";

// 2024 审计 transplant-ok（三具尸体化食尸鬼/附赠命令/24 小时/升环一致），但 summon 池
// documentId 无法指向官方 mmGhoul000000000，故只保留施法/材料/24 小时控制标记，食尸鬼由 DM 手动放置。
// 5R 锚点：5R 玩家手册2024 6环.htm#Create_Undead。
const createUndead = cleanRoomSpell({
  id: "create-undead",
  contract: spellContract({
    ruleset: "2024",
    level: 6,
    school: "nec",
    components: {
      verbal: true,
      somatic: true,
      material: true,
    },
    material: {
      cost: 150,
      consumed: false,
    },
    lifetime: spellLifetime(),
  }),
  emission: { contentVersion: 1 },
  support: {
    level: "simplified",
    omissions: [
      "召唤物不由本定义创建：施法后由 DM 手动从 actors24/《怪物手册》放置至多三只 Ghoul（升环时按所选环位放置更多 Ghoul、Ghast、Wight 或 Mummy），系统不建 Token、不校验体型/类人尸体/夜间条件",
      "「你只能在夜晚施放」由 DM 确认；当前没有昼夜或世界时间校验",
      "材料为每具尸体一颗价值 150+ GP 且不被消耗的缟玛瑙；contract 只记录 150 GP / consumed=false，不按尸体数量检查库存或扣除物件",
      "24 小时控制窗口以来源标记记录；再次施法只替换并刷新该标记，系统不区分「创造新亡灵」与「延长至多三个已有亡灵的控制」，也不验证目标亡灵是否由本法术创造",
      "附赠动作 120 ft 内对一只或多只亡灵下达同一命令、无命令时的回避动作与移动，以及控制到期后的行为与 ownership，全部由 DM 裁决",
      "升环的 Ghoul/Ghast/Wight/Mummy 数量与形态选择不建模，由 DM 按 5R 与所选法术位放置",
      "施法距离 10 ft 以 self 记录：尸体/亡灵不是 token，本定义不建立目标选择；DM 手动确认 10 ft 内的尸体",
    ],
  },
  fragments: [
    graphFragment({
      id: "create-undead-graph",
      actions: [
        publicAction("cast", "唤起亡灵 Create Undead", {
          activationType: "minute",
        }),
      ],
      artifacts: [
        cleanRoomEffect("create-undead-control", {
          host: "actor",
          scope: "source",
          reapply: "replace",
          name: "Create Undead: Control (24h)",
          markerOnly: true,
          modifiers: [],
          lifecycle: duration(24, "hours"),
        }),
      ],
      rules: [
        rule({
          id: "cast-create-undead",
          on: trigger("action-used", { actionId: "cast" }),
          targets: [self("target:cast")],
          do: [
            consume(),
            operation("apply-artifact", {
              id: "cast:apply-control",
              artifactId: "create-undead-control",
              target: "source",
            }),
          ],
        }),
      ],
    }),
  ],
  accepted: acceptance(QA_LOG, [
    "cast 是一个一分钟 utility activity，只消耗一个六环或更高法术位，不选择 token 也不掷骰",
    "施法创建一个 24 小时的控制标记，重复施法以 replace 刷新同一来源的标记，不叠加多个窗口",
    "材料契约记录每具尸体 150 GP、consumed=false，并保留 V/S/M 成分；库存与尸体数量由 DM 确认",
    "Ghoul 等亡灵的创建、Token 放置、形态与数量（含八/九环的 Ghast/Wight/Mummy 选项）由 DM 手动完成",
    "夜间限制、120 ft 附赠动作命令、回避行为、控制到期后的处置与 ownership 保持明确 DM 边界",
    "本定义不创建、删除或移动任何召唤物 Token，也不伪造 24 小时控制关系的成员校验",
  ], { status: "compiler-passed" }),
});

export default createUndead;
