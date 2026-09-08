import {
  SUM_NATIVE_QA_LOG,
  acceptance,
  cleanRoomSpell,
  cleanRoomSummonedEntity,
  concentration,
  consume,
  duration,
  graphFragment,
  operation,
  publicAction,
  rule,
  self,
  spellContract,
  trigger,
  whileSpellActive,
} from "@arcanedesk/spell-compiler/dsl";
import { conjureWoodlandBeingsPool } from "../../resources/pools.mjs";

const conjureWoodlandBeings = cleanRoomSpell({
  id: "conjure-woodland-beings",
  contract: spellContract({
    ruleset: "2014",
    level: 4,
    school: "con",
    components: {
      verbal: true,
      somatic: true,
      material: true,
    },
    lifetime: concentration(duration(1, "hours")),
  }),
  emission: { contentVersion: 1 },
  support: {
    level: "simplified",
    omissions: [
      "2014 RAW 的 CR/数量选项与具体 fey 选择被有意收窄为一只 Dryad；角色卡、Agent 与 Runtime 不提供 chooser、任意 CR browser、其他 fey 或调用方输入数量",
      "法术保持最长一小时专注：根施法只创建 Dryad，根 CWB 专注结束时应按本次施法的精确 provenance 清理仍存活的 Dryad，以及 Dryad 后续通过 Fallen Lover 创建的 Wood Woad；Dryad 自身死亡不会提前删除已经存在的 Woad",
      "落点完全交给 dnd5e 原生 TokenPlacement；DM 按 60 ft、施法者可见、未占据空间、Token footprint、墙体、地形与高度逐枚判断，Arcane 不自动放到施法者身边，也不实现合法格、LOS、碰撞或路径检查",
      "Fallen Lover 不在根 cast 中自动执行；它是 Dryad 在之后自己的合法回合中单独使用的一次明确 Activity，并由 DM 再完成一次原生 TokenPlacement；本回合新建的 Woad 不立即行动",
      "Fallen Lover 是 Dryad 的 1/short-rest 冻结能力；同一根专注已有活跃 Wood Woad 时在消费该资源前拒绝，不建立通用 nested summon engine",
      "Dryad 与 Wood Woad 的普通 activities 由各自冻结 Actor profile 提供；复杂被动、魅惑、环境交互、叙事限制及未自动化能力由 DM 按卡面裁定",
    ],
  },
  fragments: [
    graphFragment({
      id: "conjure-woodland-beings-graph",
      actions: [
        publicAction("cast", "咒唤林地生物 Conjure Woodland Beings"),
      ],
      artifacts: [
        cleanRoomSummonedEntity("dryad-entity", {
          pool: conjureWoodlandBeingsPool,
          rulesModel: "dnd5e-2014-simplified",
          cleanup: {
            expiry: "concentration-effect",
            fallback: "dm",
          },
          lifecycle: whileSpellActive(),
        }),
      ],
      rules: [
        rule({
          id: "cast-conjure-woodland-beings",
          on: trigger("action-used", { actionId: "cast" }),
          targets: [self("target:cast")],
          do: [
            consume(),
            operation("create-artifact", {
              id: "cast:create-dryad",
              artifactId: "dryad-entity",
              target: "source",
            }),
          ],
        }),
      ],
    }),
  ],
  accepted: acceptance(SUM_NATIVE_QA_LOG, [
    "角色卡与 turn-context 只暴露一个无 chooser 的 public cast；它绑定唯一 Dryad profile，canonical count 为 1，不开放其他 fey、CR 或数量输入",
    "一次 action cast 只消耗一个四环或更高法术位并建立最长一小时的原生专注；根 cast 只通过真实 dnd5e SummonActivity 创建一枚非链接 Dryad Token",
    "同一次 execute-turn 在 GM 页面等待 dnd5e 原生 TokenPlacement；DM 决定 60 ft 内可见且未占据的最终落点，Arcane 不创建 Token、不做 staging/legal-square 校验，也不在跳过、timeout 或不明结果后补生",
    "根 cast 不调用 Fallen Lover，也不自动创建 Wood Woad；Fallen Lover 必须在 Dryad 后续自己的合法回合中作为一次独立 Activity use，只创建一个 Woad，并在 live Woad 已存在时于消费前拒绝",
    "Fallen Lover 精确为 1/short rest；拒绝活跃 Woad 的 preflight 不消耗该次使用，成功后只由原生 Wood Woad profile count 1 创建实体",
    "原生返回的 Dryad 与后续 Woad 各自取得独立 Combatant，并 exact 复制根 source Combatant 的 finite initiative；不掷 d20、不做 null 到 0 或正负 0.01 偏移，也不移动当前 combat cursor",
    "Dryad 死亡或被 DM 删除后，已经存在的 Woad 保留；根 CWB 专注结束时只按本次 cast provenance 清理仍存活的 Dryad/Woad，不串删其他施法者或 cast group",
    "DM 处理复杂被动、魅惑、环境交互、叙事限制与本法术冻结 profile 未覆盖的规则；pending-runtime 只能在根 cast、Fallen Lover、原生 placement、Combatant/先攻及 lifecycle 的真实 Foundry QA 全部通过后关闭",
  ], { status: "compiler-runtime-passed" }),
});

export default conjureWoodlandBeings;
