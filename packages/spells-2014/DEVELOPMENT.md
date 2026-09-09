# 法术开发必读

本文件是 Arcane 2014 法术开发的正式 SOP。新增、盘点、迁移、修复或测试法术，以及修改相关 compiler/runtime/内容绑定前必须阅读。
它承接旧《法术自动化开发规范》的范围、agent-native、HITL、三层实现和验收要求，并使用当前 package 路径。
后续修改本文件，不在旧项目或各个 skill 内维护另一份现行规范。

## 1. 阅读顺序与源码归属

先读仓库根 `AGENTS.md`、本文件、当前任务的范围冻结/开工单，再看所需 DSL API、contract tests 和历史 QA。
本文件决定如何开发；批次文件冻结单法术产品边界；代码与测试决定 API 是否真的可用。
历史报告中的 passed 只证明记录中的版本、环境和用例，不自动证明新宿主通过。

以下路径相对公开源码根；维护者开发树中对应目录位于 `public/` 下。

| 模块 | 唯一职责与编辑位置 |
| --- | --- |
| 法术定义与专用脚本 | `packages/spells-2014/src/spells/<id>/definition.mjs`；需要时同目录 `script.js` |
| 法术注册与来源生成 | `packages/spells-2014/src/index.mjs`、`src/scripts.mjs`、来源匹配/绑定/合集生成入口 |
| 公共契约 | `packages/automation-contracts/src/`：输入、资源、adapter 和语义边界 |
| DSL、compiler、emitter | `packages/spell-compiler/src/`；[API 入口](../spell-compiler/README.md)、[DSL 导出](../spell-compiler/src/data/spell-automation/dsl.mjs) |
| 共享 runtime 源码 | `packages/auto2014-runtime/src/automation.js` |
| 独立法术 runtime | `packages/spell-runtime/src/`：从共享源码生成审核过的法术投影、bootstrap、依赖就绪检查 |
| 可安装模块 | `modules/arcane-spells-2014/` 与 `tools/build-spell-module.mjs` |
| Pack 序列化与组装 | `packages/foundry-pack-builder/`：消费已准备内容，不承担法术规则 |

现阶段开发树的一至六环 167 项及 20 个戏法（19 项迁入，加上新增舞光术）均在 spells-2014 中；旧 catalogue 的 `src/data/spell-automation/specs/` 只重导出同一对象。
不保留两份可编辑 spec；源码迁入不代表独立宿主的戏法验收已完成。
v0.1.0 的安装包只包含一至六环；不能因源码树中已有戏法便声称它们已进入安装包。
范围变更要同步 registry、来源 level 校验、构建选择、冻结清单、测试和文档，不只改一个数量断言。

## 2. 先冻结“做什么”，再编码

新自动化默认范围门是：已有 Arcane 2014 内容范围与 BG3 Patch 8 实际实现的交集。
记录范围证据和 canonical/alias；沿用已有用户裁决，有后续明确重开记录时以新裁决为准。
BG3 决定投入范围，不代替 2014 规则。采用 BG3 简化必须显式声明规则模型、support 和 omissions。

| 产品状态 | 要求 |
| --- | --- |
| full | 冻结范围全部闭合，omissions 为空 |
| simplified | 核心机械闭合，逐项明确删减与 DM 操作 |
| marker-only | 只建立明确提示，不冒充机械效果 |
| manual | 自动部分与人工关键步骤明确，验证自动部分 |
| W-LARIAN | 未过范围门，不投入新自动化、不加 registry 或假 pending-runtime |
| W-COMPLEX | 已过范围门但专项投入不值得；明确暂缓，不自动进入后续批次 |

先判断 DM 能否用一次选择、拖放、切换、删除或编辑可靠处理低频规则。如果可以，保留人工处理，写明时点、动作、可见依据和不会自动恢复的结果。
不要为罕见的一步操作引入状态机、持久 marker 或第三方内部补丁。频繁记账、易错结算和时序敏感机制才值得进一步自动化。
`simplified` 不宣传为完整 RAW。不同修订、数字 identifier 和职业强化版不能按相似名称自动合并。

开工单至少填写：

```text
法术名 / canonical identifier / alias：
范围证据与批准批次：
产品状态 / 规则模型：
自动部分 / omissions / DM 动作与时点：
公开 Actions / 每个 Action 的输入与 selections：
实现层 / 现有能力 / 新机制及消费者：
Artifact identity / lifecycle / cleanup owner：
authority / dedupe / commit 与重试边界：
正例 / 反例 / 非目标 / 多来源 / 重施 / 清理用例：
UI 与 Context-Exec 用例：
来源合成与内外回归范围：
本次验收状态：pending-runtime
```

## 3. 一份机械源码，两种内容组装

DSL、compiler 和共享 runtime 维护一份实现。公开模块在用户世界中接入其已有文本；内部完整包由维护者入口组合额外内容。
不要在私有输入中藏另一份法术逻辑，也不要把完整规则文本、翻译、购买内容、生物数据或第三方素材塞进 spec、测试或公开日志。
测试夹具使用原创简短文本。来源文档只贡献允许的展示字段，不提供机械 fallback；外来 Activities、Effects 和宏不能作为自动化实现继承。

匹配按稳定身份、规则版本和环位；无法确定时拒绝或要求显式映射。展示名、译名、Legacy 字样不单独证明规则身份。
资源 UUID 格式正确不等于资源有效；宿主必须验证资源契约。依赖缺失应报告未就绪，不生成假可用内容。
编译计划成功、内容绑定成功、runtime 就绪和真实施法通过是四种不同结论。

生成世界合集不得修改原始来源或已有 Actor；重复生成保留自有条目 ID，拒绝覆盖外来条目。
已复制进角色的 Item 不会跟随合集升级。Actor 更新需要独立的迁移范围与操作说明。

## 4. Agent-native 是完成条件

公共链路：`battle-context → turn-context → execute-turn → 真实 dnd5e/Midi workflow 或有机械证据的 runtime Rule`。
角色卡与 operator 必须使用同一个 compiler-emitted Activity；agent 不需要读宏、Effect UUID、provider、hook 或内部 Activity。
不添加法术专用 CLI 命令，不把 debug eval 当施法入口。

公开输入只有：

- `self`：不传目标。
- `selected-targets`：稳定 targetTokenIds 或已冻结的确定默认策略。
- `placed-template`：发起调用，等待人类通过原生画布/TokenPlacement 放置。

环位、元素、形态、逐束分配等是 typed selections，不是第四种输入。隐藏 Activity 和事件目标不暴露为内部协议。
多阶段法术可有多个公开 Action；每次结束后重读 turn-context，再调用当前可用的下一 Action。不要新增 Start/Resume 或坐标协议。

一次 Invocation 的结果为 `completed | rejected | partial | indeterminate`：

- completed：本次真实机械和必要 receipt 闭合，不要求整个持续生命周期结束。
- rejected：确认在 commit 前拒绝，世界无副作用。
- partial：已知部分完成。
- indeterminate：可能已 commit，但无法可靠观察最终状态。

超时不自动等于失败；partial/indeterminate 不盲重放消耗资源或创建实体的动作。重读状态，仍无法判断时交由 DM。

declared-rider 是入口对等的显式例外：执行真实基础武器 Activity，以 typed declaredRiders 声明。
若没有标准 UI 声明 chooser，UI 只验证同一基础武器 Activity 不触发 rider，Context 验证声明分支，并把 UI 限制写入 omission。
不得伪造独立法术 Activity 来声称完整 UI 声明对等。

## 5. 选择实现层

1. **DSL 组合优先**：复用现有 TargetQuery、Rule、Operation、Artifact、Lifecycle 与 typed helpers。
   spec 只声明 D&D 语义、support 和 acceptance；不写 system/flags、raw macro、DAE mode/priority、provider 名或内部 Activity identifier。
2. **共享扩展**：新公共顶层语义或通用机制至少有两个真实法术消费者，且现有原语不能清晰表达。
   同时交付 closed validation、lowering/provider ownership、emitter/runtime、contract tests、API 说明和真实 QA。
3. **单法术脚本**：独有、高价值机制且手动会频繁或易错时允许，不强行抽成通用 D&D 原语。
   先冻结 typed contract 与执行边界；同目录注册脚本，不直接注册散落的全局 hook。

脚本只能接收版本化结构化上下文，经显式 registry 和共享 dispatcher 调用；不解析 agent 自由文本。
必须声明 trigger、targets、operations、artifacts、lifecycle、evidence，并明确 primary authority、幂等键、唯一 cleanup writer 和来源隔离。
commit 前 fail closed，commit 后不确定如实返回证据；不绕过真实攻击、豁免、资源或伤害结算，不返回伪 workflow。
新 event/phase ABI 必须先由主线统一建立最小脚手架；它可以有一个初始消费者，但不能把该法术规则塞进 dispatcher。

`damage-die-selection` 是同步掷骰前接口，当前消费者为 Toll the Dead。它引用一个原生单目标伤害规则，
声明 allowedFaces、`damage-roll-caller` authority 与 `workflow:base-damage-die` 写入范围。
脚本只接收冻结的普通 HP 与原生成长后的 baseDie，返回 `{schemaVersion: 1, faces}`；
不接收可写世界文档，不自行掷骰或结算伤害。dispatcher 在真实 `dnd5e.preRollDamage` 中仅替换首个骰面，
保留原骰数、后续伤害段和 options。同一配置重复处理保持首次快照，错误则取消掷骰并记录 runtime 错误。
该阶段完成只证明骰型准备，不证明整个伤害 workflow 已完成；不得把准备收据当扣血证据。

共享 runtime 不增加按法术名/identifier 的特判；生成 closure 不是源码。修改共享 runtime 后显式评审投影及固定基线，不自动刷新 pin 让测试通过。
出现第二个消费者时评审抽取共享语义，不仅凭代码相似就抽象。

## 6. 从 source 到验收

按顺序执行：检查工作树与既有实现 → 范围/开工单 → 单项 author 与门禁 → 主线集成 → clean build → 已授权 QA → receipt → 审查提交。
在线 pack、world Item 和宏只作调查证据；有用改动必须回到 source 再构建。

从公开源码根运行 Node 24 命令：

```sh
npm ci
npm test --workspace @arcanedesk/spells-2014
npm test --workspace @arcanedesk/spell-runtime
npm run check:spell-browser
npm run verify
```

按修改面选择检查，不为纯文档修改跑完整战斗测试。定义调试可用
`node examples/spell-suite/compile.mjs <registered-id> <new-output.json>`，但不能用它代替运行验收，也不能绕过尚未开放的范围。
维护者内部完整构建、机械对比及导出命令见根 AGENTS 和维护者 skill；公开贡献者不需要私有内容或凭证。
影响 SDK/Context ABI 时，在对应 SDK 仓库执行必要的类型检查、测试及构建，不复制 SDK 到法术 package。

真实 QA 必须从已提交候选构建，在已授权的明确测试世界执行；不要默认连接生产或沿用历史 Actor ID。
每项先测最简单正例，再验证反例。每 case 复位 HP、临时 HP、效果、状态、目标、模板、token、战斗游标和资源；戏法也检查法术位不变。
任意 JS 可用于隔离夹具和观察，不替代 UI/Context 施法；不改变来源合集来强制测试通过。

至少验证：

- 真实 hit/miss、成功/失败豁免、成长/升环、HP/temp HP、资源和非目标。
- 效果、反应、专注、模板/实体等实际状态差；不是只看聊天卡、动画或“没报错”。
- 来源/目标精确身份、多个来源、重施、重复事件、使用消费及清理。
- 到期、解除专注、替换、手删和异常中止；动态 Action 在来源结束后消失。
- 缺依赖、无资源、非法目标和失败后的重试边界；不依赖未声明的完整旧模块。
- 原始来源与 Actor 不变、重复生成 ID 稳定、使用者可读描述保留。

先记录失败，再修复再重测。历史 synthetic 结果不能替代真实 workflow。遗漏范围必须与实际行为一致。
保存候选 commit、版本/依赖、用例、入口、前后状态、结果和清理证据，避免将受限世界内容写入公开报告。
新实现 QA 前保持 pending-runtime；已有实现迁入新宿主时保留历史 acceptance，单独记录迁入验收，不伪造覆盖。
只有同一 Activity 的 UI 与 Context（或上述 rider 例外）通过后关闭本次 runtime acceptance。
验收元数据变更后重建验证；若 executable 改变，从新候选重测受影响用例。

## 7. 内外一致与发布

纯迁移应保持机械与稳定标识一致；规则改进单独列出预期差异，不能用更新 baseline 掩盖回归。
内部原有职业、戏法和资源不得因公开范围改变而被删减。独立 runtime 的接线与依赖需要自己的验收，共享源码不自动证明两种宿主行为相同。

维护者从同一开发真源审查、构建、验证，再通过白名单导出公开字节；不导出私有历史，也不在公开 checkout 并行开发第二份实现。
社区修改先归并到开发真源，保留归属，再统一导出。批准哈希不能由 CI 自动刷新；源码使用 LF，构建包与发布包按哈希核验。
公开贡献者正常提交公开源码 PR，不需要取得维护者的私有仓库。

发布是已提交源码 → 验证包 → 发布附件/部署。发布、生产部署、世界设置和 Actor 批量迁移各自以用户授权范围为准；测试通过不自动扩大授权。
每波形成可独立回滚的提交；可在未公开的开发分支整理 checkpoint，不改写已发布历史。
不把 source、安装包、generated compendium、角色 Item 的版本状态混为一谈。

## 8. 协作与完成定义

若任务采用 subagent，一次负责一个法术；仅编辑获授权 spec 和同目录脚本，运行单项检查。
registry、共享 DSL/compiler/runtime、生成器、validator 和 QA 集成由主代理统一处理。共享 API 不足时输出 GAP，不自行加 provider flags 绕过。

完成必须同时具备批准范围、明确 support/DM 动作、唯一 source、真实机械、三输入公共入口、资源/身份/清理契约、静态与真实 QA 证据、内外回归及可复现候选。
交付说明分别列出：通过、修复后通过、未验收、阻塞、明确人工处理。不得用“全部完成”隐藏简化或缺资源。
