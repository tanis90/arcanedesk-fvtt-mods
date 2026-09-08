import {
  QA_LOG,
  acceptance,
  cleanRoomEffect,
  cleanRoomSpell,
  consume,
  contentRef,
  dropToOneHitPointOnDamage,
  duration,
  graphFragment,
  operation,
  publicAction,
  rule,
  selected,
  spellContract,
  spellLifetime,
  trigger,
  whileSpellActive,
} from "@arcanedesk/spell-compiler/dsl";

const deathWard = cleanRoomSpell({
  id: "death-ward",
  contract: spellContract({
    ruleset: "2014",
    level: 4,
    school: "abj",
    components: {
      verbal: true,
      somatic: true,
      material: false,
    },
    lifetime: spellLifetime(duration(8, "hours")),
  }),
  content: contentRef("death-ward"),
  emission: { contentVersion: 1 },
  support: {
    level: "simplified",
    omissions: [
      "没有造成伤害、但直接使目标死亡的情况由 DM 否决，并由 DM 手动删除本次施法产生的精确 Death Ward 效果",
      "Midi 伤害卡仍显示保护介入前的 HP 摘要，且卡片上的单目标 Reverse/Reapply 不会恢复已消耗的 Death Ward 或 Relentless Endurance；以 Actor 的 1 HP 与 Arcane 触发消息为准，必须等 Arcane 触发消息出现后再使用完整 Workflow Undo，或由 DM 手动恢复精确效果/次数",
    ],
  },
  fragments: [
    graphFragment({
      id: "death-ward-graph",
      actions: [publicAction("cast", "防死结界 Death Ward")],
      artifacts: [
        cleanRoomEffect("death-ward", {
          host: "actor",
          scope: "source-target",
          reapply: "replace",
          name: "Death Ward",
          modifiers: [dropToOneHitPointOnDamage()],
          lifecycle: whileSpellActive(),
        }),
      ],
      rules: [
        rule({
          id: "cast-death-ward",
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
            operation("apply-artifact", {
              id: "cast:apply-death-ward",
              artifactId: "death-ward",
              target: "target:cast",
            }),
          ],
        }),
      ],
    }),
  ],
  accepted: acceptance(QA_LOG, [
    "action 接触一个 creature，只消耗一个四环或更高法术位；法术不要求目标 willing，也不建立专注",
    "目标获得具有独立 source-target identity 的 Death Ward 效果；同一来源对同一目标重施只替换自己的效果，其他来源实例保持不变",
    "效果固定持续八小时；到期、解除或手动删除只移除精确来源效果，不治疗目标，也不视为已触发保护",
    "只有真实伤害事务在目标当前 HP 大于 0 且最终会降至 0 时，才把该次 HP 结果固定为 1，并且只消费一个精确 Death Ward 效果一次；禁止事后治疗到 1 HP",
    "触发后的权威收据是 Actor 保持 1 HP、精确来源被消费、pending receipt 清空并产生 Arcane 触发消息；不得把 Midi 伤害卡的介入前 HP 摘要误作最终 Actor 状态",
    "来源消费失败时 Actor 仍保持 1 HP、pending receipt 保留并向 GM 显示持久错误；ready、canvasReady 或 primary-GM 交接会重试精确来源结算，禁止免费再次触发同一来源",
    "原生抗性、免疫、减伤和临时 HP 先于保护结算并保持原生结果；非致死伤害、被临时 HP 完全吸收的伤害，以及目标已经处于 0 HP 时均不触发",
    "Death Ward 与 Relentless Endurance 同时可用时只消费 Death Ward；Relentless Endurance 不能阻止巨量伤害造成的直接死亡；Strength of the Grave 不进入该自动仲裁流程",
    "没有造成伤害、但直接使目标死亡的情况保持明确 DM omission：DM 否决死亡并手动删除本次施法产生的精确 Death Ward 效果",
  ], { status: "compiler-runtime-passed" }),
});

export default deathWard;
