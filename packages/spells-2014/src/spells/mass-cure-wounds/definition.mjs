import {
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

const L5_WAVE_I2_QA_RECEIPT =
  "docs/foundry-automation/notes/spell-level-5-wave-i2-qa-2026-08-26.md";

const massCureWounds = cleanRoomSpell({
  id: "mass-cure-wounds",
  contract: spellContract({
    ruleset: "2014",
    level: 5,
    school: "evo",
    components: {
      verbal: true,
      somatic: true,
      material: false,
    },
    lifetime: spellLifetime(instant()),
  }),
  emission: { contentVersion: 1 },
  support: {
    level: "simplified",
    omissions: [
      "所选目标是否能由施法者 60 ft 内同一个合法点的 30-ft-radius sphere 共同覆盖由 DM 在声明目标时确认；系统不接收点坐标，也不自行推导该覆盖关系",
      "undead 与 construct 的无效目标限制由 DM 在声明目标时判断",
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
              // The spell point is within 60 ft of the caster; a creature may
              // then be up to 30 ft from that point.  Because Context Exec does
              // not supply that point, the DM declares the complete geometry
              // and this query must not reject otherwise-legal 61-90 ft targets.
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
                add(dice(3, 8), spellcastingModifier()),
                dice(1, 8),
              ),
              healingTypes: ["healing"],
            }),
          ],
        }),
      ],
    }),
  ],
  accepted: acceptance(L5_WAVE_I2_QA_RECEIPT, [
    "action 以 selected-targets 接受一至六个由 DM 声明满足完整施法点与范围约束的 creature；零个或第七个目标在资源消耗前拒绝",
    "每个目标恢复 3d8 + 施法属性调整值，每高一环增加 1d8 healing",
    "一次施法只消耗一个明确声明的五环或更高法术位，不建立专注、持续 Effect 或模板",
    "非目标的 HP 保持不变",
    "合法选点与 30 ft 半径共同覆盖关系，以及 undead/construct 资格，保持明确 DM omission，不被自动化冒充为系统校验",
  ], { status: "compiler-runtime-passed" }),
});

export default massCureWounds;
