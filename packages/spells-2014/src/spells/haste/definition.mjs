import {
  QA_LOG,
  acceptance,
  blockActionKinds,
  cleanRoomEffect,
  cleanRoomSpell,
  concentration,
  constant,
  consume,
  contentRef,
  duration,
  grantAbilitySavingThrowAdvantage,
  grantArmorClassBonus,
  graphFragment,
  operation,
  predicate,
  publicAction,
  rule,
  scaleAllMovement,
  selected,
  setAllMovement,
  spellContract,
  targetQuery,
  trigger,
  untilTrigger,
  whileSpellActive,
} from "@arcanedesk/spell-compiler/dsl";

// EX-8 冻结边界（§3.9）：+2 AC、速度加倍、DEX save 优势、额外 action，以及
// 法术结束时目标获得 lethargy（不能动作、不能移动，直到其下一回合结束）。
//
// 法术结束 lethargy 已由 lifecycle-outcome 接线：`artifact-deleted` trigger
// 降低为 `artifact-ended-outcome-v1` adapter，runtime 在 deleteActiveEffect
// 时给宿主施加 haste-lethargy；专注中断、一分钟到期与驱散三条结束路径都经
// 该 hook 覆盖。仍待基础层的部分：
//
// 1. 额外 action。clean-room modifier 全集没有任何"向 effect-target 授予额外
//    action"的原语；availability（requiresSourceArtifact）只支持 source-scoped
//    Effect 且决定的是施法者 spell Item 上 Action 的可见性，不能把动作授予目标
//    生物。RAW 用途限定（该 action 只能用于 Attack[一次武器攻击]/Dash/Disengage/
//    Hide/Use an Object） additionally 需要用途白名单语义，现有
//    blockActionKinds 是黑名单且 kinds 只有 attack/spell/reaction，无法表达。
//    等待基础层提供 grant-action 类 modifier + 用途限定后由 DM 裁定改为自动。
//
// 2. lethargy 的 "不能动作" 只阻断整 action（2014 PHB 下不能动作即不能
//    bonus action，reaction 不受限）；blockedActionKinds 没有 bonus action
//    kind，bonus action 阻断由 DM 裁定。
//
// lethargy lifecycle 用 untilTrigger(turn-end, effect-target,
// occurrence:"next-after-created")，降低为 next-effect-target-turn-end runtime
// contract；即使在目标自己的回合内施加，也会等到目标再完成一个后续回合才清理。

const haste = cleanRoomSpell({
  id: "haste",
  contract: spellContract({
    ruleset: "2014",
    level: 3,
    school: "trs",
    components: {
      verbal: true,
      somatic: true,
      material: true,
    },
    lifetime: concentration(duration(1, "minutes")),
  }),
  content: contentRef("haste"),
  emission: { contentVersion: 1 },
  support: {
    level: "simplified",
    omissions: [
      "额外 action 及其 RAW 用途限定（仅 Attack[一次武器攻击]/Dash/Disengage/Hide/Use an Object）未接线：DSL 无向 effect-target 授予 action 的 modifier，也无用途白名单机制，属 BASE-LAYER-NEED，由 DM 手动执行",
      "lethargy 的不能动作只阻断整 action；bonus action 阻断无对应 kind（2014 PHB 下不能动作即不能 bonus action，reaction 不受限），由 DM 裁定",
      "目标自愿且施法者能看见目标由 DM 在声明时判断，willing predicate 只是目标投影元数据",
    ],
  },
  fragments: [
    graphFragment({
      id: "haste-graph",
      actions: [publicAction("cast", "加速术 Haste")],
      artifacts: [
        cleanRoomEffect("hasted", {
          host: "actor",
          scope: "source-target",
          reapply: "replace",
          name: "Haste",
          modifiers: [
            grantArmorClassBonus(constant(2)),
            grantAbilitySavingThrowAdvantage(["dex"]),
            scaleAllMovement(constant(2)),
          ],
          lifecycle: whileSpellActive(),
        }),
        cleanRoomEffect("haste-lethargy", {
          host: "actor",
          scope: "source-target",
          reapply: "replace",
          name: "Haste Lethargy",
          modifiers: [
            setAllMovement(constant(0)),
            blockActionKinds(["action"]),
          ],
          lifecycle: untilTrigger(
            trigger("turn-end", {
              subject: "effect-target",
              occurrence: "next-after-created",
            }),
          ),
        }),
      ],
      rules: [
        rule({
          id: "cast-haste",
          on: trigger("action-used", { actionId: "cast" }),
          targets: [
            selected("target:cast", {
              min: 1,
              max: 1,
              range: 30,
              kind: "creature",
              predicates: [predicate("willing")],
            }),
          ],
          do: [
            consume(),
            operation("apply-artifact", {
              id: "cast:apply-hasted",
              artifactId: "hasted",
              target: "target:cast",
            }),
          ],
        }),
        rule({
          id: "haste-lethargy-on-end",
          on: trigger("artifact-deleted", { artifactId: "hasted" }),
          targets: [
            targetQuery({
              id: "target:host",
              result: "tokens",
              origin: { type: "event-binding", name: "host" },
              evaluation: "snapshot",
              cardinality: { min: 1, max: 1 },
            }),
          ],
          do: [
            operation("apply-artifact", {
              id: "lethargy:apply",
              artifactId: "haste-lethargy",
              target: "target:host",
            }),
          ],
        }),
      ],
    }),
  ],
  accepted: acceptance(
    QA_LOG,
    [
      "cast 是 action，对 30 ft 内一个由 DM 声明为 willing 且可见的 creature 施放，只消耗一个三环或更高法术位，并建立最长一分钟的专注",
      "命中声明目标后目标获得可见 Haste effect：AC 恰 +2、所有现有移动速度加倍、Dexterity saving throw 优势，不随环位缩放",
      "专注中断、一分钟到期或驱散时 Haste effect 精确移除，三项 modifier 全部恢复，非目标生物全程不受影响",
      "同一来源对同一目标重施只替换自己的 Haste effect（source-target identity），不同施法者的 Haste 在同一目标上共存；重施新的专注法术会结束旧 Haste，因此旧实例仍按 RAW 触发一次 lethargy",
      "法术结束（破专注、到期或驱散）时目标自动获得 Haste Lethargy：移动归零、整 action 阻断（bonus action 与 reaction 由 DM 裁定），直到其下一回合结束",
      "额外 action 是 BASE-LAYER-NEED：本 spec 不生成任何额外 Action 或 availability gate，目标每回合的额外动作与其 RAW 用途限定由 DM 手动执行（显式 omission）",
    ],
    { status: "compiler-runtime-passed" },
  ),
});

export default haste;
