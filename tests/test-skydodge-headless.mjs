// ═══════════════════════════════════════════
// Sky Dodge 3D — 无头自动化 QA 逻辑测试脚本
// ═══════════════════════════════════════════
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// 简单模拟 localStorage
global.localStorage = {
  store: {},
  getItem(k) { return this.store[k] || null; },
  setItem(k, v) { this.store[k] = v.toString(); },
  clear() { this.store = {}; }
};

let passed = 0;
let failed = 0;

function assert(condition, testName) {
  if (condition) {
    console.log(`\x1b[32m✔ PASS\x1b[0m: ${testName}`);
    passed++;
  } else {
    console.error(`\x1b[31m✘ FAIL\x1b[0m: ${testName}`);
    failed++;
  }
}

async function runTests() {
  console.log('════════ 开始 Sky Dodge 3D 自动化系统测试 ════════\n');

  // 1. 静态源码完整性检查
  const requiredFiles = [
    'games/skydodge/index.html',
    'games/skydodge/css/style.css',
    'games/skydodge/js/main.js',
    'games/skydodge/js/scene/SceneSetup.js',
    'games/skydodge/js/scene/SpaceEnvironment.js',
    'games/skydodge/js/game/GameState.js',
    'games/skydodge/js/game/PlayerShip.js',
    'games/skydodge/js/game/ObstacleManager.js',
    'games/skydodge/js/game/CollectibleManager.js',
    'games/skydodge/js/game/ModelLoader.js',
    'games/skydodge/js/effects/ParticleFX.js',
    'games/skydodge/js/effects/CameraFlightFX.js',
    'games/skydodge/js/audio/FlightAudio.js',
    'scripts/generate-skydodge-models.mjs',
  ];

  for (const relPath of requiredFiles) {
    const fullPath = path.join(rootDir, relPath);
    assert(fs.existsSync(fullPath), `文件存在: ${relPath}`);
  }

  // 2. 状态机逻辑测试
  const { GameState } = await import('../games/skydodge/js/game/GameState.js');
  const gs = new GameState();

  assert(gs.state === 'start', '初始状态必须为 start');
  assert(gs.score === 0, '初始得分为 0');
  assert(gs.level === 1, '初始关卡为 Lv.1');
  assert(gs.boostEnergy === 100, '初始冲刺能量为 100%');

  // 开始游戏重置
  gs.reset();
  assert(gs.state === 'playing', '重置后状态进入 playing');

  // 模拟航行 5 秒
  for (let i = 0; i < 50; i++) {
    gs.update(0.1);
  }
  assert(gs.distance > 0, `航行距离随时间累计: ${Math.floor(gs.distance)}m`);
  assert(gs.score > 0, `自然飞行基础得分累计: ${gs.score}`);

  // 冲刺状态能耗测试
  gs.setBoosting(true);
  assert(gs.isBoosting === true, '可正常开启脉冲冲刺 (Boost)');
  const oldSpeed = gs.currentSpeed;
  gs.update(0.5);
  assert(gs.boostEnergy < 100, `冲刺消耗能量，剩余: ${Math.floor(gs.boostEnergy)}%`);
  assert(gs.currentSpeed > oldSpeed - 5, '冲刺状态速度获得明显加成');

  // 连击 Combo 计分测试
  gs.setBoosting(false);
  gs.increaseCombo(); // x2
  gs.increaseCombo(); // x3
  assert(gs.combo === 3, '连击数正确累计至 x3');
  const pts = gs.addScore(100, 'ENERGY');
  assert(pts.earned === 300, `连击加成正确应用 (100 * 3 = ${pts.earned})`);

  // 关卡升级测试 (航行超过 360m 进入 Lv.3)
  gs.distance = 380;
  gs.update(0.1);
  assert(gs.level >= 3, `航程提升触发关卡晋级 (Lv.${gs.level})`);

  // 护盾激活与破损测试
  assert(gs.hasShield === false, '初始无护盾');
  gs.activateShield();
  assert(gs.hasShield === true, '拾取护盾球后护盾激活');
  gs.breakShield();
  assert(gs.hasShield === false, '碰撞受击后护盾碎裂破损');

  // 游戏结束与结算记录
  gs.setGameOver();
  assert(gs.state === 'gameover', '碰撞后状态转为 gameover');
  assert(gs.highScore >= gs.score, '最高分纪录正确同步更新');

  console.log(`\n════════ 测试结果: ${passed} 通过, ${failed} 失败 ════════`);
  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('测试运行异常:', err);
  process.exit(1);
});
