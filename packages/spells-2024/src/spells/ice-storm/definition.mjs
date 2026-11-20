import {
  QA_LOG,
  acceptance,
  artifact,
  cleanRoomEffect,
  cleanRoomSpell,
  consume,
  dice,
  graphFragment,
  instant,
  manual,
  operation,
  perSlotAboveBase,
  placedTemplate,
  publicAction,
  rule,
  spellContract,
  spellLifetime,
  trigger,
  whileArtifact,
} from "@arcanedesk/spell-compiler/dsl";

// L2 重写批（M1.0 审计 C 桶 recipe-invalid，c-dm）：2024 的钝击伤害是 2d10、每环 +1d10，
// 寒冷 4d6 不变；半径 20/高 40 尺、敏捷半伤与困难地形条款不变。
// 5R 锚点：玩家手册2024/法术详述/4环.htm#Ice_Storm。
const iceStorm = cleanRoomSpell({
  id: "ice-storm",
  contract: spellContract({
    ruleset: "2024",
    level: 4,
    school: "evo",
    components: {
      verbal: true,
      somatic: true,
      material: true,
    },
    lifetime: spellLifetime(instant()),
  }),
  emission: { contentVersion: 1 },
  support: {
    level: "simplified",
    omissions: [
      "cylinder 的 40 ft height 只保留为 schema/provider 元数据；Runtime 与 ActiveAuras 不按 elevation 或垂直边界过滤，只按画布 XY 模板选取目标",
      "当前 COS 的 placed-template workflow 使用 geometry-only auto-target，ActiveAuras 的 system wall-block 也为关闭；初始结算与后续 membership 不按场景 Wall 裁切。若墙体按规则应阻断范围，DM 恢复墙后目标的本次初始伤害并忽略其困难地形 marker",
      "区域在施法后直到施法者下一回合结束前是 difficult terrain；当前 DSL/runtime 不按穿越路径增加移动消耗，也不修改 Actor movement speed，由 DM 根据可见模板处理",
      "瞬时法术留下的困难地形模板使用 manual lifecycle，不自动按施法者下一回合结束计时；到点由 DM 删除本次 measured template；对应 membership 只是 best-effort 展示，不是困难地形规则权威",
      "同一施法者从同一 embedded Item 创建的重叠 Ice Storm 模板会被 ActiveAuras 按 origin + name 合并为一枚纯展示 membership；DM 必须始终以可见模板而不是 marker provenance/有无判断困难地形；不同施法者仍隔离",
    ],
  },
  fragments: [
    graphFragment({
      id: "ice-storm-zone-graph",
      actions: [publicAction("cast", "冰风暴 Ice Storm")],
      artifacts: [
        artifact({
          id: "ice-storm-zone",
          kind: "zone",
          role: "mechanical",
          identity: { scope: "cast", keys: ["castId"] },
          state: {
            anchor: "placed-point",
            shape: {
              type: "cylinder",
              radius: 20,
              height: 40,
              units: "ft",
            },
            stationary: true,
          },
          lifecycle: manual(),
        }),
        cleanRoomEffect("ice-storm-membership", {
          host: "actor",
          scope: "source-target",
          reapply: "replace",
          name: "【系统】冰风暴：困难地形范围（勿删）",
          markerOnly: true,
          lifecycle: whileArtifact("ice-storm-zone"),
        }),
      ],
      rules: [
        rule({
          id: "cast-ice-storm",
          on: trigger("action-used", { actionId: "cast" }),
          targets: [
            placedTemplate("target:cast", {
              type: "cylinder",
              size: 20,
              height: 40,
              range: 300,
              evaluation: "snapshot",
            }),
          ],
          do: [
            consume(),
            operation("create-artifact", {
              id: "cast:create-zone",
              artifactId: "ice-storm-zone",
              target: "target:cast",
            }),
            operation("saving-throw", {
              id: "initial-save",
              ability: ["dex"],
              target: "target:cast",
              onSave: "half",
            }),
            operation("damage", {
              id: "initial-bludgeoning-damage",
              target: "target:cast",
              formula: perSlotAboveBase(
                dice(2, 10),
                dice(1, 10),
              ),
              damageTypes: ["bludgeoning"],
              onSave: "half",
            }),
            operation("damage", {
              id: "initial-cold-damage",
              target: "target:cast",
              formula: dice(4, 6),
              damageTypes: ["cold"],
              onSave: "half",
            }),
          ],
        }),
      ],
    }),
  ],
  accepted: acceptance(QA_LOG, [
    "DM 在施法者 300 ft 内放置 20-ft-radius、schema height 40 ft 的 cylinder；公开 action 只消费一个四环或更高法术位且不建立专注",
    "同一初始 workflow 对二维模板内所有 creature（包括友军）进行 Dexterity save；失败承受 2d10 bludgeoning 与 4d6 cold，成功时两部分分别半伤，模板外目标不变",
    "每高一环只给 bludgeoning 增加 1d10（2024 口径）；cold 不随环位增加",
    "施法伤害只结算一次；施法后进入、离开或在区域内开始/结束回合只增删无状态、无数值 modifier 的 membership，不再次豁免或伤害",
    "manual template 按 cast identity 独立存在；DM 只以可见模板判断困难地形；不同施法者实例隔离",
    "40 ft height 不做垂直 membership/elevation 过滤，困难地形路径消耗与模板删除时机保持明确 DM omission",
  ], { status: "compiler-passed" }),
});

export default iceStorm;
