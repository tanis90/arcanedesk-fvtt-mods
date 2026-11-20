import {
  QA_LOG,
  acceptance,
  artifact,
  cleanRoomEffect,
  cleanRoomSpell,
  concentration,
  consume,
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

// 2024 重写批（M1.0 审计 C 桶 recipe-invalid）：不再召唤元素生物，改为固定在原地、
// 豁免失败即束缚的虚幻精魂。
// 5R 锚点：5R 玩家手册2024 5环.htm#Conjure_Elemental。
const ZONE_ID = "conjure-elemental-spirit";
const AREA_ID = "conjure-elemental-area";
const BOUND_ID = "conjure-elemental-bound";

const pulseReceipt = () => predicate("once-per-turn", {
  identity: "zoneInstanceId + targetUuid + turn",
});

const conjureElemental = cleanRoomSpell({
  id: "conjure-elemental",
  contract: spellContract({
    ruleset: "2024",
    level: 5,
    school: "con",
    components: {
      verbal: true,
      somatic: true,
      material: false,
    },
    lifetime: concentration(duration(10, "minutes")),
  }),
  emission: { contentVersion: 1 },
  support: {
    level: "simplified",
    omissions: [
      "精魂的元素类别（气/土/火/水）与对应伤害类型（闪电/雷鸣/火焰/寒冷）未参数化：模板、豁免与束缚共用同一来源，DM 在施法时口头声明类别并据此结算伤害",
      "canonical zone pulse 的失败分支只允许 apply-artifact，无法在同一脉冲内结算 8d8 伤害：进入精魂空间或在其 5 ft 内开始回合的首次失败伤害由 DM 掷 8d8（每高环 +1d8），束缚条件由自动化施加",
      "重复豁免规则只接受单一 saving-throw，失败时的 4d8 伤害没有 lowering：被束缚生物回合开始的 Dexterity 豁免由自动化掷出，失败伤害由 DM 掷 4d8（每高环 +1d8），成功时自动移除束缚",
      "「若没有生物被精魂束缚」的全局唯一性无法由无否定存在谓词的规则层表达：已有束缚时，其他生物进入或开始回合仍会触发豁免，DM 必须跳过这些结算",
      "被束缚生物回合开始时同时命中 zone pulse（再次 Dex 豁免，失败只会重复施加束缚）与重复豁免，DM 只需采用后者",
      "zone pulse 的 receipt 按 zoneInstanceId + targetUuid + turn 去重，同一回合多次进入只结算一次；5R 未设置每回合次数上限",
      "「你可见的生物」只进入 interaction projection，不做自动视线/遮蔽校验；DM 应只为可见目标结算",
      "精魂所在空间与 5 ft 光环用半径 5 ft 模板近似，模板只承诺 XY 几何，高程与特殊地形由 DM 处理",
    ],
  },
  fragments: [
    graphFragment({
      id: "conjure-elemental-graph",
      actions: [
        publicAction("cast", "咒唤元素 Conjure Elemental"),
      ],
      artifacts: [
        artifact({
          id: ZONE_ID,
          kind: "zone",
          role: "mechanical",
          identity: { scope: "cast", keys: ["castId"] },
          state: {
            anchor: "placed-point",
            shape: { type: "radius", size: 5, units: "ft" },
            stationary: true,
          },
          lifecycle: whileSpellActive(),
        }),
        cleanRoomEffect(AREA_ID, {
          host: "actor",
          scope: "source-target",
          reapply: "replace",
          name: "Conjure Elemental Area",
          markerOnly: true,
          lifecycle: whileArtifact(ZONE_ID),
        }),
        cleanRoomEffect(BOUND_ID, {
          host: "actor",
          scope: "source-target",
          reapply: "replace",
          name: "Conjure Elemental: Bound",
          modifiers: [grantStatus("restrained")],
          lifecycle: whileSpellActive(),
        }),
      ],
      rules: [
        rule({
          id: "cast-conjure-elemental",
          on: trigger("action-used", { actionId: "cast" }),
          targets: [
            placedTemplate("target:cast", {
              type: "radius",
              size: 5,
              range: 60,
              evaluation: "snapshot",
            }),
          ],
          do: [
            consume(),
            operation("create-artifact", {
              id: "cast:create-spirit",
              artifactId: ZONE_ID,
              target: "target:cast",
            }),
          ],
        }),
        rule({
          id: "conjure-elemental-entry-save",
          on: trigger("enter", { zoneId: ZONE_ID }),
          when: [pulseReceipt()],
          targets: [
            eventTarget("target:entry", [
              predicate("visible-to-source"),
            ]),
          ],
          do: [
            operation("saving-throw", {
              id: "entry-save",
              ability: ["dex"],
              target: "target:entry",
              onSave: "none",
            }),
          ],
        }),
        rule({
          id: "conjure-elemental-entry-save-failed",
          on: trigger("operation-outcome", {
            operationId: "entry-save",
            outcome: "failure",
          }),
          targets: [eventTarget("target:entry-failed")],
          do: [
            operation("apply-artifact", {
              id: "entry:apply-bound",
              artifactId: BOUND_ID,
              target: "target:entry-failed",
            }),
          ],
        }),
        rule({
          id: "conjure-elemental-turn-start-save",
          on: trigger("turn-start", { subject: "zone-member" }),
          when: [
            predicate("artifact-exists", {
              artifactId: AREA_ID,
              subject: "effect-target",
            }),
            pulseReceipt(),
          ],
          targets: [
            eventTarget("target:turn-start", [
              predicate("visible-to-source"),
            ]),
          ],
          do: [
            operation("saving-throw", {
              id: "turn-start-save",
              ability: ["dex"],
              target: "target:turn-start",
              onSave: "none",
            }),
          ],
        }),
        rule({
          id: "conjure-elemental-turn-start-save-failed",
          on: trigger("operation-outcome", {
            operationId: "turn-start-save",
            outcome: "failure",
          }),
          targets: [eventTarget("target:turn-start-failed")],
          do: [
            operation("apply-artifact", {
              id: "turn-start:apply-bound",
              artifactId: BOUND_ID,
              target: "target:turn-start-failed",
            }),
          ],
        }),
        rule({
          id: "conjure-elemental-repeat-save",
          on: trigger("turn-start", { subject: "effect-target" }),
          when: [
            predicate("artifact-exists", {
              artifactId: BOUND_ID,
              subject: "effect-target",
            }),
          ],
          targets: [eventTarget("target:bound")],
          do: [
            operation("saving-throw", {
              id: "repeat-save",
              ability: ["dex"],
              target: "target:bound",
              onSave: "none",
            }),
          ],
        }),
        rule({
          id: "conjure-elemental-repeat-save-succeeded",
          on: trigger("operation-outcome", {
            operationId: "repeat-save",
            outcome: "success",
          }),
          targets: [eventTarget("target:released")],
          do: [
            operation("delete-artifact", {
              id: "repeat-save:release",
              artifactId: BOUND_ID,
              target: "target:released",
            }),
          ],
        }),
      ],
    }),
  ],
  accepted: acceptance(QA_LOG, [
    "cast 只消耗一个五环或更高法术位并建立最长十分钟专注；在 60 ft 内一处位置放置半径 5 ft 的静止精魂模板",
    "未受束缚的可见生物进入精魂空间或在精魂 5 ft 内开始回合时进行 Dexterity save，失败自动获得 restrained",
    "被束缚生物在其回合开始时进行 Dexterity save，成功自动移除 restrained",
    "首次豁免失败的 8d8 伤害与重复豁免失败的 4d8 伤害不由 zone pulse/repeat-save lowering 结算，由 DM 按 5R 掷骰；两者都按每高环 +1d8 扩骰",
    "元素类别决定伤害类型（气=闪电、土=雷鸣、火=火焰、水=寒冷），由 DM 在施法时声明并据此结算伤害",
    "同一回合内同一目标的 zone pulse 只结算一次；已有束缚时的全局唯一性由 DM 跳过额外结算",
    "专注结束、替换或到期时按本次 cast provenance 清理精魂模板、成员 marker 与束缚效果",
  ], { status: "compiler-passed" }),
});

export default conjureElemental;
