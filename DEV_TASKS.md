# 📋 开发任务看板与追踪 (DEV_TASKS)

本文档用于追踪 MiniGame 项目的迭代任务、缺陷修复、技术债务与排期规划。

---

## 📊 任务总体状态概览

- **当前里程碑**：Web 3D 游戏体验与立体视觉全维度重塑 (Milestone v1.1)
- **里程碑状态**：✅ **已全部完成并通过全链路自动化回归测试**
- **当前代码质量**：Chrome Headless 自动化测试 **0 报错** (4/4 套件通过)

---

## 🚀 今日已完成任务 (Completed Today)

| 模块 / 领域 | 任务说明 | 交付产物 | 验收结果 |
| :--- | :--- | :--- | :--- |
| **大厅左上角与中文 HUD** | 统一全矩阵大厅入口至左上角，单行流线排布，顶部状态栏全面默认中文版本 | `games/snake3d/`<br>`games/skydodge/` | ✅ 左右平衡对齐无遮挡，中文信息流转自然 |
| **移动端背景自适应** | 废除 Three.js 场景直赋纹理导致的拉伸，采用 CSS Cover + WebGL 透明穿透 | `games/snake3d/js/scene/SceneSetup.js`<br>`games/snake3d/css/style.css` | ✅ 竖屏/横屏等比自适应，山峦与白云构图完美，0 畸变 |
| **原生 3D 图标库** | 原生生图生成 10 款专属 3D 游戏图标，Chrome Canvas 泛洪去底输出透明 PNG | `assets/icons/`<br>`scripts/process-icons.mjs` | ✅ 环形刷新图标双游戏复用，全项目原生 Emoji 彻底清零 |
| **全场景 Emoji 替换** | 贪吃蛇、太空战机与游戏大厅全面接入 3D 图标（大厅、起飞、重开、碰撞、指南等） | `games/snake3d/`<br>`games/skydodge/`<br>`index.html` | ✅ 双端 UI 质感统一跃升，自动化测试 0 报错 |
| **原生生图资产** | 生成 3D 粘土全景天幕与 3D 泡泡字标头/Logo 徽章 | `assets/ui/snake3d_sky_bg.jpg`<br>`assets/ui/snake3d_gameover_badge.png`<br>`assets/ui/snake3d_start_badge.png` | ✅ 视觉通透，透明通道干净，沉浸感大幅增强 |
| **动力学抗卡顿** | 废除顿挫的 `smoothstep`，重构为恒速线性插值 + 亚帧时间余量累加器 | `games/snake3d/js/game/Snake.js` | ✅ 彻底根除每秒 6 次的格末停顿，跨格滑行极其丝滑 |
| **仿生蛇体形态** | 变径锥度收束（$1.15 \rightarrow 0.30$）+ 专属尾尖 + 脊椎切线旋转 + S 游动 + 弹性生长 | `games/snake3d/js/game/Snake.js` | ✅ 摆脱方块生硬感，转弯自然圆润，新尾节无突兀跳出 |
| **立体浮岛场景** | 构建立体草皮/泥土/倒锥岩石厚度地台与四角灯塔立柱，抬升地表彻底消除 Z-Fighting | `games/snake3d/js/scene/Ground.js`<br>`games/snake3d/js/scene/SceneSetup.js` | ✅ 场景立体厚实，地面条纹噪波归零 |
| **3D 粘土 UI 弹窗** | 重塑立体奶白卡片弹窗、高对比度珊瑚红胶囊标签（`💥 撞到墙壁`）与 3D 玩具按钮 | `games/snake3d/css/style.css`<br>`games/snake3d/index.html` | ✅ 彻底解决白底白字隐形问题，UI 触感生动 |
| **触控与互动音效** | 引入 360° 弹性虚拟摇杆 + 增补清脆苹果咬嚼音、卡通气泡转向音等 Q 版音效 | `games/snake3d/js/main.js`<br>`games/snake3d/js/audio/SoundManager.js` | ✅ 移动端触控丝滑，音效清脆可爱反馈明确 |
| **太空战机升级** | Meshy.ai 3D 资产管线与 90%+ 拓扑压缩瘦身，激光主炮系统与飞行动力学侧倾 | `games/skydodge/` 全套源码与模型 | ✅ 自动化测试 0 报错，双拇指触控运作正常 |
| **战机移动性能与采光** | 0.5x 降采样 Bloom、关 preserveDrawingBuffer、DPR 1.5 封顶；三点式跟随光、双色半球光与 PBR 增益 | `games/skydodge/js/` 渲染与光照管线 | ✅ 移动端 60fps 满帧无卡顿，战机形态清晰立体 |
| **规范与事实源** | 建立项目最高事实源与体验调优避坑手册 | `AGENTS.md`<br>`docs/EXPERIENCE_AND_CHECKLIST.md` | ✅ 跨智能体协作基石与交付规范就绪 |

---

## 🎯 明日与待办任务清单 (Next Up / Backlog)

### 阶段一：玩法机制丰富化 (P1)
- [ ] **贪吃蛇特色技能道具**：
  - [ ] 磁铁道具：吃下后 6 秒内自动吸附 3 格范围内的果实；
  - [ ] 冰冻道具：使蛇速降低 40% 且网格冰蓝特效，适合长蛇极限操控；
  - [ ] 连线奖励：短时间内连续吃同色果实触发倍数得分特效。
- [ ] **太空战机波次与 Boss 战**：
  - [ ] 第二波次：高速晶体陨石阵与自爆幽灵浮游雷；
  - [ ] 战舰 Boss：周期性刷新母舰，发射扇形激光弹幕，破坏弱点核心通关。

### 阶段二：战绩与数据持久化 (P1)
- [ ] **本地 LocalStorage 存储**：
  - [ ] 记录历史最高分、最长蛇身、最高连击数、总消灭陨石数；
  - [ ] 游戏结束弹窗新增「历史最高纪录打破」高光庆典与粒子喷花；
- [ ] **战绩结算卡片生成**：支持一键生成带有 3D 战绩徽章的分享截图。

### 阶段三：工程化与首屏加载调优 (P2)
- [ ] **首屏资源预加载骨架屏**：消除大纹理或 3D 模型首帧异步加载过程中的突变闪烁；
- [ ] **音频交互策略优化**：遵循 iOS Safari / Chrome AudioContext 策略，在首个用户手势（如点击开始）静音预热所有音频源；
- [ ] **低配性能降级检测**：检测到平均帧率低于 45fps 时，自动关闭高开销软阴影与过量粒子发射。

---

## 🧪 自动化测试验证标准

提交前必须运行以下测试套件，并确保 **0 Errors**：

```bash
node scripts/test-gameplay.mjs          # 贪吃蛇桌面端（开始卡片/立体地台/蛇身/弹窗）
node scripts/test-mobile.mjs            # 贪吃蛇移动端（390×844 视口/360°弹性摇杆）
node scripts/test-skydodge.mjs          # 太空战机桌面端（激光主炮/击石粒子/HUD）
node scripts/test-skydodge-mobile.mjs   # 太空战机移动端（双拇指虚拟触控）
```
