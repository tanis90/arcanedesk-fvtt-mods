import {
  QA_LOG,
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

const wallDamage = perSlotAboveBase(
  dice(5, 8),
  dice(1, 8),
);

const oncePerTurnPhase = () => predicate("once-per-turn", {
  identity: "zoneInstanceId + targetUuid + turn + phase",
});

const wallOfFire = cleanRoomSpell({
  id: "wall-of-fire",
  contract: spellContract({
    ruleset: "2014",
    level: 4,
    school: "evo",
    components: {
      verbal: true,
      somatic: true,
      material: true,
    },
    lifetime: concentration(duration(1, "minutes")),
  }),
  content: contentRef("wall-of-fire"),
  emission: { contentVersion: 1 },
  support: {
    level: "simplified",
    omissions: [
      "DM 在放置时确认火墙位于实体表面；Runtime 不判断地面、墙面或其他表面是否合法",
      "只实现固定 60-ft-long、5-ft-wide 的二维直线墙；环墙、冷热侧选择与墙外 10 ft 热侧伤害按冻结边界取消",
      "20 ft 高度、不同 elevation 的成员关系，以及不透明火墙造成的视线限制由 DM 裁定；若二维自动目标按 elevation 本不应命中，DM 在该次结算后立即恢复误扣 HP 并移除或忽略 membership；若火墙应遮挡视线，DM 在发起后续目标工作流前拒绝或纠正目标；模板不创建 Foundry WallDocument，也不修改视觉、移动或远程攻击遮挡",
      "进入伤害只响应 outside-to-inside 的区域成员变化，不扫描 token 的整段移动路径；穿墙时 DM 必须先把 token 移入墙格完成结算，再移动到另一侧，单次 outside-to-outside 拖动不会触发",
      "火墙创建后保持固定 60×5 ft 几何，专注期间不支持修改长度、宽度或方向；5 ft 是固定规则值，只在 COS 的 5-ft grid 上恰好等于一格",
    ],
  },
  fragments: [
    graphFragment({
      id: "wall-of-fire-zone-graph",
      actions: [publicAction("cast", "火墙术 Wall of Fire")],
      artifacts: [
        artifact({
          id: "wall-of-fire-zone",
          kind: "zone",
          role: "mechanical",
          identity: { scope: "cast", keys: ["castId"] },
          state: {
            anchor: "placed-point",
            shape: {
              type: "line",
              size: 60,
              width: 5,
              units: "ft",
            },
            stationary: true,
          },
          lifecycle: whileSpellActive(),
        }),
        cleanRoomEffect("wall-of-fire-membership", {
          host: "actor",
          scope: "source-target",
          reapply: "replace",
          name: "【系统】火墙术：墙格成员（勿删）",
          markerOnly: true,
          lifecycle: whileArtifact("wall-of-fire-zone"),
        }),
      ],
      rules: [
        rule({
          id: "cast-wall-of-fire",
          on: trigger("action-used", { actionId: "cast" }),
          targets: [
            placedTemplate("target:cast", {
              type: "line",
              size: 60,
              width: 5,
              range: 120,
              evaluation: "snapshot",
            }),
          ],
          do: [
            consume(),
            operation("create-artifact", {
              id: "cast:create-zone",
              artifactId: "wall-of-fire-zone",
              target: "target:cast",
            }),
            operation("saving-throw", {
              id: "initial-save",
              ability: ["dex"],
              target: "target:cast",
              onSave: "half",
            }),
            operation("damage", {
              id: "initial-damage",
              target: "target:cast",
              formula: wallDamage,
              damageTypes: ["fire"],
              onSave: "half",
            }),
          ],
        }),
        rule({
          id: "wall-of-fire-entry",
          on: trigger("enter", { zoneId: "wall-of-fire-zone" }),
          when: [oncePerTurnPhase()],
          targets: [eventTarget("target:entry")],
          do: [
            operation("damage", {
              id: "entry-damage",
              target: "target:entry",
              formula: wallDamage,
              damageTypes: ["fire"],
            }),
          ],
        }),
        rule({
          id: "wall-of-fire-turn-end",
          on: trigger("turn-end", { subject: "zone-member" }),
          when: [
            predicate("artifact-exists", {
              artifactId: "wall-of-fire-membership",
              subject: "effect-target",
            }),
            oncePerTurnPhase(),
          ],
          targets: [eventTarget("target:turn-end")],
          do: [
            operation("damage", {
              id: "turn-end-damage",
              target: "target:turn-end",
              formula: wallDamage,
              damageTypes: ["fire"],
            }),
          ],
        }),
      ],
    }),
  ],
  accepted: acceptance(QA_LOG, [
    "DM 在施法者 120 ft 内放置并定向一条固定 60-ft-long、5-ft-wide 的二维 line；一次施法只消耗一个四环或更高法术位并建立最长 1 分钟专注",
    "施法瞬间只对墙格内 creature 进行一次真实 Dexterity save；失败承受 5d8 fire damage，成功承受一半，模板外目标不变",
    "creature 每回合首次进入墙格时承受无豁免的 5d8 fire damage；同一目标、区域与回合的重复 entry 按 phase receipt 去重，下一回合可以再次触发",
    "墙格成员在自己的回合结束时承受无豁免的 5d8 fire damage；entry 与 turn-end 按相位分离，因此目标进入后留在墙格到回合结束时两次伤害都合法结算",
    "每高一环给初始、entry 与 turn-end 三类伤害都增加 1d8 fire；五环时三者各为 6d8",
    "专注结束、替换或到期时按 cast 清理固定 line template 与精确来源 membership，不影响其他施法来源",
    "环墙、冷热侧与墙外 10 ft 热侧不实现；20 ft 高度、实体表面与不透明视线由 DM 裁定，系统只承诺 XY 墙格 membership",
    "穿墙必须由 DM 拆成 outside-to-inside 与 inside-to-outside 两段；单次 outside-to-outside 拖动不触发 entry，Runtime 不冒充路径扫掠支持",
    "模板创建后始终保持 distance 60 ft、width 5 ft，不支持专注期间的 post-create geometry edit，也不创建 Foundry WallDocument",
  ], { status: "compiler-runtime-passed" }),
});

export default wallOfFire;
