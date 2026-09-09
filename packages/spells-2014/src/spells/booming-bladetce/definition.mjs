import {
  QA_LOG,
  acceptance,
  cantripProgression,
  cleanRoomEffect,
  cleanRoomSpell,
  constant,
  dice,
  duration,
  eventTarget,
  firstOf,
  graphFragment,
  operation,
  ownedItem,
  publicAction,
  rule,
  selected,
  spellContract,
  spellLifetime,
  trigger,
  untilTrigger,
} from "@arcanedesk/spell-compiler/dsl";

const boomingBladeTce = cleanRoomSpell({
  id: "booming-bladetce",
  contract: spellContract({
    ruleset: "2014",
    level: 0,
    school: "evo",
    components: {
      verbal: false,
      somatic: true,
      material: true,
    },
    material: {
      cost: 0.1,
      consumed: false,
    },
    lifetime: spellLifetime(duration(1, "rounds")),
  }),
  emission: { contentVersion: 1 },
  support: {
    level: "simplified",
    omissions: [
      "目标在到期前自愿移动至少 5 ft 时触发的 thunder damage 及法术结束由 DM 结算；自动化只保留来源绑定 marker",
      "有多件合格武器时按 sort、name、id 稳定选择第一件已装备的近战武器，不额外询问施法者",
      "武器至少价值 1 sp 的材料资格由 DM 判断；runtime 只校验存在可用的已装备近战武器",
    ],
  },
  fragments: [
    graphFragment({
      id: "booming-blade-tce-graph",
      actions: [
        publicAction("cast", "轰雷剑 Booming Blade（TCE）"),
      ],
      artifacts: [
        cleanRoomEffect("booming-blade-sheathed", {
          host: "actor",
          scope: "source-target",
          reapply: "replace",
          name: "Booming Blade: Sheathed in Thunder",
          markerOnly: true,
          lifecycle: firstOf(
            duration(1, "rounds"),
            untilTrigger(trigger("turn-start", { subject: "source" })),
          ),
        }),
      ],
      rules: [
        rule({
          id: "cast-booming-blade",
          on: trigger("action-used", { actionId: "cast" }),
          targets: [
            selected("target:cast", {
              min: 1,
              max: 1,
              range: 5,
              kind: "creature",
            }),
            ownedItem("target:weapon", {
              itemType: "weapon",
              equipped: true,
              attackRange: "melee",
              selection: "first-stable",
            }),
          ],
          do: [
            operation("weapon-attack", {
              id: "cast:weapon-attack",
              weapon: "target:weapon",
              target: "target:cast",
            }),
          ],
        }),
        rule({
          id: "apply-booming-blade-on-hit",
          on: trigger("operation-outcome", {
            operationId: "cast:weapon-attack",
            outcome: "hit",
          }),
          targets: [eventTarget("target:hit")],
          do: [
            operation("damage", {
              id: "hit:booming-blade-damage",
              target: "target:hit",
              formula: cantripProgression(
                constant(0),
                dice(1, 8),
              ),
              damageTypes: ["thunder"],
              properties: ["magical"],
              attachment: "triggering-attack",
            }),
            operation("apply-artifact", {
              id: "hit:apply-booming-blade-marker",
              artifactId: "booming-blade-sheathed",
              target: "target:hit",
            }),
          ],
        }),
      ],
    }),
  ],
  accepted: acceptance(
    QA_LOG,
    [
      "一个公开 action 对 5 ft 内一个声明 creature 施法，CLI 输入为 selected-targets，且不创建 measured template",
      "runtime 从施法者已装备的近战武器中按 sort、name、id 稳定选择第一件，并执行该武器真实的 melee attack workflow",
      "真实命中保留武器攻击的正常伤害与效果，并在角色 5、11、17 级分别向父伤害 roll 注入 1d8、2d8、3d8 thunder；一级至四级不创建零伤害段",
      "额外 thunder 的暴击扩骰交给 Midi，runtime 不预先翻倍；真实未命中不造成任何伤害，也不创建 marker",
      "命中目标获得来源绑定的 Booming Blade marker，并在施法者下一回合开始或一轮上限时清理",
      "移动目标不会被 runtime 伪判定为自愿移动，也不会自动结算二段伤害；DM 依据 marker 完成该简化边界",
      "没有合格武器或目标超出 5 ft 时在真实武器 workflow 前拒绝，HP、Effect、模板与回合状态保持零副作用",
      "该戏法不消耗任何法术位，也不会把武器普通伤害错误标记为魔法伤害",
    ],
    { status: "compiler-runtime-passed" },
  ),
});

export default boomingBladeTce;
