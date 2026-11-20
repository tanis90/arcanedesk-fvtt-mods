import {
  QA_LOG,
  acceptance,
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
  whileSpellActive,
} from "@arcanedesk/spell-compiler/dsl";

// 2024 重写批（M1.0 审计 C 桶 recipe-invalid）：删除 5d8 生命值池，改为 5 ft
// 球内感知豁免→失能→（该回合末再次失败）昏迷；施法距离 90→60 ft。
// 5R 锚点：5R 玩家手册2024 1环.htm#Sleep。
const sleep = cleanRoomSpell({
  id: "sleep",
  contract: spellContract({
    ruleset: "2024",
    level: 1,
    school: "enc",
    components: {
      verbal: true,
      somatic: true,
      material: true,
    },
    lifetime: concentration(duration(1, "minutes")),
  }),
  emission: { contentVersion: 8 },
  support: {
    level: "simplified",
    omissions: [
      "第二次豁免失败应转为昏迷（并在受伤或被人用动作摇醒时结束）；repeat-save 失败分支没有 apply-artifact 的 lowering，由 DM 手动追加昏迷状态",
      "5R 只影响区域内「你选择的」生物；模板成员全部参与豁免，哪些生物被排除由 DM 在施法时声明并按需忽略结果",
      "不需要睡眠（如精灵）或免疫疲竭的生物自动通过豁免：当前没有按 trait/immunity 自动判成功的原语，由 DM 忽略其结果",
      "同一回合内的失能到期由重复豁免结算代替；若战斗外目标没有回合，失能会一直保留到 DM 手动清除",
    ],
  },
  fragments: [
    graphFragment({
      id: "sleep-graph",
      actions: [publicAction("cast", "睡眠术 Sleep")],
      artifacts: [
        cleanRoomEffect("sleep-incapacitated", {
          host: "actor",
          scope: "source-target",
          reapply: "replace",
          name: "Sleep: Incapacitated",
          modifiers: [grantStatus("incapacitated")],
          lifecycle: whileSpellActive(),
        }),
      ],
      rules: [
        rule({
          id: "cast-sleep",
          on: trigger("action-used", { actionId: "cast" }),
          targets: [
            placedTemplate("target:cast", {
              type: "sphere",
              size: 5,
              range: 60,
              evaluation: "snapshot",
            }),
          ],
          do: [
            consume(),
            operation("saving-throw", {
              id: "cast:save",
              ability: ["wis"],
              target: "target:cast",
              onSave: "none",
            }),
          ],
        }),
        rule({
          id: "cast-sleep-save-failed",
          on: trigger("operation-outcome", {
            operationId: "cast:save",
            outcome: "failure",
          }),
          targets: [eventTarget("target:failed")],
          do: [
            operation("apply-artifact", {
              id: "failure:apply-incapacitated",
              artifactId: "sleep-incapacitated",
              target: "target:failed",
            }),
          ],
        }),
        rule({
          id: "sleep-repeat-save",
          on: trigger("turn-end", { subject: "effect-target" }),
          when: [
            predicate("artifact-exists", {
              artifactId: "sleep-incapacitated",
              subject: "effect-target",
            }),
          ],
          targets: [eventTarget("target:drowsy")],
          do: [
            operation("saving-throw", {
              id: "repeat-save",
              ability: ["wis"],
              target: "target:drowsy",
              onSave: "none",
            }),
          ],
        }),
        rule({
          id: "sleep-repeat-save-succeeded",
          on: trigger("operation-outcome", {
            operationId: "repeat-save",
            outcome: "success",
          }),
          targets: [eventTarget("target:repeat-succeeded")],
          do: [
            operation("delete-artifact", {
              id: "repeat-succeeded:remove-incapacitated",
              artifactId: "sleep-incapacitated",
              target: "target:repeat-succeeded",
            }),
          ],
        }),
      ],
    }),
  ],
  accepted: acceptance(QA_LOG, [
    "DM 在 60 ft 内放置 5-ft-radius 球状区域，只消耗一个一环或更高法术位并建立最长一分钟专注",
    "区域内每个 creature 立即进行 Wisdom save；失败者陷入失能，成功者不受影响",
    "失能目标在其回合结束时重复一次 Wisdom save；成功则移除失能并恢复正常",
    "第二次失败本应转为昏迷（持续到法术结束，受伤或摇醒结束）；该升级分支保持为明确 omission，由 DM 手动追加",
    "法术到期或专注结束清理全部仍存在的本来源失能效果",
    "5R 的目标选择、无需睡眠/免疫疲竭自动成功与摇醒动作保持明确 omission",
  ], { status: "compiler-passed" }),
});

export default sleep;
