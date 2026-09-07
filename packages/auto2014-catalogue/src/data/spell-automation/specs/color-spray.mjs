import {
  compilerAcceptance,
  cleanRoomEffect,
  cleanRoomSpell,
  consume,
  dice,
  duration,
  grantStatus,
  graphFragment,
  operation,
  perSlotAboveBase,
  placedTemplate,
  publicAction,
  rule,
  spellContract,
  spellLifetime,
  trigger,
  untilTrigger,
} from "../dsl.mjs";

const EXPANSION_BATCH =
  "docs/foundry-automation/notes/零至三环新法术扩展批次.md";

const colorSpray = cleanRoomSpell({
  id: "color-spray",
  contract: spellContract({
    ruleset: "2014",
    level: 1,
    school: "ill",
    components: {
      verbal: true,
      somatic: true,
      material: true,
    },
    lifetime: spellLifetime(duration(1, "rounds")),
  }),
  emission: { contentVersion: 1 },
  support: {
    level: "simplified",
    omissions: [
      "当前 blinded 状态会被排除，但没有可靠的通用字段表达所有非状态型的‘无法看见’；罕见的无视觉器官或特殊感知边界由 DM 裁定",
    ],
  },
  fragments: [
    graphFragment({
      id: "color-spray-graph",
      actions: [publicAction("cast", "七彩喷射 Color Spray")],
      artifacts: [
        cleanRoomEffect("color-spray-blinded", {
          host: "actor",
          scope: "source-target",
          reapply: "replace",
          name: "Color Spray",
          modifiers: [grantStatus("blinded")],
          lifecycle: untilTrigger(
            trigger("turn-end", {
              subject: "source",
              occurrence: "next-after-created",
            }),
          ),
        }),
      ],
      rules: [
        rule({
          id: "cast-color-spray",
          on: trigger("action-used", { actionId: "cast" }),
          targets: [
            placedTemplate("target:cast", {
              type: "cone",
              size: 15,
              range: null,
              rangeUnits: "self",
              evaluation: "snapshot",
            }),
          ],
          do: [
            consume(),
            operation("allocate-hit-point-pool", {
              id: "cast:allocate-color-spray-pool",
              target: "target:cast",
              formula: perSlotAboveBase(
                dice(6, 10),
                dice(2, 10),
              ),
              artifactId: "color-spray-blinded",
              eligibility: {
                currentHitPoints: "positive",
                excludedStatuses: ["blinded", "dead", "unconscious"],
                requiredSusceptibility: "condition:blinded",
              },
            }),
          ],
        }),
      ],
    }),
  ],
  accepted: compilerAcceptance(EXPANSION_BATCH, [
    "DM 从施法者位置确定一个 15-ft cone，并由同一 workflow 快照模板内 creature；一次施法只消耗一个法术位",
    "一环掷 6d10 建立生命值池，每升一环增加 2d10",
    "忽略 blinded、dead、unconscious 与具有结构化 blinded 免疫的目标；其余目标按当前 HP 从低到高、同 HP 按稳定 token id 分配，池不足以覆盖整个目标时跳过该目标",
    "分配成功的目标获得独立 source-target identity 的 blinded，未分配目标与非目标不变",
    "blinded 在施法者下一回合结束时精确移除；结算后删除瞬时 measured template，且不建立专注",
  ]),
});

export default colorSpray;
