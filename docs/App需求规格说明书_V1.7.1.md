# App需求规格说明书

> 文档版本：v1.0（对应软件版本 V1.7.1）
> 适用范围：家庭营养师 App（Android 手机端 / 平板端 + Web 通用版）
> 本说明书自包含，不依赖任何此前对话即可理解；信息来源仅限本次对话及其间确认的代码/构建事实。

---

## 目录

- [1. 项目概述](#1-项目概述)
- [2. 名词与角色](#2-名词与角色)
- [3. 用户流程与页面清单](#3-用户流程与页面清单)
- [4. 功能需求](#4-功能需求)
- [5. 非功能需求](#5-非功能需求)
- [6. 数据与状态](#6-数据与状态)
- [7. 接口与第三方集成](#7-接口与第三方集成)
- [8. UI/UX要求](#8-uiux要求)
- [9. 技术约束](#9-技术约束)
- [10. 里程碑与任务拆分](#10-里程碑与任务拆分)
- [11. 风险与依赖](#11-风险与依赖)
- [12. 开放问题/待确认](#12-开放问题待确认)
- [13. 关键决策记录](#13-关键决策记录)
- [14. 新AI交接摘要](#14-新ai交接摘要)

---

## 1. 项目概述

### 1.1 产品目标
"家庭营养师"是一款面向家庭日常饮食管理的本地优先（local-first）移动应用，内置虚拟营养师形象"知夏"。产品目标是通过拍照记录与配餐建议，帮助用户长期了解自己的饮食结构，而不是要求每一餐完美；强调"累计成果不会因中断而熄灭、计划外饮食不清零"的温和激励理念。

产品以 Web 技术构建，通过 Capacitor 封装为 Android 安装包；用户要求其具备原生 App 观感，不得出现网页式的文字选择/复制菜单。

### 1.2 目标用户
- 家庭自用、单用户场景（界面多处标注"本地 · 单用户"）。
- 明确提到的设备：手机（对话中提到 vivo S7，屏宽约 360–411px）与平板（对话中提到 Y900，宽约 1280px）。
- 具体年龄、职业、适老化要求：待确认（对话未展开）。

### 1.3 核心场景
1. 拍照/录入当次食材与用餐记录，估算营养摄入。
2. 依据个人档案（目标、口味、忌口、疾病）生成配餐建议，并给出具体烹饪方式。
3. 记录计划外饮食、健康指标（血压/血糖/血脂/体重等），可上传健康报告文字做在线识别。
4. 阅读每日营养知识、查看勋章墙与阶段奖励，形成长期坚持。
5. 数据全部保存在设备本机，可通过 NDM（`.ndm.md`）导出/导入迁移设备。

### 1.4 当前范围
- 一个代码库构建三份 Web 资源（通用/手机/平板），产出两个独立 Android APK（手机端、平板端）与 Web 成品包。
- AI 能力（DeepSeek）为增强项：填密钥后启用照片识别、报告解读、配餐 AI 点评；未填时回退本地规则，核心功能仍可用。
- 当前软件版本：1.7.1（`versionCode 19`）。

### 1.5 明确不做 / 暂不做
- 不做服务端账号体系、不做数据自动上传（数据只在本机）。
- 不做深色模式、多语言、 tablet 专属交互细节：对话未涉及，不列为当前需求。
- "签到积分/领积分"：对话末尾用户提出"怎么不能领签到积分呢"，经核查 App 内不存在该功能（只有自动点亮的勋章墙与阶段奖励）；用户未进一步澄清，故列为最高优先级待确认项 Q-001，未纳入当前开发范围。

---

## 2. 名词与角色

### 2.1 术语表

| 术语 | 含义 |
|---|---|
| 家庭营养师 | 产品名，Capacitor `appName`；包名前缀 `com.family.nutritionist` |
| 知夏 | App 内虚拟营养师形象，头像资源 `/assistant.png`，出现在引导弹窗、悬浮球、勋章寄语、AI 解读等处 |
| 本地 · 单用户 | 界面标注，指数据只存本机、无账号、无云同步 |
| NDM | 自定义数据导出格式 `.ndm.md`，用于备份与跨设备迁移；导出内容不含图片/录音二进制与密钥 |
| 设备档（DeviceProfile） | 构建时由 `VITE_DEVICE_PROFILE` 写入 JS 的取值：`auto` / `phone` / `pad`；宿主可用 `window.__FN_DEVICE_PROFILE__` 覆盖 |
| 手机端 | 锁定单栏 + 底部三段导航 + 竖屏的安装包，包名 `com.family.nutritionist.phone` |
| 平板端 | 锁定侧栏 + 双栏 + 横竖屏可用的安装包，包名 `com.family.nutritionist.pad` |
| 主导航页 | `/`、`/records`、`/mine` 三个根页面，不显示返回按钮 |
| 勋章墙 | 依据记录数据自动点亮的成就模块；Ingredient/Medal/Reward 等实体见第 6 章 |
| DeepSeek 密钥 | 用户自行申请的 API Key（`sk-` 开头），加密存本机，不明文回显 |
| 视觉模型 | `deepseek-flash`，用于食材照片识别；文本模型为 `deepseek-chat` |

### 2.2 用户角色与权限差异
- 单用户，无登录、无多角色、无权限分级（对话未涉及任何角色权限设计）。
- 唯一的"权限"边界是：设备本机数据可见；AI 密钥仅本机加密保存，不随安装包分发、不写入导出文件；共用设备场景被明确提示风险。

---

## 3. 用户流程与页面清单

### 3.1 核心用户流程

**流程 A：首次启动到可用**
1. 打开 App，显示加载态"正在读取本地数据 / 请稍等，你的记录只会保存在这台设备上。"
2. 初始化完成后，若"未填密钥"且"未提醒过"，弹出引导弹窗"先填一次 DeepSeek 密钥"。
3. 用户选择"去填写密钥"→ 跳转 `/settings` 填写并保存；或"稍后再说"→ 关闭弹窗。两条路径都写入"已提醒"标记，之后不再弹出。
4. 未填密钥也可正常使用：配餐/记录/勋章在本机完成，拍照识别回退本地匹配。

**流程 B：一次完整配餐**
1. `/meal/new` 录入当次食材（可拍照识别）。
2. 生成 `/meal/:id` 配餐结果：包含营养摘要、菜品步骤、建议烹饪方式（微波炉加热等）、AI 解读（有密钥时）。
3. `/meal/:id/confirm` 确认后写入 `MealLog`，点亮相应勋章。

**流程 C：从设置进入编辑档案再返回**
1. `/mine` → 点击"编辑" → `/onboarding` 编辑个人档案。
2. 返回方式二选一：左上角"返回"按钮；或从屏幕左边缘向右滑。
3. 不再需要靠底部 dock 栏切换返回。

### 3.2 页面/模块清单

| 路由 | 页面 | 说明 |
|---|---|---|
| `/` | Today（今天） | 主导航页；下一餐、每日知识 |
| `/records` | Records（记录） | 主导航页；趋势、历史、连续记录统计 |
| `/mine` | Mine（我的） | 主导航页；档案、数据入口、勋章数量 |
| `/onboarding` | Onboarding | 个人档案编辑（目标/生日/口味/忌口等） |
| `/meal/new` | MealNew | 新建配餐、食材录入/拍照 |
| `/meal/:id` | MealResult | 配餐结果、烹饪方式、AI 解读 |
| `/meal/:id/confirm` | MealConfirm | 确认用餐记录 |
| `/knowledge` | Knowledge | 每日营养知识、收藏、日历点亮 |
| `/utensils/calibrate` | UtensilCalibration | 餐具（bowl/spoon/cup）校准 |
| `/health` | Health | 健康指标、拍照/上传报告识别 |
| `/off-plan` | OffPlan | 计划外饮食记录 |
| `/medals` | Medals | 勋章墙、阶段奖励 |
| `/import` | ImportExport | NDM 导入导出 |
| `/settings` | Settings | 悬浮球、AI 接口、DeepSeek 密钥等 |

所有页面由 `AppShell` 包裹；`AppShell` 根据设备档渲染手机底部导航或平板侧栏，并在二级页面注入 `BackNavigation`。全屏聚焦页（focus-page）包括：`/onboarding`、`/meal/new`、`/meal/confirm`、`/utensils/calibrate`、`/import`，这些页不显示悬浮营养师。

---

## 4. 功能需求

### 4.1 原生观感与文字选择

#### FR-001 静态文字长按不弹出网页式选择菜单
- **优先级**：P0
- **功能描述**：安装到手机/平板后，长按普通文字区域不得出现"复制 / 剪切 / 全选 / 朗读 / 分享"等网页式选择菜单，避免"像网页"的观感。
- **业务规则**：
  1. 三层防护：CSS 关闭静态文字的 `user-select` / `-webkit-touch-callout` / `-webkit-tap-highlight-color`；Web 层在捕获阶段拦截 `contextmenu`/`selectstart`/`dragstart` 并清除残留选区；Android WebView 层消费长按。
  2. 可编辑区域（`input`、`textarea`、`select`、`[contenteditable="true"]`、`[data-allow-select="true"]`）一律例外放行。
  3. 绝不拦截 `paste`/`copy`/`cut` 事件，不清空输入框选区。
- **输入/输出**：输入为用户长按事件；输出为"静态文字无菜单 / 输入框保留系统菜单"。
- **异常与边界**：部分 Android WebView 即使 CSS 关闭仍走原生 ActionMode，必须由 `MainActivity` 的 `setOnLongClickListener` 兜底。
- **验收标准**：
  - 真机/模拟器长按静态文字无复制菜单（自动化层以源码断言覆盖：CSS 含 `-webkit-user-select: none`，JS 含三个事件拦截，`MainActivity` 含 `setOnLongClickListener` 与 `return true`）。
  - 输入框长按仍可弹出粘贴菜单（见 FR-005）。
  - 单元测试与类型检查、Lint、构建全部通过。

#### FR-005 所有输入框恢复长按粘贴（修复缺陷）
- **优先级**：P0
- **功能描述**：用户反馈在输入 DeepSeek API Key 时只能一个字一个字输入，没有粘贴功能；要求所有需要用户输入的文本框都具备粘贴能力。
- **业务规则**：
  1. CSS 中可编辑区域的 `user-select: text !important` 与 `-webkit-touch-callout: default !important` 必须覆盖全局的 `none`（因 `.app-shell *` 特异性高于 `input`，必须用 `!important`）。
  2. `MainActivity` 用 `WebView.HitTestResult` 判断：命中 `EDIT_TEXT_TYPE` 时 `onLongClick` 返回 `false`，交回系统默认处理以显示"粘贴 / 全选"；其余返回 `true` 消费。**禁止一律返回 true 的简单做法**。
  3. 输入框聚焦时，`selectionchange` 清理逻辑完全跳过，避免破坏"长按 → 全选 → 粘贴"。
- **输入/输出**：输入为文本框长按手势；输出为系统粘贴菜单可用、密钥可整段粘贴。
- **异常与边界**：备注文本域、密钥输入框、任何 `contenteditable` 均应放行；横向滚动与光标定位不受手势拦截影响。
- **验收标准**：
  - 在 `/settings` 的 DeepSeek 密钥输入框（`<input id="ai-key" type="password">`）长按可粘贴完整密钥。
  - 回归测试确认静态文字仍无选择菜单（FR-001 不被破坏）。
  - 新增测试 `src/tests/input-paste.test.tsx` 与更新后的 `native-ui.test.tsx` 通过；全量测试、类型检查、Lint、构建通过。
  - 状态：**已在 V1.7.1 修复并发布**。

### 4.2 密钥引导与在线识别

#### FR-002 首次启动提醒填写 DeepSeek 密钥
- **优先级**：P0
- **功能描述**：用户实测"接入 DeepSeek API 后才能识别图片"，因此第一次打开 App 必须提醒用户填入密钥。
- **业务规则**：
  1. 仅当"尚未填密钥"且"未提醒过"时弹出；选"去填写密钥"或"稍后再说"都写入已提醒标记 `family-nutritionist:api-key-prompt:v1 = seen`，不再打扰。
  2. 弹窗为 `role="dialog" aria-modal="true"`，含知夏头像、标题"先填一次 DeepSeek 密钥"、三条说明、两个按钮"去填写密钥"/"稍后再说"及脚注。
  3. localStorage 不可用时仍然提醒（隐私模式最多每次启动提醒一次）；写入失败静默忽略，不影响使用。
  4. 修正过时表述：不再声称"DeepSeek 暂不支持看图"；如实说明"必须先填密钥才能看图，没填时只按文件名做简单匹配，结果请手动确认"。
- **输入/输出**：输入为 App 启动事件、`AppSettings.aiKeyEncrypted`、localStorage 标记；输出为弹窗显示/隐藏与可选跳转 `/settings`。
- **异常与边界**：深链接直接进入二级页面时同样遵守"只弹一次"；密钥本身不在弹窗输入、不回显、不进产物。
- **验收标准**：
  - 首次打开且无密钥 → 弹窗出现；点击任一按钮后重启 App → 不再出现。
  - 已填密钥 → 不出现。
  - 文案包含"sk- 开头"、"我的 → 设置 → DeepSeek 密钥"、"不随安装包分发、不写进导出文件"。
  - 测试 `api-key-prompt.test.tsx`、`settings.test.tsx` 与全量校验通过。
  - 状态：**已在 V1.7.0 实现，V1.7.1 保留**。

### 4.3 配餐与烹饪方式

#### FR-003 配餐结果给出具体烹饪方式建议
- **优先级**：P1
- **功能描述**：用户认可烹饪细节，但希望"建议具体的烹饪方式，例如用微波炉加热，这样更能保留食物本身的营养价值"。
- **业务规则**：
  1. 新增 `CookingMethod` 结构：`name`（方式）、`appliesTo`（适用食材类别）、`reason`（保留营养的理由）、`tip`（火候/时间/水量的操作要点）。
  2. `Dish` 增加可选字段 `cookingMethods?: CookingMethod[]`；旧数据缺字段时按空处理并即时补算，不要求迁移。
  3. 按当次食材类别（`foodCategory`）匹配：蔬菜→微波炉加热/少油快炒/快速焯水；蛋白质食材→隔水蒸/少油快炒；主食→蒸或电饭煲原味煮/微波炉短时复热；水果或奶制品→洗净后直接食用 / 冷藏搭配。
  4. 无论食材如何组合，至少保证一条"微波炉加热"建议；最多返回 5 条。
  5. 保留原有烹饪步骤 `steps`；AI 解读提示词沿用这些方式，不推荐油炸/久炖。
- **输入/输出**：输入 `MealIngredient[]`；输出 `CookingMethod[]`，在 `/meal/:id` 以"建议烹饪方式"区块展示，含理由与操作要点，并写入 AI 提示词摘要。
- **异常与边界**：无参照物/无食材类别识别时，回退给出"微波炉加热 · 当次食材"。
- **验收标准**：
  - 含蔬菜的一餐能看到"微波炉加热"且理由含"维生素 C、叶酸和 B 族维生素"。
  - 旧会话数据（无 `cookingMethods`）打开 `/meal/:id` 不报错并显示补算结果。
  - 测试 `cooking-method.test.tsx` 与全量校验通过。
  - 状态：**已在 V1.7.0 实现**。

### 4.4 手机 / 平板分版

#### FR-004 产出两个独立安装包（手机端、平板端）
- **优先级**：P0
- **功能描述**：用户设备为手机和平板，要求适配两个端、两个 APP 都做；包名、应用名、Web 资源、布局全部独立，可同时装在一台设备上。
- **业务规则**：
  1. Android `productFlavors`：`phone` → `applicationId com.family.nutritionist.phone`、`versionNameSuffix -phone`、`appLabel 家庭营养师·手机`；`pad` → `com.family.nutritionist.pad`、`-pad`、`家庭营养师·平板`。
  2. 构建时由 `.env.phone`（`VITE_DEVICE_PROFILE=phone`）/ `.env.pad`（`=pad`）把设备档写进各自 JS 包；`scripts/sync-device-assets.mjs` 将 `dist-phone`/`dist-pad` 写入各自 flavor 的 `assets/public`。
  3. `useIsTablet()`：`phone` 恒 false（单栏+底部导航+竖屏），`pad` 恒 true（侧栏+双栏+横竖屏），`auto`（默认 Web 版）仍按 CSS 宽度 900px 断点自适应。
  4. 宿主可用 `window.__FN_DEVICE_PROFILE__` 覆盖；未知值一律回落 `auto`。
  5. 页脚显示 `v1.7.1 · 手机端/平板端 · 数据存于本机` 与 `NDM 可导出迁移`。
- **输入/输出**：输入为构建 mode（phone/pad）；输出为两个签名的 Release APK。
- **异常与边界**：Web 通用版 `dist` 保持旧的自适应行为，不锁死布局。
- **验收标准**：
  - 两个 APK 的包名/版本名/应用名/屏幕方向/包内设备档逐项核对正确（已核验：`1.7.1-phone`、`1.7.1-pad`，包内含 `deviceProfile` 标记）。
  - 两包通过 v1+v2 签名验证；包名不同可同时安装。
  - `device-profile.test.tsx`、`layout.test.tsx` 等通过。
  - 状态：**已在 V1.7.0 实现，V1.7.1 延续**。

### 4.5 导航与返回

#### FR-006 二级页面返回按钮 + 左边缘右滑返回
- **优先级**：P0
- **功能描述**：用户反馈"在设置页面点开编辑个人信息时只能通过点下方 dock 栏回去，不符合手机使用习惯"，要求支持从左侧屏幕往右滑返回，并给出返回按钮。
- **业务规则**：
  1. 三个主导航页 `/`、`/records`、`/mine` 为根，不显示返回入口；其余页面（含 `/settings` → `/onboarding` 编辑档案）显示左上角返回按钮。
  2. 按钮 `aria-label="返回上一页"`，文案"‹ 返回"，旁注"从屏幕左边缘向右滑也可返回"。
  3. 手势：起手点距左边缘 ≤ 32px（`SWIPE_BACK_EDGE_PX`），水平位移 ≥ 72px（`SWIPE_BACK_MIN_DISTANCE_PX`）且 `dx >= dy` 才触发；输入框、`textarea`、`select`、`contenteditable`、`[data-no-swipe-back]` 元素不接管。
  4. 深链接（`location.key === 'default'`）无上一页时返回 `/`（`replace: true`），否则 `navigate(-1)`。
- **输入/输出**：输入为点击或触摸序列；输出为路由回退。
- **异常与边界**：不干扰光标定位、横向滚动、按钮点击；`touchcancel` 重置跟踪状态。
- **验收标准**：
  - `/settings`→`/onboarding` 后点返回按钮或从左边缘右滑均回到 `/settings`；在 `/` 无返回按钮。
  - 测试 `back-navigation.test.tsx` 与全量校验通过。
  - 状态：**已在 V1.7.1 实现并发布**。

### 4.6 既有功能现状（对话中提及，非本轮改动）
以下功能在对话与代码中被引用，本轮未修改；细节超出对话范围的部分列入 Q 项，不作为可验收需求：
- 拍照识别食材（FR-002 相关，DeepSeek 视觉模型）、健康报告拍照/上传识别、健康指标录入、餐具校准、计划外饮食记录、每日知识与收藏、勋章自动点亮与阶段奖励、悬浮营养师知夏（每天主动播报知识一次，由 `lastKnowledgePushDate` 控制）、NDM 导入导出。
- 勋章示例：第一束光（首次真实用餐记录）、三日新芽/七日同桌/十四日渐暖/三十日烟火/百日常青/四季如一（累计 1/3/7/14/30/100/365 记录日）、诚实记录、不必完美、重新出发、彩虹餐桌、食材探索家、三餐有序、搭配小能手、知食入门、懂一点为什么。阶段奖励在点亮 30 天勋章后出现。

### 4.7 构建与发布工程需求

#### FR-007 Web 与双 APK 的 CI 构建和 Release 发布
- **优先级**：P1
- **功能描述**：推送/PR/手动触发时完整编译；打 `v*` 标签时自动创建 GitHub Release 并附 Web 成品包与两个 APK。
- **业务规则**：CI 依次执行 pnpm 10.28.2 / Node 22、类型检查、`oxlint`、单元测试、`pnpm build`，`scripts/test_serve.py` 冒烟、`scripts/package.py` 打包；Android job 安装 JDK 21、Android SDK 35，三份 Web 构建、`npx cap sync android`、`scripts/sync-device-assets.mjs`、keytool 临时签名、`assemblePhoneRelease assemblePadRelease`；Release job 汇总产物。
- **输入/输出**：输入为 git push/tag；输出为 Actions 产物与 GitHub Release（`family-nutritionist-phone.apk`、`family-nutritionist-pad.apk`、`App_vX.Y.Z.zip`）。
- **异常与边界**：`ANDROID_HOME` 与 `ANDROID_SDK_ROOT` 必须指向同一路径，否则 Gradle 报 SDK 路径冲突；签名密钥不入库、每次构建临时生成，故升级时可能出现"签名冲突"提示（需卸载旧版）。
- **验收标准**：推送 `v1.7.1` 标签后 CI 全绿并生成含 3 类资产的 Release（已验证）。

---

## 5. 非功能需求

| 类别 | 内容 |
|---|---|
| 性能 | 对话未涉及具体指标。 |
| 安全 | 密钥使用 Web Crypto AES-GCM（PBKDF2 100000 次、SHA-256、salt `family-nutritionist-local-seal-v1`、标记 `ndmseal1`）加密；无 `crypto.subtle` 时降级为可逆混淆并标注 `obf`；纯前端方案下密钥仍可能被本机提取，界面如实提示"不要在共用设备上填入重要密钥"。 |
| 隐私 | 数据全部保存在本机、不自动上传；密钥不明文回显、不显示尾号、不写进导出文件、不随安装包分发；附件仅以文件名关联，图片/录音二进制不进入数据或 NDM 正文。 |
| 兼容性 | Android：手机竖屏 / 平板横竖屏；Web 通用版按 900px 断点自适应。minSdk/targetSdk 由 `android/variables.gradle` 定义（具体值对话未列出，待确认）。 |
| 离线能力 | 未填密钥或断网时回退本地规则，配餐/记录/勋章/知识等本机功能可用；AI 功能不可用。 |
| 通知 | 存在 `notificationsEnabled` 设置与"悬浮球每天主动开口一次播报今日知识"（`lastKnowledgePushDate`）；系统通知的具体渠道/时机：对话未涉及。 |
| 埋点/统计 | 对话未涉及（无埋点、无统计需求）。 |
| 可用性 | 文案温和、不制造负罪感；中断不清零；所有需输入处必须可粘贴。其它可用性指标：对话未涉及。 |

---

## 6. 数据与状态

### 6.1 核心实体（字段以 `src/types.ts` 为准）
- `Profile`：nickname、birthDate、sex、heightCm、weightKg、activityLevel、goal、allergies、avoid、tastes、customTastes、diseases、doctorRestrictions、createdAt、updatedAt。
- `MealIngredient`：name、source（`current`/`recommended`）、estimatedAmount、confirmedAmount、unit（`g`/`ml`）、state（`raw`/`cooked`）、used、photoPath、nutritionPer100g、referenceKind、estimateRange、estimateConfidence、portion。
- `CookingMethod`（V1.7 新增）：name、appliesTo、reason、tip。
- `Dish`：name、servings、steps、ingredientIds、`cookingMethods?`。
- `MealSession`：date、mealType、goalSnapshot、ingredients、dishes、recommendations、nutrition、reason、sourceDevice。
- `MealLog`：sessionId?、date、mealType、items、nutrition、isOffPlan、note、sourceDevice。
- `HealthMetric`：type、value、unit、measuredAt、source（`manual`/`import`/`vivo`）、referenceRange。
- `HealthUpload`：kind（`photo`/`voice`/`file`）、fileName、rawText、status（`pending`/`recognized`/`failed`）、metricIds。未填密钥时只留档并标"待识别"，填密钥后可对同一份留档重新识别，无需重新上传。
- `KnowledgeItem`：title、category、summary、why、relatedFeature、date、readAt、favorite。
- `MedalProgress`：group、condition、current、target、unlockedAt、achievedAt。
- `Reward`：name、description、status（`suggested`/`accepted`/`completed`/`skipped`）。
- `AppSettings`：assistantEnabled、assistantPosition、aiProvider（`local`/`remote`）、vivoHealthAuthorized、notificationsEnabled、lastKnowledgePushDate、`aiKeyEncrypted?`。
- 枚举：`MealType`=breakfast/lunch/dinner/snack；`Goal`=gain_muscle/lose_fat/maintain_health；`Disease`=hypertension/diabetes/kidney_disease/other；`Taste`=spicy/sweet/sour/mild/light。

### 6.2 状态流转
- 密钥：`未设置` →（保存密钥，自动 `aiProvider='remote'`）→ `已设置（加密保存）` →（清除密钥，`aiProvider='local'`）→ `未设置`。
- 健康上传：`pending` →（有密钥并识别成功）`recognized` /（失败）`failed`；可重试识别。
- 勋章：由数据实时计算，`current >= target` 且无 `unlockedAt` 时写入点亮时间；已有 `unlockedAt` 不因数据回落而撤销。
- 首次提醒：无标记且无密钥 → 弹窗 → 任一操作写入 `seen` → 永久不再弹（`resetApiKeyPrompt` 仅供测试/重置）。

### 6.3 数据权限与可见性
单用户本地可见；无跨用户/跨设备同步；NDM 导出用于手动迁移，导入时按 id 合并并统计 added/skipped/conflicts/errors/missingAttachments。

### 6.4 数据保留/删除
对话未涉及明确的保留期限或删除策略（如卸载、清除数据之外的规则）：待确认。

---

## 7. 接口与第三方集成

### 7.1 DeepSeek（已知，唯一在线服务）
- 端点：`https://api.deepseek.com/chat/completions`，OpenAI 兼容协议，已验证支持 CORS，浏览器可直接调用。
- 鉴权：请求头 `Authorization: Bearer <密钥>`，`Content-Type: application/json`。
- 模型：`deepseek-chat`（文本：健康报告解读、配餐点评、指标抽取）；`deepseek-flash`（视觉：食材照片识别，图片以 base64 data URL 直传）。
- 请求体：`{ model, messages, temperature, stream: false }`；文本默认 `temperature 0.6`，视觉 `0.2`；报告文本截断 8000 字符。
- 响应：`choices[0].message.content`；要求模型只输出 JSON 数组时用 `extractJsonArray` 解析，失败返回空数组并回退本地规则。
- 错误处理：`401` → "DeepSeek 密钥校验失败（401），请到「设置」里检查或更换密钥。"；`402` → 余额不足；`429` → 请求太频繁；其它 → "接口返回 {status}"；无密钥 → `AiNotConfiguredError`。
- 指标别名映射：`收缩压/高压/systolic` 等中文词映射到内部 `MetricType`，映射不上丢弃（见 `metricAlias`）。

### 7.2 其它第三方
- vivo 健康授权：存在 `vivoHealthAuthorized` 设置与 `HealthMetric.source='vivo'`，具体接口/协议：待确认。
- 系统能力：相机（`CAMERA`）、录音（`RECORD_AUDIO`）、读取图片（`READ_MEDIA_IMAGES` / `READ_EXTERNAL_STORAGE` maxSdkVersion 32）、网络（`INTERNET`）；FileProvider authority `${applicationId}.fileprovider`。
- 推送通知服务：`google-services.json` 存在时才应用 Google Services 插件；当前默认不启用。

### 7.3 未知项
- 服务端 API、账号系统、统计/埋点接口：对话未涉及，待确认（按当前设计不存在）。

---

## 8. UI/UX要求

### 8.1 页面结构与关键组件
- 手机端：底部 `bottom-nav` 三段导航（今天/记录/我的）；平板端：`side-nav` 左侧导航（含品牌区"家庭营养师 · 本地 · 单用户"） + 双栏 `tablet-layout`。
- 二级页面顶部 `BackNavigation`：返回按钮 + 手势提示（见 FR-006）。
- 引导弹窗 `ApiKeyPrompt`：知夏头像、标题、说明列表、两个按钮、脚注（见 FR-002）。
- 悬浮营养师 `FloatingAssistant`：focus 页面不显示。
- 勋章弹窗 `MedalCelebration`、勋章徽章 `MedalBadge`、营养饼图 `NutritionPie`、拍照组件 `PhotoCapture`。

### 8.2 交互规则
- 静态文字长按无选择菜单；输入框长按可粘贴（FR-001/FR-005）。
- 左边缘右滑返回，主导航页无返回入口（FR-006）。
- 未填密钥不阻断主流程，AI 功能降级并如实说明。

### 8.3 文案（保留原文）
- 引导弹窗标题："先填一次 DeepSeek 密钥"；说明："照片识别食材、让知夏用 AI 解读这一餐，都需要连接 DeepSeek。第一次打开先填一次，之后就不用再管。"
- 引导三条："去 DeepSeek 开放平台创建密钥（sk- 开头）" / "在「我的 → 设置 → DeepSeek 密钥」里粘贴保存" / "密钥只加密存在这台设备，不随安装包分发、不写进导出文件"
- 按钮："去填写密钥" / "稍后再说"；脚注："暂时不填也能用：配餐、记录、勋章都在本机完成，只是拍照识别会回退到简单的本地匹配。"
- 设置页密钥说明："接口已内置（api.deepseek.com）……填好后：食材照片可以看图识别，健康报告文字可在线识别，配餐结果可让知夏做 AI 解读。"；状态文案 `aiKeyStatus`：`已设置（加密保存）` / `未设置`；输入框 placeholder：`已设置；如需更换，直接输入新密钥` / `粘贴你的密钥（sk- 开头）`；按钮：`保存密钥`/`更换密钥`/`清除密钥`。
- 结论性提示："如实说明：食材照片识别调用 DeepSeek 视觉模型，必须先填密钥才能看图；没填时只按文件名做简单匹配，结果请手动确认……"
- 勋章墙寄语："不是每餐都完美，但你一直在了解自己的饮食。这些徽章记的是「我做过很多」，不是「我又失去了什么」。"
- 加载态："正在读取本地数据" / "请稍等，你的记录只会保存在这台设备上。"
- 导航副标题：今天"下一餐 · 知识"、记录"趋势 · 历史"、我的"档案 · 数据"；页脚 `v1.7.1 · 数据存于本机` / `NDM 可导出迁移`。

### 8.4 颜色、字体、设计规范
对话未明确给出具体色值、字号或字体族；`src/styles/app.css` 使用 CSS 变量（如 `--border`、`--muted`、`--fs-hint`）与类名（`.card`、`.button`、`.section-title`、`.muted`、`.medal-card`、`.cooking-method`、`.cooking-method-tip` 等）。具体色值/字号：待确认，不从代码推断为需求。

### 8.5 空状态、加载态、错误态
- 加载态：见 8.3。
- 空状态：对话未明确定义（勋章进度条 `当前 x / y` 为现状展示）：待确认。
- 错误态：AI 相关错误提示见第 7 章；其它错误态对话未涉及。

---

## 9. 技术约束

- **平台/框架**：Web（React 19 + TypeScript）+ Vite 8 + Capacitor 7（Android），单代码库多端。
- **关键依赖**：react 19.3.1、react-dom 19.3.1、react-router-dom 7.18.5、zustand 5.1.0、idb 8.0.4、dayjs 1.11.23、jszip 3.10.2、@capacitor/android|core 7.6.10；dev：vitest 5.1.0、oxlint 1.90.0、typescript ~7.0.2、@capacitor/cli 7.6.10、@playwright/test 1.65.0。
- **包管理**：pnpm 10.28.2（`pnpm install --frozen-lockfile`）。
- **构建脚本**：`build` / `build:phone` / `build:pad` / `build:devices` / `sync:devices` / `test` / `lint` / `typecheck`。
- **Android**：`compileSdk`/`minSdk`/`targetSdk` 由 `variables.gradle` 定义；本地与 CI 均用 JDK 21、Android SDK 35、build-tools 35.0.0；CI 用 Gradle wrapper，本地因镜像 zip 损坏改用本地 Gradle 8.11.1。
- **环境要求**：CI 中 `ANDROID_HOME` 与 `ANDROID_SDK_ROOT` 必须指向同一路径；Gradle 要求 source 21。
- **测试要求（用户明确的流程约束）**：每做/改一个功能必须先跑测试，通过后 git 提交；全部完成后全量回归；最终 git 推送 + Release + 对话内交付 APK。质量门禁包括 vitest 全量、`tsc -b` 类型检查、`oxlint` 0 警告、`vite build`、serve 冒烟测试。
- **不删除断言原则**：修复时不得为通过测试而删除既有断言（项目约定）。
- **密钥与凭据**：GitHub PAT 需 repo 读写 + workflow 权限；签名密钥不入库，仅构建时生成。
- **部署方式**：GitHub Actions（`.github/workflows/build.yml`），Release 附 APK 与 Web zip。
- **仓库**：`WFY-1-BYO/-app`（GitHub），默认分支 `main`。
- **本地工作副本**：`F:\2026-11-15-12-34-08\app-repo`；工具链 `F:\2026-11-15-12-34-08\toolchain`；APK 输出 `F:\2026-11-15-12-34-08\apk\v1.7.1\`。

---

## 10. 里程碑与任务拆分

仅整理对话中已明确或可合理推导的内容：

| 版本/阶段 | 内容 | 状态 |
|---|---|---|
| V1.6.1 | 基线版本（修复 APK 构建 JDK 版本、纳入 2.x 软件建设蓝图） | 已完成（历史） |
| V1.7.0 | 四个需求：关闭长按菜单、首启密钥提醒、烹饪方式建议、手机/平板分版双 APK | 已完成；对应提交 b681e6a、52dc1c2、dd0cd96、42fe8de；因粘贴缺陷，其 Release 已删除（tag 保留） |
| V1.7.1 | 修复输入框粘贴、二级页面返回按钮与右滑返回、版本号升至 1.7.1（versionCode 19） | 已完成并发布；提交 7734112、dab1cb8、d3c30b1；标签 v1.7.1 已推送 |
| 下一阶段 | 签到积分（若确认为需求）：需先明确规则与用途，再按"开发→测试→git→打包→Release→对话内 APK"流程推进 | 待确认（Q-001/Q-002） |

---

## 11. 风险与依赖

| 风险/依赖 | 说明 | 缓解 |
|---|---|---|
| GitHub PAT 失效 | 前两个 PAT 返回 401；第三个 PAT（具 workflow 权限）成功推送与 CI 发布 | 使用有效 PAT；不要把 PAT 写入仓库或文档 |
| 签名冲突 | 每次构建临时生成签名，升级安装可能提示签名冲突 | 用户卸载旧版再装；如需长期稳定升级，待确认是否固定签名（Q-004） |
| 本地下载损坏 | GitHub 下载走代理偶发 502 或损坏文件 | 通过 API asset 接口 + Bearer + `Accept: application/octet-stream` 下载最稳 |
| 工具链镜像 | gradlew 从镜像下载的 zip 曾损坏 | 本地改用 Gradle 8.11.1 直接构建；CI 不受影响 |
| 无真机环境 | 测试为自动化 + 包内容验证，未做真机安装运行 | 交付后请用户实机验证粘贴与右滑返回 |
| 第三方模型可用性 | `deepseek-flash` 视觉模型名称与计费/可用性依赖 DeepSeek 侧 | 保留本地匹配兜底与如实文案 |
| 平台依赖 | Capacitor、Android SDK 35、JDK 21、Gradle 版本升级可能导致构建破坏 | 锁定 lockfile 与固定版本号 |

---

## 12. 开放问题/待确认

| 编号 | 问题 | 影响 |
|---|---|---|
| Q-001 | 用户问"怎么不能领签到积分呢"。核查结论：App 内无签到积分功能，只有自动点亮的勋章墙与"阶段奖励"；用户未在澄清选项中作答。是否要新增签到积分功能？ | 决定下一阶段是否有新需求；未确认前不开发 |
| Q-002 | 若新增签到积分：积分获取规则（每日/连续/任务）、用途（兑换什么）、是否与勋章/奖励打通、是否跨端同步？ | 决定 FR 设计与数据结构 |
| Q-003 | minSdkVersion / targetSdkVersion 的具体数值（对话未列出，存于 `variables.gradle`）。 | 影响兼容性验收口径 |
| Q-004 | 是否改为固定签名密钥以支持无感升级（当前每次构建临时生成签名）。 | 影响发布策略与升级体验 |
| Q-005 | 颜色值、字号、字体族等视觉规范是否需固化为设计 token（对话未给出具体值）。 | 影响 UI 一致性验收 |
| Q-006 | 通知的具体渠道与时点、统计埋点是否需要（对话未涉及）。 | 影响非功能范围 |
| Q-007 | 目标用户画像、适老化/无障碍要求。 | 影响交互与可访问性设计 |
| Q-008 | 数据保留期限与主动删除策略。 | 影响隐私合规 |

---

## 13. 关键决策记录

| 决策点 | 最终结论 | 原因 | 被放弃方案 |
|---|---|---|---|
| 长按菜单实现层次 | CSS + Web 捕获拦截 + Android WebView 三层 | 仅 CSS 在部分 WebView 仍触发原生 ActionMode | 只改 CSS；只改 JS |
| 输入框长按策略 | 用 `HitTestResult.EDIT_TEXT_TYPE` 区分，输入框返回 false | 用户实测密钥只能逐字输入，无法粘贴 | `onLongClick` 一律 return true（曾导致粘贴失效） |
| "看图是否需要密钥"表述 | 如实说明必须先填密钥才能看图，未填仅按文件名匹配 | 用户亲测接入 DeepSeek 后才能识别图片 | 旧文案"DeepSeek 暂不支持看图" |
| 手机/平板适配方式 | 同一代码库 + productFlavors 双 APK + 构建时注入设备档 | 用户要求两个 APP，且手机/平板锁定不同布局 | 单一自适应包；运行时仅靠 CSS 宽度漂移 |
| 二级页面返回 | 返回按钮 + 左边缘右滑，主导航页除外 | 用户认为只能点 dock 栏返回不符合手机习惯 | 仅靠底部导航返回 |
| V1.7.0 发布处理 | 推送后取消其 CI 构建并删除 Release（tag 保留） | 该版本带粘贴缺陷，避免用户误装 | 保留 V1.7.0 Release |
| GitHub 推送凭据 | 更换到第三个有效 PAT 后推送 main 与标签、CI 发布 | 前两个 PAT 401 Bad credentials | 继续尝试无效 PAT；仅本地交付 |
| 本地 APK 交付来源 | 从 GitHub Release v1.7.1 下载两个 APK 放入对话 | 与 CI 发布产物保持一致；本地构建作为备份 | 仅用本地 Gradle 构建产物 |

---

## 14. 新AI交接摘要

本项目是"家庭营养师"App（仓库 `WFY-1-BYO/-app`，本地 `app-repo`），React+Vite+Capacitor 单代码库产出手机端与平板端两个独立 Android APK，数据本地存储、知识库名为知夏，DeepSeek 密钥为增强项。当前阶段：V1.7.1 已全部完成并发布（提交 d3c30b1，标签 v1.7.1，Release 含两个 APK 与 Web 包），四个初始需求与两个交互缺陷均已修复并通过全量测试。P0 约束：改动必须先测试再 git、不删断言、最终 Release 并在对话内交付 APK；静态文字无复制菜单但输入框必须可粘贴；二级页面必须有返回入口。最需要先确认的问题：Q-001——用户提出"怎么不能领签到积分呢"，App 内并无此功能，需确认是否新增以及积分规则与用途（Q-002）。

---

### 交付核对自查
- 本说明书包含需求讨论中的全部明确需求（4 个初始问题 + 2 个缺陷修复 + 工程流程约束），并可追溯到版本与提交。
- 全文不依赖此前对话：专有名词、页面名、字段名、文案、接口与构建参数均已就地定义。
- 所有 FR 均给出优先级、业务规则、输入/输出、异常边界与验收标准；无法验收的信息列入第 12 章待确认。
- 冲突项（看图表述、长按返回策略、V1.7.0 发布）已在第 13 章记录最终决策与放弃方案。
