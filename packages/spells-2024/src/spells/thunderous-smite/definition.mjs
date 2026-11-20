import {
  QA_LOG,
  acceptance,
  cleanRoomEffect,
  cleanRoomSpell,
  consume,
  dice,
  eventTarget,
  grantStatus,
  graphFragment,
  instant,
  manual,
  operation,
  perSlotAboveBase,
  predicate,
  publicAction,
  rule,
  spellContract,
  spellLifetime,
  trigger,
} from "@arcanedesk/spell-compiler/dsl";

// L4 移植批（G 桶，非 SRD，spells24 无源文档）：2014 recipe 搬运改契约。
// 5R 锚点 Thunderous_Smite（1环.htm）：头部 一环 塑能（圣武士），V，附赠动作紧接近战命中。
// 与 2014 差异：持续时间改为立即、prone 改手动存续，并补齐 2014 recipe 缺失的每环 +1d6 升环。
const thunderousSmite = cleanRoomSpell({
  id: "thunderous-smite",
  contract: spellContract({
    ruleset: "2024",
    level: 1,
    school: "evo",
    components: {
      verbal: true,
      somatic: false,
      material: false,
    },
    lifetime: spellLifetime(instant()),
    primaryActionId: "declare",
  }),
  emission: { contentVersion: 1 },
  support: {
    level: "simplified",
    omissions: [
      "失败豁免后的 10 ft 推离以及 300 ft 可闻声响不自动化，仍由 DM 处理",
      "prone 使用 manual lifecycle：起身（花费一半移动）与效果清除由 DM/玩家按常规机械处理，不随法术结束自动解除",
      "declared-rider 将 bonus-action 施法声明合并到命中事件；未命中不耗槽，也不建立命中前或命中后的专注窗口",
    ],
  },
  fragments: [
    graphFragment({
      id: "thunderous-smite-rider",
      actions: [
        publicAction("declare", "雷鸣斩 Thunderous Smite", {
          activationType: "bonus",
          delivery: "declared-rider",
        }),
      ],
      artifacts: [
        cleanRoomEffect("thunderous-impact", {
          scope: "source-target",
          reapply: "replace",
          name: "Thunderous Smite",
          modifiers: [grantStatus("prone")],
          lifecycle: manual(),
        }),
      ],
      rules: [
        rule({
          id: "resolve-declared-rider",
          on: trigger("operation-outcome", {
            operationId: "external:triggering-weapon-attack",
            outcome: "hit",
          }),
          when: [
            predicate("declared"),
            predicate("attack-kind", { value: "melee-weapon" }),
          ],
          targets: [eventTarget("target:hit")],
          do: [
            consume("rider:consume", "on-hit"),
            operation("damage", {
              id: "rider:damage",
              target: "target:hit",
              formula: perSlotAboveBase(
                dice(2, 6),
                dice(1, 6),
              ),
              damageTypes: ["thunder"],
            }),
            operation("saving-throw", {
              id: "rider:save",
              ability: ["str"],
              target: "target:hit",
              onSave: "none",
            }),
          ],
        }),
        rule({
          id: "rider-save-failed",
          on: trigger("operation-outcome", {
            operationId: "rider:save",
            outcome: "failure",
          }),
          targets: [eventTarget("target:failed")],
          do: [
            operation("apply-artifact", {
              id: "rider:apply-prone",
              artifactId: "thunderous-impact",
              target: "target:failed",
            }),
          ],
        }),
      ],
    }),
  ],
  accepted: acceptance(QA_LOG, [
    "声明 rider 后只在真实近战武器命中时消耗一个一环或更高法术位",
    "命中只追加一次 2d6 thunder，每高一环增加 1d6",
    "随后只进行一次 Strength save，失败时应用一个包含 prone 的 Thunderous Smite 效果",
    "豁免 activity 不造成伤害，也不再次消耗法术位",
    "proneness 以 manual lifecycle 存续，由 DM 按起身规则清除",
    "10 ft 推离不自动化，未命中不消耗法术位",
  ], { status: "compiler-passed" }),
});

export default thunderousSmite;
