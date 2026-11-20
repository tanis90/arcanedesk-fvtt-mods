import {
  acceptance,
  add,
  cleanRoomEffect,
  cleanRoomSpell,
  concentration,
  constant,
  consume,
  duration,
  endSourceWhenLastDependentEnds,
  firstOf,
  grantStatus,
  graphFragment,
  levelsAboveBase,
  operation,
  publicAction,
  rule,
  selected,
  spellContract,
  trigger,
  untilTrigger,
  whileSpellActive,
} from "@arcanedesk/spell-compiler/dsl";

// L2 重写批（M1.0 审计 A/B 桶 desc-diff-flag）：2024 起「造成伤害」也会提前终止隐形
// （2014 只有攻击检定或施法）；触碰、专注一小时与升环加目标不变。
// 5R 锚点：玩家手册2024/法术详述/2环.htm#Invisibility。
const EXPANSION_BATCH =
  "docs/foundry-automation/notes/零至三环新法术扩展批次.md";

const invisibility = cleanRoomSpell({
  id: "invisibility",
  contract: spellContract({
    ruleset: "2024",
    level: 2,
    school: "ill",
    components: {
      verbal: true,
      somatic: true,
      material: true,
    },
    lifetime: concentration(duration(1, "hours")),
  }),
  emission: { contentVersion: 1 },
  support: {
    level: "simplified",
    omissions: [
      "2024 新增的「造成伤害即终止隐形」没有可用的 damage-dealt 事件（runtime 只暴露 damage-taken）；目标造成伤害后由 DM 删除该目标的本来源效果",
    ],
  },
  fragments: [
    graphFragment({
      id: "invisibility-graph",
      actions: [publicAction("cast", "隐形术 Invisibility")],
      artifacts: [
        cleanRoomEffect("invisible-target", {
          host: "actor",
          scope: "source-target",
          reapply: "replace",
          name: "Invisibility",
          modifiers: [grantStatus("invisible")],
          sourceTermination: endSourceWhenLastDependentEnds(),
          lifecycle: firstOf(
            whileSpellActive(),
            untilTrigger(
              trigger("attack-roll-made", { subject: "effect-target" }),
            ),
            untilTrigger(
              trigger("spell-cast", { subject: "effect-target" }),
            ),
          ),
        }),
      ],
      rules: [
        rule({
          id: "cast-invisibility",
          on: trigger("action-used", { actionId: "cast" }),
          targets: [
            selected("target:cast", {
              min: 1,
              max: add(constant(1), levelsAboveBase()),
              range: null,
              units: "touch",
              kind: "creature",
            }),
          ],
          do: [
            consume(),
            operation("apply-artifact", {
              id: "cast:apply-invisibility",
              artifactId: "invisible-target",
              target: "target:cast",
            }),
          ],
        }),
      ],
    }),
  ],
  accepted: acceptance(EXPANSION_BATCH, [
    "二环施法接触一个声明生物，每高于二环一环可多声明一个生物；目标数超限时在 workflow、扣槽与效果创建前拒绝",
    "一次合法施法只消耗一个所声明环位的法术位，并为每个目标建立独立 source-target identity 的 invisible 效果与最长一小时的共享专注",
    "目标与其当时穿戴或携带的物件按 invisible condition 处理；非目标保持不变",
    "某一个隐形目标进行攻击检定时，只清理该目标的效果，不清理同一次升环施法的其他目标",
    "某一个隐形目标施放任意法术时，只清理该目标的效果；非 spell action、移动、受伤和其他目标的行为均不会误清理；最后一个目标效果消失时共享来源专注同步结束",
    "2024 的「造成伤害」终止条件保持明确 DM omission，不冒充已自动追踪",
    "解除、替换或到期结束来源专注时一次清理本次施法仍存续的全部目标效果；已提前结束的目标效果不会被重建",
  ], { status: "compiler-passed" }),
});

export default invisibility;
