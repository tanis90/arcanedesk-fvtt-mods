import {
  acceptance,
  artifact,
  cleanRoomEffect,
  cleanRoomSpell,
  concentration,
  consume,
  contentRef,
  duration,
  eventTarget,
  grantStatus,
  graphFragment,
  operation,
  placedTemplate,
  publicAction,
  rule,
  spellContract,
  trigger,
  whileArtifact,
  whileSpellActive,
} from "../dsl.mjs";

const EXPANSION_BATCH =
  "docs/foundry-automation/notes/零至三环新法术扩展批次.md";

const entangle = cleanRoomSpell({
  id: "entangle",
  contract: spellContract({
    ruleset: "2014",
    level: 1,
    school: "con",
    components: {
      verbal: true,
      somatic: true,
      material: false,
    },
    lifetime: concentration(duration(1, "minutes")),
  }),
  content: contentRef("entangle"),
  emission: { contentVersion: 1 },
  support: {
    level: "simplified",
    omissions: [
      "20-ft square 内的 difficult terrain 需要按实际穿越路径增加移动消耗，不能等价为减半角色速度；当前 DSL/runtime 没有 zone movement-cost 原语，暂由 DM 处理",
      "被植物束缚的生物应能用自己的 action 进行 Strength check 对抗来源施法者的 spell save DC，成功后只移除自身本来源效果；当前 DSL 没有由目标 effect 授予 action、跨来源 DC ability check 与精确自助解除的组合原语，暂由 DM 掷检定并移除效果",
      "ActiveAuras 与当前模板成员查询只承诺 XY 几何；离地且未接触植物的 creature 可能仍落入正方形投影，需由 DM 按 elevation 排除",
    ],
  },
  fragments: [
    graphFragment({
      id: "entangle-zone-graph",
      actions: [publicAction("cast", "放置纠缠术 Place Entangle")],
      artifacts: [
        artifact({
          id: "entangle-zone",
          kind: "zone",
          role: "mechanical",
          identity: { scope: "cast", keys: ["castId"] },
          state: {
            anchor: "placed-point",
            shape: { type: "square", size: 20, units: "ft" },
            stationary: true,
          },
          lifecycle: whileSpellActive(),
        }),
        cleanRoomEffect("entangle-membership", {
          host: "actor",
          scope: "source-target",
          reapply: "replace",
          name: "Entangle Area",
          markerOnly: true,
          lifecycle: whileArtifact("entangle-zone"),
        }),
        cleanRoomEffect("entangle-restrained", {
          host: "actor",
          scope: "source-target",
          reapply: "replace",
          name: "Entangle",
          modifiers: [grantStatus("restrained")],
          lifecycle: whileSpellActive(),
        }),
      ],
      rules: [
        rule({
          id: "cast-entangle",
          on: trigger("action-used", { actionId: "cast" }),
          targets: [
            placedTemplate("target:cast", {
              type: "square",
              size: 20,
              range: 90,
              evaluation: "snapshot",
            }),
          ],
          do: [
            consume(),
            operation("create-artifact", {
              id: "cast:create-zone",
              artifactId: "entangle-zone",
              target: "target:cast",
            }),
            operation("saving-throw", {
              id: "initial-save",
              ability: ["str"],
              target: "target:cast",
              onSave: "none",
            }),
          ],
        }),
        rule({
          id: "initial-save-failed",
          on: trigger("operation-outcome", {
            operationId: "initial-save",
            outcome: "failure",
          }),
          targets: [eventTarget("target:failed")],
          do: [
            operation("apply-artifact", {
              id: "failure:apply-restrained",
              artifactId: "entangle-restrained",
              target: "target:failed",
            }),
          ],
        }),
      ],
    }),
  ],
  accepted: acceptance(EXPANSION_BATCH, [
    "DM 在施法者 90 ft 内放置一个边长 20 ft 的正方形持续区域，并只消耗一个一环或更高法术位",
    "只有施法瞬间位于正方形内的 creature 进行 Strength save；成功者不改变，失败者获得来源绑定的 restrained",
    "后续进入区域的 creature 只成为区域成员，不补做首次豁免，也不会自动获得 restrained",
    "施法建立最长一分钟的专注；解除、替换或到期结束专注时删除区域、成员 marker 与仍存在的本来源 restrained",
    "difficult terrain 的路径移动消耗与目标花费 action 挣脱保持明确 omission，不以减半速度或重复 saving throw 冒充",
    "区域成员与初始目标判定只有 XY 保证；离地目标的垂直边界由 DM 处理",
  ], { status: "compiler-runtime-passed" }),
});

export default entangle;
