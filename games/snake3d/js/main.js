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
  startBtn:      document.getElementById('start-btn'),
  restartBtn:    document.getElementById('restart-btn'),
  floatingScores:document.getElementById('floating-scores'),
  touchControls: document.getElementById('touch-controls'),
  virtualStick:  document.getElementById('virtual-stick'),
  stickKnob:     document.getElementById('stick-knob'),
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
window._snake   = snake;
const food      = new Food(scene, modelLoader);
const obstacles = new ObstacleManager(scene, modelLoader);
const gameState = new GameState();
const sound     = new SoundManager();
const particles = new ParticleSystem(scene);
const cameraFX  = new CameraFX(camera);

// ── 跟踪蛇上次逻辑位置用于检测 step 发生 ──
let lastSnakePos = null;

// ── 开阔全景平稳视角 ──
function updateCamera(delta) {
  if (!snake.head) return;
  const headPos = snake.head.position;

  // 开阔稳定全景基准：高度 28.5，纵深 19.5
  // 对蛇头仅做极微量有机呼吸微动（0.12 系数），彻底消除剧烈晃动与抖动
  const targetX = headPos.x * 0.12;
  const targetY = 28.5;
  const targetZ = 19.5 + headPos.z * 0.08;

  const smooth = 1 - Math.pow(0.02, delta);
  camera.position.x += (targetX - camera.position.x) * smooth;
  camera.position.y += (targetY - camera.position.y) * smooth;
  camera.position.z += (targetZ - camera.position.z) * smooth;

  const lookX = headPos.x * 0.08;
  const lookZ = headPos.z * 0.08;
  camera.lookAt(lookX, 0, lookZ);
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

// ── 弹窗按钮事件 ──
const onActionBtnClick = (e) => {
  e.preventDefault();
  e.stopPropagation();
  sound.init();
  startGame();
};
if (ui.startBtn) {
  ui.startBtn.addEventListener('click', onActionBtnClick);
  ui.startBtn.addEventListener('touchend', onActionBtnClick);
}
if (ui.restartBtn) {
  ui.restartBtn.addEventListener('click', onActionBtnClick);
  ui.restartBtn.addEventListener('touchend', onActionBtnClick);
}

// ── 移动端检测与文案自适应 ──
const isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0) || (window.innerWidth <= 1024);
if (isTouchDevice) {
  if (ui.startBtn) ui.startBtn.innerHTML = '<img src="assets/icons/icon_rocket.png" alt="Start" class="ui-icon-btn"> 开始游戏 (轻触)';
  if (ui.restartBtn) ui.restartBtn.innerHTML = '<img src="assets/icons/icon_refresh.png" alt="Restart" class="ui-icon-btn"> 重新开始 (轻触)';
}

// ── 360° 弹性虚拟摇杆操控 ──
let stickActive = false;
let stickCenterX = 0;
let stickCenterY = 0;
const STICK_MAX_RADIUS = 38; // 最大视觉拨动半径 (px)
const STICK_DEAD_ZONE = 10;  // 死区阈值 (px)

function updateStickKnob(dx, dy) {
  if (!ui.stickKnob) return;
  ui.stickKnob.style.transform = `translate(calc(-50% + ${dx.toFixed(1)}px), calc(-50% + ${dy.toFixed(1)}px))`;
}

function resetStick() {
  stickActive = false;
  if (ui.stickKnob) {
    ui.stickKnob.style.transform = 'translate(-50%, -50%)';
  }
}

function handleStickVector(dx, dy) {
  const distance = Math.hypot(dx, dy);
  if (distance < STICK_DEAD_ZONE) return;

  // 限制摇杆钮视觉位移
  const clampedDist = Math.min(distance, STICK_MAX_RADIUS);
  const angle = Math.atan2(dy, dx);
  const knobX = Math.cos(angle) * clampedDist;
  const knobY = Math.sin(angle) * clampedDist;
  updateStickKnob(knobX, knobY);

  // 360° 映射至 4 扇区：
  // 右: [-PI/4, PI/4]
  // 下: [PI/4, 3PI/4]
  // 上: [-3PI/4, -PI/4]
  // 左: > 3PI/4 或 < -3PI/4
  let dir = null;
  if (angle >= -Math.PI / 4 && angle <= Math.PI / 4) {
    dir = 'ArrowRight';
  } else if (angle > Math.PI / 4 && angle < 3 * Math.PI / 4) {
    dir = 'ArrowDown';
  } else if (angle >= -3 * Math.PI / 4 && angle <= -Math.PI / 4) {
    dir = 'ArrowUp';
  } else {
    dir = 'ArrowLeft';
  }

  if (dir && gameState.state === 'playing') {
    snake.handleInput(dir);
  }
}

if (ui.virtualStick) {
  const onStickStart = (e) => {
    e.preventDefault();
    e.stopPropagation();
    sound.init();

    if (gameState.state !== 'playing') {
      startGame();
      return;
    }

    stickActive = true;
    const rect = ui.virtualStick.getBoundingClientRect();
    stickCenterX = rect.left + rect.width / 2;
    stickCenterY = rect.top + rect.height / 2;

    const touch = e.touches ? e.touches[0] : e;
    handleStickVector(touch.clientX - stickCenterX, touch.clientY - stickCenterY);
  };

  const onStickMove = (e) => {
    if (!stickActive) return;
    e.preventDefault();
    e.stopPropagation();

    const touch = e.touches ? e.touches[0] : e;
    handleStickVector(touch.clientX - stickCenterX, touch.clientY - stickCenterY);
  };

  const onStickEnd = (e) => {
    if (!stickActive) return;
    e.preventDefault();
    e.stopPropagation();
    resetStick();
  };

  ui.virtualStick.addEventListener('touchstart', onStickStart, { passive: false });
  ui.virtualStick.addEventListener('touchmove', onStickMove, { passive: false });
  ui.virtualStick.addEventListener('touchend', onStickEnd, { passive: false });
  ui.virtualStick.addEventListener('touchcancel', onStickEnd, { passive: false });

  // 鼠标拖拽支持（便于桌面调试）
  ui.virtualStick.addEventListener('mousedown', onStickStart);
  window.addEventListener('mousemove', (e) => {
    if (stickActive) onStickMove(e);
  });
  window.addEventListener('mouseup', () => {
    if (stickActive) resetStick();
  });
}

// ── 全局滑动手势 (辅助备用) ──
let touchStartX = 0, touchStartY = 0;
let isScreenSwiping = false;
const SWIPE_THRESHOLD = 24;

document.addEventListener('touchstart', (e) => {
  sound.init();
  if (e.target.closest('#virtual-stick') || e.target.closest('.back-home-btn')) return;

  isScreenSwiping = true;
  const touch = e.touches[0];
  touchStartX = touch.clientX;
  touchStartY = touch.clientY;

  // 开始屏或结束屏轻触直接开始
  if (gameState.state !== 'playing') {
    startGame();
  }
}, { passive: true });

document.addEventListener('touchmove', (e) => {
  if (!isScreenSwiping || gameState.state !== 'playing') return;
  if (e.target.closest('#virtual-stick') || e.target.closest('.back-home-btn')) return;

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
    touchStartX = touch.clientX;
    touchStartY = touch.clientY;
  }
}, { passive: true });

document.addEventListener('touchend', () => {
  isScreenSwiping = false;
}, { passive: true });

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
  if (ui.touchControls && (isTouchDevice || window.innerWidth <= 1024)) {
    ui.touchControls.classList.remove('hidden');
  }

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
    snake.grow(null, ateSpecial);

    const scoreResult = gameState.addScore(basePoints, ateSpecial);

    // 粒子特效
    const pos = snake.head.position.clone();
    particles.spawnEatBurst(pos, ateSpecial ? 0xFFD700 : 0xFF6600);

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
      const removed = obstacles.removeAt(snake.logicalPos, 1.2);
      if (removed) {
        sound.playRockShatter();
        particles.spawnRockShatter(removed.pos || snake.head.position);
        cameraFX.shake(0.25, 0.35);
        gameState.addScore(50, true);
        showFloatingScore(snake.head.position, `+50 撞碎障碍!`, '#FFD700');
        updateHUD();
      }
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
  if (ui.touchControls) {
    ui.touchControls.classList.add('hidden');
  }
  resetStick();
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
  ui.combo.textContent = `连击 x${multiplier}!`;
  ui.combo.classList.remove('hidden');
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
