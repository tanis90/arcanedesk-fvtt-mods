import {
  acceptance,
  artifact,
  cleanRoomEffect,
  cleanRoomSpell,
  concentration,
  consume,
  contentRef,
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

const QA_LOG =
  "docs/foundry-automation/notes/spell-combat-test-cases-1-3.md";

const zoneDamage = () => operation("damage", {
  id: "pulse:damage",
  target: "target:pulse",
  formula: dice(3, 6),
  damageTypes: ["bludgeoning"],
  onSave: "none",
});

const oncePerTurn = () => predicate("once-per-turn", {
  identity: "zoneInstanceId + targetUuid + turn",
});

const membershipGuard = () => predicate("artifact-exists", {
  artifactId: "black-tentacles-membership",
  subject: "effect-target",
});

const restrainedGuard = () => predicate("artifact-exists", {
  artifactId: "black-tentacles-restrained",
  subject: "effect-target",
});

const unrestrainedPulse = ({
  id,
  on,
  includeMembershipGuard = false,
}) => rule({
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
      ability: ["dex"],
      target: "target:pulse",
      onSave: "none",
    }),
    zoneDamage(),
  ],
});

const restrainedPulse = ({
  id,
  on,
  includeMembershipGuard = false,
}) => rule({
  id,
  on,
  when: [
    ...(includeMembershipGuard ? [membershipGuard()] : []),
    restrainedGuard(),
    oncePerTurn(),
  ],
  targets: [eventTarget("target:pulse")],
  do: [zoneDamage()],
});

const applyRestrainedOnFailure = ({ id, operationId }) => rule({
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
    ruleset: "2014",
    level: 4,
    school: "con",
    components: {
      verbal: true,
      somatic: true,
      material: true,
    },
    lifetime: concentration(duration(1, "minutes")),
  }),
  content: contentRef("black-tentacles"),
  emission: { contentVersion: 1 },
  support: {
    level: "simplified",
    omissions: [
      "20-ft square 区域是 difficult terrain；当前 DSL/runtime 不按穿越区域的实际路径增加移动消耗，由 DM 处理",
      "受束缚者可花费 action，以 Strength 或 Dexterity check 对抗来源 spell save DC；成功后由 DM 在目标 Actor Sheet 的 Effects 中删除【可解除】艾伐黑触手：束缚",
      "已被本施法来源束缚的目标即使离开后重入，仍按冻结简化直接受到 3d6 bludgeoning、跳过 Dexterity save；离区不会自动移除束缚",
      "P0 假定同一目标至多持有一个可见的 Black Tentacles 束缚 marker；UI 不附加施法者或区域编号，但机械判断仍使用精确来源 provenance",
      "区域成员判定只保证画布 XY 平面；离地高度与区域是否确实铺在地面上由 DM 裁定",
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
          ],
        }),
        unrestrainedPulse({
          id: "black-tentacles-entry-unrestrained",
          on: trigger("enter", { zoneId: "black-tentacles-zone" }),
        }),
        applyRestrainedOnFailure({
          id: "black-tentacles-entry-failed",
          operationId: "black-tentacles-entry-unrestrained:save",
        }),
        restrainedPulse({
          id: "black-tentacles-entry-restrained",
          on: trigger("enter", { zoneId: "black-tentacles-zone" }),
        }),
        unrestrainedPulse({
          id: "black-tentacles-turn-start-unrestrained",
          on: trigger("turn-start", { subject: "zone-member" }),
          includeMembershipGuard: true,
        }),
        applyRestrainedOnFailure({
          id: "black-tentacles-turn-start-failed",
          operationId: "black-tentacles-turn-start-unrestrained:save",
        }),
        restrainedPulse({
          id: "black-tentacles-turn-start-restrained",
          on: trigger("turn-start", { subject: "zone-member" }),
          includeMembershipGuard: true,
        }),
      ],
    }),
  ],
  accepted: acceptance(QA_LOG, [
    "DM 在施法者 90 ft 内放置边长 20 ft 的固定正方形区域；一次施法只消耗一个四环或更高法术位并建立最长 1 分钟专注",
    "区域出现在 creature 脚下时不触发豁免、伤害或 restrained；只有 eligible enter 或区域成员 turn-start 启动事件结算",
    "目标没有本 cast 精确 restrained artifact 时进行真实 Dexterity save；成功无事，失败受到真实 3d6 bludgeoning 并获得【可解除】艾伐黑触手：束缚",
    "目标已有本 cast 精确 restrained artifact 时跳过豁免，只受到一次真实 3d6 bludgeoning；普通 restrained 或其他来源 marker 不命中该分支",
    "enter 与 turn-start 的两条条件分支共同争用 zoneInstanceId + targetUuid + turn receipt，同一目标、区域和回合只结算一次",
    "离开区域只删除【系统】区域成员，不删除【可解除】束缚；专注结束、到期或被驱散时按精确来源删除区域、membership 与 restrained，且不影响其他施法来源",
    "DM 处理困难地形、地面与 elevation 裁定，以及逃脱 check 成功后手动删除精确【可解除】束缚 marker；Runtime 不提供挣脱 Activity 或移动扣除",
  ], { status: "compiler-runtime-passed" }),
});

export default blackTentacles;
