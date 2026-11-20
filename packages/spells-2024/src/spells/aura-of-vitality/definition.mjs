import {
  QA_LOG,
  acceptance,
  cleanRoomEffect,
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
  cleanRoomRangeIndicator,
} from "@arcanedesk/spell-compiler/dsl";

// L4 移植批（非 SRD，spells24 无源文档）：G 桶 + 2014 recipe aura-of-vitality。
// 5R 锚点 三环.htm#Aura_of_Vitality。与 2014 差异：学派 塑能→防护；治疗由附赠动作改为创造灵光时与每个自己回合开始的免费选择（每回合 2d6）。
const auraOfVitality = cleanRoomSpell({
  id: "aura-of-vitality",
  contract: spellContract({
    ruleset: "2024",
    level: 3,
    school: "abj",
    components: {
      verbal: true,
      somatic: false,
      material: false,
    },
    lifetime: concentration(duration(1, "minutes")),
  }),
  emission: { contentVersion: 1 },
  support: {
    level: "simplified",
    omissions: [
      "5R 的治疗时机是创造灵光时与你每个自己回合开始时，每回合一次，且不消耗动作与法术位；runtime 不绑定该时机，改由一个 special 激活的 heal 动作供 DM 在正确时点使用，频次由 DM 把握",
      "治疗目标是半径 30 ft 光环区域里你选择的一名生物；runtime 只校验 30 ft 距离，不校验是否属于光环区域的实际成员，也不自动治疗全体成员",
      "heal 动作不再次消耗法术位；若 DM 在错误时点调用，系统不会拒绝",
    ],
  },
  fragments: [
    graphFragment({
      id: "aura-of-vitality-graph",
      actions: [
        publicAction("cast", "活力灵光 Aura of Vitality"),
        publicAction("heal", "活力灵光：治疗一名生物 Heal One Creature", {
          activationType: "special",
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
  accepted: acceptance(QA_LOG, [
    "cast 是动作，只消耗一个三环或更高法术位并建立一分钟专注与 source marker",
    "source marker 显示一个跟随施法者的 30-ft 圆形范围提示，但不会自动治疗范围成员",
    "heal 是不消耗动作经济的独立入口，只治疗一个 30-ft 内声明目标 2d6，且不再次消耗法术位",
    "5R 的可用时机（创造灵光时与每个自己回合开始、每回合一次）由 DM 把握，runtime 不绑定回合事件",
    "source marker 结束后 heal 不再可见或可用；范围内其他生物不会被自动治疗",
  ], { status: "compiler-passed" }),
});

export default auraOfVitality;
