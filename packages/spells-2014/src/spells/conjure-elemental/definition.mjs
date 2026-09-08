import {
  acceptance,
  cleanRoomSpell,
  cleanRoomSummonedEntity,
  concentration,
  consume,
  duration,
  enumParameter,
  graphFragment,
  operation,
  parameterValue,
  publicAction,
  rule,
  self,
  spellContract,
  trigger,
  whileSpellActive,
} from "@arcanedesk/spell-compiler/dsl";
import { conjureElementalPool } from "../../resources/pools.mjs";

const L5_WAVE_I5_QA_RECEIPT =
  "docs/foundry-automation/notes/spell-level-5-wave-i5-qa-2026-08-27.md";
const SUMMON_FORM_PARAMETER = "summon-form";

const summonFormValues = conjureElementalPool.choices.map(choice =>
  choice.choice
);
const summonFormLabels = Object.fromEntries(
  conjureElementalPool.choices.map(choice => [choice.choice, choice.label]),
);

const conjureElemental = cleanRoomSpell({
  id: "conjure-elemental",
  contract: spellContract({
    ruleset: "2014",
    level: 5,
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
      "2014 RAW 的 1 分钟施法过程与受伤/中断不由系统计时或追踪；桌面先以 HITL 完成该过程，只有 DM 宣布施法完成后才点击这个单 action Activity 扣槽并创建实体",
      "召唤池固定为 Air Elemental、Earth Elemental、Fire Elemental、Water Elemental 四个 MM'14 CR 5 profile，各 count 1；不开放任意 compendium/CR browser、其他元素或调用方输入数量",
      "六环及以上不提高可召唤 CR，也不替换为更高 CR profile；高环施法只消耗 DM 明确选择的真实法术位，召唤数量与四个 profile 均保持不变",
      "DM 在原生 TokenPlacement 前确认 90 ft 内存在对应的 10-foot cube 空气、土地/岩石、火焰或水体，并把元素放在该介质 10 ft 内的未占据空间；Arcane 不接收介质坐标，也不实现材质、LOS、占位、墙体、地形、高度、碰撞或合法格检查",
      "不实现 2014 RAW 的破专注后元素仍留场、失控并敌对一小时；第一版在本次来源专注结束、替换或删除时，按精确 invocation provenance 清理残存元素 Token/Combatant",
      "元素理解口头命令但不自动解释或执行自然语言命令；DM/操作者在元素自己的回合使用冻结 Actor activities，并按各 profile capability audit 完成 Multiattack、Whirlwind 位移、Earth Glide、点燃、Whelm、Freeze 等明确手工步骤",
    ],
  },
  fragments: [
    graphFragment({
      id: "conjure-elemental-graph",
      actions: [
        publicAction("cast", "元素咒唤术 Conjure Elemental", {
          parameters: [
            enumParameter(SUMMON_FORM_PARAMETER, summonFormValues, {
              labels: summonFormLabels,
            }),
          ],
        }),
      ],
      artifacts: [
        cleanRoomSummonedEntity("conjured-elemental", {
          pool: conjureElementalPool,
          selection: parameterValue(SUMMON_FORM_PARAMETER),
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
          id: "cast-conjure-elemental",
          on: trigger("action-used", { actionId: "cast" }),
          targets: [self("target:cast")],
          do: [
            consume(),
            operation("create-artifact", {
              id: "cast:create-elemental",
              artifactId: "conjured-elemental",
              target: "source",
            }),
          ],
        }),
      ],
    }),
  ],
  accepted: acceptance(L5_WAVE_I5_QA_RECEIPT, [
    "角色卡、battle-context 与 turn-context 只暴露 Air、Earth、Fire、Water 四个有名称的 Cast activities；每项只绑定一个白名单 MM'14 profile，缺失、非法或额外 choice 在法术位与 workflow 变化前拒绝",
    "四个命名 Activity 的 canonical cardinality 均为 single/count 1；每次 action cast 只消耗一个五环或更高法术位并建立最长一小时原生专注，升环不改变 count、CR、profile 或基础 Actor 数值",
    "一次 execute-turn 在同一个 GM 页面等待一次 dnd5e 原生 TokenPlacement，并只接受该 invocation 原生返回的一个非链接 Large Token/ActorDelta；Arcane Token create 数为零，也不浏览 compendium、自动邻接、staging、补生或 spawn retry",
    "Air/Earth/Fire/Water 分别保留 MM'14 的 AC、HP、能力值、2x2 footprint、移动/hover、感官、抗性/免疫/易伤、condition immunity、语言与 CR 5；nonmagical B/P/S 抗性不得错误阻挡魔法武器，共享 compendium Actor 不随施法者、环位或 invocation 变化",
    "冻结 Actor activities 保留 Slam/Touch 的真实 attack 与 damage；Whirlwind 保留 Strength save、成功半伤与 Recharge 4-6，Whelm 保留 DC 15 Strength save、仅失败伤害与 Recharge 4-6；复杂位移、Prone、碰撞、Earth Glide、Siege Monster、点燃、Water Susceptibility、Whelm 状态/容量、Freeze 与 Multiattack 按 profile 的精确 DM 动作处理，不冒充已自动化",
    "施法前 source Token 在唯一 active Combat 中恰有一个 finite initiative Combatant；实际创建的元素取得独立 Combatant并 exact 复制该 initiative，不掷 d20、不做 null 到 0 或正负 0.01 偏移，也不移动当前 combat cursor",
    "唯一活跃非 GM OWNER 可控制实体，否则保持 GM 操控；相同名称的其他施法者、其他 invocation 与共享 base Actor 不被本次 ownership、Combatant 或 lifecycle sidecar 串改",
    "DM 右键跳过时 receipt 报告 partial-manual/skipped-manual；timeout、transport indeterminate 或 CLI 返回后手删元素均不 replay、不补 Token，法术位/专注/现有世界状态不得被盲目重放",
    "来源专注结束、替换或删除时只按本次 native invocation provenance 清理残存元素 Token/Combatant；一个成员手删、死亡或不存在不串删其他来源，也不触发敌对状态或替代召唤",
    "角色卡可信 UI 与 battle-context -> turn-context -> execute-turn 必须调用同一个 compiler-emitted SummonActivity；completion receipt 报告命名 Activity/profile、expected 1、placed/skipped count、workflow/message UUID、Token/Combatant/source Combatant UUID、inherited initiative、concentration lifecycle 与 manual outcome",
  ], { status: "compiler-runtime-passed" }),
});

export default conjureElemental;
