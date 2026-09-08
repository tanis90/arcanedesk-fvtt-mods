import {
  acceptance,
  cleanRoomEffect,
  cleanRoomSpell,
  consume,
  dice,
  duration,
  graphFragment,
  instant,
  operation,
  predicate,
  publicAction,
  rule,
  selected,
  spellContract,
  spellLifetime,
  spellScript,
  spellScriptHandler,
  trigger,
} from "@arcanedesk/spell-compiler/dsl";

const L6_RUNTIME_QA_RECEIPT =
  "docs/foundry-automation/notes/spell-level-6-runtime-qa-2026-09-02.md";
const CAPACITY_REDUCTION_ARTIFACT = "harm-hit-point-capacity-reduction";

const harm = cleanRoomSpell({
  id: "harm",
  contract: spellContract({
    ruleset: "2014",
    level: 6,
    school: "nec",
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
      "remove disease 没有可靠的结构化触发 route；疾病移除结算后，DM 按来源删除该次施法建立的精确 maximum-HP reduction Effect，其他来源实例保持不变",
    ],
  },
  script: spellScript("harm", {
    version: 1,
    handlers: [
      spellScriptHandler(
        "resolve-typed-damage-transaction",
        "typed-damage-transaction",
        {
          runtimeRuleId: "cast-harm",
          artifactId: CAPACITY_REDUCTION_ARTIFACT,
          outcomes: ["success", "failure"],
          authority: "primary-active-gm",
          dedupe: "transactionId + targetActorUuid",
          cleanupOwner: "script",
          writes: [
            "actor:hit-points",
            `artifact:${CAPACITY_REDUCTION_ARTIFACT}`,
            "receipt:typed-damage-transaction",
          ],
          configuration: {
            schemaVersion: 1,
            minimumHitPoints: 1,
            reductionOutcome: "failure",
            reductionBasis: "ordinary-hit-point-loss",
            durationSeconds: 60 * 60,
          },
        },
      ),
    ],
  }),
  fragments: [
    graphFragment({
      id: "harm-graph",
      actions: [
        publicAction("cast", "重伤术 Harm"),
      ],
      artifacts: [
        cleanRoomEffect(CAPACITY_REDUCTION_ARTIFACT, {
          host: "actor",
          scope: "cast-target",
          identityKeys: ["castUuid", "targetUuid"],
          reapply: "stack",
          name: "Harm — Maximum Hit Points Reduced",
          markerOnly: true,
          lifecycle: duration(1, "hours"),
        }),
      ],
      rules: [
        rule({
          id: "cast-harm",
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
              id: "harm-save",
              ability: ["con"],
              target: "target:cast",
              onSave: "half",
            }),
            operation("damage", {
              id: "cast:harm-damage",
              target: "target:cast",
              formula: dice(14, 6),
              damageTypes: ["necrotic"],
            }),
          ],
        }),
      ],
    }),
  ],
  accepted: acceptance(L6_RUNTIME_QA_RECEIPT, [
    "Cast 是 selected-targets public Activity，只接受施法者 60 ft 内一个可见 creature，并只消耗一个六环或更高法术位",
    "目标进行 Constitution save；失败时按 14d6 necrotic damage 结算，成功时结算一半伤害且不建立 maximum-HP reduction，非目标保持不变",
    "pre-damage clamp 必须在真实 dnd5e/Midi damage transaction 内保证普通 HP 永不低于 1；禁止先写入 0 HP、再治疗或回填到 1 HP",
    "仅失败分支在 post-mitigation settlement 后，把该次事务造成的实际 ordinary HP loss 作为 maximum-HP reduction；临时 HP 吸收量、免疫或抗性消除的伤害，以及 1 HP floor 截断的未生效伤害均不得计入 reduction",
    "maximum-HP reduction 只限制一小时内的 HP 上限，不阻止后续治疗；效果到期或由 DM 因 remove disease 精确删除时恢复对应容量，但不恢复该次真实损失的 ordinary HP",
    "同一 typed damage transaction receipt 只能结算一次；重复回调、重连或 primary-GM 交接不得重复扣 HP、重复降低 maximum HP 或重复消费法术位，commit 后不允许自动 replay",
    "来自不同施法的 maximum-HP reduction 可以叠加；每个实例保留独立 source provenance，并在各自一小时到期或精确手工删除时只恢复自己的容量，不删除或改写其他来源",
    "QA-A 覆盖 failed-save、successful-save half、necrotic resistance、necrotic immunity、临时 HP 部分与全部吸收、低 HP 1 点下限、多来源叠加、独立到期、no-replay 与非目标不变",
  ], { status: "compiler-runtime-passed" }),
});

export default harm;
