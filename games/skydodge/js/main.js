// ═══════════════════════════════════════════
// 星空冲锋 (Sky Dodge 3D) — 主循环与控制中枢
// ═══════════════════════════════════════════
import * as THREE from 'three';
import { SceneSetup } from './scene/SceneSetup.js';
import { SpaceEnvironment } from './scene/SpaceEnvironment.js';
import { GameState } from './game/GameState.js';
import { ModelLoader } from './game/ModelLoader.js';
import { PlayerShip } from './game/PlayerShip.js';
import { ObstacleManager } from './game/ObstacleManager.js';
import { CollectibleManager } from './game/CollectibleManager.js';
import { WeaponSystem } from './game/WeaponSystem.js';
import { ParticleFX } from './effects/ParticleFX.js';
import { CameraFlightFX } from './effects/CameraFlightFX.js';
import { FlightAudio } from './audio/FlightAudio.js';

// ── DOM UI 元素引用 ──
const ui = {
  hud: document.getElementById('hud'),
  distance: document.getElementById('hud-distance'),
  speed: document.getElementById('hud-speed'),
  level: document.getElementById('hud-level'),
  score: document.getElementById('hud-score'),
  highScore: document.getElementById('hud-highscore'),
  shield: document.getElementById('hud-shield'),
  comboBanner: document.getElementById('combo-banner'),
  comboText: document.getElementById('combo-text'),
  comboSub: document.getElementById('combo-sub'),
  boostContainer: document.getElementById('boost-meter-container'),
  boostFill: document.getElementById('boost-fill'),
  startScreen: document.getElementById('start-screen'),
  startBtn: document.getElementById('start-btn'),
  gameoverScreen: document.getElementById('gameover-screen'),
  restartBtn: document.getElementById('restart-btn'),
  finalScore: document.getElementById('final-score'),
  finalHighScore: document.getElementById('final-highscore'),
  finalDistance: document.getElementById('final-distance'),
  finalMaxCombo: document.getElementById('final-maxcombo'),
  touchControls: document.getElementById('touch-controls'),
  virtualStick: document.getElementById('virtual-stick'),
  stickKnob: document.getElementById('stick-knob'),
  touchFireBtn: document.getElementById('touch-fire-btn'),
  touchBoostBtn: document.getElementById('touch-boost-btn'),
};

// ── 初始化游戏子系统 ──
const container = document.getElementById('game-container');
const sceneSetup = new SceneSetup(container);
const { scene, camera, renderer } = sceneSetup;

const gameState = new GameState();
const audio = new FlightAudio();
const spaceEnv = new SpaceEnvironment(scene);
const modelLoader = new ModelLoader();
const particles = new ParticleFX(scene);
const cameraFX = new CameraFlightFX(camera);

const playerShip = new PlayerShip(scene, modelLoader);
const obstacleManager = new ObstacleManager(scene, modelLoader);
const collectibleManager = new CollectibleManager(scene, modelLoader);
const weaponSystem = new WeaponSystem(scene);

// 异步加载模型并在就绪后无缝热挂载
modelLoader.loadAll().then(() => {
  console.log('[Sky Dodge 3D] 模型资源加载完毕，装配战机外观');
  playerShip.loadShipModel();
});

// ── 输入控制状态 ──
const keys = {
  up: false,
  down: false,
  left: false,
  right: false,
  boost: false,
  fire: false,
};

let isMouseDown = false;
let mouseStartX = 0, mouseStartY = 0;
let mouseMoveX = 0, mouseMoveY = 0;

let stickTouchId = null;
let stickCenter = { x: 0, y: 0 };
let touchMoveX = 0, touchMoveY = 0;

// ── 连击浮现定时器 ──
let comboHideTimeout = null;

// ── 启动游戏 ──
function startGame() {
  audio.init();
  gameState.reset();
  playerShip.reset();
  obstacleManager.reset();
  collectibleManager.reset();
  weaponSystem.reset();
  particles.reset();
  cameraFX.reset();

  ui.startScreen.classList.add('hidden');
  ui.gameoverScreen.classList.add('hidden');
  ui.hud.classList.remove('hidden');
  ui.boostContainer.classList.remove('hidden');

  if (isTouchDevice()) {
    ui.touchControls.classList.remove('hidden');
  }
}

// ── 战机坠毁结束 ──
function triggerGameOver() {
  gameState.setGameOver();
  audio.playExplosion();
  cameraFX.triggerShake(1.2, 0.7);
  particles.createExplosion(playerShip.getPosition());

  // 延迟微量展示坠毁特效后唤出结算弹窗
  setTimeout(() => {
    ui.finalScore.textContent = gameState.score.toLocaleString();
    ui.finalHighScore.textContent = gameState.highScore.toLocaleString();
    ui.finalDistance.textContent = `${Math.floor(gameState.distance)}m`;
    ui.finalMaxCombo.textContent = `x${gameState.maxCombo}`;

    ui.gameoverScreen.classList.remove('hidden');
    ui.hud.classList.add('hidden');
    ui.boostContainer.classList.add('hidden');
    ui.touchControls.classList.add('hidden');
  }, 400);
}

// ── 更新 HUD 显示 ──
function updateHUD() {
  ui.distance.innerHTML = `${Math.floor(gameState.distance)} <small>m</small>`;
  ui.speed.innerHTML = `${Math.floor(gameState.currentSpeed * 3.6)} <small>km/h</small>`;
  ui.level.textContent = `Lv.${gameState.level}`;
  ui.score.textContent = gameState.score.toLocaleString();
  ui.highScore.textContent = gameState.highScore.toLocaleString();

  // 护盾状态
  if (gameState.hasShield) {
    ui.shield.textContent = 'ACTIVE';
    ui.shield.className = 'hud-badge shield-active';
  } else {
    ui.shield.textContent = 'OFFLINE';
    ui.shield.className = 'hud-badge shield-offline';
  }

  // 冲刺能量条
  ui.boostFill.style.width = `${gameState.boostEnergy}%`;
  if (gameState.isBoosting) {
    ui.boostFill.style.background = 'linear-gradient(90deg, #ff9900 0%, #ff5500 100%)';
  } else {
    ui.boostFill.style.background = 'linear-gradient(90deg, #00f2fe 0%, #4facfe 50%, #00ff87 100%)';
  }
}

// ── 连击效果提示 ──
function showComboUI(combo, addedPoints) {
  if (combo < 2) return;
  ui.comboText.textContent = `COMBO x${combo}!`;
  ui.comboSub.textContent = `+${addedPoints} PTS`;
  ui.comboBanner.classList.remove('hidden');

  if (comboHideTimeout) clearTimeout(comboHideTimeout);
  comboHideTimeout = setTimeout(() => {
    ui.comboBanner.classList.add('hidden');
  }, 1600);
}

// ── 键盘事件绑定 ──
window.addEventListener('keydown', (e) => {
  audio.init();

  if (gameState.state === 'start' && (e.code === 'Space' || e.code === 'Enter')) {
    e.preventDefault();
    startGame();
    return;
  }

  if (gameState.state === 'gameover' && (e.code === 'KeyR' || e.code === 'Space')) {
    e.preventDefault();
    startGame();
    return;
  }

  if (gameState.state === 'playing') {
    switch (e.code) {
      case 'KeyW':
      case 'ArrowUp':
        keys.up = true;
        break;
      case 'KeyS':
      case 'ArrowDown':
        keys.down = true;
        break;
      case 'KeyA':
      case 'ArrowLeft':
        keys.left = true;
        break;
      case 'KeyD':
      case 'ArrowRight':
        keys.right = true;
        break;
      case 'ShiftLeft':
      case 'ShiftRight':
        keys.boost = true;
        break;
      case 'Space':
      case 'KeyJ':
      case 'KeyK':
        keys.fire = true;
        break;
    }
  }
});

window.addEventListener('keyup', (e) => {
  switch (e.code) {
    case 'KeyW':
    case 'ArrowUp':
      keys.up = false;
      break;
    case 'KeyS':
    case 'ArrowDown':
      keys.down = false;
      break;
    case 'KeyA':
    case 'ArrowLeft':
      keys.left = false;
      break;
    case 'KeyD':
    case 'ArrowRight':
      keys.right = false;
      break;
    case 'ShiftLeft':
    case 'ShiftRight':
      keys.boost = false;
      break;
    case 'Space':
    case 'KeyJ':
    case 'KeyK':
      keys.fire = false;
      break;
  }
});

// ── 鼠标拖拽控制 ──
window.addEventListener('mousedown', (e) => {
  if (e.target.closest('.action-btn') || e.target.closest('.back-home-btn')) return;
  audio.init();

  if (gameState.state === 'start') {
    startGame();
    return;
  }

  isMouseDown = true;
  mouseStartX = e.clientX;
  mouseStartY = e.clientY;
});

window.addEventListener('mousemove', (e) => {
  if (!isMouseDown || gameState.state !== 'playing') return;
  const dx = e.clientX - mouseStartX;
  const dy = e.clientY - mouseStartY;
  mouseMoveX = THREE.MathUtils.clamp(dx / 90, -1, 1);
  mouseMoveY = THREE.MathUtils.clamp(-dy / 70, -1, 1);
});

window.addEventListener('mouseup', () => {
  isMouseDown = false;
  mouseMoveX = 0;
  mouseMoveY = 0;
});

// ── 移动端触控摇杆与按键 ──
function isTouchDevice() {
  return ('ontouchstart' in window) || (navigator.maxTouchPoints > 0) || (window.innerWidth < 768);
}

if (ui.virtualStick) {
  ui.virtualStick.addEventListener('touchstart', (e) => {
    e.preventDefault();
    audio.init();
    const touch = e.changedTouches[0];
    stickTouchId = touch.identifier;
    const rect = ui.virtualStick.getBoundingClientRect();
    stickCenter = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    handleStickMove(touch.clientX, touch.clientY);
  }, { passive: false });

  ui.virtualStick.addEventListener('touchmove', (e) => {
    e.preventDefault();
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier === stickTouchId) {
        handleStickMove(touch.clientX, touch.clientY);
        break;
      }
    }
  }, { passive: false });

  const resetStick = (e) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === stickTouchId) {
        stickTouchId = null;
        touchMoveX = 0;
        touchMoveY = 0;
        ui.stickKnob.style.transform = `translate(-50%, -50%)`;
        break;
      }
    }
  };

  ui.virtualStick.addEventListener('touchend', resetStick);
  ui.virtualStick.addEventListener('touchcancel', resetStick);
}

function handleStickMove(clientX, clientY) {
  const maxRadius = 38;
  const dx = clientX - stickCenter.x;
  const dy = clientY - stickCenter.y;
  const dist = Math.hypot(dx, dy);
  const clampedDist = Math.min(dist, maxRadius);
  const angle = Math.atan2(dy, dx);

  const knobX = Math.cos(angle) * clampedDist;
  const knobY = Math.sin(angle) * clampedDist;

  ui.stickKnob.style.transform = `translate(calc(-50% + ${knobX}px), calc(-50% + ${knobY}px))`;

  touchMoveX = knobX / maxRadius;
  touchMoveY = -knobY / maxRadius;
}

if (ui.touchFireBtn) {
  ui.touchFireBtn.addEventListener('touchstart', (e) => {
    e.preventDefault();
    audio.init();
    keys.fire = true;
  }, { passive: false });
  ui.touchFireBtn.addEventListener('touchend', (e) => {
    e.preventDefault();
    keys.fire = false;
  });
}

if (ui.touchBoostBtn) {
  ui.touchBoostBtn.addEventListener('touchstart', (e) => {
    e.preventDefault();
    keys.boost = true;
  }, { passive: false });
  ui.touchBoostBtn.addEventListener('touchend', (e) => {
    e.preventDefault();
    keys.boost = false;
  });
}

// 界面按钮绑定
ui.startBtn.addEventListener('click', startGame);
ui.restartBtn.addEventListener('click', startGame);

// ── 主游戏循环 ──
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);

  const delta = Math.min(clock.getDelta(), 0.1);

  if (gameState.state === 'playing') {
    // 1. 合成综合输入意图
    let moveX = 0, moveY = 0;
    if (keys.left) moveX -= 1;
    if (keys.right) moveX += 1;
    if (keys.down) moveY -= 1;
    if (keys.up) moveY += 1;

    // 叠加鼠标/触控意图
    if (isMouseDown) {
      moveX += mouseMoveX;
      moveY += mouseMoveY;
    }
    if (stickTouchId !== null) {
      moveX += touchMoveX;
      moveY += touchMoveY;
    }

    moveX = THREE.MathUtils.clamp(moveX, -1, 1);
    moveY = THREE.MathUtils.clamp(moveY, -1, 1);

    playerShip.setInput(moveX, moveY);
    gameState.setBoosting(keys.boost);

    // 2. 状态机推进
    gameState.update(delta);

    // 3. 实体与环境逻辑演进
    playerShip.update(delta, gameState.isBoosting, gameState.hasShield);
    const shipPos = playerShip.getPosition();

    // 激光主炮发射与弹道演进
    if (keys.fire) {
      weaponSystem.tryFire(shipPos, playerShip.currentRoll, audio);
    }
    weaponSystem.update(delta, obstacleManager, particles, audio, (destroyedObstacle, hitPos, pts) => {
      const result = gameState.addScore(pts || 200, 'BLASTER');
      const combo = gameState.increaseCombo();
      cameraFX.triggerShake(0.35, 0.2);
      showComboUI(combo, result.earned);
    });

    obstacleManager.update(delta, shipPos.z, gameState.currentSpeed, gameState.level);
    collectibleManager.update(delta, shipPos, gameState.isBoosting, gameState.currentSpeed);

    // 4. 碰撞判定 (战机 vs 障碍)
    const collisionResult = obstacleManager.checkCollision(playerShip.collider);
    if (collisionResult.hit) {
      if (gameState.hasShield) {
        // 护盾抵消伤害
        gameState.breakShield();
        audio.playShieldBreak();
        cameraFX.triggerShake(0.6, 0.35);
        particles.createExplosion(collisionResult.obstacle.mesh.position);
        scene.remove(collisionResult.obstacle.mesh);
      } else {
        // 战机摧毁
        triggerGameOver();
      }
    }

    // 5. 拾取判定 (战机 vs 晶石与道具)
    const collected = collectibleManager.checkPickup(playerShip.collider);
    for (const item of collected) {
      if (item.type === 'energy_core') {
        const result = gameState.addScore(item.points, 'ENERGY');
        const combo = gameState.increaseCombo();
        audio.playEnergyPickup();
        particles.createPickupBurst(item.mesh.position, 0x00f2fe);
        showComboUI(combo, result.earned);
      } else if (item.type === 'shield_orb') {
        gameState.activateShield();
        gameState.addScore(item.points, 'SHIELD');
        audio.playShieldPickup();
        particles.createPickupBurst(item.mesh.position, 0xffde59);
      }
    }

    // 6. 尾焰与环境动态
    particles.emitThruster(shipPos, gameState.isBoosting);
    spaceEnv.update(delta, gameState.currentSpeed, shipPos.z);
    cameraFX.update(delta, shipPos, gameState.isBoosting);

    // 7. 更新 HUD
    updateHUD();
  } else {
    // 非游玩状态 (开始/结算) 下保持星空漫游
    spaceEnv.update(delta, 12, 0);
  }

  particles.update(delta);
  audio.updateEngine(gameState.currentSpeed, gameState.isBoosting, gameState.state === 'playing');

  sceneSetup.render();
}

animate();
