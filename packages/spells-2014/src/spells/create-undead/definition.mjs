import {
  acceptance,
  cleanRoomSpell,
  cleanRoomSummonedEntity,
  consume,
  duration,
  enumParameter,
  graphFragment,
  manual,
  nativeSummonControl,
  operation,
  parameterValue,
  publicAction,
  rule,
  selected,
  self,
  spellContract,
  spellLifetime,
  trigger,
} from "@arcanedesk/spell-compiler/dsl";
import { createUndeadPool } from "../../resources/pools.mjs";

const L6_RUNTIME_QA_RECEIPT =
  "docs/foundry-automation/notes/spell-level-6-runtime-qa-2026-09-02.md";
const GHOUL_COUNT_PARAMETER = "ghoul-count";

const ghoulCountValues = createUndeadPool.choices.map(choice => choice.choice);
const ghoulCountLabels = Object.fromEntries(
  createUndeadPool.choices.map(choice => [choice.choice, choice.label]),
);

const createUndead = cleanRoomSpell({
  id: "create-undead",
  contract: spellContract({
    ruleset: "2014",
    level: 6,
    school: "nec",
    components: {
      verbal: true,
      somatic: true,
      material: true,
    },
    material: {
      cost: 150,
      consumed: false,
    },
    lifetime: spellLifetime(),
  }),
  emission: { contentVersion: 1 },
  support: {
    level: "simplified",
    omissions: [
      "Cast 前由 DM 确认当前为夜间、施法者已完成 1 分钟施法，并为所选数量准备同样数量的 Small/Medium humanoid corpses 与每具尸体一颗价值 150 gp 且不被法术消耗的 black onyx stone；material contract 结构化记录 150 gp / corpse 与 consumed=false，runtime 不计时、不扫描或消耗尸体，也不搜索或扣除动态数量的材料物件",
      "原生 TokenPlacement 的每个落点由 DM 按施法者 10 ft 内、尸体位置、未占据空间、Token footprint、墙体、地形与高度裁决；Arcane 不接收尸体或坐标输入，也不实现 LOS、碰撞、路径或合法格搜索",
      "只实现 One Ghoul、Two Ghouls、Three Ghouls 三个固定同质 profile；不实现七至九环的 ghast、wight、mummy 形态、额外数量、混编、任意 undead chooser、CR 搜索或 compendium 浏览",
      "施法者以 bonus action 在 120 ft 内对一只或多只受控亡灵下达同一命令、亡灵未获命令时的自卫，以及控制失效后的行为与 Foundry ownership 由 DM 处理；runtime 只维护结构化 control provenance 与到期资格",
      "Reassert Control 只信任 Arcane-owned 的同施法者、同法术、仍在 24 小时控制期内的 Ghoul provenance；DM 仍负责确认 Token 在叙事上是原尸体转化的同一生物，不把普通 Ghoul、复制 Actor 或手工改名 Token 冒充为合法目标",
    ],
  },
  fragments: [
    graphFragment({
      id: "create-undead-graph",
      actions: [
        publicAction("cast", "唤起亡灵 Create Undead", {
          activationType: "minute",
          parameters: [
            enumParameter(GHOUL_COUNT_PARAMETER, ghoulCountValues, {
              labels: ghoulCountLabels,
            }),
          ],
        }),
        publicAction(
          "reassert-control",
          "唤起亡灵：重申控制 Create Undead: Reassert Control",
          { activationType: "minute" },
        ),
      ],
      artifacts: [
        cleanRoomSummonedEntity("create-undead-ghouls", {
          pool: createUndeadPool,
          selection: parameterValue(GHOUL_COUNT_PARAMETER),
          rulesModel: "dnd5e-2014-simplified",
          control: nativeSummonControl({
            duration: duration(24, "hours"),
            expiry: "release-control-keep-entity",
          }),
          lifecycle: manual(),
        }),
      ],
      rules: [
        rule({
          id: "cast-create-undead",
          on: trigger("action-used", { actionId: "cast" }),
          targets: [self("target:cast")],
          do: [
            consume("cast:consume"),
            operation("create-artifact", {
              id: "cast:create-ghouls",
              artifactId: "create-undead-ghouls",
              target: "source",
            }),
          ],
        }),
        rule({
          id: "reassert-create-undead-control",
          on: trigger("action-used", { actionId: "reassert-control" }),
          targets: [
            selected("target:reassert-control", {
              min: 1,
              max: 3,
              range: 10,
              units: "ft",
              kind: "creature",
            }),
          ],
          do: [
            consume("reassert-control:consume"),
            operation("reassert-native-summon-control", {
              id: "reassert-control:refresh",
              target: "target:reassert-control",
              artifactId: "create-undead-ghouls",
            }),
          ],
        }),
      ],
    }),
  ],
  accepted: acceptance(L6_RUNTIME_QA_RECEIPT, [
    "角色卡、battle-context 与 turn-context 暴露 One Ghoul、Two Ghouls、Three Ghouls 三个稳定命名的 Cast activities，以及独立的 Reassert Control activity；三个 Cast choices 只解析 createUndeadPool 的 single/1、fixed-small/2、fixed-three/3 closed cardinality，不接受 caller profile、count、Actor UUID 或 compendium 名称",
    "每个 Cast 是 1 分钟 self + native-placement public Activity，只消耗一个明确声明的六环或更高法术位，并通过一次真实 dnd5e SummonActivity 按所选 cardinality 创建恰好 1/2/3 枚 Arcane-owned Ghoul Token/ActorDelta；material metadata 固定记录每具尸体 150 gp、consumed=false，DM 在调用前确认夜间、尸体、对应数量的 black onyx stones，并逐枚确认 10 ft 内合法落点",
    "每个实际创建的 Ghoul 都有独立 Token、ActorDelta、HP、状态、Combatant 与 turn；各 Combatant exact 复制唯一 source Combatant 的 finite initiative，不另掷 d20、不把 null 当 0、不做正负 0.01 偏移，也不移动 combat cursor",
    "每个 Ghoul 的 control provenance 精确记录 source Actor、Create Undead Item/Artifact、原始 native invocation 与 member identity，控制期限独立为创建后 24 小时；到期只关闭 agent-controlled 关系和 Reassert 资格，Token、ActorDelta、Combatant、HP、位置与世界实体继续存在且不会被 cleanup writer 删除",
    "Reassert Control 是 1 分钟 selected-targets public Activity：只接受 1..3 个施法者 10 ft 内、由同一 source Actor 通过本法术创建且仍在控制期内的 Ghoul，可横跨该施法者不同原始 Cast invocation；它只消耗一个明确声明的六环或更高法术位，并把每个合法目标的 control deadline 分别刷新为调用完成后 24 小时",
    "Reassert Control 不创建、删除、替换或移动任何 Token/ActorDelta，不新增或重建 Combatant，不改变 initiative 或 combat cursor，也不把多个 creation source 合并成新的 summon batch；其他施法者、非本法术 Ghoul、普通/改名/复制 Ghoul、控制已到期目标、10 ft 外目标、重复目标或第 4 个目标都在资源与 world write 前拒绝",
    "Cast 在首个 world write 前明确取消可安全重试；DM 跳过部分原生 placements、transport timeout 或 commit 后结果不明只返回 partial/indeterminate/manual receipt，绝不重放完整 Activity或补生 Ghoul。Reassert 按目标记录原子进度；若部分刷新已 commit，receipt 报告已完成与未完成目标且不自动重放已完成刷新",
    "相同施法者不同 Cast 的 Ghoul 保持各自 creation/member provenance，只在 Reassert eligibility 中按同 source Actor + spell control contract 合并选择；另一施法者、另一法术、另一 invocation 与既有 SUM-NATIVE 实体不会被本次控制刷新、到期或手工清理串改",
    "bonus-action command、120 ft 命令范围、共同命令、无命令自卫、失控后的行为/ownership、尸体与材料事实均保持明确 DM 边界；系统不得用持续 Token 存在冒充仍受控制，也不得用聊天卡或名称匹配冒充 provenance",
    "可信角色卡 UI 与 battle-context -> turn-context -> execute-turn 对每个 Cast/Reassert 都调用同一 compiler-emitted Activity；completion receipt 包含命名 Activity、profile/cardinality、placed/skipped 数量、有序 Token/Combatant UUID、source Combatant/initiative、control deadlines、逐目标 Reassert 结果与 no-replay 结论",
  ], { status: "compiler-runtime-passed" }),
});

export default createUndead;
