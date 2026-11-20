import {
  QA_LOG,
  acceptance,
  add,
  cleanRoomEffect,
  cleanRoomSpell,
  concentration,
  constant,
  consume,
  duration,
  endSourceWhenLastDependentEnds,
  eventTarget,
  grantStatus,
  graphFragment,
  levelsAboveBase,
  operation,
  predicate,
  publicAction,
  rule,
  selected,
  spellContract,
  trigger,
  whileSpellActive,
} from "@arcanedesk/spell-compiler/dsl";

// L2 重写批（2024，M1 审计 C 桶 recipe-invalid）：施法距离由 60 尺改为 30 尺；
// 放逐目标在无害半位面期间明确陷入失能（2014 定义只放 marker）。
// 来源：5R 玩家手册2024 4环.htm#Banishment。
const banishment = cleanRoomSpell({
  id: "banishment",
  contract: spellContract({
    ruleset: "2024",
    level: 4,
    school: "abj",
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
      "目标是否在施法者视野内，以及目标是否原生于当前位面，均由 DM 在施法前确认；系统不推断可见性或位面来源",
      "豁免失败后由 DM 隐藏或移出对应 token；法术提前结束时由 DM 将目标放回离开空间，若该处被占据则放到最近的未占据空间；系统不删除、恢复或跨场景 suspended token",
      "非当前位面原生生物（异怪、天族、元素、妖精、邪魔）放逐满一分钟后不返回、改送关联位面的随机地点，由 DM 确认并处理最终 token 状态",
    ],
  },
  fragments: [
    graphFragment({
      id: "banishment-graph",
      actions: [publicAction("cast", "放逐术 Banishment")],
      artifacts: [
        cleanRoomEffect("banished", {
          host: "actor",
          scope: "source-target",
          reapply: "replace",
          name: "Banished",
          modifiers: [grantStatus("incapacitated")],
          sourceTermination: endSourceWhenLastDependentEnds(),
          lifecycle: whileSpellActive(),
        }),
      ],
      rules: [
        rule({
          id: "cast-banishment",
          on: trigger("action-used", { actionId: "cast" }),
          targets: [
            selected("target:cast", {
              min: 1,
              max: add(constant(1), levelsAboveBase()),
              range: 30,
              kind: "creature",
              predicates: [predicate("visible-to-source")],
            }),
          ],
          do: [
            consume(),
            operation("saving-throw", {
              id: "initial-save",
              ability: ["cha"],
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
          targets: [eventTarget("target:failed")],
          do: [
            operation("apply-artifact", {
              id: "apply-banished",
              artifactId: "banished",
              target: "target:failed",
            }),
          ],
        }),
      ],
    }),
  ],
  accepted: acceptance(QA_LOG, [
    "action 对 30 ft 内由 DM 确认为施法者可见的一个 creature 进行 Charisma save；每使用高于四环一级的法术位可多声明一个目标，整次施法只消耗一个对应法术位",
    "首次豁免失败的目标获得具有独立 source-target identity 的 Banished marker，并在放逐期间陷入 incapacitated（5R 半位面条款）；豁免成功目标、未声明目标与其他来源效果保持不变",
    "Banished 不授予其他机械状态；DM 根据目标的位面来源执行 token 隐藏或移出，系统不代为移动 token",
    "施法建立最长一分钟的专注；专注解除、替换、提前结束或到期时精确清理仍存在的本来源 marker，同来源重施只替换自己的 marker",
    "最后一个本来源 Banished marker 被手动删除时结束已经失去全部 dependent 的对应来源专注；其他施法来源保持不变",
    "法术提前结束时由 DM 恢复对应 token；非当前位面原生目标维持满一分钟后不返回由 DM 确认，系统不执行 token 删除、恢复或跨场景 suspension",
  ], { status: "compiler-passed" }),
});

export default banishment;
