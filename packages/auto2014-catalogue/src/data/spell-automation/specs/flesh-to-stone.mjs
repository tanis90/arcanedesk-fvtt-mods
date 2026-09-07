import {
  acceptance,
  cleanRoomEffect,
  cleanRoomSpell,
  concentration,
  consume,
  duration,
  endSourceWhenLastDependentEnds,
  eventTarget,
  grantStatus,
  graphFragment,
  manual,
  operation,
  outcomeRace,
  predicate,
  publicAction,
  rule,
  selected,
  spellContract,
  trigger,
  whileSpellActive,
} from "../dsl.mjs";

const L6_RUNTIME_QA_RECEIPT =
  "docs/foundry-automation/notes/spell-level-6-runtime-qa-2026-09-02.md";

const PENDING_ARTIFACT_ID = "flesh-to-stone-pending";
const BOUND_PETRIFIED_ARTIFACT_ID =
  "flesh-to-stone-petrified-bound";
const PERMANENT_PETRIFIED_ARTIFACT_ID =
  "flesh-to-stone-petrified-permanent";
const REPEAT_SAVE_RULE_ID = "repeat-save-at-turn-end";

const fleshToStone = cleanRoomSpell({
  id: "flesh-to-stone",
  contract: spellContract({
    ruleset: "2014",
    level: 6,
    school: "trs",
    components: {
      verbal: true,
      somatic: true,
      material: true,
    },
    lifetime: concentration(duration(1, "minutes")),
  }),
  emission: { contentVersion: 1 },
  support: {
    level: "simplified",
    omissions: [
      "DM 在 Cast 前确认目标是由血肉构成且可受石化术影响的 creature；runtime 只验证 60 ft 内单个 creature Token，不根据材质、外形或描述推断资格",
    ],
  },
  fragments: [
    graphFragment({
      id: "flesh-to-stone-graph",
      actions: [
        publicAction("cast", "石化术 Flesh to Stone"),
      ],
      artifacts: [
        cleanRoomEffect(PENDING_ARTIFACT_ID, {
          host: "actor",
          scope: "source-target",
          reapply: "replace",
          name: "Flesh to Stone: Restrained",
          modifiers: [grantStatus("restrained")],
          sourceTermination: endSourceWhenLastDependentEnds(),
          outcomeRace: outcomeRace({
            profile: "source-bound-natural-expiry",
            entry: {
              operationId: "initial-save",
              beginOn: "failure",
              endSourceOn: "success",
            },
            repeatSaveRuleId: REPEAT_SAVE_RULE_ID,
            successThreshold: 3,
            failureThreshold: 3,
            failureArtifactId: BOUND_PETRIFIED_ARTIFACT_ID,
            naturalExpiryArtifactId: PERMANENT_PETRIFIED_ARTIFACT_ID,
          }),
          lifecycle: whileSpellActive(),
        }),
        cleanRoomEffect(BOUND_PETRIFIED_ARTIFACT_ID, {
          host: "actor",
          scope: "source-target",
          reapply: "replace",
          name: "Flesh to Stone: Petrified (Concentration)",
          modifiers: [grantStatus("petrified")],
          lifecycle: whileSpellActive(),
        }),
        cleanRoomEffect(PERMANENT_PETRIFIED_ARTIFACT_ID, {
          host: "actor",
          scope: "source-target",
          reapply: "replace",
          name: "Flesh to Stone: Petrified (Permanent)",
          modifiers: [grantStatus("petrified")],
          lifecycle: manual(),
        }),
      ],
      rules: [
        rule({
          id: "cast-flesh-to-stone",
          on: trigger("action-used", { actionId: "cast" }),
          targets: [
            selected("target:cast", {
              min: 1,
              max: 1,
              range: 60,
              kind: "creature",
              predicates: [predicate("visible-to-source")],
            }),
          ],
          do: [
            consume(),
            operation("saving-throw", {
              id: "initial-save",
              ability: ["con"],
              target: "target:cast",
              onSave: "none",
            }),
          ],
        }),
        rule({
          id: "initial-save-failed",
          on: trigger("operation-outcome", {
            operationId: "initial-save",
            outcome: "failure",
          }),
          targets: [eventTarget("target:initial-failed")],
          do: [
            operation("apply-artifact", {
              id: "apply-flesh-to-stone-pending",
              artifactId: PENDING_ARTIFACT_ID,
              target: "target:initial-failed",
            }),
          ],
        }),
        rule({
          id: REPEAT_SAVE_RULE_ID,
          on: trigger("turn-end", { subject: "effect-target" }),
          when: [
            predicate("artifact-exists", {
              artifactId: PENDING_ARTIFACT_ID,
              subject: "effect-target",
            }),
          ],
          targets: [eventTarget("target:pending")],
          do: [
            operation("saving-throw", {
              id: "repeat-save",
              ability: ["con"],
              target: "target:pending",
              onSave: "none",
            }),
          ],
        }),
      ],
    }),
  ],
  accepted: acceptance(L6_RUNTIME_QA_RECEIPT, [
    "Cast 是 selected-targets public Activity，只接受 60 ft 内一个对施法者可见、且由 DM 确认为由血肉构成并可受本法术影响的 creature，并只消耗一个六环或更高法术位",
    "初始 Constitution save 成功时不在目标上留下 restrained、petrified 或 race state，并立即结束本次无受影响目标的专注来源；失败时只建立本来源的 source-target restrained pending Effect",
    "pending 目标在自己的每个回合结束时使用原施法者 DC 进行一次 Constitution save且不再消耗法术位；成功与失败分别非连续累计，阈值固定为三次，重复 dispatch 由 source Effect、目标与目标回合 receipt 去重",
    "第三次成功只删除本来源 pending，并通过 last-dependent-ended 结束本次专注；不会创建任何 petrified Effect，其他来源和非目标保持不变",
    "第三次失败先创建名称与身份独立的 Petrified (Concentration) Effect，再以受控 source-termination suppression 删除 restrained pending；两个终态互斥，转换不会提前结束仍需维持到一分钟的专注，终局后不再进行重复豁免",
    "第三次失败后若专注在一分钟前结束，只清理本来源 Petrified (Concentration) 且不创建永久效果；若来源自然维持完整一分钟，runtime 先创建不依赖来源的 Petrified (Permanent)，再清理 bound Effect 与 spell source",
    "Petrified (Permanent) 使用 manual lifecycle 并在来源清理后继续存在，直到 DM 按能移除石化的规则删除；它不被同名 bound replacement、其他施法来源或后续 source cleanup 误删",
    "outcome race 的 successes、failures、阶段、目标回合 receipt 与终局写入均按精确 source/item/effect/target provenance 隔离；重复事件、并发终局、刷新恢复和双来源不会重复计数、同时建立两个终态或跨来源清理",
    "目标材质和适用性保持明确 DM 前置判断；系统不会用 creature Token 分类冒充已经识别血肉材质",
  ], { status: "compiler-runtime-passed" }),
});

export default fleshToStone;
