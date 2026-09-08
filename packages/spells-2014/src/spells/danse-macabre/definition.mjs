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
import { danseMacabrePool } from "../../resources/pools.mjs";

const L5_WAVE_I5_QA_RECEIPT =
  "docs/foundry-automation/notes/spell-level-5-wave-i5-qa-2026-08-27.md";
const SUMMON_FORM_PARAMETER = "summon-form";

const summonFormValues = danseMacabrePool.choices.map(choice => choice.choice);
const summonFormLabels = Object.fromEntries(
  danseMacabrePool.choices.map(choice => [choice.choice, choice.label]),
);

const danseMacabre = cleanRoomSpell({
  id: "danse-macabre",
  contract: spellContract({
    ruleset: "2014",
    level: 5,
    school: "nec",
    components: {
      verbal: true,
      somatic: true,
    },
    lifetime: concentration(duration(1, "hours")),
  }),
  emission: { contentVersion: 1 },
  support: {
    level: "simplified",
    omissions: [
      "每次施法固定为 Five Skeletons 或 Five Zombies；不识别、选择或消耗尸体，也不允许 Skeleton/Zombie 混编",
      "不实现六环及以上每升一环额外两具尸体；两个命名 Activity 在所有合法施法环位都固定创建五只同类亡灵",
      "第一版不把施法者的施法属性调整值加入亡灵的攻击与伤害；Skeleton 和 Zombie 使用各自冻结的 2014 基础攻击数值",
      "不自动执行施法者的 bonus-action command，也不维护 60 ft 命令接收、共同命令、默认自卫或持续执行命令的状态机；DM/操作者直接在每只亡灵自己的回合决定移动和 Action",
      "Zombie 的 Undead Fortitude 由 DM 在会降至 0 HP 时按伤害来源和 DC 手工处理；Skeleton 的前身语言、两种亡灵的尸体装备和其他叙事事实也由 DM 裁定",
      "落点完全交给 dnd5e 原生 TokenPlacement；DM 按 60 ft、可见尸体位置、未占据空间、Token footprint、墙体、地形与高度连续判断五个落点，Arcane 不自动寻找尸体或合法格",
      "施法前由 DM 在当前场景只保留一个 active Combat，并确保当前 source Token 在其中恰有一个 finite initiative Combatant；薄适配器在耗槽前拒绝缺失、重复或非 finite 绑定，不另掷召唤物先攻",
    ],
  },
  fragments: [
    graphFragment({
      id: "danse-macabre-graph",
      actions: [
        publicAction("cast", "骷髅之舞 Danse Macabre", {
          parameters: [
            enumParameter(SUMMON_FORM_PARAMETER, summonFormValues, {
              labels: summonFormLabels,
            }),
          ],
        }),
      ],
      artifacts: [
        cleanRoomSummonedEntity("danse-macabre-undead", {
          pool: danseMacabrePool,
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
          id: "cast-danse-macabre",
          on: trigger("action-used", { actionId: "cast" }),
          targets: [self("target:cast")],
          do: [
            consume(),
            operation("create-artifact", {
              id: "cast:create-danse-macabre-undead",
              artifactId: "danse-macabre-undead",
              target: "source",
            }),
          ],
        }),
      ],
    }),
  ],
  accepted: acceptance(L5_WAVE_I5_QA_RECEIPT, [
    "角色卡与 turn-context 只暴露 Five Skeletons、Five Zombies 两个有名称的 Cast activities；每项只绑定一个白名单 profile，不能混编，也没有任意 profile 或 count 输入",
    "两个 Activity 的 canonical cardinality 均为 fixed-group/count 5；一次 action cast 只消耗一个五环或更高法术位并建立最长一小时的原生专注",
    "同一次 execute-turn 在 GM 页面等待 DM 连续完成五次原生 TokenPlacement；第五个位置确认后，dnd5e 一次 batch 创建五枚非链接 Token，Arcane 不另建 Token 或补偿组",
    "Skeleton 组保留 AC 13、HP 13、30 ft movement、Shortsword/Shortbow、bludgeoning vulnerability、poison immunity 与对应 condition immunity；Zombie 组保留 AC 8、HP 22、20 ft movement、Slam、poison immunity 与对应 condition immunity",
    "五个成员分别拥有独立 Token、ActorDelta、HP、位置、状态、Combatant 和 turn；每个 Combatant exact 复制唯一 source Combatant 的 finite initiative，不掷 d20、不做 null 到 0 或正负 0.01 偏移，也不移动 combat cursor",
    "唯一活跃非 GM OWNER 可控制全部五个成员，否则保持 GM 操控；共享 world base profile 不随施法者、施法环位或 invocation 改写",
    "施法者的 spellcasting ability modifier 不进入 profile attack/damage bonus；Skeleton 使用固定 +4 与 1d6+2 piercing，Zombie Slam 使用固定 +3 与 1d6+1 bludgeoning，Undead Fortitude 明确保留为 DM 手工规则",
    "DM 右键跳过任意 placement 时 receipt 报告 partial-manual/skipped-manual；timeout、partial 或 indeterminate 不重放完整 Activity，CLI 返回后手删或击杀成员也不补生",
    "exact concentration effect 结束、替换或删除时只按本次 native invocation provenance 清理残存 Token/Combatant；成员先行死亡或手删不阻止其余成员清理，也不串删另一施法者或 invocation",
    "completion receipt 报告命名 Activity/profile、expected 5、placed/skipped count、workflow/message UUID、五个有序 Token/Combatant UUID、source Combatant UUID、inherited initiative、concentration lifecycle 与 manual outcome",
  ], { status: "compiler-runtime-passed" }),
});

export default danseMacabre;
