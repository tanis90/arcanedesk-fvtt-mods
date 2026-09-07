import {
  COMPILER_MIGRATION_LOG,
  acceptance,
  cleanRoomEffect,
  cleanRoomSpell,
  concentration,
  consume,
  contentRef,
  duration,
  enumParameter,
  grantResistance,
  graphFragment,
  operation,
  parameterValue,
  publicAction,
  rule,
  selected,
  spellContract,
  trigger,
  whileSpellActive,
} from "../dsl.mjs";

const energyTypes = ["acid", "cold", "fire", "lightning", "thunder"];
const protectionFromEnergy = cleanRoomSpell({
  id: "protection-from-energy",
  contract: spellContract({
    ruleset: "2014",
    level: 3,
    school: "abj",
    components: {
      verbal: true,
      somatic: true,
      material: false,
    },
    lifetime: concentration(duration(1, "hours")),
  }),
  content: contentRef("protection-from-energy"),
  emission: { contentVersion: 6 },
  support: { level: "full", omissions: [] },
  fragments: [
    graphFragment({
      id: "protection-from-energy-graph",
      actions: [
        publicAction("cast", "防护能量 Protection from Energy", {
          parameters: [enumParameter("damageType", energyTypes, {
            labels: {
              acid: "强酸 Acid",
              cold: "寒冷 Cold",
              fire: "火焰 Fire",
              lightning: "闪电 Lightning",
              thunder: "雷鸣 Thunder",
            },
          })],
        }),
      ],
      artifacts: [
        cleanRoomEffect("energy-resistance", {
          host: "actor",
          scope: "source-target",
          reapply: "replace",
          name: "Protection from Energy",
          modifiers: [grantResistance(parameterValue("damageType"))],
          lifecycle: whileSpellActive(),
        }),
      ],
      rules: [
        rule({
          id: "cast-protection",
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
              id: "cast:apply-resistance",
              artifactId: "energy-resistance",
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
      "五个命名 action 分别选择 acid、cold、fire、lightning 与 thunder",
      "touch 范围内一个声明目标只获得所选的一种伤害抗性",
      "只消耗一个三环或更高法术位并建立最长一小时的专注",
      "专注或持续时间结束时清理抗性",
      "非目标与未选择的伤害类型不变",
    ],
    { status: "compiler-runtime-passed" },
  ),
});

export default protectionFromEnergy;
