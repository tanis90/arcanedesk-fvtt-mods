import {
  QA_LOG,
  acceptance,
  add,
  cleanRoomSpell,
  consume,
  dice,
  graphFragment,
  instant,
  operation,
  perSlotAboveBase,
  publicAction,
  rule,
  selected,
  spellContract,
  spellLifetime,
  spellcastingModifier,
  trigger,
} from "@arcanedesk/spell-compiler/dsl";

// 2024 重写批（M1.0 审计 C 桶 recipe-invalid）：治疗 3d8→5d8（升环仍 +1d8），
// 学派塑能→防护，且 2024 删除了 2014 的"亡灵与构装无效"限制。
// 5R 锚点：5R 玩家手册2024 5环.htm#Mass_Cure_Wounds。
const massCureWounds = cleanRoomSpell({
  id: "mass-cure-wounds",
  contract: spellContract({
    ruleset: "2024",
    level: 5,
    school: "abj",
    components: {
      verbal: true,
      somatic: true,
      material: false,
    },
    lifetime: spellLifetime(instant()),
  }),
  emission: { contentVersion: 2 },
  support: {
    level: "simplified",
    omissions: [
      "5R 要求目标位于 60 ft 内一点周边 30 ft 半径球状区域内；系统不接收该点坐标，也不推导共同覆盖关系，由 DM 在声明目标时确认",
      "目标可见性未校验：至多六个目标是否都在施法者视线内由 DM 判断",
    ],
  },
  fragments: [
    graphFragment({
      id: "mass-cure-wounds-graph",
      actions: [publicAction("cast", "群体疗伤术 Mass Cure Wounds")],
      rules: [
        rule({
          id: "cast-mass-cure-wounds",
          on: trigger("action-used", { actionId: "cast" }),
          targets: [
            selected("target:cast", {
              min: 1,
              max: 6,
              // 法术中心点在 60 ft 内，目标可再距该点 30 ft；Context Exec 不
              // 提供该点坐标，因此由 DM 声明完整几何，查询不做 60 ft 拒绝。
              range: null,
              kind: "creature",
            }),
          ],
          do: [
            consume(),
            operation("healing", {
              id: "cast:healing",
              target: "target:cast",
              formula: perSlotAboveBase(
                add(dice(5, 8), spellcastingModifier()),
                dice(1, 8),
              ),
              healingTypes: ["healing"],
            }),
          ],
        }),
      ],
    }),
  ],
  accepted: acceptance(QA_LOG, [
    "action 以 selected-targets 接受一至六个由 DM 声明满足 60 ft 中心点与 30 ft 球状范围的 creature，只消耗一个五环或更高法术位",
    "每个目标恢复 5d8 + 施法属性调整值（2024 口径），每比五环高一环增加 1d8",
    "2024 起不再排除亡灵与构装目标",
    "非目标 HP 不变，不建立专注、持续 Effect 或模板",
    "选点几何与目标可见性由 DM 确认，不由自动化冒充",
  ], { status: "compiler-passed" }),
});

export default massCureWounds;
