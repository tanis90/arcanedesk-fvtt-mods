import {
  COMPILER_MIGRATION_LOG,
  acceptance,
  blockActionKinds,
  cleanRoomEffect,
  cleanRoomSpell,
  concentration,
  constant,
  consume,
  contentRef,
  duration,
  endSourceWhenLastDependentEnds,
  firstOf,
  grantAbilitySavingThrowAdvantage,
  grantHover,
  grantNonmagicalDamageResistance,
  graphFragment,
  operation,
  publicAction,
  rule,
  selected,
  setMovement,
  spellContract,
  trigger,
  untilTrigger,
  whileSpellActive,
} from "../dsl.mjs";

const gaseousForm = cleanRoomSpell({
  id: "gaseous-form",
  contract: spellContract({
    ruleset: "2014",
    level: 3,
    school: "trs",
    components: {
      verbal: true,
      somatic: true,
      material: true,
    },
    lifetime: concentration(duration(1, "hours")),
  }),
  content: contentRef("gaseous-form"),
  emission: { contentVersion: 8 },
  support: {
    level: "simplified",
    omissions: [
      "目标是否自愿、进入其他生物空间、穿过小孔或裂缝以及将液体视为固体仍由 DM 裁定",
      "不能说话或操纵物件仍由 DM 裁定",
    ],
  },
  fragments: [
    graphFragment({
      id: "gaseous-form-graph",
      actions: [publicAction("cast", "气化形体 Gaseous Form")],
      artifacts: [
        cleanRoomEffect("gaseous-form", {
          host: "actor",
          scope: "source-target",
          reapply: "replace",
          name: "Gaseous Form",
          modifiers: [
            setMovement("walk", constant(0)),
            setMovement("burrow", constant(0)),
            setMovement("climb", constant(0)),
            setMovement("swim", constant(0)),
            setMovement("fly", constant(10)),
            grantHover(),
            grantAbilitySavingThrowAdvantage(["str", "dex", "con"]),
            grantNonmagicalDamageResistance(),
            blockActionKinds(["attack", "spell"]),
          ],
          sourceTermination: endSourceWhenLastDependentEnds(),
          lifecycle: firstOf(
            whileSpellActive(),
            untilTrigger(
              trigger("hit-points-depleted", { subject: "effect-target" }),
            ),
          ),
        }),
      ],
      rules: [
        rule({
          id: "cast-gaseous-form",
          on: trigger("action-used", { actionId: "cast" }),
          targets: [
            selected("target:cast", {
              min: 1,
              max: 1,
              range: null,
              units: "touch",
              kind: "creature",
            }),
          ],
          do: [
            consume(),
            operation("apply-artifact", {
              id: "cast:apply-gaseous-form",
              artifactId: "gaseous-form",
              target: "target:cast",
            }),
          ],
        }),
      ],
    }),
  ],
  accepted: acceptance(
    COMPILER_MIGRATION_LOG,
    [
      "一个 touch 声明目标只保留 10 ft fly movement 并获得 hover",
      "目标对 Strength、Dexterity 与 Constitution saving throws 获得优势",
      "目标获得对全部 nonmagical damage 的 resistance",
      "目标的攻击与施法 action 被 turn-context 隐藏，旧 action id 与直接 Midi workflow 同样被阻止",
      "非目标不变且只消耗一个所声明环位的法术位",
      "专注结束或一小时到期时清理目标效果并恢复原有动作与移动",
      "目标降至 0 HP 时清理目标效果并同步终止 source concentration",
      "穿隙、进入其他生物空间、液体、说话与操纵物件仍明确交由 DM 裁定",
    ],
    { status: "compiler-runtime-passed" },
  ),
});

export default gaseousForm;
