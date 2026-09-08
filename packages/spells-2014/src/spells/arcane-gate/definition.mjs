import {
  acceptance,
  cleanRoomEffect,
  cleanRoomSpell,
  concentration,
  consume,
  duration,
  graphFragment,
  operation,
  publicAction,
  rule,
  self,
  spellContract,
  trigger,
  whileSpellActive,
} from "@arcanedesk/spell-compiler/dsl";

const L6_RUNTIME_QA_RECEIPT =
  "docs/foundry-automation/notes/spell-level-6-runtime-qa-2026-09-02.md";

const arcaneGate = cleanRoomSpell({
  id: "arcane-gate",
  contract: spellContract({
    ruleset: "2014",
    level: 6,
    school: "con",
    components: {
      verbal: true,
      somatic: true,
      material: false,
    },
    lifetime: concentration(duration(10, "minutes")),
  }),
  emission: { contentVersion: 1 },
  support: {
    level: "manual",
    omissions: [
      "Cast 完成后，DM 使用 Foundry Drawings 手工放置两个 5-ft-radius（10-ft-diameter）圆形端点：near 位于施法者 10 ft 内可见地面，far 位于施法者 500 ft 内可见地面；runtime 不创建、校验或拥有这两个 Drawing",
      "DM 确认每个端点的合法地面、空间与尺寸，并记录唯一生效面、进入方向和出口朝向；runtime 不建立 portal、碰撞、朝向、单向面或跨 Scene 状态",
      "生物穿越时由 DM 将 Token 拖到另一端点旁最近的合法未占据空间；系统不自动传送、移动、选择落点或解析大型 Token 与占位冲突",
      "施法者在自己回合以 bonus action 旋转端点时，由 DM 手工旋转或记录朝向；runtime 不追踪 action economy 或 portal facing",
      "解除、替换或到期结束专注时 source marker 自动清理，但 DM 创建的 Drawings 不属于 compiler-owned dependents；DM 必须在该时点手工删除两个端点 Drawing",
    ],
  },
  fragments: [
    graphFragment({
      id: "arcane-gate-graph",
      actions: [
        publicAction(
          "cast",
          "秘法门 Arcane Gate — DM：10 ft 内画近门、500 ft 内画远门（各 5 ft 半径并标朝向）；穿越时拖动 Token，结束时删除两门",
        ),
      ],
      artifacts: [
        cleanRoomEffect("arcane-gate-source", {
          host: "actor",
          scope: "source",
          reapply: "replace",
          name: "Arcane Gate — DM: Near ≤10 ft; Far ≤500 ft; each radius 5 ft with facing; drag Tokens to traverse; delete both Drawings when concentration ends",
          markerOnly: true,
          modifiers: [],
          lifecycle: whileSpellActive(),
        }),
      ],
      rules: [
        rule({
          id: "cast-arcane-gate",
          on: trigger("action-used", { actionId: "cast" }),
          targets: [self("target:cast")],
          do: [
            consume(),
            operation("apply-artifact", {
              id: "cast:apply-arcane-gate-source",
              artifactId: "arcane-gate-source",
              target: "source",
            }),
          ],
        }),
      ],
    }),
  ],
  accepted: acceptance(L6_RUNTIME_QA_RECEIPT, [
    "唯一 public Cast 使用 self 输入；角色卡与 Context Exec 调用同一个 compiler-emitted Activity，agent 不提供坐标、模板 UUID、Drawing UUID、目标 Token 或内部 Action",
    "Cast 真实消费一个六环或更高法术位，并在施法者建立最长 10 分钟的原生专注与 source-scoped arcane-gate-source marker；没有第二个 Far Action，也不会出现残缺或可重放的第二模板阶段",
    "公开 Activity 名与施法后可见 marker 名都完整提示五步 manual 工作流：near 在 10 ft 内、far 在 500 ft 内、两门各 5 ft 半径并记录朝向、穿越时由 DM 拖动 Token、专注结束时删除两处 Drawings；自动状态差只包含槽位、专注和来源 marker，不创建 Template、Drawing、WallDocument，不移动 Token，也不冒充传送已实现",
    "Cast 后 DM 立即在可见合法地面手工绘制两个 10-ft-diameter endpoints：near 在施法者 10 ft 内，far 在 500 ft 内；DM 记录生效面与朝向，并在穿越时把 Token 拖到另一端最近的合法未占据空间",
    "施法者回合的 bonus-action 旋转由 DM 手工记录；碰撞、占位、大型 Token、朝向与跨 Scene 传送均保持 manual，不引入坐标参数或 portal 状态机",
    "解除、替换或到期结束专注会精确清理本来源 marker；由于两个 Drawings 是 DM-owned，DM 同时手工删除它们，系统不得声称自动 endpoint cleanup",
    "重施只替换同一施法者该 Item 的来源 marker，不修改其他来源、其他 Actor、DM Drawings、Token 位置或无关世界状态",
  ], { status: "compiler-runtime-passed" }),
});

export default arcaneGate;
