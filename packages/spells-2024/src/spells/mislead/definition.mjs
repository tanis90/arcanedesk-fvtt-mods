import {
  QA_LOG,
  acceptance,
  cleanRoomEffect,
  cleanRoomSpell,
  concentration,
  consume,
  duration,
  firstOf,
  grantStatus,
  graphFragment,
  operation,
  publicAction,
  rule,
  self,
  spellContract,
  trigger,
  untilTrigger,
  whileSpellActive,
} from "@arcanedesk/spell-compiler/dsl";

// L3 新写批（无 2014 recipe）：5R 玩家手册2024/法术详述/5环.htm#Mislead。
// 自动化等级：invisible 状态 + 分身来源标记自动化；分身演绎与「造成伤害即结束隐形」由 DM 执行。
const mislead = cleanRoomSpell({
  id: "mislead",
  contract: spellContract({
    ruleset: "2024",
    level: 5,
    school: "ill",
    components: {
      verbal: false,
      somatic: true,
      material: false,
    },
    lifetime: concentration(duration(1, "hours")),
  }),
  emission: { contentVersion: 1 },
  support: {
    level: "simplified",
    omissions: [
      "幻象分身只是施法者身上的来源 marker；系统不创建第二个 Token、不跟随移动，也不处理分身的打手势、说话与指定行为，由 DM 手动放置并演绎",
      "「造成伤害即结束隐形」没有可用的 damage-dealt 事件（runtime 只暴露 damage-taken），目标造成伤害后由 DM 手动删除 invisible effect",
      "用分身的眼睛和耳朵观察属于叙事视角切换，系统不切换 Token 视野或生成感官信息",
      "以一个魔法动作令分身移动（至多两倍速度）不自动执行，由 DM 在场景中移动分身 Token",
    ],
  },
  fragments: [
    graphFragment({
      id: "mislead-graph",
      actions: [publicAction("cast", "假象术 Mislead")],
      artifacts: [
        cleanRoomEffect("mislead-invisible", {
          host: "actor",
          scope: "source",
          reapply: "replace",
          name: "Mislead: Invisible",
          modifiers: [grantStatus("invisible")],
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
        cleanRoomEffect("mislead-double", {
          host: "actor",
          scope: "source",
          reapply: "replace",
          name: "Mislead: Illusory Double",
          markerOnly: true,
          modifiers: [],
          lifecycle: whileSpellActive(),
        }),
      ],
      rules: [
        rule({
          id: "cast-mislead",
          on: trigger("action-used", { actionId: "cast" }),
          targets: [self("target:cast")],
          do: [
            consume(),
            operation("apply-artifact", {
              id: "cast:apply-invisible",
              artifactId: "mislead-invisible",
              target: "source",
            }),
            operation("apply-artifact", {
              id: "cast:apply-double",
              artifactId: "mislead-double",
              target: "source",
            }),
          ],
        }),
      ],
    }),
  ],
  accepted: acceptance(QA_LOG, [
    "以 action 施法只消耗一个五环或更高法术位，建立最长一小时的专注；施法者获得 invisible 状态与一个 Mislead 分身来源标记",
    "施法者发动攻击检定时只清理 invisible effect，幻象分身继续存在至专注结束",
    "施法者施展任意法术时同样只清理 invisible effect，分身不随之消失",
    "「造成伤害即结束隐形」保持明确 DM omission，不冒充已自动追踪",
    "分身的移动、说话、指定行为与通过其感官观察由 DM 演出；系统不创建分身 Token，也不切换视野",
    "解除专注、替换专注或一小时到期时清理两个本次来源的效果",
  ], { status: "compiler-passed" }),
});

export default mislead;
