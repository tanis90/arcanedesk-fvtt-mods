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

// 2024 重写批：审计 transplant-ok（2d6 火焰/敏捷半伤/升环一致），但 summon 池 documentId
// 只能解析到模块内 summons 包，官方 actors24 uuid 不可用，故以 5 ft 可移动区域表达法球。
// 5R 锚点：5R 玩家手册2024 2环.htm#Flaming_Sphere。
const sphereDamage = perSlotAboveBase(
  dice(2, 6),
  dice(1, 6),
);

const flamingSphere = cleanRoomSpell({
  id: "flaming-sphere",
  contract: spellContract({
    ruleset: "2024",
    level: 2,
    school: "con",
    components: {
      verbal: true,
      somatic: true,
      material: true,
    },
    material: {
      cost: 0,
      consumed: false,
    },
    lifetime: concentration(duration(1, "minutes")),
  }),
  emission: { contentVersion: 1 },
  support: {
    level: "simplified",
    omissions: [
      "法球不建 Actor/Token：以跟随 DM 拖动的 5 ft 可移动模板表示，附赠动作移动 30 ft 由 DM 手动拖动模板完成，系统不校验距离、路径、5 ft 障碍或 10 ft 陷坑",
      "「将火球移入生物所占据的空间」触发的豁免由模板移动造成，ActiveAuras enter 事件只从 token 移动检测，因此该次豁免与火球停止移动由 DM 裁定",
      "法球散发的 20 ft 明亮光照与额外 20 ft 微光光照不绑定到模板，由 DM 放置光源或口头说明",
      "被火球点燃的未着装/未携带可燃物件、场景物件与其他环境交互不实现",
      "「直径 5 ft 法球周围 5 ft 内」以半径 5 ft 模板近似；模板只承诺 XY 几何，高程与特殊地形由 DM 处理",
      "同一回合多次进入/离开模板不额外结算，回合结束豁免按 zoneInstanceId + targetUuid + turn 去重",
    ],
  },
  fragments: [
    graphFragment({
      id: "flaming-sphere-graph",
      actions: [
        publicAction("cast", "召唤炽焰法球 Summon Flaming Sphere"),
      ],
      artifacts: [
        artifact({
          id: "flaming-sphere-zone",
          kind: "zone",
          role: "mechanical",
          identity: { scope: "cast", keys: ["castId"] },
          state: {
            anchor: "movable-template",
            shape: { type: "radius", size: 5, units: "ft" },
            stationary: false,
          },
          lifecycle: whileSpellActive(),
        }),
        cleanRoomEffect("flaming-sphere-membership", {
          host: "actor",
          scope: "source-target",
          reapply: "replace",
          name: "Flaming Sphere Area",
          markerOnly: true,
          lifecycle: whileArtifact("flaming-sphere-zone"),
        }),
      ],
      rules: [
        rule({
          id: "cast-flaming-sphere",
          on: trigger("action-used", { actionId: "cast" }),
          targets: [
            placedTemplate("target:cast", {
              type: "radius",
              size: 5,
              range: 60,
              evaluation: "snapshot",
            }),
          ],
          do: [
            consume(),
            operation("create-artifact", {
              id: "cast:create-zone",
              artifactId: "flaming-sphere-zone",
              target: "target:cast",
            }),
          ],
        }),
        rule({
          id: "flaming-sphere-turn-end",
          on: trigger("turn-end", { subject: "zone-member" }),
          when: [
            predicate("artifact-exists", {
              artifactId: "flaming-sphere-membership",
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
              ability: ["dex"],
              target: "target:turn-end",
              onSave: "half",
            }),
            operation("damage", {
              id: "turn-end-damage",
              target: "target:turn-end",
              formula: sphereDamage,
              damageTypes: ["fire"],
              onSave: "half",
            }),
          ],
        }),
      ],
    }),
  ],
  accepted: acceptance(QA_LOG, [
    "cast 只消耗一个二环或更高法术位并建立最长一分钟专注；在 60 ft 内一处未占据空间放置半径 5 ft 的可移动法球模板",
    "生物在法球 5 ft 内结束其回合时进行 Dexterity save，失败受到 2d6 fire damage，成功只受一半",
    "每比二环高一环，伤害增加 1d6；同一目标同一回合的回合结束结算只触发一次",
    "法球的附赠动作 30 ft 移动、移入生物空间触发的豁免与停止移动由 DM 拖动模板并裁定",
    "20 ft 明亮光照、额外 20 ft 微光、可燃物件点燃与地形障碍保持明确 omission",
    "专注结束、替换或到期时按本次 cast provenance 清理法球模板与成员 marker",
  ], { status: "compiler-passed" }),
});

export default flamingSphere;
