# 火影忍者猜猜猜 - 部署指南

## 通过 GitHub + Render 部署（推荐）

### 第一步：创建 GitHub 仓库

1. 访问 https://github.com/new 创建一个新仓库，例如名为 `naruto-guess-game`
2. 初始化 Git 并推送到 GitHub：

```bash
# 在项目根目录执行
git init
git add .
git commit -m "初始化火影忍者猜猜猜项目"
git branch -M main
git remote add origin https://github.com/你的用户名/naruto-guess-game.git
git push -u origin main
```

### 第二步：注册 Render 并部署

1. 访问 https://render.com 注册账号（可以使用 GitHub 登录）
2. 点击 **New +** 按钮，选择 **Web Service**
3. 选择 **From a Repository**
4. 连接你的 GitHub 账号并选择刚创建的仓库
5. 配置如下：
   - **Name**: naruto-guess-game
   - **Region**: Singapore（亚洲区域，延迟更低）
   - **Branch**: main
   - **Root Directory**: 保持不变
   - **Runtime**: Node
   - **Build Command**: `pnpm install && pnpm build`
   - **Start Command**: `pnpm start`

6. 在 **Environment** 选项卡中添加以下环境变量：

```
NODE_ENV=production
PORT=3000
DB_CLIENT=sqlite
DB_URL=/data/csgofriberg.sqlite3
REDIS_REQUIRED=false
POW_DIFFICULTY=17
CORS_ORIGINS=*.onrender.com
TRUST_PROXY=true
JWT_SECRET=（生成一个随机字符串，至少32字节）
```

7. **重要**：在 **Advanced** 选项卡中：
   - 启用 **Persistent Disk**，设置路径为 `/data`，大小 1GB（免费额度）
   - 这是为了让 SQLite 数据持久化存储

8. 点击 **Create Web Service** 并等待部署完成

### 第三步：获取访问地址

部署成功后，Render 会提供一个 URL，格式如：
`https://naruto-guess-game.onrender.com`

这就是你的公开访问地址！

## 其他部署选项

### 使用 Railway

Railway 也是一个不错的选择：
1. 访问 https://railway.app 注册
2. 点击 **New Project** → **Deploy from GitHub repo**
3. 选择你的仓库
4. 配置环境变量（与 Render 相同）
5. 部署完成后即可获得访问地址

### 使用 Fly.io

1. 访问 https://fly.io 注册
2. 安装 Fly CLI：`npm install -g @flydotio/node-fly`
3. 初始化项目：`fly launch`
4. 部署：`fly deploy`

## 注意事项

1. **数据备份**：免费版 Render 的持久化磁盘有限，重要数据建议定期备份
2. **休眠策略**：免费版服务在无流量 15 分钟后会休眠，首次访问需要唤醒时间
3. **域名绑定**：如需自定义域名，可在 Render 付费版中配置
4. **HTTPS**：Render 自动提供 HTTPS，安全无忧
