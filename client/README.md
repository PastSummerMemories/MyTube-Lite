# Client（Vite + React）

本目录为 YouTube Clone 前端。已从 Create React App 迁移至 **Vite**。

更完整的安装、环境变量与功能说明见仓库根目录 [README.md](../README.md)。

## 快速开始

```bash
cp .env.example .env
# 确认 VITE_API_BASE=http://localhost:5000（后端地址）
npm install
npm run dev
```

浏览器打开：http://localhost:3000

请先启动后端（默认 `http://localhost:5000`），否则接口请求会失败。

## 脚本

| 命令 | 说明 |
|------|------|
| `npm run dev` / `npm start` | Vite 开发服务器 |
| `npm run build` | 生产构建 → `dist/` |
| `npm run preview` | 预览构建产物 |

## 环境变量

见 [.env.example](./.env.example)：

```env
VITE_API_BASE=http://localhost:5000
```

在代码中通过 `import.meta.env.VITE_API_BASE` 读取（封装于 `src/config.js`）。  
**不要**再使用 CRA 的 `REACT_APP_*`。

## 测试账号

无内置账号。在 `/Register` 自行注册（密码需含数字 + 大写 + 小写，6～18 位），或使用根 README 中的在线演示地址。

## 技术要点

- 路由：`src/App.jsx`（Login/Register 无壳；业务页走 `MainLayout`）
- 鉴权守卫：`src/componets/RequireAuth/RequireAuth.jsx`
- 请求层：`src/service/index.js`（token、401/403、`skipLoading`、全局 loading）
- UI：Tailwind + shadcn + Sonner（无 Ant Design）
