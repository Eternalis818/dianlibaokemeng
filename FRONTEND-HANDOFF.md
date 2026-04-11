# PowerLink OS v2.0 — 前端工程师转接文档

> **最后更新**: 2026-04-11 · **最新提交**: `a2b7d18` · **分支**: `main`

---

## 一、项目概况

电力施工管理系统（配电工程），包含工人端（手机）、管理后台（PC）、分包老板端（手机）三个入口。

| 项 | 说明 |
|---|---|
| 框架 | **Next.js 16.2.1** (App Router) + **React 19** + **TypeScript** |
| 样式 | **Tailwind CSS 4** — CSS 变量主题（非 class 主题） |
| 数据库 | Supabase PostgreSQL，通过 Prisma 5 + `@prisma/adapter-pg` 连接 |
| 认证 | Cookie 签名：`pl_admin`(管理员) / `pl_boss`(老板)，工人用 localStorage + PIN |
| GitHub | https://github.com/Eternalis818/dianlibaokemeng |

### 快速启动

```bash
git clone https://github.com/Eternalis818/dianlibaokemeng.git
cd dianlibaokemeng
npm install
npm run dev    # → http://localhost:3000
```

`.env` 文件需手动配置（不入库）：
```
LLM_API_KEY=xxx
LLM_MODEL=xxx
LLM_BASE_URL=xxx
ADMIN_SECRET=pl_admin_secret_2026
```

---

## 二、设计系统（CSS 变量）

全局 CSS 变量定义在 `app/layout.tsx` 或全局 CSS 中，所有组件统一使用：

| 变量 | 用途 | 典型值 |
|------|------|--------|
| `--bg` | 页面底色 | 深灰 `#0a0f1a` |
| `--surface` | 卡片/面板底色 | 稍浅灰 `#111827` |
| `--border` | 边框色 | `rgba(148,163,184,0.12)` |
| `--text` | 主文字 | `#f1f5f9` |
| `--muted` | 次要文字 | `#94a3b8` |
| `--accent` | 主色调（蓝） | `#3b82f6` |
| `--green` | 成功色 | `#10b981` |
| `--amber` | 警告色 | `#f59e0b` |
| `--red` | 错误色 | `#ef4444` |
| `--accent-glow` | 主色光晕 | `rgba(59,130,246,0.15)` |

**全局类**：
- `.glass` — 磨砂玻璃卡片
- `.grid-bg` — 网格背景纹理
- `.btn-primary` — 主按钮（蓝底白字）
- `.btn-ghost` — 幽灵按钮（透明底灰字）

---

## 三、目录结构

```
app/
├── layout.tsx                    # 全局 layout + CSS 变量
├── globals.css                   # 全局样式 + Tailwind
├── worker/
│   └── page.tsx                  # 🔵 工人端（手机，~2100行，单文件SPA）
├── boss/
│   └── page.tsx                  # 🔵 分包老板端（手机）
├── (admin)/                      # 管理后台（PC，侧边栏布局）
│   ├── components/Sidebar.tsx    # 侧边栏导航（17+入口）
│   ├── dashboard/page.tsx        # 今日看板
│   ├── projects/page.tsx         # 项目管理
│   ├── reports/page.tsx          # 报量审核（含缩略图预览）
│   ├── corrections/page.tsx      # 纠偏中心
│   ├── finance/page.tsx          # 财务核算
│   ├── materials/page.tsx        # 材料管控（双库+6级搜索+分类树）
│   ├── visas/page.tsx            # 签证管理
│   ├── annual/page.tsx           # 年度汇总
│   ├── workers/page.tsx          # 工人列表
│   ├── workers/[id]/page.tsx     # 工人详情（奖励/处罚/规则/考试）
│   ├── penalties/page.tsx        # 违章类别管理
│   ├── site-rules/page.tsx       # 进场须知管理
│   ├── trainings/page.tsx        # 安规学习+题目管理
│   ├── equipment/page.tsx        # 工器具
│   ├── audit/page.tsx            # 审计追踪
│   ├── subscriptions/page.tsx    # 订阅管理
│   ├── payments/page.tsx         # 付款管理
│   ├── settings/page.tsx         # 系统设置（多模型+推送配置）
│   └── agent/page.tsx            # Agent 控制台
├── api/
│   ├── workers/                  # 工人 CRUD + 认证
│   ├── reports/                  # 报量 CRUD + 自动计价 + 连续作业奖励
│   ├── checkin/                  # 打卡（含锁定/规则前置检查）
│   ├── worker/                   # 工人端专用 API
│   │   ├── chat/                 # 工人聊天（LLM）
│   │   ├── smart-parse/          # 智能拆解
│   │   ├── photo-review/         # 照片复核
│   │   ├── rules/                # 规则确认
│   │   ├── trainings/            # 安规学习+考试
│   │   ├── dashboard/            # 🆕 工人首页数据
│   │   └── leaderboard/          # 🆕 多维度排行榜
│   ├── worker-rewards/           # 奖励 API
│   ├── worker-penalties/         # 处罚 API（≥12分自动锁定）
│   ├── penalty-categories/       # 违章类别
│   ├── site-rules/               # 进场须知
│   ├── safety-trainings/         # 安规培训+题目
│   ├── settings/                 # 系统设置（LLM+推送配置）
│   ├── cron/report/              # 🆕 定时报告生成+推送
│   ├── boss/                     # 老板端 API
│   └── ...
└── lib/
    ├── prisma.ts                 # 数据库连接
    ├── llm.ts                    # 多模型 LLM（default/photo/summary）
    ├── push.ts                   # 🆕 推送服务（Server酱/企业微信）
    ├── subscription.ts           # 订阅状态
    ├── ai-quota.ts               # AI 配额
    ├── rate-limit.ts             # 限流
    └── referral.ts               # 推荐码
```

---

## 四、数据库表（26张）

通过 raw SQL 创建（非 Prisma migrate），关键字段如下：

| 表名 | 核心字段 | 说明 |
|------|----------|------|
| `Worker` | id, name, project, phone, wageType, wageRate, **rewardPoints**, **penaltyPoints**, **isLocked** | 工人 |
| `CheckIn` | workerId, project, type, gpsLat/Lng, duration, createdAt | 打卡 |
| `Report` | workerId, task, spec, qty, **unitPrice**, **totalValue**, status(pending/verified/rejected), photoUrls, createdAt | 报量 |
| `Visa` | type, title, project, amount, status, contractorSign... | 签证 |
| `Correction` | workerId, original, corrected, reason, reportId, status | 纠偏 |
| `Project` | name, code, budget, spent, profitRate, centerLat/Lng, geoRadius | 项目 |
| `PriceLibrary/PriceItem` | name, code, unitPrice, keywords | 定额计价 |
| `Material/MaterialLibrary` | name, code, spec, category, pinyin, stockQty, minStock | 材料 |
| `WorkerReward` | workerId, points, amount, reason, createdBy | 奖励 |
| `WorkerPenalty` | workerId, categoryId, points, fineAmount, finePaid | 处罚 |
| `PenaltyCategory` | name, points, description | 违章类别预设 |
| `SafetyTraining` | title, content, version | 培训内容 |
| `ExamQuestion` | trainingId, question, optionA/B/C/D, correctAnswer | 考试题 |
| `ExamAttempt` | workerId, trainingId, answers(JSONB), score, passed, pointsCleared | 考试记录 |
| `SiteRule` | title, content, version | 进场须知 |
| `RuleConfirmation` | workerId, ruleId, ruleVersion | 规则确认 |
| `Settings` | key, value | 系统设置（KV） |
| `Equipment` | name, projectCode, lastCheckDate, nextCheckDate | 工器具 |
| `AuditLog` | tableName, recordId, action, oldValue, newValue | 审计 |
| `Subscription/Plan/Payment` | — | SaaS 订阅 |
| `BaseCost` | year, month, type, amount | 基地费用 |

---

## 五、核心业务规则

### 工人打卡前置检查
```
工人点"打卡" → isLocked? → 是 → 跳转安规学习+考试
                        → 否 → 未确认规则? → 是 → 跳转规则确认
                                           → 否 → 正常打卡
```

### 违章扣分（类驾照积分制）
- penaltyPoints ≥ 12 → 自动锁定（isLocked=true），无法打卡
- 安规考试 ≥ 80分通过 → 核销扣分（满分100%核销，否则50%）
- 核销后 < 12分 → 自动解锁

### 连续作业奖励（🆕 自动触发）
| 连续天数 | 鸡腿积分 | 备注 |
|----------|----------|------|
| 3天 | +5 | 每个阈值仅奖一次 |
| 5天 | +10 | |
| 7天 | +20 | |
| 15天 | +30 | |
| 30天 | +50 | |

基于**有报量记录**的连续天数（非打卡），在 `/api/reports` POST 时自动检测。

### 多模型 LLM 架构
- 3 个功能槽位：**default**（文本）、**photo**（视觉）、**summary**（摘要）
- 配置优先级：功能级配置 → 默认配置 → 环境变量
- 设置页面 3 个 Tab 独立配置

### 定时推送（🆕）
- 推送渠道：Server酱 / 企业微信群机器人 Webhook
- 报告类型：施工日报、周报汇总、异常预警
- 设置页面配置：Webhook URL、平台选择、推送时间、报告类型
- API：`POST /api/cron/report?type=daily&push=1&secret=xxx`

---

## 六、工人端首页 UI（🆕 最新改造）

`app/worker/page.tsx` 的 `CheckInScreen` 已从简单打卡页重构为**可滚动信息流**：

```
┌──────────────────────────────┐
│ [头像] 工人名  项目名  [记录] │  ← Header
│ ● 已打卡 08:30   3条报量      │
├──────────────────────────────┤
│ ┌──────────┐ ┌──────────┐   │  ← 积分卡片
│ │🍗 鸡腿 15│ │⚠️ 扣分 2/12│  │
│ │+5 连续3天│ │ ████░░░░  │  │
│ └──────────┘ └──────────┘   │
│ ┌──────────────────────────┐ │  ← 连续作业
│ │⚡ 连续作业 5天           │ │
│ │ ▓▓▓░░ 再2天奖20鸡腿     │ │
│ └──────────────────────────┘ │
│ ┌──────────────────────────┐ │  ← 本月统计
│ │ 出勤18天 ¥12,800 照片23 │ │
│ │ ┌─────────────────────┐ │ │
│ │ │ 电缆敷设 12条 ¥5000 │ │ │  ← 计量工按工序汇总
│ │ │ 配电箱    8条 ¥3000 │ │ │
│ │ └─────────────────────┘ │ │
│ └──────────────────────────┘ │
│ ┌──────────────────────────┐ │  ← 排行榜（可折叠）
│ │ 本月排行 ▼               │ │
│ │ [产值][鸡腿][工程量][照片]│ │  ← 6个维度Tab
│ │ 🥇 张三  ¥15,000        │ │
│ │ 🥈 李四  ¥12,800        │ │
│ │ 🥉 王五  ¥10,500 (我)   │ │
│ └──────────────────────────┘ │
│ ┌──────────────────────────┐ │  ← 最近记录
│ │ 🍗 +5 连续作业3天       │ │
│ │ ⚠️ -2 未佩戴安全帽      │ │
│ └──────────────────────────┘ │
├──────────────────────────────┤
│     [ 进场打卡 ]             │  ← 底部固定按钮
└──────────────────────────────┘
```

### 新增 API 端点

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/worker/dashboard` | GET (Header: x-worker-id) | 工人首页全部数据 |
| `/api/worker/leaderboard?project=xx` | GET | 6维排行榜数据 |
| `/api/cron/report?type=daily\|weekly\|alert` | POST | 报告生成 |
| `/api/cron/report?type=daily&push=1&secret=xxx` | POST | 生成+推送 |

---

## 七、UI 优化建议（供前端工程师参考）

### 优先级 P0（体验核心）

1. **工人端 `app/worker/page.tsx`** — 单文件 2100+ 行，建议拆分组件到 `app/worker/components/` 目录：
   - `CheckInScreen.tsx` — 首页
   - `DashboardCards.tsx` — 积分+连续作业卡片
   - `MonthStats.tsx` — 月度统计
   - `Leaderboard.tsx` — 排行榜
   - `HistoryView.tsx` — 历史记录
   - `TrainingScreen.tsx` — 安规学习
   - `SmartParseView.tsx` — 智能拆解
   - `ManualReportForm.tsx` — 手动报量

2. **工人端首页动画** — 积分数字变化时加计数动画，连续作业进度条加过渡效果

3. **管理后台设置页 `app/(admin)/settings/page.tsx`** — 推送配置区域已有 UI，可优化交互细节

### 优先级 P1（视觉打磨）

4. **工人端排行榜** — 加骨架屏 loading，前 3 名头像加光效
5. **报量明细列表** — 加图标区分工序类型（电缆→⚡、土方→🏗️等）
6. **积分卡片** — 鸡腿积分加渐变背景色，扣分卡片加脉冲动画（高扣分时）

### 优先级 P2（体验提升）

7. **Boss 端 `app/boss/page.tsx`** — 同步工人端的积分/排行榜展示
8. **管理后台工人详情 `app/(admin)/workers/[id]/page.tsx`** — 加工人端首页预览
9. **移动端适配** — 管理后台部分页面在平板上的响应式优化

---

## 八、测试账号

| 角色 | 入口 | 账号 |
|------|------|------|
| 管理员 | `/settings`（需登录后台） | PIN: `6789` |
| 测试老板 | `/boss` | 手机 `13696955064` / PIN `6789` |
| 管理员密钥 | API 调用 | `pl_admin_secret_2026` |

---

## 九、注意事项

1. **数据库操作**：全部用 `prisma.$queryRawUnsafe` / `$executeRawUnsafe`，SQL 参数用字符串拼接（已知技术债，后续参数化）
2. **环境变量**：`.env` 不入库，敏感信息（API Key）存在 DB `Settings` 表
3. **代理问题**：本机 Clash TUN 代理偶尔导致 `git push` 失败，重试即可
4. **CSS 变量优先**：新增样式尽量用 `style={{ }}` + CSS 变量，保持与现有设计一致
5. **中文注释**：代码注释和 UI 文案统一使用中文
