import {
  acceptance,
  cleanRoomEffect,
  cleanRoomSpell,
  consume,
  contentRef,
  dice,
  duration,
  eventTarget,
  graphFragment,
  operation,
  predicate,
  publicAction,
  requiresSourceArtifact,
  rule,
  self,
  spellContract,
  spellLifetime,
  trigger,
  whileSpellActive,
} from "../dsl.mjs";

const I2B_QA_LOG =
  "docs/foundry-automation/notes/spell-combat-test-cases-1-3.md";

// EX-8 冻结边界（2026-08-03）对 Blink 的拍板：
// 施法者每个自己回合的 turn-end 自动投一次 flat d20 check（无属性、非豁免），
// >= 11 判定离场；每次结果（离场/留场）写入聊天消息。token 的实际消失、
// 下一回合返回与 10 ft 内选位全部由 DM 手动执行，是显式 omission。
//
// turn-end check 脉冲由 `source-turn-check-v1` adapter 承载：rule 级
// trigger("turn-end", { subject: "source" }) + source artifact-exists 守卫 +
// 单个 check operation（flat dice + threshold + 双分支聊天文案），compiler 把
// 合同写到 blink-source effect 的 sourceTurnCheck flag，runtime 在 updateCombat
// 的回合结束检测点掷骰并按结果发聊天消息（含施法当回合的回合结束，符合 RAW
// "at the end of each of your turns for the duration"）。

const blink = cleanRoomSpell({
  id: "blink",
  contract: spellContract({
    ruleset: "2014",
    level: 3,
    school: "trs",
    components: {
      verbal: true,
      somatic: true,
      material: false,
    },
    // 2014 RAW：Blink 持续 1 分钟，不需要专注。
    lifetime: spellLifetime(duration(1, "minutes")),
  }),
  content: contentRef("blink"),
  emission: { contentVersion: 2 },
  support: {
    // 批次表分配 full，但编译器强制 full 必须空 omissions（DSL 参考 §14），
    // 而冻结边界带显式 omission，故按校验规则落为 simplified。
    level: "simplified",
    omissions: [
      "token 实际消失（进入以太位面）、下一回合开始（或法术结束时仍在以太位面）的返回、返回时在消失点 10 ft 内选择可见空位（无空位则最近空位、平手随机）全部由 DM 手动执行——EX-8 冻结边界（2026-08-03）的显式 omission",
      "以太位面期间的感知（来源位面呈灰色、视距 60 ft）与'只能影响/被同位面生物影响'的跨位面互动裁定由 DM 手动处理，不做 token 视觉或交互自动化",
      "施法者已在以太位面时施法失败并浪费法术位的 RAW 分支没有位面状态输入，由 DM 裁定",
    ],
  },
  fragments: [
    graphFragment({
      id: "blink-graph",
      actions: [
        publicAction("cast", "闪现术 Blink"),
        publicAction("dismiss", "解除闪现术 Dismiss Blink", {
          availableWhen: [requiresSourceArtifact("blink-source")],
        }),
      ],
      artifacts: [
        cleanRoomEffect("blink-source", {
          host: "actor",
          scope: "source",
          reapply: "replace",
          name: "Blink",
          markerOnly: true,
          lifecycle: whileSpellActive(),
        }),
      ],
      rules: [
        rule({
          id: "cast-blink",
          on: trigger("action-used", { actionId: "cast" }),
          targets: [self("target:cast")],
          do: [
            consume(),
            operation("apply-artifact", {
              id: "cast:apply-source",
              artifactId: "blink-source",
              target: "source",
            }),
          ],
        }),
        rule({
          id: "blink-turn-end-check",
          on: trigger("turn-end", { subject: "source" }),
          when: [
            predicate("artifact-exists", {
              artifactId: "blink-source",
              subject: "source",
            }),
          ],
          targets: [eventTarget("target:caster")],
          do: [
            operation("check", {
              id: "turn-end:vanish-check",
              target: "target:caster",
              formula: dice(1, 20),
              threshold: 11,
              onSuccess: {
                chat: "d20 >= 11：施法者离场进入以太位面（token 消失由 DM 处理）",
              },
              onFailure: {
                chat: "d20 < 11：施法者留在当前位面",
              },
            }),
          ],
        }),
        rule({
          id: "dismiss-blink",
          on: trigger("action-used", { actionId: "dismiss" }),
          targets: [self("target:dismiss")],
          do: [
            operation("delete-artifact", {
              id: "dismiss:remove-source",
              artifactId: "blink-source",
              target: "source",
            }),
          ],
        }),
      ],
    }),
  ],
  accepted: acceptance(I2B_QA_LOG, [
    "cast 是 action，只对施法者自身生效，消耗且仅消耗一个三环或更高法术位，并在施法者身上建立来源绑定的 Blink source marker",
    "Blink 不建立专注：source marker 最长持续 1 分钟，到期或被移除时精确清理，专注规则不适用于本法术",
    "法术持续期间施法者每个自己回合的 turn-end 自动投一次无属性、非豁免的 flat d20 check（含施法当回合），total >= 11 判定离场；该脉冲由 source-turn-check-v1 adapter 承载，不套用豁免语义",
    "每次 turn-end check 按结果各写一条聊天消息：>= 11 离场（token 消失由 DM 处理）或 < 11 留场",
    "token 实际消失、下一回合开始或法术结束时的返回、消失点 10 ft 内选位是 EX-8 冻结边界的显式 omission，由 DM 手动执行，spec 不以任何 token 移动、隐藏或模板自动化冒充",
    "以太位面感知与跨位面互动裁定、以及已在以太位面时施法失败的 RAW 分支均为明确 omission，不做自动化",
    "公开 dismiss Action 只在精确 Blink source marker 存在时可用，并通过 source-artifact-dismiss-v1 删除该来源效果",
  ], { status: "compiler-runtime-passed" }),
});

export default blink;
