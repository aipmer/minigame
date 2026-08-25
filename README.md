# 🎯 眼力大挑战365

> 60 秒观察力挑战休闲小游戏 — 「休闲游戏365」品牌首款作品

## ✨ 游戏简介

在限定 60 秒内完成 10 道「找不同」题目，从色块、方向箭头、数字文字、大小或数量中找出唯一不同项。完成后生成挑战分、等级和称号。

### 🎮 五种题型

| 题型 | 说明 | 示例 |
|---|---|---|
| 色块明度差 | HSL 空间中找出明度不同的色块 | 一组蓝色中有一个略浅的蓝色 |
| 方向差异 | 找出方向不同的箭头 | 一堆 → 中有一个 ← |
| 数字/文字差异 | 找出相似字符中的不同项 | 「日」中有一个「目」 |
| 大小差异 | 找出尺寸不同的图形 | 一组方块中有一个偏大/偏小 |
| 数量差异 | 找出点数不同的点阵 | 一组 5 点图案中有一个 4 点 |

### 🕹️ 三种模式

- **经典挑战**：限时 60 秒，10 道题定长难度曲线
- **无尽挑战**：3 条生命，答错扣血/答对回血，五种题型持续轮转，越打越难
- **每日挑战**：用当天日期做随机种子，全球玩家当天打到完全相同的 10 题，方便比拼分数

### 💡 道具系统

答对连击每满 3 次获得 1 点「观察力值」（上限 5 点），可在答题过程中消耗：

| 道具 | 消耗 | 效果 |
|---|---|---|
| 提示 💡 | 1 点 | 排除 2 个错误格子 |
| 冻结 ❄️ | 1 点 | 暂停计时 3 秒 |
| 双倍分 ✨ | 2 点 | 下一题得分 ×2 |

### 🧊 3D 立体视觉

网格格子、结算卡片、护盾特效均采用斜面材质渐变 + `perspective`/`transform-style: preserve-3d`，
答对时格子做 3D 弹出翻转，答错时做 3D 俯仰抖动，结算页等级徽章做 3D 翻入揭晓，Fever 护盾是旋转的
`conic-gradient` 能量光环——全部纯 CSS 实现，不依赖陀螺仪/传感器权限。

### 🏆 等级系统

| 分数 | 等级 | 称号 |
|---:|---|---|
| 98-100 | SSS | 人形扫描仪 |
| 90-97 | SS | 鹰眼玩家 |
| 80-89 | S | 细节猎人 |
| 70-79 | A | 观察高手 |
| 60-69 | B | 稳定发挥 |
| 50-59 | C | 眼神飘忽 |
| 0-49 | D | 今天先休息 |

## 🚀 快速开始

```bash
# 使用本地服务器（ES Modules 需要 HTTP 服务）
cd minigame
python3 -m http.server 8086

# 访问 http://localhost:8086
```

或使用任何支持 ES Modules 的本地服务器（Live Server、http-server 等）。

> ⚠️ 不能直接双击 `index.html` 打开，因为浏览器会阻止 ES Module 的 `file://` 加载。

## 📁 项目结构

```
minigame/
├── index.html              # 入口页面
├── README.md               # 项目说明
├── package.json            # 仅 devDependencies（playwright），运行时零依赖
├── css/
│   └── style.css           # 完整视觉设计系统 + 3D 立体材质
├── js/
│   ├── main.js             # 入口 + 视图路由 + window.__game 调试接口
│   ├── core/               # 核心逻辑层（纯逻辑，无 DOM 依赖）
│   │   ├── LevelConfig.js  # 难度曲线 / 题型 / 道具 数据表
│   │   ├── GameState.js    # 游戏状态机（含道具点数、每日种子）
│   │   ├── QuestionGenerator.js # 题目生成器（可注入确定性 rng）
│   │   ├── SeededRandom.js # 每日挑战用的确定性随机数（mulberry32）
│   │   ├── ScoreManager.js # 计分系统
│   │   ├── StorageManager.js # 本地存储（含每日挑战记录）
│   │   └── AudioManager.js # Web Audio 音效
│   ├── gameplay/           # 游戏玩法层
│   │   ├── GridRenderer.js # 网格渲染（五种题型 + 提示道具排除）
│   │   ├── TimerController.js # 倒计时（含冻结道具、forceExpire 调试接口）
│   │   └── FeedbackManager.js # 反馈动效
│   ├── views/              # UI 视图层
│   │   ├── HomeView.js     # 首页（含每日挑战入口）
│   │   ├── GameView.js     # 游戏页（含道具栏交互）
│   │   ├── ResultView.js   # 结算页
│   │   └── RankView.js     # 排行榜页
│   └── wx/                 # 微信小游戏能力占位
│       ├── WxRankManager.js  # 开放数据域
│       ├── WxAdManager.js    # 激励视频广告
│       └── WxShareManager.js # 分享
├── tests/                  # Playwright 自动化测试（devDependency，不影响运行时）
│   ├── _helpers.js          # 共享工具：开浏览器、监听 pageerror
│   ├── smoke.js              # 主流程冒烟测试
│   ├── newtypes.js           # 新增 size/count 题型
│   ├── powerup.js            # 道具系统
│   ├── daily.js               # 每日挑战 seed 复现
│   └── hit-3d.js              # 3D 动画下的点击命中回归
└── docs/
    └── 眼力大挑战365_微信小游戏AI开发方案_最终版.md
```

## 🛠️ 技术栈

- **前端**: HTML5 + CSS3 + JavaScript (ES Modules)
- **音效**: Web Audio API（程序化生成，无音频文件）
- **存储**: localStorage（预留 wx.setStorageSync 接口）
- **字体**: Google Fonts (Noto Sans SC)
- **零依赖**: 无框架、无构建工具

## 🧪 调试与测试

浏览器控制台可通过 `window.__game` 直接驱动游戏，跳过等待动画/计时器真实流逝：

```js
__game.start('daily');       // 'classic' | 'endless' | 'daily'
__game.answer(2);            // 模拟点击第 2 个格子（0-based），返回 Promise
__game.skipTimer();          // 立即让当前倒计时归零，触发超时分支
__game.usePowerup('hint');   // 'hint' | 'freeze' | 'double'
__game.score / __game.combo / __game.powerupPoints / __game.dailySeed
```

自动化测试基于 Playwright（仅 devDependency，运行时零依赖不受影响）：

```bash
npm install
npx playwright install chromium
npm test        # 依次跑 smoke / newtypes / powerup / daily / hit-3d
```

## 📦 后续迁移路径

当前为 Web 玩法原型。正式发布需迁移到：

```
Cocos Creator 3.8.x + TypeScript → 微信小游戏
```

核心逻辑层（`js/core/`）可直接迁移为 Cocos 组件脚本。

## ⚠️ 合规声明

本游戏为休闲娱乐挑战，结果仅供娱乐参考，不代表医学、心理或专业能力评估。

## 📄 许可证

MIT License

## 👨‍💻 开发信息

品牌：休闲游戏365  
版本：V1.0 Web 原型  
日期：2026-07-09
