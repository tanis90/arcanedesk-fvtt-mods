import {
  QA_LOG,
  acceptance,
  cleanRoomSpell,
  consume,
  dice,
  eventTarget,
  graphFragment,
  instant,
  operation,
  perSlotAboveBase,
  predicate,
  publicAction,
  requiredEnumSelection,
  rule,
  selected,
  spellContract,
  spellLifetime,
  trigger,
} from "@arcanedesk/spell-compiler/dsl";

// L2 重写批（2024，M1 审计 C 桶 recipe-invalid）：新增「两枚 d8 点数相同则跳到 30 ft 内另一目标」的
// 连续跳跃规则；基础 3d8、+1d8/环、90 ft 远程法术攻击与 2014 一致。
// 来源：5R 玩家手册2024 1环.htm#Chromatic_Orb。
const damageTypes = [
  {
    id: "acid",
    label: "强酸 Acid",
  },
  {
    id: "cold",
    label: "寒冷 Cold",
  },
  {
    id: "fire",
    label: "火焰 Fire",
  },
  {
    id: "lightning",
    label: "闪电 Lightning",
  },
  {
    id: "poison",
    label: "毒素 Poison",
  },
  {
    id: "thunder",
    label: "雷鸣 Thunder",
  },
];

const chromaticOrb = cleanRoomSpell({
  id: "chromatic-orb",
  contract: spellContract({
    ruleset: "2024",
    level: 1,
    school: "evo",
    components: {
      verbal: true,
      somatic: true,
      material: true,
    },
    material: {
      cost: 50,
      consumed: false,
    },
    lifetime: spellLifetime(instant()),
  }),
  emission: { contentVersion: 1 },
  support: {
    level: "simplified",
    omissions: [
      "目标必须能被施法者看见；当前 selected-targets 原语没有通用可见性校验，由 DM 在声明目标时判断",
      "2024 的跳跃规则（任两枚 d8 点数相同则从原目标跃向 30 ft 内由施法者选择的另一目标，重新攻击检定与伤害掷骰，跳跃次数上限等于所用法术位环阶、且每名生物每次施法只能被指定一次）需要对逐骰点数分支；当前 DSL 没有逐骰值条件与递归二次攻击的原语，由 DM 在掷骰后手动执行",
    ],
  },
  fragments: [
    graphFragment({
      id: "chromatic-orb-graph",
      actions: [
        publicAction("cast", "繁彩球 Chromatic Orb", {
          parameters: [
            requiredEnumSelection(
              "damageType",
              damageTypes.map(damageType => damageType.id),
              {
                labels: Object.fromEntries(
                  damageTypes.map(damageType => [
                    damageType.id,
                    damageType.label,
                  ]),
                ),
              },
            ),
          ],
        }),
      ],
      rules: [
        rule({
          id: "cast-chromatic-orb",
          on: trigger("action-used", { actionId: "cast" }),
          targets: [
            selected("target:cast", {
              min: 1,
              max: 1,
              range: 90,
              kind: "creature",
            }),
          ],
          do: [
            consume(),
            operation("attack-roll", {
              id: "cast:attack",
              target: "target:cast",
              attack: {
                source: "spellcasting",
                range: "ranged",
              },
            }),
          ],
        }),
        ...damageTypes.map(damageType =>
          rule({
            id: `chromatic-orb-hit:${damageType.id}`,
            on: trigger("operation-outcome", {
              operationId: "cast:attack",
              outcome: "hit",
            }),
            when: [
              predicate("input-selection-equals", {
                id: "damageType",
                value: damageType.id,
              }),
            ],
            targets: [
              eventTarget(`target:hit:${damageType.id}`),
            ],
            do: [
              operation("damage", {
                id: `hit:damage:${damageType.id}`,
                target: `target:hit:${damageType.id}`,
                formula: perSlotAboveBase(
                  dice(3, 8),
                  dice(1, 8),
                ),
                damageTypes: [damageType.id],
                attachment: "triggering-attack",
              }),
            ],
          })
        ),
      ],
    }),
  ],
  accepted: acceptance(QA_LOG, [
    "同一个 selected-targets action 必须由 DM 明确提供 acid、cold、fire、lightning、poison 或 thunder；缺失、非法或未知 selection 在 workflow 与法术位消耗前拒绝",
    "对 90 ft 内一个 creature 进行 ranged spell attack；未命中不造成伤害",
    "命中只造成所声明类型的 3d8 damage；暴击扩骰交给 Midi",
    "每升一环增加 1d8，并且一次合法施法只消耗一个明确声明环位的法术位",
    "材料成分保留至少价值 50 gp 且不消耗的钻石契约",
    "目标可见性由 DM 在声明目标时判断，不误报为自动校验",
    "未选择的五种伤害类型以及非目标 creature 均不改变",
    "2024 新增的 d8 同点跳跃与重复攻击检定保持明确 DM omission，不由单目标单次攻击冒充",
  ], { status: "compiler-passed" }),
});

export default chromaticOrb;
