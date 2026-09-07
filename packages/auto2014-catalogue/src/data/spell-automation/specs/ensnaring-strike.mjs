import {
  acceptance,
  cleanRoomEffect,
  cleanRoomSpell,
  consume,
  dice,
  duration,
  eventTarget,
  grantStatus,
  graphFragment,
  operation,
  perSlotAboveBase,
  predicate,
  publicAction,
  rule,
  spellContract,
  spellLifetime,
  trigger,
  whileSpellActive,
} from "../dsl.mjs";

const EXPANSION_BATCH =
  "docs/foundry-automation/notes/零至三环新法术扩展批次.md";

const ensnaringStrike = cleanRoomSpell({
  id: "ensnaring-strike",
  contract: spellContract({
    ruleset: "2014",
    level: 1,
    school: "con",
    components: {
      verbal: true,
      somatic: false,
      material: false,
    },
    lifetime: spellLifetime(duration(1, "minutes")),
    primaryActionId: "declare",
  }),
  emission: { contentVersion: 1 },
  support: {
    level: "simplified",
    omissions: [
      "大型或更大体型生物在首次 Strength save 上的优势缺少按目标体型选择 roll mode 的通用契约，由 DM 处理",
      "受束缚者或能触及它的其他生物使用动作进行 Strength check 解除藤蔓，缺少由效果宿主或第三方执行的通用 follow-up Action，由 DM 处理",
      "declared-rider 将 bonus-action 施法声明合并到下一次武器命中；未命中不耗槽，也不建立命中前或命中后的专注窗口；命中后的 restrained 依靠一分钟固定生命周期结束",
    ],
  },
  fragments: [
    graphFragment({
      id: "ensnaring-strike-rider",
      actions: [
        publicAction("declare", "诱捕打击 Ensnaring Strike", {
          activationType: "bonus",
          delivery: "declared-rider",
        }),
      ],
      artifacts: [
        cleanRoomEffect("ensnared", {
          scope: "source-target",
          reapply: "replace",
          name: "Ensnaring Strike",
          modifiers: [grantStatus("restrained")],
          lifecycle: whileSpellActive(),
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
            predicate("attack-kind", { value: "weapon" }),
          ],
          targets: [eventTarget("target:hit")],
          do: [
            consume("rider:consume", "on-hit"),
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
              id: "rider:apply-ensnared",
              artifactId: "ensnared",
              target: "target:failed",
            }),
          ],
        }),
        rule({
          id: "ensnared-turn-start-damage",
          on: trigger("turn-start", { subject: "effect-target" }),
          when: [
            predicate("artifact-exists", {
              artifactId: "ensnared",
              subject: "effect-target",
            }),
          ],
          targets: [eventTarget("target:ensnared")],
          do: [
            operation("damage", {
              id: "ensnared:piercing-damage",
              target: "target:ensnared",
              formula: perSlotAboveBase(
                dice(1, 6),
                dice(1, 6),
              ),
              damageTypes: ["piercing"],
            }),
          ],
        }),
      ],
    }),
  ],
  accepted: acceptance(EXPANSION_BATCH, [
    "declared rider 只在下一次真实近战或远程武器命中时消耗一个一环或更高法术位；未命中保持资源和目标状态不变",
    "命中本身不追加法术伤害，只令目标进行一次 Strength save；失败时应用 restrained，成功时不建立效果",
    "受束缚目标在自己的每个回合开始时承受基础 1d6 piercing，使用的法术位每高一环增加 1d6，并保留本次来源与施法环位",
    "同一来源重施只替换自己的效果，不覆盖其他来源；持续时间结束时清理 restrained 和后续伤害触发",
    "大型体型优势与动作解除严格保留在 support omissions，不会被普通无条件 save 或自动默认动作冒充",
  ], { status: "compiler-runtime-passed" }),
});

export default ensnaringStrike;
