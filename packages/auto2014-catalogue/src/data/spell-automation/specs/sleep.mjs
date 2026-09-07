import {
  COMPILER_MIGRATION_LOG,
  acceptance,
  cleanRoomEffect,
  cleanRoomSpell,
  consume,
  dice,
  duration,
  firstOf,
  grantStatus,
  graphFragment,
  operation,
  perSlotAboveBase,
  placedTemplate,
  publicAction,
  rule,
  spellContract,
  spellLifetime,
  trigger,
  untilTrigger,
  whileSpellActive,
} from "../dsl.mjs";

const sleep = cleanRoomSpell({
  id: "sleep",
  contract: spellContract({
    ruleset: "2014",
    level: 1,
    school: "enc",
    components: {
      verbal: true,
      somatic: true,
      material: true,
    },
    lifetime: spellLifetime(duration(1, "minutes")),
  }),
  emission: { contentVersion: 7 },
  support: {
    level: "simplified",
    omissions: [
      "其他生物使用动作摇醒目标由 DM 处理",
      "当前 HP 相同的目标按稳定 token id 排序，不再向施法者追问",
      "只自动识别可靠的睡眠免疫数据；无法由系统字段可靠判断的边缘免疫由 DM 处理",
    ],
  },
  fragments: [
    graphFragment({
      id: "sleep-graph",
      actions: [publicAction("cast", "睡眠术 Sleep")],
      artifacts: [
        cleanRoomEffect("sleeping", {
          host: "actor",
          scope: "source-target",
          reapply: "replace",
          name: "Sleep",
          modifiers: [
            grantStatus("unconscious"),
            grantStatus("incapacitated"),
          ],
          lifecycle: firstOf(
            whileSpellActive(),
            untilTrigger(trigger("damage-taken", {
              subject: "effect-target",
            })),
          ),
        }),
      ],
      rules: [
        rule({
          id: "cast-sleep",
          on: trigger("action-used", { actionId: "cast" }),
          targets: [
            placedTemplate("target:cast", {
              type: "sphere",
              size: 20,
              range: 90,
              evaluation: "snapshot",
            }),
          ],
          do: [
            consume(),
            operation("allocate-hit-point-pool", {
              id: "cast:allocate-sleep-pool",
              target: "target:cast",
              formula: perSlotAboveBase(
                dice(5, 8),
                dice(2, 8),
              ),
              artifactId: "sleeping",
              eligibility: {
                currentHitPoints: "positive",
                excludedStatuses: ["dead", "unconscious"],
                requiredSusceptibility: "magical-sleep",
              },
            }),
          ],
        }),
      ],
    }),
  ],
  accepted: acceptance(COMPILER_MIGRATION_LOG, [
    "DM 在 90 ft 内放置 20-ft-radius 瞬时区域，并且只消耗一个法术位",
    "一环以 5d8 建立生命值池，每升一环增加 2d8",
    "合格目标按当前 HP 从低到高、同 HP 按稳定 token id 分配，生命值池不足以覆盖整个目标时跳过该目标",
    "分配成功的目标获得 unconscious 与 incapacitated，明确免疫睡眠的目标不受影响",
    "结算后删除 measured template；目标受到伤害或一分钟到期时移除睡眠效果",
  ], { status: "compiler-runtime-passed" }),
});

export default sleep;
