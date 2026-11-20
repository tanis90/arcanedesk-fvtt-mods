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
  grantConditionImmunity,
  grantResistance,
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
} from "@arcanedesk/spell-compiler/dsl";

// L2 重写批（M1.0 审计 C 桶 recipe-invalid，c-dm）：2024 改为毒素抗性 + 中毒/恐慌免疫 +
// 生命值上限 +2d10，删除感知豁免优势与疾病/中毒治愈；持续 24 小时的增益，法术本身即时。
// 5R 锚点：玩家手册2024/法术详述/6环.htm#Heroes'_Feast。
const L6_RUNTIME_QA_RECEIPT =
  "docs/foundry-automation/notes/spell-level-6-runtime-qa-2026-09-02.md";

const heroesFeast = cleanRoomSpell({
  id: "heroes-feast",
  contract: spellContract({
    ruleset: "2024",
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
    lifetime: spellLifetime(),
    primaryActionId: "create",
  }),
  emission: { contentVersion: 1 },
  support: {
    level: "simplified",
    omissions: [
      "Create Feast 前由 DM 确认并移除价值至少 1,000 gp 的 gem-encrusted bowl；material contract 保留费用与 consumed 语义，但 runtime 不搜索或删除 Actor inventory 中的具体物件",
      "Foundry 把 Create Feast 标记为 10 分钟 Activity，但不推进世界时间或追踪施法中断；DM 只在 10 分钟施法完成并允许扣除法术位后调用 Create Feast",
      "heroes-feast-source 使用明确 manual HITL lifecycle，避免完整 1 小时进餐结束与自动 source 到期发生竞态；DM 在整场进餐完成时立即调用 Consume Feast，若进餐被放弃、无合法参与者或一小时结束而未 Consume，则删除本次精确 source；runtime 不计时或推断进餐事实",
      "2024 不再治愈既有疾病或毒素：本实现不扫描或删除任何疾病/毒素 Item 与 Effect，也不授予感知豁免优势",
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
            grantResistance("poison"),
            grantConditionImmunity("poisoned"),
            grantConditionImmunity("frightened"),
          ],
          lifecycle: duration(24, "hours"),
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
    "Create Feast 是 10 分钟 self public Activity：只消费一个六环或更高法术位并建立 source-scoped heroes-feast-source；Create 本身不选择参与者、不增加 HP，也不授予免疫或抗性，施法时间推进与中断由 DM 处理",
    "heroes-feast-source 使用 manual lifecycle 而不在一小时边界自动到期；DM 在完整一小时进餐结束时立即调用 Consume Feast，或在进餐被放弃、无合法参与者、以及一小时结束而未 Consume 时删除本次精确 source",
    "Consume Feast 是 special-range selected-targets public Activity，接受 1..12 个 DM 已确认完整进餐的 creature；它由 consumesSourceArtifact(heroes-feast-source) 门控，不再次消耗法术位，并在 committed 后原子消费该来源",
    "每个受益者独立掷 2d10 并获得独立 cast-target Heroes' Feast 实例，最长持续 24 小时；实例负责可逆的 current/effective max HP 容量、poison damage resistance、poisoned 与 frightened condition immunity",
    "2024 不再提供感知豁免优势，也不再治愈既有疾病或中毒；这些条款不进入自动化",
  ],
    { status: "compiler-passed" }),
});

export default heroesFeast;
