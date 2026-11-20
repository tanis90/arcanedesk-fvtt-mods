import {
  QA_LOG,
  acceptance,
  cantripProgression,
  cleanRoomEffect,
  cleanRoomSpell,
  constant,
  dice,
  duration,
  graphFragment,
  minimumTokenLight,
  operation,
  predicate,
  publicAction,
  requiresSourceArtifact,
  rule,
  selected,
  self,
  spellContract,
  spellLifetime,
  trigger,
  whileSpellActive,
} from "@arcanedesk/spell-compiler/dsl";

// 2024 重写批（M1.0 审计 C 桶 recipe-invalid）：施法改为附赠动作、投掷距离
// 30→60 ft，且投出的火焰不再结束法术（手中火焰持续 10 分钟可反复投掷）。
// 5R 锚点：5R 玩家手册2024 0环.htm#Produce_Flame。
const produceFlame = cleanRoomSpell({
  id: "produce-flame",
  contract: spellContract({
    ruleset: "2024",
    level: 0,
    school: "con",
    components: {
      verbal: true,
      somatic: true,
      material: false,
    },
    lifetime: spellLifetime(duration(10, "minutes")),
  }),
  emission: { contentVersion: 2 },
  support: {
    level: "simplified",
    omissions: [
      "5R 允许投向生物或物件；当前 hurl 只接受 creature 目标，物件目标由 DM 手动结算",
      "手中火焰可照亮 20 ft 明亮与额外 20 ft 微光；光照作为施法者 Token 的最低光照实现，不追踪火焰是否需要被放下或熄灭",
      "火焰不会散发热量、不会点燃物品的叙事条款由 DM 处理",
    ],
  },
  fragments: [
    graphFragment({
      id: "produce-flame-graph",
      actions: [
        publicAction("cast", "燃火术 Produce Flame", {
          activationType: "bonus",
        }),
        publicAction("hurl", "燃火术：投掷火焰 Produce Flame: Hurl", {
          availableWhen: [requiresSourceArtifact("produce-flame-flame")],
        }),
      ],
      artifacts: [
        cleanRoomEffect("produce-flame-flame", {
          host: "actor",
          scope: "source",
          reapply: "replace",
          name: "Produce Flame",
          modifiers: [
            minimumTokenLight(constant(20), constant(40)),
          ],
          lifecycle: whileSpellActive(),
        }),
      ],
      rules: [
        rule({
          id: "cast-produce-flame",
          on: trigger("action-used", { actionId: "cast" }),
          targets: [self("target:cast")],
          do: [
            operation("apply-artifact", {
              id: "cast:apply-flame",
              artifactId: "produce-flame-flame",
              target: "source",
            }),
          ],
        }),
        rule({
          id: "hurl-produce-flame",
          on: trigger("action-used", { actionId: "hurl" }),
          when: [
            predicate("artifact-exists", {
              artifactId: "produce-flame-flame",
              subject: "source",
            }),
          ],
          targets: [
            selected("target:hurl", {
              min: 1,
              max: 1,
              range: 60,
              kind: "creature",
            }),
          ],
          do: [
            operation("attack-roll", {
              id: "hurl:attack",
              target: "target:hurl",
              attack: {
                source: "spellcasting",
                range: "ranged",
              },
            }),
            operation("damage", {
              id: "hurl:damage",
              target: "target:hurl",
              formula: cantripProgression(
                dice(1, 8),
                dice(1, 8),
              ),
              damageTypes: ["fire"],
            }),
          ],
        }),
      ],
    }),
  ],
  accepted: acceptance(QA_LOG, [
    "bonus action 施法在施法者身上建立持续 10 分钟的 Produce Flame 效果，戏法不消耗法术位",
    "效果提供至少 20 ft bright / 40 ft dim 的 Token 最低光照；再次施法 replace 旧效果",
    "效果存续期间可用一个魔法动作（hurl）对 60 ft 内一个 creature 进行远程法术攻击",
    "命中造成 1d8 fire damage，角色等级 5、11、17 时分别增至 2d8、3d8、4d8；未命中不造成伤害",
    "投掷不再结束法术：火焰效果在 10 分钟剩余时间内继续存在并可再次投掷",
    "物件目标、火焰熄灭与不点燃物品等条款保持明确 omission",
  ], { status: "compiler-passed" }),
});

export default produceFlame;
