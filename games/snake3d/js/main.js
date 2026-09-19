// ═══════════════════════════════════════════
// 3D 贪吃蛇 — 主入口
// ═══════════════════════════════════════════
import { SceneSetup } from './scene/SceneSetup.js';
import { Ground } from './scene/Ground.js';
import { Snake } from './game/Snake.js';
import { Food } from './game/Food.js';
import { ObstacleManager } from './game/Obstacle.js';
import { GameState } from './game/GameState.js';
import { SoundManager } from './audio/SoundManager.js';
import { ParticleSystem } from './effects/Particles.js';
import { CameraFX } from './effects/CameraFX.js';
import { ModelLoader } from './game/ModelLoader.js';

// ── UI 元素 ──
const ui = {
  hud:           document.getElementById('hud'),
  score:         document.getElementById('hud-score'),
  highScore:     document.getElementById('hud-highscore'),
  length:        document.getElementById('hud-length'),
  level:         document.getElementById('hud-level'),
  combo:         document.getElementById('combo'),
  startScreen:   document.getElementById('start-screen'),
  gameoverScreen:document.getElementById('gameover-screen'),
  gameoverReason:document.getElementById('gameover-reason'),
  gameoverScore: document.getElementById('gameover-score'),
  floatingScores:document.getElementById('floating-scores'),
};

// ── 初始化系统 ──
const container = document.getElementById('game-container');
const sceneSetup = new SceneSetup(container);
const { scene, camera, renderer } = sceneSetup;

const modelLoader = new ModelLoader();
// 异步触发模型预加载
modelLoader.loadAll().then(() => {
  console.log('[3D Snake] 模型载入流程就绪');
  snake.applyModels();
});

const ground    = new Ground(scene);
const snake     = new Snake(scene, modelLoader);
const food      = new Food(scene, modelLoader);
const obstacles = new ObstacleManager(scene, modelLoader);
const gameState = new GameState();
const sound     = new SoundManager();
const particles = new ParticleSystem(scene);
const cameraFX  = new CameraFX(camera);

// ── 跟踪蛇上次逻辑位置用于检测 step 发生 ──
let lastSnakePos = null;

// ── 相机跟随 ──
function updateCamera(delta) {
  if (!snake.head) return;
  const headPos = snake.head.position;
  const tx = headPos.x;
  const ty = headPos.y + 22;
  const tz = headPos.z + 14;

  const smooth = 1 - Math.pow(0.001, delta);
  camera.position.x += (tx - camera.position.x) * smooth;
  camera.position.y += (ty - camera.position.y) * smooth;
  camera.position.z += (tz - camera.position.z) * smooth;

  camera.lookAt(headPos.x, headPos.y + 1, headPos.z);
}

// ── 输入处理 ──
document.addEventListener('keydown', (e) => {
  const key = e.key;
  sound.init();

  if (gameState.state === 'start') {
    if (key === ' ') { e.preventDefault(); startGame(); }
    return;
  }

  if (gameState.state === 'gameover') {
    if (key === 'r' || key === 'R' || key === ' ') { e.preventDefault(); startGame(); }
    return;
  }

  if (gameState.state === 'playing') {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'w', 'a', 's', 'd'].includes(key)) {
      e.preventDefault();
    }
    snake.handleInput(key);
  }
});

// ── 移动端手势与触控控制 ──
let touchStartX = 0, touchStartY = 0;
let isTouching = false;
const SWIPE_THRESHOLD = 22; // 极速响应滑动阈值 (像素)

// 检测移动端并更新提示文案
const isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0) || (window.innerWidth < 768);
if (isTouchDevice) {
  const startSubtitle = ui.startScreen.querySelector('.subtitle');
  if (startSubtitle) startSubtitle.textContent = '轻触屏幕 开始游戏';
  const startHint = ui.startScreen.querySelector('.hint');
  if (startHint) startHint.textContent = '滑动屏幕 或 屏幕右下角按键 控制方向';

  const overSubtitle = ui.gameoverScreen.querySelector('.subtitle');
  if (overSubtitle) overSubtitle.textContent = '轻触屏幕 重新开始';
}

// 触屏开始
document.addEventListener('touchstart', (e) => {
  sound.init();
  if (e.target.closest('.dpad-btn') || e.target.closest('.back-home-btn')) return;
  
  isTouching = true;
  const touch = e.touches[0];
  touchStartX = touch.clientX;
  touchStartY = touch.clientY;

  // 开始屏或结束屏轻触直接开始
  if (gameState.state !== 'playing') {
    startGame();
  }
}, { passive: true });

// 即时连续滑动手势 (无需抬起手指即可连贯转弯)
document.addEventListener('touchmove', (e) => {
  if (!isTouching || gameState.state !== 'playing') return;
  if (e.target.closest('.dpad-btn')) return;

  const touch = e.touches[0];
  const dx = touch.clientX - touchStartX;
  const dy = touch.clientY - touchStartY;
  const distance = Math.hypot(dx, dy);

  if (distance >= SWIPE_THRESHOLD) {
    if (Math.abs(dx) > Math.abs(dy)) {
      snake.handleInput(dx > 0 ? 'ArrowRight' : 'ArrowLeft');
    } else {
      snake.handleInput(dy > 0 ? 'ArrowDown' : 'ArrowUp');
    }
    // 连续滑动手势锚点更新，支持不抬手无缝连续转向
    touchStartX = touch.clientX;
    touchStartY = touch.clientY;
  }
}, { passive: true });

document.addEventListener('touchend', () => {
  isTouching = false;
}, { passive: true });

// ── 虚拟十字键 (D-Pad) 触控响应 ──
const dpadButtons = document.querySelectorAll('.dpad-btn');
dpadButtons.forEach(btn => {
  const triggerDirection = (e) => {
    e.preventDefault();
    e.stopPropagation();
    sound.init();

    if (gameState.state !== 'playing') {
      startGame();
      return;
    }

    const dir = btn.getAttribute('data-dir');
    if (dir) {
      snake.handleInput(dir);
      btn.classList.add('active');
      setTimeout(() => btn.classList.remove('active'), 150);
    }
  };

  btn.addEventListener('touchstart', triggerDirection, { passive: false });
  btn.addEventListener('mousedown', triggerDirection);
});

// ── 开始游戏 ──
function startGame() {
  gameState.startGame();
  snake.reset();
  food.dispose();
  obstacles.clearAll();
  cameraFX.reset();

  const occupied = snake.getOccupiedPositions();
  food.spawn(occupied, []);

  lastSnakePos = snake.logicalPos.clone();
  specialFoodTimer = 0;
  specialFoodTimeout = 0;

  ui.hud.classList.remove('hidden');
  ui.startScreen.classList.add('hidden');
  ui.gameoverScreen.classList.add('hidden');
  ui.combo.classList.add('hidden');

  sound.startBGM();
  updateHUD();
}

// ── 蛇步进后碰撞检测 ──
function handleSnakeStep() {
  const headPos = snake.logicalPos;

  // 检测食物碰撞
  const ateNormal = snake.checkFoodCollision(food.getPosition());
  const ateSpecial = food.hasSpecial && snake.checkFoodCollision(food.specialPosition);

  if (ateNormal || ateSpecial) {
    const basePoints = ateSpecial ? 30 : 10;
    snake.grow();

    const scoreResult = gameState.addScore(basePoints, ateSpecial);

    // 粒子特效
    const pos = snake.head.position.clone();
    particles.spawnEatBurst(pos, ateSpecial ? 0xFFD700 : 0xFF6600);
    cameraFX.punch(52, 0.2);

    // 音效
    if (scoreResult.comboMultiplier > 1) {
      sound.playEatCombo(scoreResult.comboMultiplier);
      showCombo(scoreResult.comboMultiplier);
    } else {
      sound.playEat();
    }

    // 浮动得分
    const label = scoreResult.comboMultiplier > 1
      ? `+${scoreResult.finalAmount} x${scoreResult.comboMultiplier}`
      : `+${scoreResult.finalAmount}`;
    showFloatingScore(pos, label, ateSpecial ? '#FFD700' : '#FFFFFF');

    // 升级
    if (scoreResult.leveledUp) {
      sound.playLevelUp();
      snake.speedUp();
    }

    // 特殊食物效果
    if (ateSpecial) {
      food.consumeSpecial();
      snake.startInvincibility(5);
      sound.playInvincible();
    }

    // 普通食物重新生成
    if (ateNormal) {
      food.spawn(snake.getOccupiedPositions(), obstacles.getPositions());
    }

    // 障碍物生成
    if (gameState.shouldSpawnObstacle() && obstacles.count < 8) {
      const occ = snake.getOccupiedPositions();
      occ.push(food.getPosition());
      obstacles.spawn(occ);
    }

    updateHUD();
  }

  // 障碍物碰撞
  if (obstacles.count > 0 && snake.checkObstacleCollision(obstacles.getPositions())) {
    if (snake.isInvincible) {
      cameraFX.shake(0.15, 0.3);
    } else {
      handleDeath('撞到障碍物');
    }
  }
}

// ── 死亡处理 ──
function handleDeath(reason) {
  gameState.triggerGameOver(reason);
  sound.stopBGM();
  sound.playGameOver();
  particles.spawnDeathBurst(snake.head.position.clone());
  cameraFX.shake(0.4, 0.6);

  ui.gameoverReason.textContent = reason;
  ui.gameoverScore.textContent = gameState.score;
  ui.gameoverScreen.classList.remove('hidden');
}

// ── 特殊食物定时器 ──
let specialFoodTimer = 0;
let specialFoodTimeout = 0;

function updateSpecialFood(delta) {
  if (gameState.state !== 'playing') return;

  if (!food.hasSpecial) {
    specialFoodTimer += delta;
    if (specialFoodTimer >= 30) {
      specialFoodTimer = 0;
      if (Math.random() < 0.15) {
        const occ = snake.getOccupiedPositions();
        occ.push(food.getPosition());
        food.spawnSpecial(occ.concat(obstacles.getPositions()));
        specialFoodTimeout = 8;
      }
    }
  } else {
    specialFoodTimeout -= delta;
    if (specialFoodTimeout <= 3 && specialFoodTimeout > 0 && Math.floor(specialFoodTimeout) !== Math.floor(specialFoodTimeout + delta)) {
      sound.playWarningBeep();
    }
    if (specialFoodTimeout <= 0) {
      food.consumeSpecial();
    }
  }
}

// ── UI 工具函数 ──
function updateHUD() {
  ui.score.textContent = gameState.score;
  ui.highScore.textContent = gameState.highScore;
  ui.length.textContent = snake.length;
  ui.level.textContent = `Lv.${gameState.level}`;
}

function showCombo(multiplier) {
  ui.combo.textContent = `COMBO x${multiplier}!`;
  ui.combo.classList.remove('hidden');
  ui.combo.classList.add('punch');
  setTimeout(() => ui.combo.classList.remove('punch'), 150);
}

let lastComboMult = 0;
function updateComboUI() {
  if (gameState.comboMultiplier > 1 && gameState.comboMultiplier !== lastComboMult) {
    showCombo(gameState.comboMultiplier);
    lastComboMult = gameState.comboMultiplier;
  } else if (gameState.comboMultiplier <= 1 && lastComboMult > 1) {
    ui.combo.classList.add('hidden');
    lastComboMult = 0;
  }
}

function showFloatingScore(worldPos, text, color) {
  const projected = worldPos.clone().project(camera);
  const x = (projected.x * 0.5 + 0.5) * window.innerWidth;
  const y = (-projected.y * 0.5 + 0.5) * window.innerHeight;

  const el = document.createElement('div');
  el.className = 'floating-score';
  el.textContent = text;
  el.style.left = `${x}px`;
  el.style.top = `${y}px`;
  el.style.color = color;
  ui.floatingScores.appendChild(el);
  setTimeout(() => el.remove(), 800);
}

// ── 游戏循环 ──
function gameLoop() {
  requestAnimationFrame(gameLoop);

  let delta = sceneSetup.clock.getDelta();
  delta = Math.min(delta, 0.1);

  const adjustedDelta = cameraFX.update(delta);

  if (gameState.state === 'playing') {
    const stepResult = snake.update(adjustedDelta);

    // 检测是否发生了 step（蛇逻辑位置变了）
    if (!lastSnakePos.equals(snake.logicalPos)) {
      // step 发生了
      if (stepResult && stepResult.died) {
        // step() 内部已检测到撞墙/自碰
        handleDeath(stepResult.dieReason === 'Hit wall' ? '撞到墙壁' : '咬到自己');
      } else {
        handleSnakeStep();
      }
      lastSnakePos.copy(snake.logicalPos);
    }

    gameState.update(adjustedDelta);
    updateSpecialFood(adjustedDelta);
    updateComboUI();

    // 动态 FOV
    const speed = snake.getNormalizedSpeed();
    cameraFX.setDynamicFOV(56 + speed * 8, 2);
  }

  food.update(delta);
  obstacles.update(delta);
  particles.update(delta);
  updateCamera(delta);

  sceneSetup.render();
}

// ── 启动 ──
gameLoop();
console.log('[3D Snake] 初始化完毕 — 按空格开始');
