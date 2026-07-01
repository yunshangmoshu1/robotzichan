# ROBO::TRACK 2.0 部署指南

## 方案：Netlify（前端）+ Render（后端）

---

## 第一步：部署后端到 Render

### 1. 打开 Render
- 访问 https://render.com
- 用 GitHub 账号登录

### 2. 创建 Web Service
- 点击 **New** → **Web Service**
- 连接 GitHub 仓库 `yunshangmoshu1/robotzichan`
- 配置：
  - **Name**: `robo-track-api`
  - **Root Directory**: `server`
  - **Runtime**: `Node`
  - **Build Command**: `npm install`
  - **Start Command**: `node index.js`
  - **Instance Type**: `Free`

### 3. 添加环境变量
在 **Environment** 中添加：
```
SUPABASE_URL=你的Supabase URL
SUPABASE_ANON_KEY=你的anon key
SUPABASE_SERVICE_KEY=你的service key
JWT_SECRET=你的JWT密钥
DINGTALK_APP_KEY=dinglgtpo0xz7gn3b36f
DINGTALK_APP_SECRET=QDRldOCcHb5Ar7Cbgkzo_OYUeKv890mKTPVIAJzKOY_HOuomcZQzVrDawUscuc0r
```

### 4. 点击 **Create Web Service**
- 等待部署完成
- 记录分配的 URL（如 `https://robo-track-api.onrender.com`）

---

## 第二步：部署前端到 Netlify

### 1. 打开 Netlify
- 访问 https://netlify.com
- 用 GitHub 账号登录

### 2. 创建站点
- 点击 **Add new site** → **Import an existing project**
- 选择 GitHub 仓库 `yunshangmoshu1/robotzichan`
- 配置：
  - **Base directory**: `client`
  - **Build command**: `npm run build`
  - **Publish directory**: `client/dist`

### 3. 添加环境变量
在 **Site settings** → **Environment variables** 中添加：
```
VITE_API_BASE_URL=https://robo-track-api.onrender.com/api
```

### 4. 部署
- 点击 **Deploy site**
- 等待部署完成
- 记录分配的 URL（如 `https://xxx.netlify.app`）

---

## 第三步：更新前端 API 地址

部署完成后，需要更新 `client/src/api/index.js` 中的 API 基础地址。

---

## 环境变量说明

| 变量名 | 说明 | 获取方式 |
|--------|------|----------|
| SUPABASE_URL | Supabase 项目 URL | Supabase 控制台 → Settings → API |
| SUPABASE_ANON_KEY | Supabase 匿名密钥 | 同上 |
| SUPABASE_SERVICE_KEY | Supabase 服务密钥 | 同上 |
| JWT_SECRET | JWT 认证密钥 | 自定义，建议使用随机字符串 |
| DINGTALK_APP_KEY | 钉钉应用 AppKey | 钉钉开放平台 |
| DINGTALK_APP_SECRET | 钉钉应用 AppSecret | 钉钉开放平台 |

---

## 部署后验证

1. 访问前端 URL，确认页面加载正常
2. 尝试登录（默认账号：admin / admin123）
3. 测试 API 连接
4. 测试钉钉数据同步功能
