import {
  SUM_NATIVE_QA_LOG,
  acceptance,
  cleanRoomSpell,
  cleanRoomSummonedEntity,
  concentration,
  consume,
  dice,
  duration,
  graphFragment,
  operation,
  perSlotAboveBase,
  publicAction,
  rule,
  self,
  spellContract,
  spellSaveDc,
  trigger,
  whileSpellActive,
} from "@arcanedesk/spell-compiler/dsl";
import { flamingSpherePool } from "../../resources/pools.mjs";

const flamingSphereSaveDamageBonus = perSlotAboveBase(
  dice(1, 6),
  dice(1, 6),
);

const flamingSphere = cleanRoomSpell({
  id: "flaming-sphere",
  contract: spellContract({
    ruleset: "2014",
    level: 2,
    school: "con",
    components: {
      verbal: true,
      somatic: true,
      material: true,
    },
    lifetime: concentration(duration(1, "minutes")),
  }),
  emission: { contentVersion: 2 },
  support: {
    level: "simplified",
    omissions: [
      "采用 BG3-style 独立 Flaming Sphere Actor，而不是 2014 RAW 的可移动法术区域：法球拥有独立 Combatant、回合与 activities；根施法只召唤实体，不自动执行 Ram 或 Ablaze",
      "落点完全交给 dnd5e 原生 TokenPlacement；DM 按 60 ft、施法者可见、未占据空间、Token footprint、墙体、地形与高度判断，Arcane 不自动邻接放置，也不实现合法格、LOS、碰撞或路径检查",
      "操作者在法球自己的回合手工移动最多 30 ft；DM 负责判断 Ram 的移动路径、撞击停止、障碍、跳坑、高度与特殊地形，并手工选择被撞目标后点击 bonus-action Ram",
      "系统不自动扫描在法球 5 ft 内结束回合的生物；到达合法 Ablaze 时机时，由 DM/操作者手工选择邻近目标并点击 Ablaze，目标范围、时机与重复结算由 DM 确认",
      "Fire surface、点燃无人携带物件、场景物件伤害及其他环境交互不实现，由 DM 处理",
    ],
  },
  fragments: [
    graphFragment({
      id: "flaming-sphere-graph",
      actions: [
        publicAction("cast", "召唤炽焰法球 Summon Flaming Sphere"),
      ],
      artifacts: [
        cleanRoomSummonedEntity("flaming-sphere-entity", {
          pool: flamingSpherePool,
          deltaBindings: [
            { slot: "spell-save-dc", value: spellSaveDc() },
            {
              slot: "activity-damage",
              value: flamingSphereSaveDamageBonus,
            },
          ],
          cleanup: {
            expiry: "concentration-effect",
            fallback: "dm",
          },
          lifecycle: whileSpellActive(),
        }),
      ],
      rules: [
        rule({
          id: "cast-flaming-sphere",
          on: trigger("action-used", { actionId: "cast" }),
          targets: [self("target:cast")],
          do: [
            consume(),
            operation("create-artifact", {
              id: "cast:create-flaming-sphere",
              artifactId: "flaming-sphere-entity",
              target: "source",
            }),
          ],
        }),
      ],
    }),
  ],
  accepted: acceptance(SUM_NATIVE_QA_LOG, [
    "角色卡与 turn-context 只暴露一个无 chooser 的 public cast；它绑定唯一 Flaming Sphere profile，native SummonActivity count 为 1",
    "一次 action cast 只消耗一个二环或更高法术位并建立最长一分钟的原生专注；根 cast 只通过真实 dnd5e SummonActivity 创建一枚非链接 Flaming Sphere Token，Arcane 不另建 Token 或 MeasuredTemplate",
    "同一次 execute-turn 在 GM 页面等待 dnd5e 原生 TokenPlacement；DM 决定 60 ft 内可见且未占据的最终落点，右键跳过、transport timeout 或不明结果均不 replay、不补 Token",
    "原生返回的法球取得独立 Combatant，并 exact 复制施法者 Combatant 的 finite initiative；不掷 d20、不做 null 到 0 或正负 0.01 偏移，也不移动当前 combat cursor",
    "法球保持 20 HP、AC 16、30 ft movement、20 ft bright + 额外 20 ft dim light，以及冻结的抗性、免疫和 cold vulnerability；共享 world profile 不被每次 cast 改写",
    "Ram 与 Ablaze 通过 native match.saves 快照施法者实际 spell save DC；profile 基础伤害 1d6 加上二环 1d6 native save damage bonus，最终为 2d6 fire，且每升一环再增加 1d6；Dexterity save 成功半伤，后续 activities 不再次消耗施法者法术位",
    "原生专注 effect 结束、替换或删除时只按本次 cast provenance 清理法球 Token/Combatant，不串删其他 cast；DM 手工删除法球后不会触发补生",
    "DM 按 HITL 边界处理 TokenPlacement、30 ft 移动、Ram 路径与目标、Ablaze 邻近目标和时机、Fire surface、物件、高度与特殊地形；pending-runtime 只能在原生 placement、数值、Combatant/先攻及 concentration lifecycle 的真实 Foundry QA 全部通过后关闭",
  ], { status: "compiler-runtime-passed" }),
});

export default flamingSphere;
