import {
  acceptance,
  cleanRoomEffect,
  cleanRoomRangeIndicator,
  cleanRoomSpell,
  concentration,
  consume,
  contentRef,
  dice,
  duration,
  graphFragment,
  operation,
  perSlotAboveBase,
  placedTemplate,
  predicate,
  publicAction,
  requiresSourceArtifact,
  rule,
  spellContract,
  trigger,
  whileSpellActive,
} from "../dsl.mjs";

const EXPANSION_BATCH =
  "docs/foundry-automation/notes/零至三环新法术扩展批次.md";

const callLightning = cleanRoomSpell({
  id: "call-lightning",
  contract: spellContract({
    ruleset: "2014",
    level: 3,
    school: "con",
    components: {
      verbal: true,
      somatic: true,
      material: false,
    },
    lifetime: concentration(duration(10, "minutes")),
  }),
  content: contentRef("call-lightning"),
  emission: { contentVersion: 1 },
  support: {
    level: "simplified",
    omissions: [
      "房间净高不足时施法失败不做场景几何判定，由 DM 裁定",
      "室外暴风雨环境下落雷伤害额外 +1d10 无结构化天气判定，由 DM 口头加骰",
      "头顶雷云仅为视觉标记，不建立区域、membership 或 zone-event 脉冲，无区域机械",
      "规则中的雷云位置应在施法时固定，后续落雷点也必须位于该雷云下；当前展示圈跟随施法者，CLI 不校验后续落点与原始雷云的位置关系",
    ],
  },
  fragments: [
    graphFragment({
      id: "call-lightning-graph",
      actions: [
        publicAction("cast", "召雷术 Call Lightning"),
        publicAction("bolt", "召雷术：落雷 Call Down Lightning", {
          activationType: "action",
          availableWhen: [requiresSourceArtifact("call-lightning-source")],
        }),
      ],
      artifacts: [
        cleanRoomEffect("call-lightning-source", {
          host: "actor",
          scope: "source",
          reapply: "replace",
          name: "Call Lightning",
          modifiers: [],
          lifecycle: whileSpellActive(),
        }),
        cleanRoomRangeIndicator("storm-cloud", {
          sourceArtifactId: "call-lightning-source",
          radius: 60,
          color: "#64748b",
        }),
      ],
      rules: [
        rule({
          id: "cast-call-lightning",
          on: trigger("action-used", { actionId: "cast" }),
          targets: [
            placedTemplate("target:cast", {
              type: "circle",
              size: 5,
              range: 120,
              evaluation: "snapshot",
            }),
          ],
          do: [
            consume(),
            operation("apply-artifact", {
              id: "cast:apply-source",
              artifactId: "call-lightning-source",
              target: "source",
            }),
            operation("saving-throw", {
              id: "initial-save",
              ability: ["dex"],
              target: "target:cast",
              onSave: "half",
            }),
            operation("damage", {
              id: "initial-damage",
              target: "target:cast",
              formula: perSlotAboveBase(
                dice(3, 10),
                dice(1, 10),
              ),
              damageTypes: ["lightning"],
              onSave: "half",
            }),
          ],
        }),
        rule({
          id: "bolt-call-lightning",
          on: trigger("action-used", { actionId: "bolt" }),
          when: [
            predicate("artifact-exists", {
              artifactId: "call-lightning-source",
              subject: "source",
            }),
          ],
          targets: [
            placedTemplate("target:bolt", {
              type: "circle",
              size: 5,
              range: 120,
              evaluation: "snapshot",
            }),
          ],
          do: [
            operation("saving-throw", {
              id: "bolt-save",
              ability: ["dex"],
              target: "target:bolt",
              onSave: "half",
            }),
            operation("damage", {
              id: "bolt-damage",
              target: "target:bolt",
              formula: perSlotAboveBase(
                dice(3, 10),
                dice(1, 10),
              ),
              damageTypes: ["lightning"],
              onSave: "half",
            }),
          ],
        }),
      ],
    }),
  ],
  accepted: acceptance(EXPANSION_BATCH, [
    "cast 是 action，只消耗一个三环或更高法术位，并建立最长十分钟专注与来源绑定的 call-lightning-source marker",
    "DM 在 120 ft 内放置 5-ft-radius circle，模板内 creature 进行 Dexterity save；失败承受 3d10 lightning damage，成功承受一半，每升一环增加 1d10",
    "bolt 是独立 action，只在施法者持有 call-lightning-source 时可见可用，且不再次消耗法术位",
    "bolt 每次使用由 DM 重新放置同样的 5-ft-radius circle，并复用与 cast 相同的 DEX save、半伤与 perSlotAboveBase(3d10, 1d10) 升环机械；落点是否位于施法时固定雷云下由 DM 裁定",
    "专注结束或十分钟到期时清理 call-lightning-source 与 storm-cloud 视觉标记，bolt 随之不再可用",
    "storm-cloud 是 60-ft-radius 的纯展示圆形标记：无 membership、无 zone-event 脉冲、不承担任何区域机械；clean-room range indicator 跟随施法者 token，未实现施法时固定位置",
    "房间净高失败、室外暴风雨加骰、固定雷云位置与后续落点约束严格保留在 support omissions，不误报为已实现",
  ], { status: "compiler-runtime-passed" }),
});

export default callLightning;
