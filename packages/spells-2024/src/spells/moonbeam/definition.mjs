import {
  QA_LOG,
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
} from "@arcanedesk/spell-compiler/dsl";

// 2024 重写批（M1.0 审计 C 桶 recipe-invalid）：结算时机由"进入/回合开始"
// 改为"出现/移入/进入/回合结束"，并删除变形生物的豁免劣势。
// 5R 锚点：5R 玩家手册2024 2环.htm#Moonbeam。
const moonbeamDamage = perSlotAboveBase(
  dice(2, 10),
  dice(1, 10),
);

const moonbeam = cleanRoomSpell({
  id: "moonbeam",
  contract: spellContract({
    ruleset: "2024",
    level: 2,
    school: "evo",
    components: {
      verbal: true,
      somatic: true,
      material: true,
    },
    lifetime: concentration(duration(1, "minutes")),
  }),
  emission: { contentVersion: 10 },
  support: {
    level: "simplified",
    omissions: [
      "变形生物豁免失败时应立即变回真实形态，并在离开光柱前不能再次变形；当前 DSL/runtime 缺少可逆 transform 与 zone-bound shapechange lock，由 DM 处理",
      "施法后的每个施法者回合可用一个魔法动作将光柱移动至多 60 ft；模板拖动、action economy 与合法移动距离由 DM 校验",
      "光柱把区域变为微光光照只保留为规则文本，不自动修改 Foundry lighting",
      "光柱移动到生物空间内（而非生物自己进入）不触发进入豁免：enter 事件只从 token 移动检测，这类结算由 DM 补掷",
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
            operation("saving-throw", {
              id: "appear-save",
              ability: ["con"],
              target: "target:cast",
              onSave: "half",
            }),
            operation("damage", {
              id: "appear-damage",
              target: "target:cast",
              formula: moonbeamDamage,
              damageTypes: ["radiant"],
              onSave: "half",
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
          id: "moonbeam-turn-end",
          on: trigger("turn-end", { subject: "zone-member" }),
          when: [
            predicate("artifact-exists", {
              artifactId: "moonbeam-membership",
              subject: "effect-target",
            }),
            predicate("once-per-turn", {
              identity: "zoneInstanceId + targetUuid + turn",
            }),
          ],
          targets: [eventTarget("target:turn-end")],
          do: [
            operation("saving-throw", {
              id: "turn-end-save",
              ability: ["con"],
              target: "target:turn-end",
              onSave: "half",
            }),
            operation("damage", {
              id: "turn-end-damage",
              target: "target:turn-end",
              formula: moonbeamDamage,
              damageTypes: ["radiant"],
              onSave: "half",
            }),
          ],
        }),
      ],
    }),
  ],
  accepted: acceptance(QA_LOG, [
    "DM 在 120 ft 内放置 5-ft-radius、40-ft-high cylinder；光柱出现时区域内每个 creature 立即进行 Constitution save",
    "施法消耗一个二环或更高环位并建立最多一分钟专注；取消或替换专注清理区域与成员 marker",
    "creature 进入区域或在其内结束回合时进行 Constitution save，失败承受 2d10 radiant damage、成功承受一半",
    "每升一环增加 1d10 radiant damage，同一法术实例对同一目标在同一回合只结算一次",
    "2024 不再给变形生物的豁免附加劣势；变形恢复与离开区域前禁止再次变形保持为明确自动化边界",
    "DM 手工拖动模板会刷新区域成员但不触发进入伤害；action economy 与 60 ft 合法移动距离仍由 DM 校验",
  ], { status: "compiler-passed" }),
});

export default moonbeam;
