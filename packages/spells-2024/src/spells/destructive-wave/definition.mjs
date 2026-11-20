import {
  QA_LOG,
  acceptance,
  cleanRoomEffect,
  cleanRoomSpell,
  consume,
  contentRef,
  dice,
  eventTarget,
  grantStatus,
  graphFragment,
  instant,
  manual,
  operation,
  publicAction,
  rule,
  selected,
  spellContract,
  spellLifetime,
  trigger,
} from "@arcanedesk/spell-compiler/dsl";

// L4 移植批（非 SRD，spells24 无源文档）：G 桶 + 2014 recipe destructive-wave。
// 5R 锚点 五环.htm#Destructive_Wave。与 2014 差异：法术成分去掉 S（仅 V），骰面与倒地条款一致（审计 transplant-recipe）。
const damageModes = [
  {
    id: "radiant",
    label: "湮灭波：光耀 Destructive Wave: Radiant",
    damageType: "radiant",
  },
  {
    id: "necrotic",
    label: "湮灭波：暗蚀 Destructive Wave: Necrotic",
    damageType: "necrotic",
  },
];

const destructiveWave = cleanRoomSpell({
  id: "destructive-wave",
  contract: spellContract({
    ruleset: "2024",
    level: 5,
    school: "evo",
    components: {
      verbal: true,
      somatic: false,
      material: false,
    },
    lifetime: spellLifetime(instant()),
    primaryActionId: "cast:radiant",
  }),
  content: contentRef("destructive-wave"),
  emission: { contentVersion: 1 },
  support: { level: "full", omissions: [] },
  fragments: [
    graphFragment({
      id: "destructive-wave-graph",
      actions: damageModes.map(mode =>
        publicAction(`cast:${mode.id}`, mode.label)
      ),
      artifacts: [
        cleanRoomEffect("destructive-wave-prone", {
          host: "actor",
          scope: "source-target",
          reapply: "replace",
          name: "Destructive Wave: Prone",
          modifiers: [grantStatus("prone")],
          lifecycle: manual(),
        }),
      ],
      rules: [
        ...damageModes.map(mode =>
          rule({
            id: `cast-destructive-wave:${mode.id}`,
            on: trigger("action-used", { actionId: `cast:${mode.id}` }),
            targets: [
              selected(`target:cast:${mode.id}`, {
                min: 1,
                max: "any",
                range: 30,
                units: "ft",
                kind: "creature",
              }),
            ],
            do: [
              consume(`cast:consume:${mode.id}`),
              operation("saving-throw", {
                id: `initial-save:${mode.id}`,
                ability: ["con"],
                target: `target:cast:${mode.id}`,
                onSave: "half",
              }),
              operation("damage", {
                id: `initial-thunder-damage:${mode.id}`,
                target: `target:cast:${mode.id}`,
                formula: dice(5, 6),
                damageTypes: ["thunder"],
                onSave: "half",
              }),
              operation("damage", {
                id: `initial-${mode.id}-damage:${mode.id}`,
                target: `target:cast:${mode.id}`,
                formula: dice(5, 6),
                damageTypes: [mode.damageType],
                onSave: "half",
              }),
            ],
          })
        ),
        ...damageModes.map(mode =>
          rule({
            id: `initial-save-failed:${mode.id}`,
            on: trigger("operation-outcome", {
              operationId: `initial-save:${mode.id}`,
              outcome: "failure",
            }),
            targets: [eventTarget(`target:failed:${mode.id}`)],
            do: [
              operation("apply-artifact", {
                id: `failure:apply-prone:${mode.id}`,
                artifactId: "destructive-wave-prone",
                target: `target:failed:${mode.id}`,
              }),
            ],
          })
        ),
      ],
    }),
  ],
  accepted: acceptance(QA_LOG, [
    "Radiant 与 Necrotic 是两个稳定命名的 public Activity；每次 invocation 只选择其中一个，并只消耗一个五环或更高法术位",
    "施法者显式声明 30 ft 内任意数量的 creature；未声明目标与友军不会被自动纳入，超距目标在真实 workflow 前拒绝",
    "每个声明目标进行 Constitution save；失败分别承受 5d6 thunder 与 5d6 所选 radiant 或 necrotic，成功时两部分分别半伤",
    "只有失败目标获得来源绑定、机械可见的 prone Effect；成功目标、非目标和未选择的伤害类型保持不变",
    "prone 使用 manual lifecycle；目标按正常 Foundry/DM 起身流程移除效果，不由瞬时法术结束或隐藏清理器提前移除",
    "角色卡与 battle-context -> turn-context -> execute-turn 调用同一个 compiler-emitted Activity，并可观察法术位、两类伤害、save outcome 与 prone 状态差",
  ], { status: "compiler-runtime-passed" }),
});

export default destructiveWave;
