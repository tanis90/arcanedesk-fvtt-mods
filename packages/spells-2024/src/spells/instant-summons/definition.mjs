import {
  QA_LOG,
  acceptance,
  cleanRoomEffect,
  cleanRoomSpell,
  consume,
  graphFragment,
  instant,
  manual,
  operation,
  publicAction,
  rule,
  self,
  spellContract,
  spellLifetime,
  trigger,
} from "@arcanedesk/spell-compiler/dsl";

// L3 新写批（无 2014 recipe）：5R 玩家手册2024/法术详述/6环.htm#Drawmij's_Instant_Summons。
// 自动化等级：utility marker-only——一分钟施法产出聊天卡与来源标记；物件标记、粉碎蓝宝石召还与持有者信息由 DM 执行。
const instantSummons = cleanRoomSpell({
  id: "instant-summons",
  contract: spellContract({
    ruleset: "2024",
    level: 6,
    school: "con",
    components: {
      verbal: true,
      somatic: true,
      material: true,
    },
    material: {
      cost: 1000,
      consumed: false,
    },
    ritual: true,
    lifetime: spellLifetime(instant()),
  }),
  emission: { contentVersion: 1 },
  support: {
    level: "simplified",
    omissions: [
      "目标物件（最重 10 磅、最长 6 尺）的选择、隐形物件标记与蓝宝石上的名称由 DM 手动记录",
      "以魔法动作说出名称并粉碎蓝宝石召回物件、跨距离/位面出现在手上，以及持有者或其位置信息的告知，均由 DM 处理",
      "每次施法必须使用不同的蓝宝石；material cost 只标注 1000 GP 门槛，不追踪库存与消耗",
      "Cast 用 self 表达施法者触碰蓝宝石与物件，物品卡射程显示 Self 而非触碰；实际触碰距离由 DM 保证",
      "「直至被解除」无法写入 contract lifetime（只接受 instant 或固定 duration）：contract 记为立即，标记使用 manual lifecycle 持续到 DM 解除",
      "仪式施法不消耗法术位；Cast action 不区分仪式版本，以法术位施展时正常扣槽，仪式版本由 DM 手动免扣",
    ],
  },
  fragments: [
    graphFragment({
      id: "instant-summons-graph",
      actions: [
        publicAction("cast", "卓姆吉瞬间召唤 Drawmij's Instant Summons", {
          activationType: "minute",
        }),
      ],
      artifacts: [
        cleanRoomEffect("instant-summons", {
          host: "actor",
          scope: "source",
          reapply: "replace",
          name: "Instant Summons",
          markerOnly: true,
          lifecycle: manual(),
        }),
      ],
      rules: [
        rule({
          id: "cast-instant-summons",
          on: trigger("action-used", { actionId: "cast" }),
          targets: [self("target:cast")],
          do: [
            consume(),
            operation("apply-artifact", {
              id: "cast:apply-marker",
              artifactId: "instant-summons",
              target: "source",
            }),
          ],
        }),
      ],
    }),
  ],
  accepted: acceptance(QA_LOG, [
    "施法入口为一分钟 utility，不选择 token，也不进行豁免；只消耗一个六环或更高法术位",
    "施法创建一个 manual lifecycle 的 Instant Summons 来源标记，持续至 DM 解除，不建立专注",
    "标记不标记物件、不召回物件、不查询持有者，只作为本次施法仍在生效的可见凭据",
    "物件选择、隐形标记、粉碎蓝宝石召还、持有者与位置信息均由 DM 按 5R 原文处理",
    "1000 GP 蓝宝石门槛只写入 contract material，不自动扣库存；每次施法须用不同蓝宝石由 DM 保证",
  ], { status: "compiler-passed" }),
});

export default instantSummons;
