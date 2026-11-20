import {
  acceptance,
  cleanRoomEffect,
  cleanRoomSpell,
  consume,
  dice,
  duration,
  eventTarget,
  grantAbilitySavingThrowDisadvantage,
  grantStatus,
  graphFragment,
  operation,
  publicAction,
  rule,
  selected,
  spellContract,
  spellLifetime,
  trigger,
  whileSpellActive,
} from "@arcanedesk/spell-compiler/dsl";

// L2 重写批（2024，M1 审计 C 桶 recipe-invalid）：由「近战法术攻击 + 六种疾病表」改为
// 触碰体质豁免、失败 11d8 暗蚀并中毒，且所选属性豁免具劣势；3 成功/3 失败计数器为 2024 新机制。
// 来源：5R 玩家手册2024 5环.htm#Contagion。
const L5_WAVE_I4_QA_RECEIPT =
  "docs/foundry-automation/notes/spell-level-5-wave-i4-qa-2026-08-27.md";

const savingThrowAbilities = [
  { id: "str", name: "力量 Strength" },
  { id: "dex", name: "敏捷 Dexterity" },
  { id: "con", name: "体质 Constitution" },
  { id: "int", name: "智力 Intelligence" },
  { id: "wis", name: "感知 Wisdom" },
  { id: "cha", name: "魅力 Charisma" },
];

const actionId = mode => `cast-${mode.id}`;
const plagueArtifactId = mode => `contagion-plague-${mode.id}`;
const initialSaveId = mode => `${actionId(mode)}:save`;

const contagion = cleanRoomSpell({
  id: "contagion",
  contract: spellContract({
    ruleset: "2024",
    level: 5,
    school: "nec",
    components: {
      verbal: true,
      somatic: true,
      material: false,
    },
    lifetime: spellLifetime(duration(7, "days")),
    primaryActionId: actionId(savingThrowAbilities[0]),
  }),
  emission: { contentVersion: 1 },
  support: {
    level: "simplified",
    omissions: [
      "2024 在施法时选择一项属性，使中毒目标对该属性的豁免具有劣势；当前以六个命名 Cast Action 表达该选择，每次施法只应用一个所选属性",
      "「每回合结束重复体质豁免，直至累计三次成功或三次失败」需要 outcome-race 以失败豁免入场并维护独立阈值终局；现有 independent-terminal 档位只允许 hit 入场，故重复豁免与 3 成功/3 失败计数由 DM 执行，第三次成功时由 DM 删除本来源 Effect",
      "「中毒目标受到能够结束中毒的效果时须成功于体质豁免，否则中毒不结束」没有可监听的解除尝试事件，由 DM 处理",
      "七日的自然到期由 Effect 生命周期承载；被驱散或手动删除只影响本次来源，不追溯其他来源的中毒",
    ],
  },
  fragments: [
    graphFragment({
      id: "contagion-graph",
      actions: savingThrowAbilities.map(mode => publicAction(
        actionId(mode),
        `疫病术：${mode.name} Contagion: ${mode.name}`,
      )),
      artifacts: savingThrowAbilities.map(mode => cleanRoomEffect(
        plagueArtifactId(mode),
        {
          host: "actor",
          scope: "source-target",
          reapply: "replace",
          name: `Contagion: ${mode.name}`,
          modifiers: [
            grantStatus("poisoned"),
            grantAbilitySavingThrowDisadvantage([mode.id]),
          ],
          lifecycle: whileSpellActive(),
        },
      )),
      rules: savingThrowAbilities.flatMap(mode => {
        const castId = actionId(mode);
        const targetId = `target:${castId}`;
        const saveId = initialSaveId(mode);
        return [
          rule({
            id: castId,
            on: trigger("action-used", { actionId: castId }),
            targets: [
              selected(targetId, {
                min: 1,
                max: 1,
                range: null,
                units: "touch",
                kind: "creature",
              }),
            ],
            do: [
              consume(`${castId}:consume`),
              operation("saving-throw", {
                id: saveId,
                ability: ["con"],
                target: targetId,
                onSave: "none",
              }),
              operation("damage", {
                id: `${castId}:damage`,
                target: targetId,
                formula: dice(11, 8),
                damageTypes: ["necrotic"],
                onSave: "none",
              }),
            ],
          }),
          rule({
            id: `${castId}-failed`,
            on: trigger("operation-outcome", {
              operationId: saveId,
              outcome: "failure",
            }),
            targets: [eventTarget(`target:${mode.id}-failed`)],
            do: [
              operation("apply-artifact", {
                id: `${castId}:apply-plague`,
                artifactId: plagueArtifactId(mode),
                target: `target:${mode.id}-failed`,
              }),
            ],
          }),
        ];
      }),
    }),
  ],
  accepted: acceptance(L5_WAVE_I4_QA_RECEIPT, [
    "角色卡与 Context Exec 暴露力量/敏捷/体质/智力/感知/魅力六个命名 Cast Action；每个只接受 touch 范围内一个 creature，并只消耗一个五环或更高法术位",
    "每个 Cast 让目标进行一次 Constitution save；成功不造成伤害也不中毒，失败承受 11d8 necrotic damage 并获得本来源的 poisoned Effect",
    "所选属性随效果记录；中毒期间目标对该属性的豁免具有劣势，其他属性与其他状态不变",
    "首次失败后的伤害、中毒与所选属性豁免劣势由 effect 承载并持续七日；每回合结束的重复体质豁免与 3/3 计数由 DM 记录",
    "Effect 最长维持七日；到期、驱散或手动删除只清理对应 source-target 实例，不追溯其他来源的中毒；DM 判定第三次成功后手动删除该 Effect",
    "重复豁免的 3 成功/3 失败终局与解除中毒尝试的体质豁免保持明确 DM omission，不被固定的重复豁免或自动提前结束冒充",
  ], { status: "compiler-passed" }),
});

export default contagion;
