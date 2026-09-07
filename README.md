# 互联网数据传输 · 3D 教学动画

一个基于 **Three.js + Vite + TypeScript** 的交互式 3D 教学模拟器，可视化演示"一次完整的数据请求"如何穿过 DNS、CDN、负载均衡、API 网关、后端、缓存与数据库，并讲解 **JSON 数据格式**。

## ✨ 功能特性

- **8 节点拓扑**：前端浏览器 / DNS / CDN / 负载均衡 / API 网关 / 后端 / 缓存 / 数据库
- **14 步完整请求生命周期**（GET 场景）：用户操作 → DNS 解析 → TCP 三次握手 → TLS 握手 → HTTP 请求 → CDN → 负载均衡 → API 路由 → 缓存 → 数据库 → JSON 序列化 → 响应返回 → 前端渲染
- **4 个教学场景**：`GET 用户信息`（200）、`POST 创建用户`（201）、`404 资源不存在`、`429 请求限流`
- **时间轴拖拽回放**：底部时间轴可拖动/点击回放到任意步骤
- **节点点击详情**：点击任意节点弹出其角色、IP、说明
- **可编辑 JSON**：直接修改 JSON 载荷，实时参与动画与前端渲染
- **代码同步高亮**：前端 `fetch` 与后端 `Express` 代码随动画逐行高亮
- **DevTools 网络瀑布**：请求/响应状态码 + 各阶段耗时瀑布图
- **视觉真实感**：UnrealBloom 发光、RoomEnvironment 环境反射、PBR 材质、粒子、空闲自动运镜

## 🚀 如何运行

**方式一：一键启动（Windows）** —— 双击 `start.bat`（自动检测 Node、装依赖、启动并打开浏览器）。

**方式二：命令行**

```bash
npm install      # 首次运行需安装依赖
npm run dev      # 开发模式，浏览器打开 http://localhost:5173
```

**生产构建**

```bash
npm run build    # 类型检查 + 构建到 dist/
npm run preview  # 本地预览构建产物
```

> 需要 Node.js 18+（建议 LTS）。

## 🖱 操作说明

| 操作 | 效果 |
|------|------|
| 鼠标拖拽 / 滚轮 / 右键 | 旋转 / 缩放 / 平移视角 |
| ⏸/▶ | 播放 / 暂停 |
| ‹ › | 逐步前进 / 后退 |
| 底部时间轴 | 拖拽 / 点击回放到任意时刻 |
| 场景下拉框 | 切换 GET/POST/404/限流场景 |
| 点击 3D 节点 | 查看节点详情 |
| JSON 面板 ✏️ | 编辑载荷（保持 id/name/role/skills/active 结构） |
| ✨ 特效 | 开/关 Bloom 后期特效 |

## 📁 目录结构

```
json-tech-02/
├── index.html            # Vite 入口
├── src/
│   ├── main.ts           # 装配入口
│   ├── style.css
│   ├── core/             # renderer（Bloom/环境贴图）/ camera / engine（数据驱动时间线）
│   ├── world/            # scene / nodes / links / packets
│   ├── ui/               # hud / panels(JSON·代码·网络) / timeline / inspector
│   └── data/             # types / scenarios（4 场景 + 载荷 + 示例代码）
├── legacy.html           # 旧单文件版本（历史参考）
└── start.bat             # Windows 一键启动
```

## 🛠 技术栈

- **Three.js** 0.160（WebGL 渲染 + EffectComposer/UnrealBloomPass + RoomEnvironment）
- **Vite** 5 · **TypeScript** 5 · **OrbitControls** · **CSS2DRenderer**

## 🎓 教学要点（JSON 数据格式）

演示 JSON 响应：

```json
{
  "id": 42,
  "name": "小明",
  "role": "全栈开发者",
  "skills": ["JavaScript", "Three.js", "API"],
  "active": true
}
```

1. 数据以 **键值对** 存储，键必须用双引号包裹
2. 支持 **字符串 / 数字 / 布尔 / null / 数组 / 对象** 六种类型
3. **数组** `[]` 有序列表，**对象** `{}` 无序键值集合
4. 前后端用 `Content-Type: application/json` 标识数据格式
