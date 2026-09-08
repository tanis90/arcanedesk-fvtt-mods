import {
  COMPILER_MIGRATION_LOG,
  acceptance,
  cleanRoomEffect,
  cleanRoomFollowingAura,
  cleanRoomSpell,
  concentration,
  constant,
  consume,
  contentRef,
  duration,
  grantSkillCheckBonus,
  graphFragment,
  operation,
  publicAction,
  rule,
  self,
  spellContract,
  trigger,
  whileSpellActive,
} from "@arcanedesk/spell-compiler/dsl";

const passWithoutTrace = cleanRoomSpell({
  id: "pass-without-trace",
  contract: spellContract({
    ruleset: "2014",
    level: 2,
    school: "abj",
    components: {
      verbal: true,
      somatic: true,
      material: true,
    },
    lifetime: concentration(duration(1, "hours")),
  }),
  content: contentRef("pass-without-trace"),
  emission: { contentVersion: 7 },
  support: {
    level: "simplified",
    omissions: [
      "规则中的逐个选择简化为自动纳入施法者及同阵营 token；neutral 与敌对 token 不自动获得加值",
      "无法被非魔法手段追踪且不留下足迹的叙事效果保留为规则文本，由 DM 裁定",
    ],
  },
  fragments: [
    graphFragment({
      id: "pass-without-trace-graph",
      actions: [
        publicAction("cast", "行动无踪 Pass without Trace"),
      ],
      artifacts: [
        cleanRoomEffect("pass-without-trace-benefit", {
          host: "actor",
          scope: "source",
          reapply: "replace",
          name: "Pass without Trace",
          modifiers: [
            grantSkillCheckBonus("ste", constant(10)),
          ],
          lifecycle: whileSpellActive(),
        }),
        cleanRoomFollowingAura("pass-without-trace-aura", {
          sourceArtifactId: "pass-without-trace-benefit",
          radius: 30,
          recipientPolicy: "same-disposition",
          includeSelf: true,
          color: "#334155",
          opacity: 0.18,
        }),
      ],
      rules: [
        rule({
          id: "cast-pass-without-trace",
          on: trigger("action-used", { actionId: "cast" }),
          targets: [self("target:cast")],
          do: [
            consume(),
            operation("apply-artifact", {
              id: "cast:apply-pass-without-trace",
              artifactId: "pass-without-trace-benefit",
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
      "self cast 只消耗一个二环或更高环位的法术位，并建立最长一小时的专注",
      "30-ft 圆形光环跟随施法者，动态纳入施法者自身及同阵营 token；neutral、敌对与超距 token 不受影响",
      "每个光环成员获得 +10 Dexterity (Stealth) checks，离开范围时自动移除，重新进入时只恢复一个来源绑定效果",
      "不同施法来源相互隔离；结束或替换一名施法者的专注只清理该来源的光环与成员副本",
      "无法被非魔法手段追踪且不留下足迹仍由 DM 按规则文本裁定",
    ],
    { status: "compiler-runtime-passed" },
  ),
});

export default passWithoutTrace;
