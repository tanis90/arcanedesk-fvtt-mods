import {
  acceptance,
  allAttackRolls,
  cleanRoomEffect,
  cleanRoomSpell,
  concentration,
  consume,
  contentRef,
  duration,
  eventTarget,
  grantAttackAdvantage,
  grantConditionImmunity,
  graphFragment,
  minimumTokenLight,
  constant,
  operation,
  placedTemplate,
  publicAction,
  rule,
  spellContract,
  trigger,
  whileSpellActive,
} from "@arcanedesk/spell-compiler/dsl";

const I2B_QA_LOG =
  "docs/foundry-automation/notes/spell-combat-test-cases-1-3.md";

const faerieFire = cleanRoomSpell({
  id: "faerie-fire",
  contract: spellContract({
    ruleset: "2014",
    level: 1,
    school: "evo",
    components: {
      verbal: true,
      somatic: false,
      material: false,
    },
    lifetime: concentration(duration(1, "minutes")),
  }),
  content: contentRef("faerie-fire"),
  emission: { contentVersion: 7 },
  support: {
    level: "simplified",
    omissions: [
      "区域内物体的轮廓及其 10 ft dim light 不创建自动化 Artifact",
      "攻击者必须能看见受影响目标的优势门槛不自动判定，由 DM 排除不满足条件的攻击",
    ],
  },
  fragments: [
    graphFragment({
      id: "faerie-fire-graph",
      actions: [
        publicAction("cast", "妖火 Faerie Fire"),
      ],
      artifacts: [
        cleanRoomEffect("faerie-fire", {
          host: "actor",
          scope: "source-target",
          reapply: "replace",
          name: "Faerie Fire",
          modifiers: [
            grantConditionImmunity("invisible"),
            grantAttackAdvantage(allAttackRolls()),
            minimumTokenLight(constant(0), constant(10)),
          ],
          lifecycle: whileSpellActive(),
        }),
      ],
      rules: [
        rule({
          id: "cast-faerie-fire",
          on: trigger("action-used", { actionId: "cast" }),
          targets: [
            placedTemplate("target:cast", {
              type: "cube",
              size: 20,
              range: 60,
              evaluation: "snapshot",
            }),
          ],
          do: [
            consume(),
            operation("saving-throw", {
              id: "initial-save",
              ability: ["dex"],
              target: "target:cast",
              onSave: "none",
            }),
          ],
        }),
        rule({
          id: "apply-faerie-fire-on-failed-save",
          on: trigger("operation-outcome", {
            operationId: "initial-save",
            outcome: "failure",
          }),
          targets: [eventTarget("failed-target")],
          do: [
            operation("apply-artifact", {
              id: "apply-faerie-fire",
              artifactId: "faerie-fire",
              target: "failed-target",
            }),
          ],
        }),
      ],
    }),
  ],
  accepted: acceptance(I2B_QA_LOG, [
    "DM 在 60 ft 内放置 20-ft cube，并由同一 workflow 快照模板成员",
    "模板成员进行 Dexterity save",
    "失败者不能从隐形获益，且针对它的攻击获得优势",
    "成功者不受影响",
    "只消耗一个一环或更高环位并建立最长一分钟的专注",
    "解除或替换专注会清理仍存在的 Faerie Fire 效果",
    "失败生物通过 ATL minimum light 发出 10 ft dim light；物体轮廓与攻击者可见性门槛保持明确 omission",
  ], { status: "compiler-runtime-passed" }),
});

export default faerieFire;
