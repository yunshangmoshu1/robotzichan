# ROBO::TRACK 2.0 — 机器人资产管理系统

全面升级的机器人资产管理系统，支持条形码扫描、钉钉集成、盘点管理、报表统计等功能。

## 功能特性

- **资产管理**：CRUD、搜索、筛选、排序、批量操作
- **条形码扫描**：摄像头扫码 → 匹配资产 → 快捷操作（改状态/位置/借出）
- **钉钉集成**：通过文件传输方式与钉钉多维表同步数据，变更通知推送到钉钉群
- **盘点管理**：扫码盘点、进度统计、差异报告
- **报表统计**：状态分布、类型分布、变动趋势
- **借还管理**：借出/归还、逾期提醒
- **审计日志**：所有变更自动记录
- **二维码标签**：批量生成资产标签，支持下载 PNG

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | Vue 3 + Vite + Element Plus + Pinia |
| 后端 | Node.js + Express |
| 数据库 | Supabase (PostgreSQL) |
| 条形码 | html5-qrcode |

## 快速开始

### 1. 配置环境变量

```bash
cd server
cp .env.example .env
# 编辑 .env 填入 Supabase 和钉钉配置
```

### 2. 初始化数据库

在 Supabase SQL Editor 中执行 `server/supabase_migration.sql`

### 3. 启动后端

```bash
cd server
npm install
npm run dev
```

后端运行在 http://localhost:3000

### 4. 启动前端

```bash
cd client
npm install
npm run dev
```

前端运行在 http://localhost:5173，API 请求自动代理到后端。

### 5. 默认登录

- 用户名：`admin`
- 密码：`admin123`（请登录后修改）

## 项目结构

```
├── server/          # Express 后端
│   ├── routes/      # API 路由
│   ├── controllers/ # 控制器
│   ├── services/    # 服务（Supabase、钉钉、Excel）
│   └── middleware/  # 中间件（认证、错误处理）
├── client/          # Vue 3 前端
│   └── src/
│       ├── views/       # 页面组件
│       ├── components/  # 通用组件
│       ├── stores/      # Pinia 状态管理
│       ├── api/         # API 调用封装
│       └── composables/ # 组合式函数
└── README.md
```

## 钉钉集成配置

1. 在 [钉钉开放平台](https://open-dev.dingtalk.com/) 创建企业内部应用
2. 获取 AppKey 和 AppSecret
3. 在系统设置页面填入配置
4. 如需群通知，创建钉钉机器人并获取 Webhook URL

## 条形码格式

系统支持以下条形码匹配：
1. 精确匹配 `robots.barcode` 字段
2. 模糊匹配 `robots.serial` 字段
3. 支持 Code 128、QR Code 等常见码制
