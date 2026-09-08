import {
  acceptance,
  cleanRoomSpell,
  consume,
  graphFragment,
  instant,
  operation,
  publicAction,
  rule,
  selected,
  spellContract,
  spellLifetime,
  trigger,
} from "@arcanedesk/spell-compiler/dsl";

const L5_WAVE_I2_QA_RECEIPT =
  "docs/foundry-automation/notes/spell-level-5-wave-i2-qa-2026-08-26.md";

const restorationModes = [
  {
    id: "charmed",
    name: "高等复原术：解除魅惑 Greater Restoration: End Charmed",
    statuses: ["charmed"],
  },
  {
    id: "petrified",
    name: "高等复原术：解除石化 Greater Restoration: End Petrified",
    statuses: ["petrified"],
  },
  {
    id: "exhaustion",
    name: "高等复原术：力竭减一（DM） Greater Restoration: Reduce Exhaustion (DM)",
  },
  {
    id: "curse",
    name: "高等复原术：解除一项诅咒（DM） Greater Restoration: End One Curse (DM)",
  },
  {
    id: "ability-score",
    name: "高等复原术：恢复一项属性值（DM） Greater Restoration: Restore One Ability Score (DM)",
  },
  {
    id: "hit-point-maximum",
    name: "高等复原术：恢复最大生命值（DM） Greater Restoration: Restore Hit Point Maximum (DM)",
  },
];

const greaterRestoration = cleanRoomSpell({
  id: "greater-restoration",
  contract: spellContract({
    ruleset: "2014",
    level: 5,
    school: "abj",
    components: {
      verbal: true,
      somatic: true,
      material: true,
    },
    material: {
      cost: 100,
      consumed: true,
    },
    lifetime: spellLifetime(instant()),
    primaryActionId: "cast-charmed",
  }),
  emission: { contentVersion: 1 },
  support: {
    level: "simplified",
    omissions: [
      "力竭分支只完成真实施法与法术位消耗；Activity 完成后由 DM 将目标 exhaustion 等级精确降低 1",
      "诅咒分支只完成真实施法与法术位消耗；Activity 完成后由 DM 删除一项明确诅咒 Effect，并按需处理被诅咒物品的 attunement",
      "属性值降低分支只完成真实施法与法术位消耗；Activity 完成后由 DM 删除造成一项 ability score 降低的精确 Effect，或修正对应字段",
      "最大生命值降低分支只完成真实施法与法术位消耗；Activity 完成后由 DM 删除造成 hit point maximum 降低的精确 Effect，或修正对应字段",
      "Charmed 与 Petrified 分支只自动移除结构化同名 status；混合 Effect 的其他 mechanical changes 会保留，同一 status 存在多个来源或来源不明确时由 DM 校正精确 Effect",
      "100 gp diamond dust 的材料消耗只保留在 SpellContract 与法术卡；Activity 完成后由 DM 记录实际材料库存变化",
    ],
  },
  fragments: [
    graphFragment({
      id: "greater-restoration-graph",
      actions: restorationModes.map(mode =>
        publicAction(`cast-${mode.id}`, mode.name)
      ),
      rules: restorationModes.map(mode =>
        rule({
          id: `cast-greater-restoration-${mode.id}`,
          on: trigger("action-used", { actionId: `cast-${mode.id}` }),
          targets: [
            selected(`target:${mode.id}`, {
              min: 1,
              max: 1,
              range: null,
              units: "touch",
              kind: "creature",
            }),
          ],
          do: [
            consume(`${mode.id}:consume`),
            ...(mode.statuses
              ? [
                  operation("remove-statuses", {
                    id: `${mode.id}:remove-status`,
                    target: `target:${mode.id}`,
                    statuses: mode.statuses,
                  }),
                ]
              : []),
          ],
        })
      ),
    }),
  ],
  accepted: acceptance(L5_WAVE_I2_QA_RECEIPT, [
    "battle-context 与 turn-context 暴露六个 selected-targets 命名 Activity；RAW 的 charmed/petrified 类别拆成两个明确 Action，每次 invocation 只处理一个类别和一个 touch creature",
    "Charmed Action 只移除目标现存的 structured charmed status；Petrified Action 只移除 structured petrified status；另一状态、无关状态、无关 mechanical changes 与非目标保持不变",
    "Exhaustion、Curse、Ability Score 与 Hit Point Maximum 四个 DM Action 都启动真实 dnd5e/Midi utility workflow，并只消耗一个明确声明的五环或更高法术位；系统不伪造字段或 Effect 已恢复",
    "四个 DM Action 完成后，DM 分别执行一次精确动作：exhaustion 减 1、删除一项 curse、恢复一项 ability score 降低、或恢复一项 hit point maximum 降低",
    "法术卡声明需要并会消耗价值 100 gp 的 diamond dust，但自动化不修改材料库存；DM 在每次成功 Cast 后记录实际消耗",
    "角色卡 UI 与 battle-context -> turn-context -> execute-turn 对每个命名分支使用同一个 compiler-emitted Activity，并由 L5-I2 Runtime QA receipt 记录双入口与状态证据",
  ], { status: "compiler-runtime-passed" }),
});

export default greaterRestoration;
