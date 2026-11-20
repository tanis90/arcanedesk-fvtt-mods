import {
  QA_LOG,
  acceptance,
  cleanRoomSpell,
  consume,
  graphFragment,
  instant,
  operation,
  placedPoint,
  publicAction,
  rule,
  spellContract,
  spellLifetime,
  trigger,
} from "@arcanedesk/spell-compiler/dsl";

// L3 新写批（无 2014 recipe）：5R 玩家手册2024/法术详述/4环.htm#Dimension_Door。
// 自动化等级：落点选择 + 施法者 Token 传送；同伴、被占据落点的 4d6 力场伤害由 DM 结算。
const dimensionDoor = cleanRoomSpell({
  id: "dimension-door",
  contract: spellContract({
    ruleset: "2024",
    level: 4,
    school: "con",
    components: {
      verbal: true,
      somatic: false,
      material: false,
    },
    lifetime: spellLifetime(instant()),
  }),
  emission: { contentVersion: 1 },
  support: {
    level: "simplified",
    omissions: [
      "落点必须是你见过的、可想象的或能以距离与方向说明的地点：合法性由 DM 在点击落点时判断，系统只校验 500 ft 内一个 space",
      "可携带一名 5 ft 内自愿生物（其终点在你所选目的地 5 ft 内）未自动化：公开 Cast 只移动施法者",
      "若你、同伴或物件将落入已被生物占据或被物件填满的空间，则所有同行者受 4d6 力场伤害且传送失败：系统不检测占位，也不结算该伤害与失败",
    ],
  },
  fragments: [
    graphFragment({
      id: "dimension-door-graph",
      actions: [publicAction("cast", "任意门 Dimension Door")],
      rules: [
        rule({
          id: "cast-dimension-door",
          on: trigger("action-used", { actionId: "cast" }),
          targets: [placedPoint("target:destination", 500)],
          do: [
            consume(),
            operation("move-token", {
              id: "cast:teleport",
              target: "source",
              destination: "target:destination",
            }),
          ],
        }),
      ],
    }),
  ],
  accepted: acceptance(QA_LOG, [
    "action 在 500 ft 内选择一个 space 落点，并只消耗一个四环或更高法术位",
    "施法者 Token 移动到该落点，精确到达；不建立专注",
    "落点被占据或填满导致的 4d6 力场伤害与传送失败由 DM 结算，系统不检测占位",
    "同行的一名 5 ft 内自愿生物保持明确 omission，施法不移动任何其他 Token",
    "非法落点（超出 500 ft、未声明为可见/可想象/可描述）应在移动前由 DM 拒绝",
  ], { status: "compiler-passed" }),
});

export default dimensionDoor;
