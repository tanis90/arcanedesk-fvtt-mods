import {
  COMPILER_MIGRATION_LOG,
  acceptance,
  cleanRoomSpell,
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

// L2 重写批（M1.0 审计 C 桶 recipe-invalid，c-dm）：2024 施法时间改为附赠动作，
// 「疾病」一项被移除；可选状态只剩目盲/耳聋/麻痹/中毒，触碰与即时不变。
// 5R 锚点：玩家手册2024/法术详述/2环.htm#Lesser_Restoration。
const removableStatuses = ["blinded", "deafened", "paralyzed", "poisoned"];
const lesserRestoration = cleanRoomSpell({
  id: "lesser-restoration",
  contract: spellContract({
    ruleset: "2024",
    level: 2,
    school: "abj",
    components: {
      verbal: true,
      somatic: true,
      material: false,
    },
    lifetime: spellLifetime(instant()),
  }),
  emission: { contentVersion: 1 },
  support: {
    level: "simplified",
    omissions: [
      "2024 规则只结束一种状态；为减少 agent 选择，本实现一次清除四类当前状态（与 2014 实现同一简化）",
      "疾病不再是可移除项，本实现不提供疾病清理",
    ],
  },
  fragments: [
    graphFragment({
      id: "lesser-restoration-graph",
      actions: [
        publicAction("cast", "次等复原术 Lesser Restoration", {
          activationType: "bonus",
        }),
      ],
      rules: [
        rule({
          id: "cast-restoration",
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
            operation("remove-statuses", {
              id: "cast:remove-statuses",
              target: "target:cast",
              statuses: removableStatuses,
            }),
          ],
        }),
      ],
    }),
  ],
  accepted: acceptance(
    COMPILER_MIGRATION_LOG,
    [
      "bonus action 选择一个 touch 范围内的 creature，并只消耗一个二环或更高环位",
      "一次清除目标现存的 blinded、deafened、paralyzed 与 poisoned",
      "删除 canonical paralyzed 时，其 derived incapacitated 一并清理",
      "混合 Active Effect 中的无关 status 与 mechanical changes 保留",
      "不删除其他状态或 Active Effect",
      "目标没有可移除状态时安静完成",
      "2024 已移除疾病项；单一状态选择按 support omissions 交给 DM",
    ],
    { status: "compiler-passed" },
  ),
});

export default lesserRestoration;
