import {
  acceptance,
  action,
  activation,
  cleanRoomSpell,
  cleanRoomSummonedEntity,
  consume,
  enumParameter,
  graphFragment,
  manual,
  operation,
  parameterValue,
  rule,
  self,
  spellContract,
  spellLifetime,
  trigger,
} from "@arcanedesk/spell-compiler/dsl";
import { PLANAR_ALLY_POOL } from "../../resources/pools.mjs";

const L6_RUNTIME_QA_RECEIPT =
  "docs/foundry-automation/notes/spell-level-6-runtime-qa-2026-09-02.md";
const SUMMON_FORM_PARAMETER = "summon-form";

const summonFormValues = PLANAR_ALLY_POOL.choices.map(choice => choice.choice);
const summonFormLabels = Object.fromEntries(
  PLANAR_ALLY_POOL.choices.map(choice => [choice.choice, choice.label]),
);

const planarAlly = cleanRoomSpell({
  id: "planar-ally",
  contract: spellContract({
    ruleset: "2014",
    level: 6,
    school: "con",
    components: {
      verbal: true,
      somatic: true,
    },
    lifetime: spellLifetime(),
  }),
  emission: { contentVersion: 1 },
  support: {
    level: "simplified",
    omissions: [
      "本实现明确采用 BG3 simplified：每次施法只召唤 Cambion、Deva、Djinni 三个 Arcane-owned 固定 profile 之一；不实现 2014 RAW 的神祇响应、任务协商、报酬、谈判、拒绝服务或按服务推导持续时间",
      "Sights of the Seelie: Summon Deva 折叠到同一个 Deva profile；角色卡、Agent 与 Runtime 不提供任意 outsider chooser、CR/compendium browser、profile 名称或 UUID 输入，也不允许调用方改变 count",
      "Foundry 只把 Cast 标记为 10 分钟 Activity，不推进世界时间或追踪施法中断；DM 在宣告施法完成并允许消耗六环或更高法术位后调用对应命名 Activity",
      "落点完全交给 dnd5e 原生 TokenPlacement；DM 在提交前确认 60 ft 内的可见、未占据且合法位置，并处理 Token footprint、墙体、地形、高度、LOS、碰撞与提前离场",
      "召唤物理解、执行命令以及所有 profile 卡面仍需 DM/操作者在召唤物自己的合法回合裁定；Arcane 不从自然语言命令建立跨 Actor 状态机",
      "提前遣返不增加第四个 Agent public Action；DM 删除本次来源的可见 source marker 或对应 Planar Ally Token，系统只清理该来源的剩余 sidecar",
    ],
  },
  fragments: [
    graphFragment({
      id: "planar-ally-graph",
      actions: [
        action({
          id: "cast",
          name: "异界誓盟 Planar Ally",
          activation: activation("minute", 10),
          visibility: "public",
          parameters: [
            enumParameter(SUMMON_FORM_PARAMETER, summonFormValues, {
              labels: summonFormLabels,
            }),
          ],
        }),
      ],
      artifacts: [
        cleanRoomSummonedEntity("planar-ally-entity", {
          pool: PLANAR_ALLY_POOL,
          selection: parameterValue(SUMMON_FORM_PARAMETER),
          rulesModel: "bg3-simplified",
          cleanup: {
            expiry: "long-rest-or-defeat-or-dismiss",
            fallback: "dm-dismiss-source-marker",
          },
          lifecycle: manual(),
        }),
      ],
      rules: [
        rule({
          id: "cast-planar-ally",
          on: trigger("action-used", { actionId: "cast" }),
          targets: [self("target:cast")],
          do: [
            consume(),
            operation("create-artifact", {
              id: "cast:create-planar-ally",
              artifactId: "planar-ally-entity",
              target: "source",
            }),
          ],
        }),
      ],
    }),
  ],
  accepted: acceptance(L6_RUNTIME_QA_RECEIPT, [
    "角色卡、battle-context 与 turn-context 只暴露 Cambion、Deva、Djinni 三个稳定命名的 10-minute Cast activities；每项绑定一个白名单 profile，调用方不能传 profile 名称、UUID、count 或第四种选择",
    "每个命名 Activity 只消耗一个六环或更高法术位，并通过真实 dnd5e SummonActivity 与一次原生 TokenPlacement 在 DM 确认的 60 ft 合法位置创建恰一个对应的非链接 Token/ActorDelta；Arcane 不另建 Token、不浏览 pack，也不补生",
    "Cambion、Deva、Djinni 均保持各自冻结的 Arcane-owned Actor profile；Sights of the Seelie: Summon Deva 与 Planar Ally: Deva 精确复用同一 profile，不生成另一张法术卡或第二套 Deva",
    "实际创建的 ally 取得独立 Token、ActorDelta、Combatant 和 turn，并 exact 继承唯一 source Combatant 的 finite initiative；不掷 d20、不偏移先攻，也不移动当前 combat cursor",
    "法术为非专注；本次来源持续到施法者 long rest、该 ally 被击败，或 DM 删除可见 source marker/Token 表示 dismiss；short rest 不结束来源，也不增加独立 Dismiss public Action",
    "long rest、defeat 或 DM dismiss 只按精确 source Actor、Item、invocation 与 entity provenance 清理本来源的 Token、Combatant、marker 和 sidecar；其他施法者、同一施法者的其他来源、其他 Planar Ally 与其他召唤保持不变",
    "DM 取消或跳过原生 placement 时 receipt 精确报告未创建或 partial-manual；一旦 Token 已创建，timeout、partial、indeterminate、手删或击败都不得重放 Cast、重复扣槽或补生实体",
    "2014 的神祇响应、任务、报酬、谈判、服务期限、合法落点与提前离场保持显式 HITL；可见 summon 与 source marker 不冒充这些叙事裁决已自动化",
    "可信角色卡 UI 与 battle-context -> turn-context -> execute-turn 调用同一个 compiler-emitted SummonActivity；completion receipt 包含命名 Activity/profile、expected 1、placed/skipped count、workflow/message UUID、Token/Combatant/source Combatant UUID、inherited initiative、source identity、lifecycle outcome 与 manual outcome",
  ], { status: "compiler-runtime-passed" }),
});

export default planarAlly;
