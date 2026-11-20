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
  placedTemplate,
  predicate,
  publicAction,
  rule,
  spellContract,
  trigger,
  whileArtifact,
  whileSpellActive,
} from "@arcanedesk/spell-compiler/dsl";

// L4 移植批（G 桶，非 SRD，spells24 无源文档）：2014 recipe 搬运改契约。
// 5R 锚点 Hunger_of_Hadar（3环.htm）：头部 三环 咒法（魔契师），V/S/M，150尺，专注1分钟。
// 与 2014 差异：5R 的回合结束敏捷豁免与「寒冷/强酸任选 +1d6/环」无法用现有 zone pulse 原语表达，按 2014 冻结口径落地并在 omissions 明示。

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
// 3. 5R 的 turn-end 脉冲要求 Dexterity save，失败才受 2d6 acid；canonical
//    zone pulse 只支持 save-only / damage-only / save+half 三种形态，没有
//    “豁免失败全额伤害”形态，故沿用 2014 冻结口径的无豁免直接伤害，由 DM
//    在结算前补掷豁免；
// 4. 5R 升环为“寒冷或强酸（由你选择）每环 +1d6”；zone pulse 规则无法读取
//    施法时枚举参数（input-selection-equals 只沿 action-used 链解析），故
//    不自动加骰，由 DM 按所选类型补骰；
// 5. ActiveAuras 对 measured template 只提供 XY membership；20-ft-radius
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
    ruleset: "2024",
    level: 3,
    school: "con",
    components: {
      verbal: true,
      somatic: true,
      material: true,
    },
    lifetime: concentration(duration(1, "minutes")),
  }),
  emission: { contentVersion: 1 },
  support: {
    level: "simplified",
    omissions: [
      "5R 的回合结束脉冲要求 Dexterity save、失败才受 2d6 acid；现有 zone pulse 没有“豁免失败全额伤害”形态，当前按 2014 冻结口径直接结算 2d6 acid，DM 应在结算前补掷该豁免",
      "5R 升环为「寒冷或强酸（由你选择）每高一环 +1d6」；zone pulse 规则无法读取施法时选择的伤害类型，自动化不加骰，由 DM 按所选类型补骰",
      "“完全进入区域内的生物陷入目盲”以及“任何光（含魔法光）都无法照亮该区域”的遮蔽/视觉语义由 DM 裁定；成员 marker 不施加 blinded status，不改动 token 视觉或光照",
      "区域为 difficult terrain 的移动消耗由 DM 处理；当前 DSL/runtime 没有 zone movement-cost 原语",
      "ActiveAuras 对 measured template 只保证 XY membership；20-ft-radius sphere 的垂直边界与不同 elevation 的成员关系由 DM 处理",
    ],
  },
  fragments: [
    graphFragment({
      id: "hunger-of-hadar-zone-graph",
      actions: [
        publicAction("cast", "哈达之欲 Hunger of Hadar"),
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
  accepted: acceptance(QA_LOG, [
    "DM 在施法者 150 ft 内放置一个 20-ft-radius 的固定球形区域；一次施法只消耗一个三环或更高法术位并建立最长 1 分钟专注",
    "放置瞬间与 creature 进入区域都不结算任何伤害或豁免：本法术没有初始脉冲与 entry 脉冲",
    "creature 在区域内开始自己的回合时受到 2d6 cold damage，无豁免；该脉冲凭 zone receipt 按 zoneInstanceId + targetUuid + turn + phase 去重，每回合 turn-start 相位只结算一次",
    "creature 在区域内结束自己的回合时受到 2d6 acid damage（5R 的 Dexterity save 由 DM 在结算前补掷）；turn-end receipt 与 turn-start receipt 按相位分离，同一回合两个相位可各自结算一次",
    "区域内 creature 只持有来源绑定的 Hunger of Hadar Area membership marker；blinded 与无光遮蔽语义保持显式 omission，marker 不施加 blinded status、不改变 token 视觉或光照，由 DM 裁定",
    "区域 difficult terrain 的移动消耗保持显式 omission，不以速度修改或额外模板几何冒充",
    "升环时自动化不增加伤害骰；DM 按所选类型（寒冷或强酸）每高一环补 1d6",
    "专注结束、到期或被驱散时按 cast 删除区域模板与成员 marker；不同施法来源的区域实例、成员 marker 与伤害 receipt 相互隔离",
    "区域成员判定只有 XY 保证；20-ft-radius sphere 的垂直边界由 DM 处理",
  ], { status: "compiler-runtime-passed" }),
});

export default hungerOfHadar;
