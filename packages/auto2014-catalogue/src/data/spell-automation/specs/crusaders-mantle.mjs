import {
  COMPILER_MIGRATION_LOG,
  acceptance,
  cleanRoomEffect,
  cleanRoomFollowingAura,
  cleanRoomSpell,
  concentration,
  consume,
  dice,
  duration,
  graphFragment,
  operation,
  publicAction,
  rule,
  self,
  spellContract,
  trigger,
  weaponHitDamageRider,
  whileSpellActive,
} from "../dsl.mjs";

const crusadersMantle = cleanRoomSpell({
  id: "crusaders-mantle",
  contract: spellContract({
    ruleset: "2014",
    level: 3,
    school: "evo",
    components: {
      verbal: true,
      somatic: false,
      material: false,
    },
    lifetime: concentration(duration(1, "minutes")),
  }),
  emission: { contentVersion: 2 },
  support: {
    level: "simplified",
    omissions: [
      "规则中的 nonhostile creature 按桌面默认策略简化为与来源同阵营的 token；其他阵营 token 不自动获得附伤",
    ],
  },
  fragments: [
    graphFragment({
      id: "crusaders-mantle-graph",
      actions: [
        publicAction("cast", "十字军披风 Crusader's Mantle"),
      ],
      artifacts: [
        cleanRoomEffect("mantle-benefit", {
          host: "actor",
          scope: "source",
          reapply: "replace",
          name: "Crusader's Mantle",
          modifiers: [
            weaponHitDamageRider(dice(1, 4), "radiant"),
          ],
          lifecycle: whileSpellActive(),
        }),
        cleanRoomFollowingAura("mantle-aura", {
          sourceArtifactId: "mantle-benefit",
          radius: 30,
          recipientPolicy: "same-disposition",
          includeSelf: true,
          color: "#f59e0b",
          opacity: 0.2,
        }),
      ],
      rules: [
        rule({
          id: "cast-crusaders-mantle",
          on: trigger("action-used", { actionId: "cast" }),
          targets: [self("target:cast")],
          do: [
            consume(),
            operation("apply-artifact", {
              id: "cast:apply-mantle",
              artifactId: "mantle-benefit",
              target: "source",
            }),
          ],
        }),
      ],
    }),
  ],
  accepted: acceptance(
    COMPILER_MIGRATION_LOG,
    [
      "self cast 只消耗一个三环或更高法术位，并建立最长一分钟的专注",
      "30-ft 光环跟随施法者，包含施法者自身，并只把 benefit 动态传播给与来源同阵营的 token",
      "同阵营成员进入范围时获得 benefit，离开范围时移除；敌对和其他阵营 token 不获得 benefit",
      "任一光环成员真实武器命中时，把基础 1d4 radiant 注入同一个父伤害 roll；未命中和法术攻击不触发",
      "暴击骰由父伤害 workflow 与 Midi 统一处理，benefit 不自行预先翻倍",
      "多个来源的同名光环彼此隔离；某一来源专注结束或持续时间到期时只清理自己的传播副本与范围提示",
    ],
    { status: "compiler-runtime-passed" },
  ),
});

export default crusadersMantle;
