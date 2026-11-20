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
  halveAllMovement,
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

// 2024 重写批（M1.0 审计 C 桶 recipe-invalid）：伤害结算由「区域内开始回合」
// 改为「进入光环 / 在光环内结束回合」，可按阵营取光耀或暗蚀。
// 5R 锚点：5R 玩家手册2024 3环.htm#Spirit_Guardians。
const guardiansDamage = perSlotAboveBase(
  dice(3, 8),
  dice(1, 8),
);

const oncePerTurn = () => predicate("once-per-turn", {
  identity: "zoneInstanceId + targetUuid + turn",
});

const spiritGuardians = cleanRoomSpell({
  id: "spirit-guardians",
  contract: spellContract({
    ruleset: "2024",
    level: 3,
    school: "con",
    components: {
      verbal: true,
      somatic: true,
      material: true,
    },
    lifetime: concentration(duration(10, "minutes")),
  }),
  emission: { contentVersion: 6 },
  support: {
    level: "simplified",
    omissions: [
      "5R 的光环跟随施法者；following-aura adapter 只支持「进入 + 回合开始」脉冲，无法表达 2024 的回合结束结算，故改用可移动模板表示 15 ft 光环——施法者移动后需由 DM 手动拖动模板",
      "光环移动到生物空间内（而非生物自己进入）不触发进入豁免：进入事件只从 token 移动检测，这类结算由 DM 补掷",
      "施法时可指定任意数量生物不受影响；当前按施法者敌我 disposition 传播（opposing-disposition），具体排除名单由 DM 声明",
      "伤害类型按阵营二选一（善良/中立光耀、邪恶暗蚀）未参数化：伤害 op 只接受固定伤害类型，当前固定为 radiant，邪恶施法者需由 DM 改成 necrotic",
      "多个不同环位的灵体卫士重叠时，成员只保留一个非叠加效果；最强来源由 DM 裁定",
    ],
  },
  fragments: [
    graphFragment({
      id: "spirit-guardians-graph",
      actions: [publicAction("cast", "召唤灵体卫士 Summon Spirit Guardians")],
      artifacts: [
        artifact({
          id: "guardians-aura-zone",
          kind: "zone",
          role: "mechanical",
          identity: { scope: "cast", keys: ["castId"] },
          state: {
            anchor: "movable-template",
            shape: { type: "radius", size: 15, units: "ft" },
            stationary: false,
          },
          lifecycle: whileSpellActive(),
        }),
        cleanRoomEffect("guardians-aura-membership", {
          host: "actor",
          scope: "source-target",
          reapply: "replace",
          name: "Spirit Guardians",
          modifiers: [halveAllMovement()],
          lifecycle: whileArtifact("guardians-aura-zone"),
        }),
      ],
      rules: [
        rule({
          id: "cast-spirit-guardians",
          on: trigger("action-used", { actionId: "cast" }),
          targets: [
            placedTemplate("target:cast", {
              type: "radius",
              size: 15,
              range: null,
              rangeUnits: "self",
              evaluation: "snapshot",
            }),
          ],
          do: [
            consume(),
            operation("create-artifact", {
              id: "cast:create-zone",
              artifactId: "guardians-aura-zone",
              target: "target:cast",
            }),
          ],
        }),
        rule({
          id: "guardians-entry",
          on: trigger("enter", { zoneId: "guardians-aura-zone" }),
          when: [oncePerTurn()],
          targets: [eventTarget("target:entry")],
          do: [
            operation("saving-throw", {
              id: "entry-save",
              ability: ["wis"],
              target: "target:entry",
              onSave: "half",
            }),
            operation("damage", {
              id: "entry-damage",
              target: "target:entry",
              formula: guardiansDamage,
              damageTypes: ["radiant"],
              onSave: "half",
            }),
          ],
        }),
        rule({
          id: "guardians-turn-end",
          on: trigger("turn-end", { subject: "zone-member" }),
          when: [
            predicate("artifact-exists", {
              artifactId: "guardians-aura-membership",
              subject: "effect-target",
            }),
            oncePerTurn(),
          ],
          targets: [eventTarget("target:turn-end")],
          do: [
            operation("saving-throw", {
              id: "turn-end-save",
              ability: ["wis"],
              target: "target:turn-end",
              onSave: "half",
            }),
            operation("damage", {
              id: "turn-end-damage",
              target: "target:turn-end",
              formula: guardiansDamage,
              damageTypes: ["radiant"],
              onSave: "half",
            }),
          ],
        }),
      ],
    }),
  ],
  accepted: acceptance(QA_LOG, [
    "self cast 只消耗一个三环或更高环位的法术位，并建立最长十分钟专注；光环以 15 ft 可移动模板表示，由 DM 跟随施法者拖动",
    "光环成员的所有移动方式减半；离开范围时自动移除，重新进入只恢复一个来源绑定效果",
    "施法时已在范围内的敌人不会立即结算；其后首次进入光环或在光环内结束回合时进行 Wisdom save",
    "失败承受 3d8 radiant damage、成功承受一半，每升一环增加 1d8；进入与回合结束共享同一来源、目标和回合的去重 receipt",
    "2024 伤害类型按阵营二选一（极端邪恶为 necrotic）未参数化，当前固定 radiant",
    "不同施法来源相互隔离；结束或替换一名施法者的专注只清理该来源的光环与成员效果",
  ], { status: "compiler-passed" }),
});

export default spiritGuardians;
