import {
  acceptance,
  artifact,
  cleanRoomEffect,
  cleanRoomSpell,
  concentration,
  consume,
  contentRef,
  dice,
  duration,
  eventTarget,
  graphFragment,
  operation,
  placedTemplate,
  predicate,
  publicAction,
  rule,
  spellContract,
  trigger,
  whileArtifact,
  whileSpellActive,
} from "../dsl.mjs";

const EXPANSION_BATCH =
  "docs/foundry-automation/notes/零至三环新法术扩展批次.md";

const coldDamage = dice(2, 6);
const acidDamage = dice(2, 6);

// 冻结边界（2026-08-03 DM 拍板）：同一 zone 允许 turn-start 与 turn-end
// 双脉冲且机械不同，receipt 按相位分离；进入不结算伤害；区域内 blinded 与
// 无光遮蔽按 membership marker + 显式 omission 处理。
//
// 冻结边界明示的 omission：
// 1. 区域内 blinded 与“任何光（含魔法光）都无法照亮该区域”的遮蔽/视觉语义：
//    只落地来源绑定的 membership marker，不施加 blinded status、不改动
//    token 视觉/光照，由 DM 裁定；
// 2. 区域为 difficult terrain 的移动消耗：当前 DSL/runtime 没有 zone
//    movement-cost 原语，由 DM 处理（与 grease/plant-growth 缺口径一致）；
// 3. 2014 RAW 的 turn-end 脉冲是 Dexterity save 失败才受 2d6 acid；冻结边界
//    拍板为无豁免的 2d6 acid 直接伤害，故不实现该豁免。当前 canonical zone
//    pulse 也只有 save-only / damage-only / save+half 三种封闭形态，没有
//    “save 失败全额伤害”形态；
// 4. ActiveAuras 对 measured template 只提供 XY membership；20-ft-radius
//    sphere 的垂直边界与不同 elevation 的成员关系由 DM 处理。
const oncePerTurnPhase = () => predicate("once-per-turn", {
  identity: "zoneInstanceId + targetUuid + turn + phase",
});

const membershipGuard = () => predicate("artifact-exists", {
  artifactId: "hunger-of-hadar-membership",
  subject: "effect-target",
});

const hungerOfHadar = cleanRoomSpell({
  id: "hunger-of-hadar",
  contract: spellContract({
    ruleset: "2014",
    level: 3,
    school: "con",
    components: {
      verbal: true,
      somatic: true,
      material: true,
    },
    lifetime: concentration(duration(1, "minutes")),
  }),
  content: contentRef("hunger-of-hadar"),
  emission: { contentVersion: 1 },
  support: {
    level: "simplified",
    omissions: [
      "区域内 creature 的 blinded，以及“任何光（含魔法光）都无法照亮该区域”的遮蔽/视觉语义由 DM 裁定；成员 marker 不施加 blinded status，不改动 token 视觉或光照",
      "区域为 difficult terrain 的移动消耗由 DM 处理；当前 DSL/runtime 没有 zone movement-cost 原语",
      "2014 RAW 的回合结束脉冲需要 Dexterity save，失败才受 2d6 acid；当前冻结实现简化为无豁免的 2d6 acid 直接伤害",
      "ActiveAuras 对 measured template 只保证 XY membership；20-ft-radius sphere 的垂直边界与不同 elevation 的成员关系由 DM 处理",
    ],
  },
  fragments: [
    graphFragment({
      id: "hunger-of-hadar-zone-graph",
      actions: [
        publicAction("cast", "放置哈达之饥 Place Hunger of Hadar"),
      ],
      artifacts: [
        artifact({
          id: "hunger-of-hadar-zone",
          kind: "zone",
          role: "mechanical",
          identity: { scope: "cast", keys: ["castId"] },
          state: {
            anchor: "placed-point",
            shape: { type: "sphere", radius: 20, units: "ft" },
            stationary: true,
          },
          lifecycle: whileSpellActive(),
        }),
        cleanRoomEffect("hunger-of-hadar-membership", {
          host: "actor",
          scope: "source-target",
          reapply: "replace",
          name: "Hunger of Hadar Area",
          markerOnly: true,
          lifecycle: whileArtifact("hunger-of-hadar-zone"),
        }),
      ],
      rules: [
        rule({
          id: "cast-hunger-of-hadar",
          on: trigger("action-used", { actionId: "cast" }),
          targets: [
            placedTemplate("target:cast", {
              type: "sphere",
              size: 20,
              range: 150,
              evaluation: "snapshot",
            }),
          ],
          do: [
            consume(),
            operation("create-artifact", {
              id: "cast:create-zone",
              artifactId: "hunger-of-hadar-zone",
              target: "target:cast",
            }),
          ],
        }),
        rule({
          id: "hunger-of-hadar-turn-start",
          on: trigger("turn-start", { subject: "zone-member" }),
          when: [
            membershipGuard(),
            oncePerTurnPhase(),
          ],
          targets: [eventTarget("target:turn-start")],
          do: [
            operation("damage", {
              id: "turn-start-damage",
              target: "target:turn-start",
              formula: coldDamage,
              damageTypes: ["cold"],
            }),
          ],
        }),
        rule({
          id: "hunger-of-hadar-turn-end",
          on: trigger("turn-end", { subject: "zone-member" }),
          when: [
            membershipGuard(),
            oncePerTurnPhase(),
          ],
          targets: [eventTarget("target:turn-end")],
          do: [
            operation("damage", {
              id: "turn-end-damage",
              target: "target:turn-end",
              formula: acidDamage,
              damageTypes: ["acid"],
            }),
          ],
        }),
      ],
    }),
  ],
  accepted: acceptance(EXPANSION_BATCH, [
    "DM 在施法者 150 ft 内放置一个 20-ft-radius 的固定球形区域；一次施法只消耗一个三环或更高法术位并建立最长 1 分钟专注；2014 RAW 无升环加伤，高低环位伤害恒为 2d6",
    "放置瞬间与 creature 进入区域都不结算任何伤害或豁免：本法术没有初始脉冲与 entry 脉冲",
    "creature 在区域内开始自己的回合时受到 2d6 cold damage，无豁免；该脉冲凭 zone receipt 按 zoneInstanceId + targetUuid + turn + phase 去重，每回合 turn-start 相位只结算一次",
    "creature 在区域内结束自己的回合时受到 2d6 acid damage（按冻结边界无 Dexterity save）；turn-end receipt 与 turn-start receipt 按相位分离，同一回合两个相位可各自结算一次",
    "区域内 creature 只持有来源绑定的 Hunger of Hadar Area membership marker；blinded 与无光遮蔽语义保持显式 omission，marker 不施加 blinded status、不改变 token 视觉或光照，由 DM 裁定",
    "区域 difficult terrain 的移动消耗保持显式 omission，不以速度修改或额外模板几何冒充",
    "专注结束、到期或被驱散时按 cast 删除区域模板与成员 marker；不同施法来源的区域实例、成员 marker 与伤害 receipt 相互隔离，删除其一不影响另一片区域",
    "区域成员判定只有 XY 保证；20-ft-radius sphere 的垂直边界由 DM 处理",
  ], { status: "compiler-runtime-passed" }),
});

export default hungerOfHadar;
