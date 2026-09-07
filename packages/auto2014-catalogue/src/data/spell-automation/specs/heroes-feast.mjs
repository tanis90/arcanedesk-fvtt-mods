import {
  acceptance,
  action,
  activation,
  cleanRoomEffect,
  cleanRoomSpell,
  consume,
  consumesSourceArtifact,
  dice,
  duration,
  grantAbilitySavingThrowAdvantage,
  grantConditionImmunity,
  grantDamageImmunity,
  graphFragment,
  manual,
  operation,
  publicAction,
  rule,
  selected,
  self,
  spellContract,
  spellLifetime,
  trigger,
  whileSpellActive,
} from "../dsl.mjs";

const L6_RUNTIME_QA_RECEIPT =
  "docs/foundry-automation/notes/spell-level-6-runtime-qa-2026-09-02.md";

const heroesFeast = cleanRoomSpell({
  id: "heroes-feast",
  contract: spellContract({
    ruleset: "2014",
    level: 6,
    school: "con",
    components: {
      verbal: true,
      somatic: true,
      material: true,
    },
    material: {
      cost: 1000,
      consumed: true,
    },
    lifetime: spellLifetime(duration(24, "hours")),
    primaryActionId: "create",
  }),
  emission: { contentVersion: 1 },
  support: {
    level: "simplified",
    omissions: [
      "Create Feast 前由 DM 确认并移除价值至少 1,000 gp 的 gem-encrusted bowl；material contract 保留费用与 consumed 语义，但 runtime 不搜索或删除 Actor inventory 中的具体物件",
      "Foundry 把 Create Feast 标记为 10 分钟 Activity，但不推进世界时间或追踪施法中断；DM 只在 10 分钟施法完成并允许扣除法术位后调用 Create Feast",
      "heroes-feast-source 使用明确 manual HITL lifecycle，避免完整 1 小时进餐结束与自动 source 到期发生竞态；DM 在整场进餐完成时立即调用 Consume Feast，若进餐被放弃、无合法参与者或一小时结束而未 Consume，则删除本次精确 source；runtime 不计时或推断进餐事实",
      "Consume Feast 后由 DM 清理参与者当前已有的 disease，以及无法由结构化 condition immunity 覆盖的现有 poison；runtime 不扫描或删除任意疾病/毒素 Item 与 Effect",
    ],
  },
  fragments: [
    graphFragment({
      id: "heroes-feast-graph",
      actions: [
        action({
          id: "create",
          name: "英雄宴：创造盛宴 Heroes' Feast: Create Feast",
          activation: activation("minute", 10),
          visibility: "public",
        }),
        publicAction("consume", "英雄宴：享用盛宴 Heroes' Feast: Consume Feast", {
          availableWhen: [consumesSourceArtifact("heroes-feast-source")],
        }),
      ],
      artifacts: [
        cleanRoomEffect("heroes-feast-source", {
          host: "actor",
          scope: "source",
          reapply: "replace",
          name: "Heroes' Feast: Awaiting Consumption",
          markerOnly: true,
          modifiers: [],
          lifecycle: manual(),
        }),
        cleanRoomEffect("heroes-feast-benefit", {
          host: "actor",
          scope: "cast-target",
          identityKeys: ["castUuid", "targetUuid"],
          reapply: "stack",
          name: "Heroes' Feast",
          modifiers: [
            grantDamageImmunity("poison"),
            grantConditionImmunity("poisoned"),
            grantConditionImmunity("frightened"),
            grantAbilitySavingThrowAdvantage(["wis"]),
          ],
          lifecycle: whileSpellActive(),
        }),
      ],
      rules: [
        rule({
          id: "create-heroes-feast",
          on: trigger("action-used", { actionId: "create" }),
          targets: [self("target:create")],
          do: [
            consume(),
            operation("apply-artifact", {
              id: "create:apply-source",
              artifactId: "heroes-feast-source",
              target: "source",
            }),
          ],
        }),
        rule({
          id: "consume-heroes-feast-benefits",
          on: trigger("action-used", { actionId: "consume" }),
          targets: [
            selected("target:consume", {
              min: 1,
              max: 12,
              range: null,
              units: "spec",
              kind: "creature",
            }),
          ],
          do: [
            operation("grant-hit-point-capacity", {
              id: "consume:grant-hit-point-capacity",
              target: "target:consume",
              artifactId: "heroes-feast-benefit",
              formula: dice(2, 10),
              formulaScope: "per-target",
              stacking: "same-spell-strongest-latest",
            }),
          ],
        }),
        rule({
          id: "consume-heroes-feast-source",
          on: trigger("action-used", { actionId: "consume" }),
          targets: [self("target:consume-source")],
          do: [
            operation("delete-artifact", {
              id: "consume:delete-source",
              artifactId: "heroes-feast-source",
              target: "source",
            }),
          ],
        }),
      ],
    }),
  ],
  accepted: acceptance(L6_RUNTIME_QA_RECEIPT, [
    "Create Feast 是 10 分钟 self public Activity：只消费一个六环或更高法术位并建立 source-scoped heroes-feast-source；Create 本身不选择参与者、不增加 HP，也不授予免疫或豁免优势，施法时间推进与中断由 DM 处理",
    "heroes-feast-source 使用 manual lifecycle 而不在一小时边界自动到期；DM 在完整一小时进餐结束时立即调用 Consume Feast，或在进餐被放弃、无合法参与者、以及一小时结束而未 Consume 时删除本次精确 source，因此 runtime 不会与同一时刻的 Consume 争抢 cleanup",
    "Consume Feast 是 special-range selected-targets public Activity，接受 1..12 个 DM 已确认完整进餐的 creature；它由 consumesSourceArtifact(heroes-feast-source) 门控，不再次消耗法术位，并在 committed 后原子消费该来源，第二次 Consume 与第 13 个目标必须在 world write 前拒绝",
    "每个受益者独立掷 2d10 并获得独立 cast-target Heroes' Feast 实例，最长持续 24 小时；实例负责可逆的 current/effective max HP 容量、poison damage immunity、poisoned 与 frightened condition immunity，以及 Wisdom saving throws advantage；同一 Actor 的多个 linked Token 在同次 Consume 中只应用一次",
    "容量实例结束时只回退仍有效的容量差，不回滚 24 小时内真实承受的伤害或获得的治疗；同名 feast 与 Aid/其他容量来源按各自 provenance 和既有 strongest/latest 仲裁保持隔离",
    "grant-hit-point-capacity 以 formulaScope per-target 逐个受益 Actor 独立求值 2d10；Aid 等未声明范围的旧消费者继续默认 shared，不改变既有一次掷骰共享批次的合同",
    "poison damage immunity、poisoned/frightened condition immunity 与 Wisdom saving throw advantage 分别落到 di、ci 与 Midi save advantage，不能以 poison resistance、healing immunity 或同名字符串替代",
    "DM 在 Create 前处理被消耗的 1,000 gp bowl，在 Create 前确认 10 分钟施法已经完成，在 Consume 前确认完整 1 小时进餐与参与资格，并在 Consume 后清除现有 disease/无法结构化的 poison；这些步骤不由 runtime 冒充完成",
    "QA-A 必须覆盖取消前可重试、commit 后 no-replay、partial/indeterminate 不自动重放、Consume 或 DM 精确删除 source 后关闭后续 Consume、逐目标独立掷骰、同 Actor linked Token 去重、多来源隔离和 24 小时 cleanup",
  ], { status: "compiler-runtime-passed" }),
});

export default heroesFeast;
