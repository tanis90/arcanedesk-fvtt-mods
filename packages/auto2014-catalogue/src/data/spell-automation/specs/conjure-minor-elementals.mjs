import {
  SUM_NATIVE_QA_LOG,
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
} from "../dsl.mjs";
import { conjureMinorElementalsPool } from "../../summon-automation/pools.mjs";

const SUMMON_FORM_PARAMETER = "summon-form";

const summonFormValues = conjureMinorElementalsPool.choices.map(choice =>
  choice.choice
);
const summonFormLabels = Object.fromEntries(
  conjureMinorElementalsPool.choices.map(choice => [choice.choice, choice.label]),
);

const conjureMinorElementals = cleanRoomSpell({
  id: "conjure-minor-elementals",
  contract: spellContract({
    ruleset: "2014",
    level: 4,
    school: "con",
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
      "2014 RAW 的 1 分钟施法过程与受伤/中断不由系统计时或追踪；桌面先以 HITL 完成该过程，只有 DM 宣布施法完成后才点击这个单 action Activity 扣槽并创建实体",
      "召唤池只提供 Azer ×1、Ice Mephit ×2、Mud Mephit ×2 三个冻结选择；不开放其他元素、任意 CR browser、规则公式数量、升环数量扩张或调用方输入数量",
      "每个 profile 的 count 由 dnd5e 原生 SummonActivity 处理：Azer 由 DM 放置一次；Ice/Mud 由 DM 连续放置两次，原生收集完 placement 后一次 batch 创建两枚独立非链接 Token/ActorDelta",
      "施法前由 DM 在当前场景只保留一个 active Combat，并确保当前 source Token 在其中恰有一个 finite initiative Combatant；薄适配器在耗槽前拒绝缺失、重复或非 finite 绑定，不另掷召唤物先攻",
      "落点完全交给 dnd5e 原生 TokenPlacement；DM 按 90 ft、施法者可见、未占据空间、Token footprint、墙体、地形与高度逐枚判断，Arcane 不自动邻接或 staging，也不实现合法格、LOS、碰撞或路径检查",
      "召唤物的冻结 Actor activities 负责普通攻击、豁免、伤害与简单状态；复杂触发、死亡能力、变体召唤、被动联动、环境交互与 profile omission 表中列出的能力由 DM 按 Actor 卡面处理，不新增跨 Actor 状态机",
      "所有 root Combatant exact 继承 source Combatant 的 finite initiative；系统不另掷 d20、不将 null 当作 0、不做 ±0.01 偏移，也不授予施法回合中的额外立即行动。DM/agent 等到各自下一轮合法回合再操作",
      "Arcane 永不补生或重试 Token：DM 右键跳过会减少实际创建数；timeout、partial 或不明结果只报告 manual outcome，CLI 返回后删除成员也不会复活。只有原生 1/2/2 placement/batch、成员独立性、no-replay 与专注 cleanup 的 Runtime QA 通过后才可关闭 pending-runtime",
    ],
  },
  fragments: [
    graphFragment({
      id: "conjure-minor-elementals-graph",
      actions: [
        publicAction("cast", "咒唤次级元素 Conjure Minor Elementals", {
          parameters: [
            enumParameter(SUMMON_FORM_PARAMETER, summonFormValues, {
              labels: summonFormLabels,
            }),
          ],
        }),
      ],
      artifacts: [
        cleanRoomSummonedEntity("minor-elementals", {
          pool: conjureMinorElementalsPool,
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
          id: "cast-conjure-minor-elementals",
          on: trigger("action-used", { actionId: "cast" }),
          targets: [self("target:cast")],
          do: [
            consume(),
            operation("create-artifact", {
              id: "cast:create-minor-elementals",
              artifactId: "minor-elementals",
              target: "source",
            }),
          ],
        }),
      ],
    }),
  ],
  accepted: acceptance(SUM_NATIVE_QA_LOG, [
    "2014 RAW 的 1 分钟施法与中断由桌面在点击前 HITL 裁定；public Activity 只在 DM 宣布施法完成后作为单 action 扣槽/创建入口，不冒充自动施法计时器",
    "角色卡与 turn-context 只暴露 Azer、Ice Mephit、Mud Mephit 三个有名称的 Cast activities；非法或缺失 choice 在耗槽前拒绝",
    "Azer activity 的 canonical cardinality 为 single/count 1；Ice/Mud activities 为 fixed-small/count 2；每个命名 Activity 只绑定一个白名单 native profile，不保留旧 summon-v1/v2 flag 或 caller count",
    "一次 action cast 只消耗一个四环或更高法术位并建立最长一小时的原生专注；dnd5e 原生 SummonActivity 按 choice 创建 1/2/2 枚非链接 Token，不留下任意 CR 或数量输入，Arcane 不另建第二组",
    "Ice/Mud 的同一次 execute-turn 等待 DM 连续完成两次 TokenPlacement；第一次左键后不创建真实 Token，第二次完成后由 dnd5e 一次 batch 创建两枚独立 Token/ActorDelta/HP/位置/状态",
    "施法前 source Token 在唯一 active Combat 中恰有一个 finite initiative Combatant；全部实际创建的 summon Combatant exact 复制该值，不掷 d20、不做 null→0 或 ±0.01 偏移，也不移动当前 combat cursor",
    "DM 按 90 ft、可见、占位、footprint、墙体、地形与高度裁定每个原生 placement；Arcane 不做 adjacent/staging/legal-square/LOS/collision gate，square、hex、gridless 由原生 UI 与 DM 共同处理",
    "DM 右键跳过时 receipt 报告 partial-manual/skipped-manual；timeout 或 indeterminate 不重放完整 Activity，CLI 返回后手删成员也不补生。Arcane 只对原生实际返回的 Token 幂等补齐 Combatant/initiative sidecar",
    "exact concentration effect 结束、替换或删除时只按本次 native invocation provenance 清理所有残存 Token/Combatant；一个成员已死亡或手删不阻止清理其余成员，不串删其他施法者或 invocation",
    "DM 按冻结 omission 表处理复杂被动、触发、死亡能力、变体召唤与环境规则；系统不把未自动化能力或尚未完成的 Runtime QA 冒充为完整 2014 RAW 支持",
  ], { status: "compiler-runtime-passed" }),
});

export default conjureMinorElementals;
