import {
  COMPILER_MIGRATION_LOG,
  acceptance,
  artifact,
  cleanRoomEffect,
  cleanRoomSpell,
  concentration,
  consume,
  dice,
  duration,
  eventTarget,
  graphFragment,
  operation,
  perSlotAboveBase,
  placedTemplate,
  predicate,
  publicAction,
  rule,
  spellContract,
  trigger,
  whileArtifact,
  whileSpellActive,
} from "../dsl.mjs";

const moonbeamDamage = perSlotAboveBase(
  dice(2, 10),
  dice(1, 10),
);

const moonbeam = cleanRoomSpell({
  id: "moonbeam",
  contract: spellContract({
    ruleset: "2014",
    level: 2,
    school: "evo",
    components: {
      verbal: true,
      somatic: true,
      material: true,
    },
    lifetime: concentration(duration(1, "minutes")),
  }),
  emission: { contentVersion: 9 },
  support: {
    level: "simplified",
    omissions: [
      "Shapechanger trait 生物的 Constitution save 应具有劣势；当前 DSL 缺少按 creature trait 条件化 saving-throw roll mode 的原语，暂由 DM 处理",
      "Shapechanger 豁免失败时应立即恢复原形，并在离开月华之光前不能再次变形；当前 DSL/runtime 缺少可逆 transform 与 zone-bound shapechange lock，暂由 DM 处理",
      "施法后的每个施法者回合可用 action 将光柱移动至多 60 ft；当前由 DM 手工拖动模板，action economy、模板所有权与合法移动距离仍由 DM 校验",
      "光柱内的 dim light 只保留为规则文本，不自动修改 Foundry lighting",
    ],
  },
  fragments: [
    graphFragment({
      id: "moonbeam-zone-graph",
      actions: [publicAction("cast", "放置月华之光 Place Moonbeam")],
      artifacts: [
        artifact({
          id: "moonbeam-zone",
          kind: "zone",
          role: "mechanical",
          identity: { scope: "cast", keys: ["castId"] },
          state: {
            anchor: "movable-template",
            shape: {
              type: "cylinder",
              radius: 5,
              height: 40,
              units: "ft",
            },
            stationary: false,
          },
          lifecycle: whileSpellActive(),
        }),
        cleanRoomEffect("moonbeam-membership", {
          host: "actor",
          scope: "source-target",
          reapply: "replace",
          name: "Moonbeam",
          lifecycle: whileArtifact("moonbeam-zone"),
        }),
      ],
      rules: [
        rule({
          id: "cast-moonbeam",
          on: trigger("action-used", { actionId: "cast" }),
          targets: [placedTemplate("target:cast", {
            type: "cylinder",
            size: 5,
            height: 40,
            range: 120,
            evaluation: "snapshot",
          })],
          do: [
            consume(),
            operation("create-artifact", {
              id: "cast:create-zone",
              artifactId: "moonbeam-zone",
              target: "target:cast",
            }),
          ],
        }),
        rule({
          id: "moonbeam-entry",
          on: trigger("enter", { zoneId: "moonbeam-zone" }),
          when: [
            predicate("once-per-turn", {
              identity: "zoneInstanceId + targetUuid + turn",
            }),
          ],
          targets: [eventTarget("target:entry")],
          do: [
            operation("saving-throw", {
              id: "entry-save",
              ability: ["con"],
              target: "target:entry",
              onSave: "half",
            }),
            operation("damage", {
              id: "entry-damage",
              target: "target:entry",
              formula: moonbeamDamage,
              damageTypes: ["radiant"],
              onSave: "half",
            }),
          ],
        }),
        rule({
          id: "moonbeam-turn-start",
          on: trigger("turn-start", { subject: "zone-member" }),
          when: [
            predicate("artifact-exists", {
              artifactId: "moonbeam-membership",
              subject: "effect-target",
            }),
            predicate("once-per-turn", {
              identity: "zoneInstanceId + targetUuid + turn",
            }),
          ],
          targets: [eventTarget("target:turn")],
          do: [
            operation("saving-throw", {
              id: "turn-save",
              ability: ["con"],
              target: "target:turn",
              onSave: "half",
            }),
            operation("damage", {
              id: "turn-damage",
              target: "target:turn",
              formula: moonbeamDamage,
              damageTypes: ["radiant"],
              onSave: "half",
            }),
          ],
        }),
      ],
    }),
  ],
  accepted: acceptance(COMPILER_MIGRATION_LOG, [
    "DM 在 120 ft 内放置 5-ft-radius、40-ft-high cylinder；初次放置不立即造成伤害",
    "施法消耗一个二环或更高环位并建立最多一分钟专注；取消或替换专注清理区域和成员 marker",
    "生物每回合首次主动进入区域或在区域内开始回合时进行 Constitution save，失败承受 2d10 radiant damage、成功承受一半",
    "每升一环增加 1d10 radiant damage，同一法术实例对同一目标在同一回合只结算一次",
    "Shapechanger 的条件劣势、失败恢复原形与离开区域前禁止再次变形保持为明确自动化边界，不以普通 creature type 或状态 marker 冒充",
    "DM 手工拖动模板会刷新区域成员但不触发进入伤害；action economy 与 60 ft 合法移动距离仍由 DM 校验",
  ], { status: "compiler-runtime-passed" }),
});

export default moonbeam;
