import {
  QA_LOG,
  acceptance,
  artifact,
  cleanRoomEffect,
  cleanRoomSpell,
  consume,
  contentRef,
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
} from "../dsl.mjs";

const iceStorm = cleanRoomSpell({
  id: "ice-storm",
  contract: spellContract({
    ruleset: "2014",
    level: 4,
    school: "evo",
    components: {
      verbal: true,
      somatic: true,
      material: true,
    },
    lifetime: spellLifetime(instant()),
  }),
  content: contentRef("ice-storm"),
  emission: { contentVersion: 1 },
  support: {
    level: "simplified",
    omissions: [
      "cylinder 的 40 ft height 只保留为 schema/provider 元数据；Runtime 与 ActiveAuras 不按 elevation 或垂直边界过滤，只按画布 XY 模板选取目标",
      "当前 COS 的 placed-template workflow 使用 geometry-only auto-target，ActiveAuras 的 system wall-block 也为关闭；初始结算与后续 membership 不按场景 Wall 裁切。若墙体按规则应阻断范围，DM 恢复墙后目标的本次初始伤害并忽略其困难地形 marker",
      "区域在施法后直到施法者下一回合结束前是 difficult terrain；当前 DSL/runtime 不按穿越路径增加移动消耗，也不修改 Actor movement speed，由 DM 根据可见模板处理",
      "瞬时法术留下的困难地形模板使用 manual lifecycle，不自动按施法者下一回合结束计时；到点由 DM 删除本次 measured template；对应 membership 只是 best-effort 展示，不是困难地形规则权威",
      "同一施法者从同一 embedded Item 创建的重叠 Ice Storm 模板会被 ActiveAuras 按 origin + name 合并为一枚纯展示 membership；其 provenance 通常保留首个模板。删除非 owner 模板不影响 marker；删除 owner 模板时，即使另一个同来源模板仍存在，marker 也可能暂时消失直到后续移动或全量归集。DM 必须始终以可见模板而不是 marker provenance/有无判断困难地形；不同施法者仍隔离",
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
                dice(2, 8),
                dice(1, 8),
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
    "同一初始 workflow 对二维模板内所有 creature（包括友军）进行 Dexterity save；失败承受 2d8 bludgeoning 与 4d6 cold，成功时两部分分别半伤，模板外目标不变",
    "当前 COS 的 geometry-only template targeting 与 ActiveAuras system wall policy 均不裁切场景 Wall；QA 明确证明墙后但仍在二维模板内的目标会被选中并获得 membership，DM 按规则恢复不应受影响目标的初始伤害并忽略其 marker",
    "每高一环只给 bludgeoning 增加 1d8；六环为 4d8 bludgeoning + 4d6 cold，cold 不随环位增加",
    "施法伤害只结算一次；施法后进入、离开或在区域内开始/结束回合只增删无状态、无数值 modifier 的 membership，不再次豁免或伤害，也不修改任何 movement speed",
    "manual template 按 cast identity 独立存在；同一施法者同一 embedded Item 的重叠模板只保留一枚 best-effort、无机械 membership。删除非 owner 模板不影响它；删除 owner 时它可在另一同来源模板仍存在期间暂时消失。DM 只以可见模板判断困难地形；不同施法者实例隔离",
    "40 ft height 不做垂直 membership/elevation 过滤，困难地形路径消耗与模板删除时机保持明确 DM omission，不把二维验收描述为 RAW full",
  ], { status: "compiler-runtime-passed" }),
});

export default iceStorm;
