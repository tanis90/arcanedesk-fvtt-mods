import {
  acceptance,
  cleanRoomEffect,
  cleanRoomSpell,
  consume,
  duration,
  graphFragment,
  operation,
  predicate,
  publicAction,
  rule,
  selected,
  spellContract,
  spellLifetime,
  trigger,
  whileSpellActive,
} from "@arcanedesk/spell-compiler/dsl";

const L5_WAVE_I2_QA_RECEIPT =
  "docs/foundry-automation/notes/spell-level-5-wave-i2-qa-2026-08-26.md";

const seeming = cleanRoomSpell({
  id: "seeming",
  contract: spellContract({
    ruleset: "2014",
    level: 5,
    school: "ill",
    components: {
      verbal: true,
      somatic: true,
      material: false,
    },
    lifetime: spellLifetime(duration(8, "hours")),
  }),
  emission: { contentVersion: 1 },
  support: {
    level: "marker-only",
    omissions: [
      "系统不生成、存储或验证目标的新外观，也不自动裁定一尺身高差、体型与肢体结构限制、服装、护甲、武器或装备的幻象表现",
      "系统不为每个目标询问 willing/unwilling，也不自动进行不愿意目标的 Charisma save；DM 在施法前完成裁定，只把 willing 或豁免失败的目标交给公开 Cast",
      "触摸产生的物理识破与 Intelligence (Investigation) check 由 DM 处理；marker 不表示观察者尚未识破目标，也不会因识破自动删除",
    ],
  },
  fragments: [
    graphFragment({
      id: "seeming-graph",
      actions: [publicAction("cast", "伪装术 Seeming")],
      artifacts: [
        cleanRoomEffect("seeming", {
          host: "actor",
          scope: "source-target",
          reapply: "replace",
          name: "Seeming",
          markerOnly: true,
          modifiers: [],
          lifecycle: whileSpellActive(),
        }),
      ],
      rules: [
        rule({
          id: "cast-seeming",
          on: trigger("action-used", { actionId: "cast" }),
          targets: [
            selected("target:cast", {
              min: 1,
              max: "any",
              range: 30,
              units: "ft",
              kind: "creature",
              predicates: [predicate("visible-to-source")],
            }),
          ],
          do: [
            consume(),
            operation("apply-artifact", {
              id: "cast:apply-seeming",
              artifactId: "seeming",
              target: "target:cast",
            }),
          ],
        }),
      ],
    }),
  ],
  accepted: acceptance(L5_WAVE_I2_QA_RECEIPT, [
    "公开 Cast 接受 30 ft 内由 DM 明确声明为可见、至少一个且不设固定上限的 creature 目标，并只消耗一个明确声明的五环或更高法术位",
    "每个明确目标获得一个持续八小时、无专注且具有独立 source-target identity 的 Seeming marker；非目标保持不变",
    "同一来源对同一目标重施只替换自己的 marker，不删除或改写其他来源的 Seeming marker；到期或手动删除时只清理对应来源实例",
    "marker 不含 status、modifier 或外观数据，不冒充已生成或验证幻象外观、体型、服装、护甲、武器或装备",
    "DM 在调用前完成 willing/unwilling 与 Charisma save 裁定，只提交 willing 或豁免失败目标；触摸识破和 Investigation check 保持 HITL，系统不新增逐目标 chooser",
  ], { status: "compiler-runtime-passed" }),
});

export default seeming;
