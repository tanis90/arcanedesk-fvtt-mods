import {
  QA_LOG,
  acceptance,
  cleanRoomEffect,
  cleanRoomSpell,
  consume,
  duration,
  graphFragment,
  operation,
  publicAction,
  rule,
  selected,
  spellContract,
  spellLifetime,
  trigger,
} from "@arcanedesk/spell-compiler/dsl";

// L3 新写批（无 2014 recipe）：5R 玩家手册2024/法术详述/8环.htm#Clone。
// 自动化等级：utility marker-only——1 小时施法卡与 120 天成熟度标记；容器、灵魂转移与复活禁令由 DM 执行。
const clone = cleanRoomSpell({
  id: "clone",
  contract: spellContract({
    ruleset: "2024",
    level: 8,
    school: "nec",
    components: {
      verbal: true,
      somatic: true,
      material: true,
    },
    material: {
      cost: 1000,
      consumed: true,
    },
    lifetime: spellLifetime(),
  }),
  emission: { contentVersion: 1 },
  support: {
    level: "simplified",
    omissions: [
      "法术可以只触碰「至少 1 立方寸的血肉」而非整只生物：target-kind 不支持血肉/物件，公开 Cast 只能声明一名 creature；以血肉残片施法由 DM 手工处理",
      "可密封大容器（价值 2,000 GP+）、容器是否被外界影响、以及克隆体在容器中的实体存在都不由系统创建或追踪；DM 需自行放置容器/Token",
      "120 日后完成、可选更年轻年龄、本体死亡后灵魂自由且愿意归来才转移、克隆体不带装备、原遗体变为无意识且不能被复活：全部由 DM 按 5R 原文叙事执行",
      "价值 1,000 GP+ 的钻石作为法术耗材：contract 保留费用与 consumed 语义，runtime 不搜索或删除 Actor inventory 中的具体物件",
      "标记固定为 120 天，系统不推进世界时间；DM 应在克隆体完成后手动删除该标记",
    ],
  },
  fragments: [
    graphFragment({
      id: "clone-graph",
      actions: [publicAction("cast", "克隆术 Clone", { activationType: "hour" })],
      artifacts: [
        cleanRoomEffect("clone-in-progress", {
          host: "actor",
          scope: "source-target",
          reapply: "replace",
          name: "Clone: Maturing (120 days)",
          markerOnly: true,
          modifiers: [],
          lifecycle: duration(120, "days"),
        }),
      ],
      rules: [
        rule({
          id: "cast-clone",
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
              id: "cast:apply-marker",
              artifactId: "clone-in-progress",
              target: "target:cast",
            }),
          ],
        }),
      ],
    }),
  ],
  accepted: acceptance(QA_LOG, [
    "1 小时施法触碰一名声明 creature，只消耗一个八环或更高法术位，并在目标身上建立 Clone: Maturing (120 days) 标记",
    "标记不建立专注、不造成伤害、不改变 HP 或状态，只表示该生物有一具克隆体在容器中成形",
    "同一来源对同一目标重施时 replace 旧标记，不叠加；120 天到期或 DM 手动删除时移除",
    "容器、克隆体实体、120 日成熟、年龄选择、灵魂转移、装备缺失、原遗体不可复活均由 DM 按 5R 原文执行",
    "以血肉残片而非整只生物施法保持明确 omission，由 DM 手工处理",
  ], { status: "compiler-passed" }),
});

export default clone;
