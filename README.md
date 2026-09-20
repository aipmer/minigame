# 🎮 MiniGame — 现代 Web 3D 小游戏矩阵

轻量、纯粹、基于现代 Web 3D 技术 (Three.js ESM) 与生成式 AI 资产 (Meshy.ai / Tripo3D / Native Generative AI) 的网页小游戏合集。

---

## 🕹️ 已收录游戏

### 1. 🐍 3D 贪吃蛇 (`games/snake3d/`)
- **美术与渲染**：
  - Q 版任天堂/动森风「3D 清新草地积木乐园」；
  - 3D 粘土风全景天幕背景（DOM 容器 CSS Cover + Three.js Alpha 穿透，移动端竖屏与全屏等比自适应，0 畸变）；
  - 立体多层浮空岛厚度地台（草皮层、泥土断层、倒锥岩体底座、四角发光灯塔立柱）；
  - 彻底杜绝 Z-Fighting 的纯净双色棋盘草坪；
- **拟真蛇体骨骼与形态**：
  - 萌系头颅（水润大眼、粉嫩腮红与动态吐信小红舌）；
  - 仿生变径锥度曲线（Tapering：头部饱满 $1.15 \rightarrow$ 颈部收束 $0.98 \rightarrow$ 躯干匀称 $0.95 \rightarrow$ 尾部收束至 $0.30$ 搭配专属圆润尾尖）；
  - 脊椎切线自适应平滑弯曲 + S 游动微幅横向蜿蜒；
  - 吃果实时新增身体段采用 `Spring Ease` 弹性生长绽放（0.05 膨胀至 1.0），告别生硬突兀感；
- **丝滑无顿挫动力学**：
  - 恒速线性位移插值（消除传统 `smoothstep` 导致的格末刹停顿挫）；
  - 亚帧时间余量累加器（Sub-frame Accumulator），彻底杜绝丢帧与微卡顿；
- **次世代 3D 粘土质感 UI 与独立 3D 图标**：
  - 加厚 3D 奶白卡片弹窗 + 3D 泡泡字标头徽章；
  - 极高辨识度的独立药丸标签（3D 爆炸冲击波配珊瑚红深红文字，告别浅底浅字隐形）；
  - 金色立体浮雕得分面板与具有真实按压位移反馈的 3D 玩具按钮（`toy-btn`）；
  - 彻底废除廉价系统原生 Emoji，全量升级为原生生图生成的 3D 质感透明 PNG 图标库（通用环形重试图标、微缩木屋大厅图标等）；
- **纯代码高品质音效**：Web Audio 纯算法合成（清脆多汁苹果咬嚼音、卡通水泡啵啵转向音、黄金星风铃仙女音、碎石卡通轰响、欢快升级音阶）；
- **全端操控**：支持桌面方向键/WASD 与移动端 360° 弹性虚拟摇杆（角度扇区映射与物理回中）。

---

### 2. 🚀 太空战机 (`games/skydodge/`)
- **引擎与图形**：Three.js r170+、高能深空星云天幕、动态空间扭曲粒子；
- **Meshy.ai 3D 资产管线**：
  - 4 款核心模型（超音速战机、晶脉深空陨石、等离子护盾球、量子能量核）经由 `scripts/optimize-assets.mjs` 实现 90%+ 极致瘦身与 Meshopt 二进制拓扑解压；
- **战机与武器动力学**：
  - 机载等离子双激光主炮（40 发循环弹道对象池，摧毁迎面陨石触发爆破粒子与连击叠加）；
  - 飞行动力学侧倾 (Banking Roll 最大 37° 倾斜角与自然 Pitch 俯仰)；
  - 双喷口蓝紫离子尾焰动态抖动；
- **程序化音频**：激光高频脉冲发射音、陨石低频爆破冲击、护盾充能音与危险警报；
- **全端触控与专属 3D 图标**：左手虚拟摇杆航向操纵 + 右手 `FIRE`（3D 烈焰）开火键与 `BOOST`（3D 闪电）冲刺键，结算弹窗复用 3D 环形重开图标。

---

## 📂 项目结构

```
minigame/
├── index.html              # 游戏大厅导航聚合页
├── AGENTS.md               # 项目智能体事实源与协作规则
├── docs/                   # 专项技术与设计规范文档
│   └── EXPERIENCE_AND_CHECKLIST.md # 3D 游戏调优避坑指南与验收核查清单
├── games/
│   ├── snake3d/            # 3D 贪吃蛇小游戏
│   │   ├── index.html      # 游戏主页面
│   │   ├── css/style.css   # 3D 粘土质感 UI 样式
│   │   ├── js/             # 游戏核心逻辑 (Three.js ESM)
│   │   ├── assets/ui/      # 原生生成的 3D 天幕与立体 UI 徽章
│   │   └── models/         # 3D 模型资产
│   └── skydodge/           # 太空战机小游戏
│       ├── index.html
│       ├── css/style.css
│       ├── js/
│       └── models/         # Meshy.ai 优化后 GLB 模型
├── scripts/                # 构建、优化与自动化测试套件
│   ├── optimize-assets.mjs # gltfpack + meshopt 自动化瘦身管线
│   ├── make-transparent.mjs# UI 徽章透明通道自动化生成
│   ├── test-gameplay.mjs   # 贪吃蛇桌面端全链路自动化测试
│   ├── test-mobile.mjs     # 贪吃蛇移动端触控自动化测试
│   ├── test-skydodge.mjs   # 太空战机激光与碰撞自动化测试
│   └── test-skydodge-mobile.mjs # 太空战机双拇指触控测试
├── package.json
└── vercel.json             # Vercel 静态托管配置
```

---

## 🚀 本地开发与全链路测试

```bash
# 启动本地静态服务 (端口 3000)
npm run dev

# 运行自动化端到端测试套件 (Chrome Headless)
node scripts/test-gameplay.mjs          # 贪吃蛇全景/蛇身/弹窗验证
node scripts/test-mobile.mjs            # 贪吃蛇 360° 弹性虚拟摇杆触控验证
node scripts/test-skydodge.mjs          # 太空战机激光主炮与击石验证
node scripts/test-skydodge-mobile.mjs   # 太空战机双拇指触控验证
```

---

## 📚 延伸阅读与规范

- [AGENTS.md](file:///Users/hunkwu/Desktop/ai/minigame/AGENTS.md) — 智能体公共事实源与协同开发守则
- [docs/EXPERIENCE_AND_CHECKLIST.md](file:///Users/hunkwu/Desktop/ai/minigame/docs/EXPERIENCE_AND_CHECKLIST.md) — Web 3D 游戏体验调优避坑指南与标准化验收清单
