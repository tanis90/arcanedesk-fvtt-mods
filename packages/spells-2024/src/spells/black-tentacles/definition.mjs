import {
  QA_LOG,
  acceptance,
  artifact,
  cleanRoomEffect,
  cleanRoomSpell,
  concentration,
  consume,
  dice,
  duration,
  eventTarget,
  grantStatus,
  graphFragment,
  operation,
  placedTemplate,
  predicate,
  publicAction,
  rule,
  spellContract,
  trigger,
  whileArtifact,
  whileSpellActive,
} from "@arcanedesk/spell-compiler/dsl";

// L2 重写批（2024，M1 审计 C 桶 recipe-invalid）：豁免由敏捷改为力量，挣脱改为仅力量（运动）检定，
// 结算时机改为「进入区域或在该区域结束回合」，且删去被束缚者回合开始自动再受 3d6。
// 来源：5R 玩家手册2024 4环.htm#Evard's_Black_Tentacles。
const oncePerTurn = () => predicate("once-per-turn", {
  identity: "zoneInstanceId + targetUuid + turn",
});

const membershipGuard = () => predicate("artifact-exists", {
  artifactId: "black-tentacles-membership",
  subject: "effect-target",
});

const zonePulse = ({ id, on, includeMembershipGuard = false }) => rule({
  id,
  on,
  when: [
    ...(includeMembershipGuard ? [membershipGuard()] : []),
    oncePerTurn(),
  ],
  targets: [eventTarget("target:pulse")],
  do: [
    operation("saving-throw", {
      id: `${id}:save`,
      ability: ["str"],
      target: "target:pulse",
      onSave: "none",
    }),
  ],
});

const restrainOnFailure = ({ id, operationId }) => rule({
  id,
  on: trigger("operation-outcome", {
    operationId,
    outcome: "failure",
  }),
  targets: [eventTarget("target:failed-save")],
  do: [
    operation("apply-artifact", {
      id: `${id}:apply-restrained`,
      artifactId: "black-tentacles-restrained",
      target: "target:failed-save",
    }),
  ],
});

const blackTentacles = cleanRoomSpell({
  id: "black-tentacles",
  contract: spellContract({
    ruleset: "2024",
    level: 4,
    school: "con",
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
      "20-ft square 区域是 difficult terrain；当前 DSL/runtime 不按穿越区域的实际路径增加移动消耗，由 DM 处理",
      "受束缚者可用一个动作进行力量（运动）检定对抗来源 spell save DC；成功后由 DM 在目标 Actor Sheet 的 Effects 中删除【可解除】艾伐黑触手：束缚",
      "zone pulse 的失败分支只允许 apply-artifact，无法在同一脉冲内结算 3d6 钝击；进入区域与区域内回合结束的失败伤害由 DM 掷 3d6 结算，施法瞬间的伤害已自动结算",
      "区域成员判定只保证画布 XY 平面；离地高度与区域是否确实铺在地面上由 DM 裁定",
      "20-ft square 必须落在施法者可见的 90 ft 内地面；模板放置不校验可见性或地面材质，由 DM 放置时确认",
    ],
  },
  fragments: [
    graphFragment({
      id: "black-tentacles-zone-graph",
      actions: [
        publicAction("cast", "放置艾伐黑触手 Place Black Tentacles"),
      ],
      artifacts: [
        artifact({
          id: "black-tentacles-zone",
          kind: "zone",
          role: "mechanical",
          identity: { scope: "cast", keys: ["castId"] },
          state: {
            anchor: "placed-point",
            shape: { type: "square", size: 20, units: "ft" },
            stationary: true,
          },
          lifecycle: whileSpellActive(),
        }),
        cleanRoomEffect("black-tentacles-membership", {
          host: "actor",
          scope: "source-target",
          reapply: "replace",
          name: "【系统】艾伐黑触手：区域成员（勿删）",
          markerOnly: true,
          lifecycle: whileArtifact("black-tentacles-zone"),
        }),
        cleanRoomEffect("black-tentacles-restrained", {
          host: "actor",
          scope: "source-target",
          reapply: "replace",
          name: "【可解除】艾伐黑触手：束缚",
          modifiers: [grantStatus("restrained")],
          lifecycle: whileSpellActive(),
        }),
      ],
      rules: [
        rule({
          id: "cast-black-tentacles",
          on: trigger("action-used", { actionId: "cast" }),
          targets: [
            placedTemplate("target:cast", {
              type: "square",
              size: 20,
              range: 90,
              evaluation: "snapshot",
            }),
          ],
          do: [
            consume(),
            operation("create-artifact", {
              id: "cast:create-zone",
              artifactId: "black-tentacles-zone",
              target: "target:cast",
            }),
            operation("saving-throw", {
              id: "cast:save",
              ability: ["str"],
              target: "target:cast",
              onSave: "none",
            }),
            operation("damage", {
              id: "cast:damage",
              target: "target:cast",
              formula: dice(3, 6),
              damageTypes: ["bludgeoning"],
              onSave: "none",
            }),
          ],
        }),
        restrainOnFailure({
          id: "cast-failed",
          operationId: "cast:save",
        }),
        zonePulse({
          id: "black-tentacles-entry",
          on: trigger("enter", { zoneId: "black-tentacles-zone" }),
        }),
        restrainOnFailure({
          id: "black-tentacles-entry-failed",
          operationId: "black-tentacles-entry:save",
        }),
        zonePulse({
          id: "black-tentacles-turn-end",
          on: trigger("turn-end", { subject: "zone-member" }),
          includeMembershipGuard: true,
        }),
        restrainOnFailure({
          id: "black-tentacles-turn-end-failed",
          operationId: "black-tentacles-turn-end:save",
        }),
      ],
    }),
  ],
  accepted: acceptance(QA_LOG, [
    "DM 在施法者 90 ft 内放置边长 20 ft 的固定正方形区域；一次施法只消耗一个四环或更高法术位并建立最长 1 分钟专注",
    "施法瞬间区域内的每名 creature 进行 Strength save；失败受到自动结算的 3d6 bludgeoning 并获得【可解除】艾伐黑触手：束缚",
    "creature 进入区域或在该区域结束自己的回合时进行 Strength save；失败获得同一来源的束缚，失败伤害按 omission 由 DM 结算",
    "enter 与 turn-end 的两条分支共享 zoneInstanceId + targetUuid + turn receipt，同一目标、区域和回合只进行一次豁免",
    "被束缚目标在其回合开始不再自动受到 3d6（2024 删除该条款）；离区也不自动移除束缚",
    "专注结束、到期或被驱散时按精确来源删除区域、membership 与 restrained，且不影响其他施法来源",
    "DM 处理困难地形、地面与 elevation 裁定，以及逃脱检定成功后手动删除精确【可解除】束缚 marker",
  ], { status: "compiler-passed" }),
});

export default blackTentacles;
