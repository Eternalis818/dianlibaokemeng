# PowerLink v2 — 施工管理系统

电力行业施工现场管理平台，面向班组长和管理员，支持工人档案、工程报告、签到、签证、异常纠正、AI 班组助手等核心功能。

**线上地址**：https://powerlink-v2.netlify.app

---

## 技术栈

- 前端：Next.js 16.2.1 + React 19 + TypeScript
- 样式：Tailwind CSS v4 + Framer Motion
- ORM：Prisma 5
- 数据库：Supabase PostgreSQL
- AI：火山引擎方舟 API（doubao 模型）
- 部署：Netlify（SSR 模式）

---

## 路由结构

- `/` — 工人入口（手机号登录）
- `/worker` — 工人端主界面（报告、签到、AI助手）
- `/boss` — 班组长看板
- `/admin/dashboard` — 管理员总览
- `/admin/workers` — 工人档案管理
- `/admin/projects` — 工程项目管理
- `/admin/reports` — 报告审核
- `/admin/corrections` — 异常纠正记录
- `/admin/visas` — 签证管理
- `/admin/finance` — 财务结算
- `/admin/annual` — 年度报表
- `/admin/agent` — AI 管理助手

---

## 本地运行

### 1. 克隆 & 安装依赖

```bash
git clone https://github.com/give-power/dianlipoikmo.git
cd dianlipoikmo
npm install
```

### 2. 配置环境变量

```bash
cp .env.example .env.local
```

编辑 `.env.local`，填入：
- `DATABASE_URL` — Supabase Transaction Pooler 连接串（端口 6543）
- `DIRECT_URL` — Supabase Direct 连接串（端口 5432，用于 migrate）
- `VOLC_API_KEY` — 火山引擎方舟 API Key
- `VOLC_MODEL` — 模型端点 ID（如 `ep-xxxxxxxx-xxxxx`）

### 3. 初始化数据库

```bash
# 同步 schema 到数据库
npx prisma db push

# 生成 Prisma Client
npx prisma generate

# 写入测试数据（可选）
npm run seed
```

### 4. 启动开发服务器

```bash
npm run dev
# 访问 http://localhost:3000
```

---

## 数据模型（prisma/schema.prisma）

- `Worker` — 工人档案（姓名、工种、联系方式）
- `Project` — 工程项目
- `Report` — 施工日报
- `CheckIn` — 签到记录
- `Visa` — 签证申请
- `Correction` — 异常纠正记录

---

## 目录结构

```
app/
  (admin)/        管理员页面（带侧边栏 Layout）
  api/            API Routes
  boss/           班组长页面
  worker/         工人端页面
lib/              工具函数、Prisma 客户端
prisma/
  schema.prisma   数据库 schema
  seed.ts         测试数据脚本
```
