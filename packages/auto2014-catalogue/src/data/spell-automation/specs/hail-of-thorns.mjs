import {
  acceptance,
  castLevel,
  cleanRoomSpell,
  consume,
  dice,
  duration,
  eventNeighborhood,
  graphFragment,
  operation,
  predicate,
  publicAction,
  rule,
  spellContract,
  spellLifetime,
  tiers,
  trigger,
} from "../dsl.mjs";

const EXPANSION_BATCH =
  "docs/foundry-automation/notes/零至三环新法术扩展批次.md";

const hailDamage = tiers([
  { minimum: 1, value: dice(1, 10) },
  { minimum: 2, value: dice(2, 10) },
  { minimum: 3, value: dice(3, 10) },
  { minimum: 4, value: dice(4, 10) },
  { minimum: 5, value: dice(5, 10) },
  { minimum: 6, value: dice(6, 10) },
], castLevel());

const hailOfThorns = cleanRoomSpell({
  id: "hail-of-thorns",
  contract: spellContract({
    ruleset: "2014",
    level: 1,
    school: "con",
    components: {
      verbal: true,
      somatic: false,
      material: false,
    },
    lifetime: spellLifetime(duration(1, "minutes")),
    primaryActionId: "declare",
  }),
  emission: { contentVersion: 1 },
  support: {
    level: "simplified",
    omissions: [
      "declared-rider 将 bonus-action 施法声明合并到下一次远程武器命中；未命中不耗槽，也不建立命中前的专注等待窗口",
      "CLI 当前不能为 dagger/handaxe 等 melee + thrown 武器明确声明本次使用投掷模式；本法术只承诺原生 ranged weapon attack 条目",
    ],
  },
  fragments: [
    graphFragment({
      id: "hail-of-thorns-rider",
      actions: [
        publicAction("declare", "棘刺之雹 Hail of Thorns", {
          activationType: "bonus",
          delivery: "declared-rider",
        }),
      ],
      rules: [
        rule({
          id: "resolve-declared-rider",
          on: trigger("operation-outcome", {
            operationId: "external:triggering-weapon-attack",
            outcome: "hit",
          }),
          when: [
            predicate("declared"),
            predicate("attack-kind", { value: "ranged-weapon" }),
          ],
          targets: [
            eventNeighborhood("target:hail", {
              anchor: "target",
              radius: 5,
              units: "ft",
              includeAnchor: true,
              kind: "creature",
            }),
          ],
          do: [
            consume("rider:consume", "on-hit"),
            operation("saving-throw", {
              id: "hail:save",
              ability: ["dex"],
              target: "target:hail",
              onSave: "half",
            }),
            operation("damage", {
              id: "hail:piercing-damage",
              target: "target:hail",
              formula: hailDamage,
              damageTypes: ["piercing"],
              onSave: "half",
            }),
          ],
        }),
      ],
    }),
  ],
  accepted: acceptance(EXPANSION_BATCH, [
    "declared rider 只在下一次真实远程武器命中时消耗一个一环或更高法术位；近战命中与远程未命中均保持资源和世界状态不变",
    "命中后以受击目标为中心快照其自身和 5 ft 内所有 creature，不要求 DM 放置模板，也不改写玩家当前 targets",
    "每个邻近目标分别进行 Dexterity save，失败承受 piercing 全伤，成功承受一半；父攻击是否暴击不改变这次区域伤害骰",
    "伤害从一环 1d10 起每升一环增加 1d10，并在六环及更高法术位保持最大 6d10",
    "5 ft 外生物不豁免也不受伤害，同一次武器命中只触发一轮邻域结算且不重复扣槽",
  ], { status: "compiler-runtime-passed" }),
});

export default hailOfThorns;
