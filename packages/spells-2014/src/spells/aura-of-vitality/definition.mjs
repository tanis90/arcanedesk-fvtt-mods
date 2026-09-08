import {
  acceptance,
  cleanRoomEffect,
  cleanRoomRangeIndicator,
  cleanRoomSpell,
  concentration,
  consume,
  dice,
  duration,
  graphFragment,
  operation,
  predicate,
  publicAction,
  requiresSourceArtifact,
  rule,
  selected,
  self,
  spellContract,
  trigger,
  whileSpellActive,
} from "@arcanedesk/spell-compiler/dsl";

const auraOfVitality = cleanRoomSpell({
  id: "aura-of-vitality",
  contract: spellContract({
    ruleset: "2014",
    level: 3,
    school: "evo",
    components: {
      verbal: true,
      somatic: false,
      material: false,
    },
    lifetime: concentration(duration(1, "minutes")),
  }),
  emission: { contentVersion: 6 },
  support: { level: "full", omissions: [] },
  fragments: [
    graphFragment({
      id: "aura-of-vitality-graph",
      actions: [
        publicAction("cast", "开启活力灵光 Enable Aura"),
        publicAction("heal", "活力灵光：治疗 Heal Target", {
          activationType: "bonus",
          availableWhen: [requiresSourceArtifact("aura-source")],
        }),
      ],
      artifacts: [
        cleanRoomEffect("aura-source", {
          host: "actor",
          scope: "source",
          reapply: "replace",
          name: "Aura of Vitality",
          modifiers: [],
          lifecycle: whileSpellActive(),
        }),
        cleanRoomRangeIndicator("range-indicator", {
          sourceArtifactId: "aura-source",
          radius: 30,
          color: "#22c55e",
        }),
      ],
      rules: [
        rule({
          id: "cast-aura",
          on: trigger("action-used", { actionId: "cast" }),
          targets: [self("target:cast")],
          do: [
            consume(),
            operation("apply-artifact", {
              id: "cast:apply-source",
              artifactId: "aura-source",
              target: "source",
            }),
          ],
        }),
        rule({
          id: "heal-pulse",
          on: trigger("action-used", { actionId: "heal" }),
          when: [
            predicate("artifact-exists", {
              artifactId: "aura-source",
              subject: "source",
            }),
          ],
          targets: [
            selected("target:heal", {
              min: 1,
              max: 1,
              range: 30,
              kind: "creature",
            }),
          ],
          do: [
            operation("healing", {
              id: "heal:2d6",
              target: "target:heal",
              formula: dice(2, 6),
              healingTypes: ["healing"],
            }),
          ],
        }),
      ],
    }),
  ],
  accepted: acceptance(
    "docs/foundry-automation/notes/法术编译器clean-room实施计划.md",
    [
      "cast 是 action，只消耗一个三环或更高法术位并建立一分钟专注与 source marker",
      "source marker 显示一个跟随施法者的 30-ft 圆形范围提示，但不会自动治疗范围成员",
      "heal 是独立 bonus action，只治疗一个 30-ft 内声明目标 2d6，且不再次消耗法术位",
      "source marker 结束后 heal 不再可见或可用",
      "范围内其他生物不会被自动治疗",
    ],
    { status: "compiler-runtime-passed" },
  ),
});

export default auraOfVitality;
