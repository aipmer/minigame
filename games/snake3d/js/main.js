// ═══════════════════════════════════════════
// 3D 贪吃蛇 — 主入口
// ═══════════════════════════════════════════
import * as THREE from 'three';
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
import { PowerUpManager } from './game/PowerUpManager.js';
import { WeatherSystem } from './scene/WeatherSystem.js';
import { CustomRulesManager } from './game/CustomRulesManager.js';
import { RadarMinimap } from './game/RadarMinimap.js';
import { SocialManager } from '/js/services/SocialManager.js';
import { SocialUI } from '/js/services/SocialUI.js';
import { EconomyManager } from '/js/services/EconomyManager.js';
import { SkinManager } from '/js/services/SkinManager.js';
import { AchievementManager } from '/js/services/AchievementManager.js';
import { ShopModalUI } from '/js/services/ShopModalUI.js';

// ── UI 元素 ──
const ui = {
  cameraToggleBtn: document.getElementById('btn-camera-toggle'),
  cameraToggleText: document.getElementById('camera-toggle-text'),
  hud:           document.getElementById('hud'),
  score:         document.getElementById('hud-score'),
  highScore:     document.getElementById('hud-highscore'),
  length:        document.getElementById('hud-length'),
  level:         document.getElementById('hud-level'),
  combo:         document.getElementById('combo'),
  powerupHud:    document.getElementById('powerup-hud'),
  powerupIcon:   document.getElementById('powerup-icon'),
  powerupName:   document.getElementById('powerup-name'),
  powerupTimer:  document.getElementById('powerup-timer'),
  weatherHud:    document.getElementById('weather-hud'),
  weatherIcon:   document.getElementById('weather-icon'),
  weatherName:   document.getElementById('weather-name'),
  weatherBanner: document.getElementById('weather-banner'),
  weatherBannerIcon: document.getElementById('weather-banner-icon'),
  weatherBannerText: document.getElementById('weather-banner-text'),
  modeBtnClassic:document.getElementById('mode-btn-classic'),
  modeBtnCrazy:  document.getElementById('mode-btn-crazy'),
  modeBtnCustom: document.getElementById('mode-btn-custom'),
  modeDesc:      document.getElementById('mode-desc'),
  customRuleSummaryRow: document.getElementById('custom-rule-summary-row'),
  customRuleSummaryText: document.getElementById('custom-rule-summary-text'),
  btnOpenCustomRules: document.getElementById('btn-open-custom-rules'),
  hudCustomPill: document.getElementById('hud-custom-pill'),
  hudCustomRuleText: document.getElementById('hud-custom-rule-text'),
  customRulesModal: document.getElementById('custom-rules-modal'),
  btnCloseCustomRules: document.getElementById('btn-close-custom-rules'),
  startScreen:   document.getElementById('start-screen'),
  gameoverScreen:document.getElementById('gameover-screen'),
  gameoverReason:document.getElementById('gameover-reason'),
  gameoverScore: document.getElementById('gameover-score'),
  gameoverPercentile: document.getElementById('gameover-percentile'),
  gameoverCoinGain: document.getElementById('gameover-coin-gain'),
  gameoverCoinTotal: document.getElementById('gameover-coin-total'),
  startBtn:      document.getElementById('start-btn'),
  restartBtn:    document.getElementById('restart-btn'),
  topLeaderboardBtn: document.getElementById('btn-top-leaderboard'),
  startLeaderboardBtn: document.getElementById('btn-start-leaderboard'),
  gameoverLeaderboardBtn: document.getElementById('btn-gameover-leaderboard'),
  topShopBtn:    document.getElementById('btn-top-shop'),
  startShopBtn:  document.getElementById('btn-start-shop'),
  gameoverShopBtn: document.getElementById('btn-gameover-shop'),
  topAchievementsBtn: document.getElementById('btn-top-achievements'),
  startAchievementsBtn: document.getElementById('btn-start-achievements'),
  gameoverAchievementsBtn: document.getElementById('btn-gameover-achievements'),
  gameoverPosterBtn: document.getElementById('btn-gameover-poster'),
  gameoverChallengeBtn: document.getElementById('btn-gameover-challenge'),
  floatingScores:document.getElementById('floating-scores'),
  touchControls: document.getElementById('touch-controls'),
  virtualStick:  document.getElementById('virtual-stick'),
  stickKnob:     document.getElementById('stick-knob'),
  touchBoostBtn: document.getElementById('touch-boost-btn'),
  rotateHint:    document.getElementById('rotate-hint'),
};

// ── 社交中枢与排行榜组件 ──
const socialManager = new SocialManager();
const socialUI = new SocialUI({
  game: 'snake3d',
  gameTitle: '3D 贪吃蛇',
  theme: 'clay',
  socialManager,
  iconBasePath: 'assets/icons/'
});

// ── 代币经济、皮肤装扮与荣誉成就中枢 ──
const economyManager = new EconomyManager();
const skinManager = new SkinManager();
const achievementManager = new AchievementManager(economyManager, skinManager);
skinManager.achievementManager = achievementManager;
window._economy = economyManager;
window._achievements = achievementManager;
window._skin = skinManager;

// 每日登录奖励检查
const dailyBonus = economyManager.checkDailyBonus();
if (dailyBonus > 0) {
  console.log(`[MiniGame] 每日登录奖励已发放: +${dailyBonus} 金币`);
}

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

window._sceneSetup = sceneSetup;
const ground    = new Ground(scene);
window._ground  = ground;
const snake     = new Snake(scene, modelLoader);
window._snake   = snake;
const food      = new Food(scene, modelLoader);
window._food    = food;
const obstacles = new ObstacleManager(scene, modelLoader);
const gameState = new GameState();
window._gameState = gameState;
const sound     = new SoundManager();
const particles = new ParticleSystem(scene);
const cameraFX  = new CameraFX(camera);
const powerUpManager = new PowerUpManager(scene, sound, particles, cameraFX);
window._powerUpManager = powerUpManager;
const radarMinimap = new RadarMinimap(container, { gridSize: 32 });
window._radarMinimap = radarMinimap;

// ── 3D 装扮商城与荣誉成就弹窗 ──
const shopUI = new ShopModalUI({
  economyManager,
  skinManager,
  achievementManager,
  soundManager: sound,
  iconBasePath: 'assets/icons/'
});
window._shopUI = shopUI;

// ── 悬空地台动态天气系统 ──
const weatherSystem = new WeatherSystem({
  scene,
  sceneSetup,
  soundManager: sound,
  ground,
  obstacleManager: obstacles,
  food,
  achievementManager,
  iconBasePath: 'assets/icons/'
});
window._weatherSystem = weatherSystem;

// ── 3D 玩法工坊自定义规则中枢 ──
const customRulesManager = new CustomRulesManager();
window._customRulesManager = customRulesManager;

let weatherBannerTimer = null;
weatherSystem.onWeatherChange((weather, meta) => {
  if (ui.weatherIcon) ui.weatherIcon.src = meta.icon;
  if (ui.weatherName) ui.weatherName.textContent = meta.name;

  if (ui.weatherBanner && ui.weatherBannerIcon && ui.weatherBannerText) {
    ui.weatherBannerIcon.src = meta.icon;
    ui.weatherBannerText.textContent = `天气变幻：${meta.name}！`;
    ui.weatherBanner.classList.remove('hidden');
    ui.weatherBanner.style.opacity = '1';

    if (weatherBannerTimer) clearTimeout(weatherBannerTimer);
    weatherBannerTimer = setTimeout(() => {
      ui.weatherBanner.style.opacity = '0';
      setTimeout(() => {
        ui.weatherBanner.classList.add('hidden');
      }, 400);
    }, 3200);
  }
});

let currentTrailDef = skinManager.getActiveTrailDef();
let trailTimer = 0;

// 实时响应装扮皮肤与流光拖尾材质应用
skinManager.subscribe((skinDef, trailDef) => {
  snake.applySkin(skinDef);
  currentTrailDef = trailDef;
});

// ── 跟踪蛇上次逻辑位置用于检测 step 发生 ──
let lastSnakePos = null;

// ── 镜头跟随与视角控制中枢（支持沉浸跟随与全局鸟瞰） ──
let currentLookAtTarget = new THREE.Vector3(0, 0, 4.8);

function updateCamera(delta) {
  if (!snake.head) return;
  const headPos = snake.head.position;
  const aspect = window.innerWidth / window.innerHeight;

  if (gameState.state === 'playing' && sceneSetup.cameraMode === 'follow') {
    // 沉浸平滑跟随模式（Slither 风格）：
    const base = sceneSetup.getFollowCameraBase(aspect, snake.length, snake.isBoosting);

    // 前瞻预判 Look-ahead 偏移
    const dir = snake.direction || new THREE.Vector3(0, 0, 1);
    const leadDist = base.lookAheadZ || 2.0;
    const lookAheadX = dir.x * leadDist;
    const lookAheadZ = dir.z * leadDist;

    // 目标机位：平移锁定在蛇头上方与后方，倾角维持 45°~52°
    const targetX = headPos.x + lookAheadX * 0.35;
    const targetY = base.y;
    const targetZ = headPos.z + base.z + lookAheadZ * 0.35;

    // 目标注视点
    const targetLookX = headPos.x + lookAheadX * 0.8;
    const targetLookY = 0.5;
    const targetLookZ = headPos.z + lookAheadZ * 0.8;

    // 高响应临界阻尼平滑插值（杜绝急转眩晕与卡顿）
    const smooth = 1 - Math.pow(0.003, delta);
    camera.position.x += (targetX - camera.position.x) * smooth;
    camera.position.y += (targetY - camera.position.y) * smooth;
    camera.position.z += (targetZ - camera.position.z) * smooth;

    currentLookAtTarget.x += (targetLookX - currentLookAtTarget.x) * smooth;
    currentLookAtTarget.y += (targetLookY - currentLookAtTarget.y) * smooth;
    currentLookAtTarget.z += (targetLookZ - currentLookAtTarget.z) * smooth;
    camera.lookAt(currentLookAtTarget.x, currentLookAtTarget.y, currentLookAtTarget.z);
  } else {
    // 全局鸟瞰模式或未开始/结算界面：平滑过渡至全岛开阔机位
    const base = sceneSetup.getAdaptiveCameraBase(aspect);
    const isPlaying = gameState.state === 'playing';
    const targetX = isPlaying ? headPos.x * 0.12 : 0;
    const targetY = base.y;
    const targetZ = base.z + (isPlaying ? headPos.z * 0.08 : 0);

    const targetLookX = isPlaying ? headPos.x * 0.08 : 0;
    const targetLookY = 0;
    const targetLookZ = base.lookZ + (isPlaying ? headPos.z * 0.08 : 0);

    const smooth = 1 - Math.pow(0.015, delta);
    camera.position.x += (targetX - camera.position.x) * smooth;
    camera.position.y += (targetY - camera.position.y) * smooth;
    camera.position.z += (targetZ - camera.position.z) * smooth;

    currentLookAtTarget.x += (targetLookX - currentLookAtTarget.x) * smooth;
    currentLookAtTarget.y += (targetLookY - currentLookAtTarget.y) * smooth;
    currentLookAtTarget.z += (targetLookZ - currentLookAtTarget.z) * smooth;
    camera.lookAt(currentLookAtTarget.x, currentLookAtTarget.y, currentLookAtTarget.z);
  }
}

function updateCameraToggleUI() {
  if (!ui.cameraToggleBtn || !ui.cameraToggleText) return;
  const isFollow = sceneSetup.cameraMode === 'follow';
  ui.cameraToggleText.textContent = isFollow ? '跟随' : '鸟瞰';
  ui.cameraToggleBtn.classList.toggle('active-overview', !isFollow);
  ui.cameraToggleBtn.title = isFollow ? '当前为沉浸跟随视角（点击切换鸟瞰）' : '当前为全局鸟瞰视角（点击切换跟随）';
}

if (ui.cameraToggleBtn) {
  ui.cameraToggleBtn.addEventListener('click', () => {
    sound.playTurn();
    sceneSetup.toggleCameraMode();
    updateCameraToggleUI();
  });
}

// ── 输入处理 ──
document.addEventListener('keydown', (e) => {
  const key = e.key;
  sound.init();

  if (key === 'v' || key === 'V') {
    sound.playTurn();
    sceneSetup.toggleCameraMode();
    updateCameraToggleUI();
    return;
  }

  if (gameState.state === 'start') {
    if (key === ' ') { e.preventDefault(); startGame(); }
    return;
  }

  if (gameState.state === 'gameover') {
    if (key === 'r' || key === 'R' || key === ' ') { e.preventDefault(); startGame(); }
    return;
  }

  if (gameState.state === 'playing') {
    if (key === 'Shift') {
      snake.setBoost(true);
    }
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'w', 'a', 's', 'd'].includes(key)) {
      e.preventDefault();
    }
    snake.handleInput(key);
  }
});

document.addEventListener('keyup', (e) => {
  if (e.key === 'Shift') {
    snake.setBoost(false);
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

// ── 社交与装扮操作按钮绑定 ──
const bindSocialBtn = (el, handler) => {
  if (!el) return;
  const cb = (e) => {
    e.preventDefault();
    e.stopPropagation();
    handler();
  };
  el.addEventListener('click', cb);
  el.addEventListener('touchend', cb);
};

bindSocialBtn(ui.topLeaderboardBtn, () => socialUI.openLeaderboard());
bindSocialBtn(ui.startLeaderboardBtn, () => socialUI.openLeaderboard());
bindSocialBtn(ui.gameoverLeaderboardBtn, () => socialUI.openLeaderboard());
bindSocialBtn(ui.topShopBtn, () => shopUI.openShop());
bindSocialBtn(ui.startShopBtn, () => shopUI.openShop());
bindSocialBtn(ui.gameoverShopBtn, () => shopUI.openShop());
bindSocialBtn(ui.topAchievementsBtn, () => shopUI.openAchievements());
bindSocialBtn(ui.startAchievementsBtn, () => shopUI.openAchievements());
bindSocialBtn(ui.gameoverAchievementsBtn, () => shopUI.openAchievements());
bindSocialBtn(ui.gameoverPosterBtn, () => socialUI.openPoster(gameState.score));
bindSocialBtn(ui.gameoverChallengeBtn, () => socialUI.copyChallengeLink(gameState.score));

// ── 模式状态管理与持久化 ──
let currentMode = localStorage.getItem('snake3d_mode') || 'classic';

const MODE_CONFIG = {
  classic: {
    desc: '经典纯粹规则 · 吃食物成长与避障'
  },
  crazy: {
    desc: '疯狂空投4款专属3D超能道具 · 5秒畅爽爆发'
  },
  custom: {
    desc: '自由定制6大维度规则 · 支持盲盒随机'
  }
};

function updateCustomRuleSummary() {
  if (ui.customRuleSummaryText && customRulesManager) {
    ui.customRuleSummaryText.textContent = customRulesManager.getSummaryBadgeText();
  }
}

function renderCustomRulesModal() {
  const body = document.getElementById('custom-rules-body');
  if (!body) return;
  body.innerHTML = '';

  const meta = customRulesManager.meta;
  const currentRules = customRulesManager.getRules();

  for (const [dimKey, dimConfig] of Object.entries(meta)) {
    const block = document.createElement('div');
    block.className = 'rule-dim-block';

    const header = document.createElement('div');
    header.className = 'rule-dim-header';
    const activeOpt = dimConfig.options.find(o => o.key === currentRules[dimKey]);
    header.innerHTML = `
      <span class="rule-dim-title">${dimConfig.title}</span>
      <span class="rule-dim-desc">${activeOpt ? (activeOpt.desc || activeOpt.name) : ''}</span>
    `;
    block.appendChild(header);

    const optsRow = document.createElement('div');
    optsRow.className = 'rule-dim-options';

    dimConfig.options.forEach(opt => {
      const pill = document.createElement('button');
      pill.type = 'button';
      const isActive = currentRules[dimKey] === opt.key;
      pill.className = `rule-opt-pill ${isActive ? 'active' : ''}`;
      pill.innerHTML = `
        <img src="${opt.icon}" alt="${opt.name}" class="ui-icon">
        <span>${opt.name}</span>
      `;
      pill.addEventListener('click', (e) => {
        e.preventDefault();
        sound.init();
        sound.playTurn();
        customRulesManager.setRule(dimKey, opt.key);
        renderCustomRulesModal();
        updateCustomRuleSummary();
      });
      optsRow.appendChild(pill);
    });

    block.appendChild(optsRow);
    body.appendChild(block);
  }
}

function openCustomRulesModal() {
  renderCustomRulesModal();
  if (ui.customRulesModal) ui.customRulesModal.classList.remove('hidden');
}

function closeCustomRulesModal() {
  if (ui.customRulesModal) ui.customRulesModal.classList.add('hidden');
}

function setGameMode(mode) {
  currentMode = mode;
  localStorage.setItem('snake3d_mode', mode);

  if (ui.modeBtnClassic) ui.modeBtnClassic.classList.toggle('active', mode === 'classic');
  if (ui.modeBtnCrazy) ui.modeBtnCrazy.classList.toggle('active', mode === 'crazy');
  if (ui.modeBtnCustom) ui.modeBtnCustom.classList.toggle('active', mode === 'custom');

  if (ui.customRuleSummaryRow) {
    ui.customRuleSummaryRow.classList.toggle('hidden', mode !== 'custom');
  }

  if (mode === 'custom') {
    updateCustomRuleSummary();
  }

  if (ui.modeDesc && MODE_CONFIG[mode]) {
    ui.modeDesc.textContent = MODE_CONFIG[mode].desc;
  }
}

const bindModeBtn = (el, mode) => {
  if (!el) return;
  const cb = (e) => {
    e.preventDefault();
    e.stopPropagation();
    sound.init();
    setGameMode(mode);
  };
  el.addEventListener('click', cb);
  el.addEventListener('touchend', cb);
};

bindModeBtn(ui.modeBtnClassic, 'classic');
bindModeBtn(ui.modeBtnCrazy, 'crazy');
bindModeBtn(ui.modeBtnCustom, 'custom');

if (ui.btnOpenCustomRules) {
  bindSocialBtn(ui.btnOpenCustomRules, () => openCustomRulesModal());
}
if (ui.btnCloseCustomRules) {
  bindSocialBtn(ui.btnCloseCustomRules, () => closeCustomRulesModal());
}

const customShuffleBtn = document.getElementById('btn-custom-shuffle');
if (customShuffleBtn) {
  bindSocialBtn(customShuffleBtn, () => {
    sound.playEatCombo(3);
    const diceIcon = customShuffleBtn.querySelector('.dice-icon-spin');
    if (diceIcon) {
      diceIcon.classList.remove('dice-shake-anim');
      void diceIcon.offsetWidth;
      diceIcon.classList.add('dice-shake-anim');
    }
    customRulesManager.shuffle();
    renderCustomRulesModal();
    updateCustomRuleSummary();
  });
}

const customResetBtn = document.getElementById('btn-custom-reset');
if (customResetBtn) {
  bindSocialBtn(customResetBtn, () => {
    sound.playTurn();
    customRulesManager.reset();
    renderCustomRulesModal();
    updateCustomRuleSummary();
  });
}

const customPlayBtn = document.getElementById('btn-custom-play');
if (customPlayBtn) {
  bindSocialBtn(customPlayBtn, () => {
    closeCustomRulesModal();
    setGameMode('custom');
    startGame();
  });
}

// 弹窗遮罩背景轻触关闭
if (ui.customRulesModal) {
  ui.customRulesModal.addEventListener('click', (e) => {
    if (e.target === ui.customRulesModal) {
      closeCustomRulesModal();
    }
  });
}

setGameMode(currentMode);

// ── 移动端检测与文案自适应 ──
const isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0) || (window.innerWidth <= 1024);
if (isTouchDevice) {
  if (ui.startBtn) ui.startBtn.innerHTML = '<img src="assets/icons/icon_rocket.png" alt="开始" class="ui-icon-btn"> 开始游戏 (轻触)';
  if (ui.restartBtn) ui.restartBtn.innerHTML = '<img src="assets/icons/icon_refresh.png" alt="重玩" class="ui-icon-btn"> 重新开始 (轻触)';
}

// ── 360° 弹性虚拟摇杆操控（支持智能随心浮动定位） ──
let stickActive = false;
let stickCenterX = 0;
let stickCenterY = 0;
const STICK_MAX_RADIUS = 38; // 最大视觉拨动半径 (px)
const STICK_DEAD_ZONE = 8;   // 死区阈值 (px)

function updateStickKnob(dx, dy) {
  if (!ui.stickKnob) return;
  ui.stickKnob.style.transform = `translate(calc(-50% + ${dx.toFixed(1)}px), calc(-50% + ${dy.toFixed(1)}px))`;
}

function resetStick() {
  stickActive = false;
  if (ui.stickKnob) {
    ui.stickKnob.style.transform = 'translate(-50%, -50%)';
  }
  if (ui.virtualStick && ui.virtualStick.classList.contains('floating')) {
    ui.virtualStick.classList.add('faded-out');
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

function activateFloatingStick(clientX, clientY) {
  if (!ui.virtualStick) return;
  ui.virtualStick.classList.add('floating');
  ui.virtualStick.classList.remove('faded-out');
  ui.virtualStick.style.left = `${clientX}px`;
  ui.virtualStick.style.top = `${clientY}px`;
  ui.virtualStick.style.bottom = 'auto';
  ui.virtualStick.style.transform = 'translate(-50%, -50%)';

  stickCenterX = clientX;
  stickCenterY = clientY;
  stickActive = true;
  updateStickKnob(0, 0);
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

  // 鼠标拖拽支持（便于桌面调试与自动化测试）
  ui.virtualStick.addEventListener('mousedown', onStickStart);
  window.addEventListener('mousemove', (e) => {
    if (stickActive) onStickMove(e);
  });
  window.addEventListener('mouseup', () => {
    if (stickActive) resetStick();
  });

  // 全局左半屏触摸支持智能随心浮动摇杆
  window.addEventListener('touchstart', (e) => {
    if (gameState.state !== 'playing') return;
    const touch = e.touches ? e.touches[0] : null;
    if (!touch) return;

    // 避让所有顶层按钮、弹窗和右侧冲刺区
    const target = e.target;
    if (target && (target.closest('button') || target.closest('a') || target.closest('.modal-overlay') || target.closest('.top-nav-bar') || target.closest('#touch-boost-btn'))) {
      return;
    }

    // 左半屏（< 58% 宽度）任意位置触发随心浮动定位
    if (touch.clientX < window.innerWidth * 0.58 && touch.clientY > 70) {
      e.preventDefault();
      activateFloatingStick(touch.clientX, touch.clientY);
    }
  }, { passive: false });

  window.addEventListener('touchmove', (e) => {
    if (!stickActive) return;
    const touch = e.touches ? e.touches[0] : null;
    if (touch) {
      handleStickVector(touch.clientX - stickCenterX, touch.clientY - stickCenterY);
    }
  }, { passive: true });

  window.addEventListener('touchend', () => {
    if (stickActive) resetStick();
  });
  window.addEventListener('touchcancel', () => {
    if (stickActive) resetStick();
  });
}

// ── 移动端极速冲刺按键 (双拇指掌机交互) ──
if (ui.touchBoostBtn) {
  const onBoostStart = (e) => {
    e.preventDefault();
    sound.init();
    snake.setBoost(true);
    ui.touchBoostBtn.classList.add('active');
  };
  const onBoostEnd = (e) => {
    if (e && e.cancelable) e.preventDefault();
    snake.setBoost(false);
    ui.touchBoostBtn.classList.remove('active');
  };

  ui.touchBoostBtn.addEventListener('touchstart', onBoostStart, { passive: false });
  ui.touchBoostBtn.addEventListener('touchend', onBoostEnd, { passive: false });
  ui.touchBoostBtn.addEventListener('touchcancel', onBoostEnd, { passive: false });
  ui.touchBoostBtn.addEventListener('mousedown', onBoostStart);
  window.addEventListener('mouseup', onBoostEnd);
}

// ── 旋转横屏提示徽章交互 ──
if (ui.rotateHint) {
  ui.rotateHint.addEventListener('click', () => {
    socialUI.showToast('旋转手机至横屏，即享双拇指掌机沉浸体验！');
  });
}

// ── 全局滑动手势 (辅助备用) ──
let touchStartX = 0, touchStartY = 0;
let isScreenSwiping = false;
const SWIPE_THRESHOLD = 24;

document.addEventListener('touchstart', (e) => {
  sound.init();
  if (
    e.target.closest('#virtual-stick') ||
    e.target.closest('#touch-boost-btn') ||
    e.target.closest('.back-home-btn') ||
    e.target.closest('.top-nav-bar') ||
    e.target.closest('.social-modal-overlay') ||
    e.target.closest('.shop-modal-overlay') ||
    e.target.closest('.ach-toast-banner') ||
    e.target.closest('.social-challenge-banner') ||
    e.target.closest('.mode-select-wrap') ||
    e.target.closest('.mode-tab-btn') ||
    e.target.closest('button') ||
    e.target.closest('a')
  ) return;

  isScreenSwiping = true;
  const touch = e.touches[0];
  touchStartX = touch.clientX;
  touchStartY = touch.clientY;

  // 开始屏或结束屏轻触空白区域开始（排除弹窗与次级卡片交互）
  if (gameState.state !== 'playing') {
    if (e.target.closest('.toy-card') && !e.target.closest('#start-btn') && !e.target.closest('#restart-btn')) {
      return;
    }
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
  snake.setBoost(false);
  if (ui.touchBoostBtn) {
    ui.touchBoostBtn.classList.remove('active');
  }
  food.dispose();
  obstacles.clearAll();
  cameraFX.reset();
  powerUpManager.reset();
  achievementManager.resetSession();
  achievementManager.recordEvent('score', 0);

  // ── 模式与工坊规则应用 ──
  if (currentMode === 'custom') {
    const rules = customRulesManager.getRules();
    const gridDim = customRulesManager.getGridDimension();
    const isWrap = rules.wallRule === 'wrap';
    const boundLimit = gridDim / 2 - 0.5;

    ground.setGridConfig(gridDim, isWrap);
    sceneSetup.setGridScale(gridDim);
    radarMinimap.setGridSize(gridDim);

    snake.setBoundLimit(boundLimit);
    snake.setWrapMode(isWrap);
    snake.setBaseSpeed(customRulesManager.getSpeedInterval());

    food.configureRules({
      foodType: rules.foodType,
      foodCount: rules.foodCount,
      boundLimit: Math.floor(boundLimit)
    });

    if (rules.weather && rules.weather !== 'auto') {
      weatherSystem.forceWeather(rules.weather);
    }

    if (ui.hudCustomPill) {
      ui.hudCustomPill.classList.remove('hidden');
      if (ui.hudCustomRuleText) {
        ui.hudCustomRuleText.textContent = customRulesManager.getSummaryBadgeText();
      }
    }
  } else {
    // 经典/疯狂模式升级为 32x32 开阔生态群岛
    ground.setGridConfig(32, false);
    sceneSetup.setGridScale(32);
    radarMinimap.setGridSize(32);
    snake.setBoundLimit(15.5);
    snake.setWrapMode(false);
    snake.setBaseSpeed(0.16);
    food.configureRules({
      foodType: 'apple',
      foodCount: 3, // 开阔大岛默认常驻 3 颗果实
      boundLimit: 15
    });
    if (ui.hudCustomPill) {
      ui.hudCustomPill.classList.add('hidden');
    }
  }

  radarMinimap.show();
  updateCameraToggleUI();

  const occupied = snake.getOccupiedPositions();
  food.spawn(occupied, []);

  lastSnakePos = snake.logicalPos.clone();
  specialFoodTimer = 0;
  specialFoodTimeout = 0;

  ui.hud.classList.remove('hidden');
  if (ui.weatherHud) {
    ui.weatherHud.classList.remove('hidden');
    const curMeta = weatherSystem.weatherMeta[weatherSystem.currentWeather];
    if (curMeta) {
      if (ui.weatherIcon) ui.weatherIcon.src = curMeta.icon;
      if (ui.weatherName) ui.weatherName.textContent = curMeta.name;
    }
  }
  if (ui.powerupHud) {
    ui.powerupHud.classList.add('hidden');
  }
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

  // 检测食物碰撞 (兼容多果实同屏)
  const ateNormal = food.checkFoodCollision(headPos, snake.getOccupiedPositions(), obstacles.getPositions()) || snake.checkFoodCollision(food.getPosition());
  const ateSpecial = food.hasSpecial && snake.checkFoodCollision(food.specialPosition);

  if (ateNormal || ateSpecial) {
    const basePoints = ateSpecial ? 30 : 10;
    snake.grow(null, ateSpecial);

    const scoreResult = gameState.addScore(basePoints, ateSpecial);

    // 荣誉成就中枢打点
    achievementManager.recordEvent('score', gameState.score);
    if (scoreResult.comboMultiplier > 1) {
      achievementManager.recordEvent('combo', scoreResult.comboMultiplier);
    }

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

    // 普通食物重新生成（补充维持目标数量）
    if (ateNormal && (!food.foodList || food.foodList.length < food.targetFoodCount)) {
      food.spawn(snake.getOccupiedPositions(), obstacles.getPositions());
    }

    // 障碍物生成
    if (gameState.shouldSpawnObstacle() && obstacles.count < 8) {
      const occ = snake.getOccupiedPositions();
      occ.push(food.getPosition());
      obstacles.spawn(occ);
    }

    updateHUD();
    socialUI.checkScoreForChallenge(gameState.score);
  }

  // 检测吃到了炸弹爆破产生的黄金食物/金币
  const eatenBonus = food.checkBonusCollisions(headPos);
  if (eatenBonus > 0) {
    sound.playEatCombo(2);
    const bonusScore = eatenBonus * 30;
    gameState.addScore(bonusScore, true);
    achievementManager.recordEvent('score', gameState.score);
    particles.spawnEatBurst(snake.head.position.clone(), 0xFFD700);
    showFloatingScore(snake.head.position, `+${bonusScore} 金币奖励!`, '#FFD700');
    updateHUD();
    socialUI.checkScoreForChallenge(gameState.score);
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
        achievementManager.recordEvent('rock_crushed', 1);
        achievementManager.recordEvent('score', gameState.score);
        showFloatingScore(snake.head.position, `+50 撞碎障碍!`, '#FFD700');
        updateHUD();
        socialUI.checkScoreForChallenge(gameState.score);
      }
    } else {
      handleDeath('撞到障碍物');
    }
  }
}

// ── 死亡处理 ──
function handleDeath(reason) {
  powerUpManager.clearSpawned();
  snake.setBoost(false);
  if (ui.touchBoostBtn) {
    ui.touchBoostBtn.classList.remove('active');
  }
  if (ui.powerupHud) {
    ui.powerupHud.classList.add('hidden');
  }
  if (ui.weatherHud) {
    ui.weatherHud.classList.add('hidden');
  }
  if (ui.weatherBanner) {
    ui.weatherBanner.classList.add('hidden');
  }
  if (ui.hudCustomPill) {
    ui.hudCustomPill.classList.add('hidden');
  }
  radarMinimap.hide();
  gameState.triggerGameOver(reason);
  sound.stopBGM();
  sound.playGameOver();
  particles.spawnDeathBurst(snake.head.position.clone());
  cameraFX.shake(0.4, 0.6);

  // 荣誉成就中枢记录对局结束
  achievementManager.recordEvent('game_end', 1);

  // 代币经济中枢：10:1 得分兑换金币
  const earnedCoins = economyManager.convertScoreToCoins(gameState.score);
  if (ui.gameoverCoinGain) {
    ui.gameoverCoinGain.textContent = earnedCoins;
  }
  if (ui.gameoverCoinTotal) {
    ui.gameoverCoinTotal.textContent = economyManager.getCoins();
  }

  ui.gameoverReason.textContent = (currentMode === 'custom' && customRulesManager)
    ? `${reason} (${customRulesManager.getSummaryBadgeText()})`
    : reason;
  ui.gameoverScore.textContent = gameState.score;
  ui.gameoverScreen.classList.remove('hidden');
  if (ui.touchControls) {
    ui.touchControls.classList.add('hidden');
  }
  resetStick();

  // 社交与排行榜上报
  socialManager.submitScore('snake3d', gameState.score);
  socialManager.getLeaderboard('snake3d', 'daily').then(list => {
    const { rank, percentile } = socialManager.calculateRank(gameState.score, list);
    if (ui.gameoverPercentile) {
      ui.gameoverPercentile.textContent = `荣登第 ${rank} 名 · 超越 ${percentile}% 挑战者`;
    }
  }).catch(() => {
    if (ui.gameoverPercentile) {
      ui.gameoverPercentile.textContent = '成绩已同步至风云榜';
    }
  });
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
  ui.level.textContent = `${gameState.level}级`;
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
    // 局内疯狂道具逻辑与吸附/减速/清屏更新
    powerUpManager.update(adjustedDelta, currentMode, snake, food, obstacles, gameState, {
      showFloatingScore,
      onPowerUpCollect: (type) => {
        achievementManager.recordEvent('powerup', 1);
      },
      onRocksCrushed: (count) => {
        achievementManager.recordEvent('rock_crushed', count);
      }
    });

    // 动态同步冰霜减速效果给蛇体
    snake.setFrostMode(powerUpManager.isFrostActive());

    // 动态更新局内道具 HUD 状态条
    const powerUpStatus = powerUpManager.getActiveStatus();
    if (powerUpStatus && ui.powerupHud) {
      ui.powerupHud.classList.remove('hidden');
      if (ui.powerupIcon) ui.powerupIcon.src = powerUpStatus.icon;
      if (ui.powerupName) ui.powerupName.textContent = powerUpStatus.name;
      if (ui.powerupTimer) ui.powerupTimer.textContent = `${powerUpStatus.remainingTime.toFixed(1)}秒`;
      ui.powerupHud.classList.toggle('warning', powerUpStatus.isWarning);
    } else if (ui.powerupHud) {
      ui.powerupHud.classList.add('hidden');
    }

    const stepResult = snake.update(adjustedDelta);

    // 流光拖尾发射
    if (currentTrailDef && currentTrailDef.id !== 'none') {
      trailTimer += adjustedDelta;
      if (trailTimer >= 0.08) {
        trailTimer = 0;
        const spawnPos = (snake.segments.length > 0)
          ? snake.segments[snake.segments.length - 1].position
          : snake.head.position;
        particles.spawnTrail(spawnPos, currentTrailDef.id);
      }
    }

    // 检测是否发生了 step（蛇逻辑位置变了）
    if (!lastSnakePos.equals(snake.logicalPos)) {
      // step 发生了
      if (stepResult && stepResult.died) {
        // step() 内部已检测到撞墙/自碰
        handleDeath(stepResult.dieReason || '撞到墙壁');
      } else {
        if (stepResult && stepResult.isGhostWarp) {
          achievementManager.recordEvent('ghost_warp', 1);
        }
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
  weatherSystem.update(delta);
  ground.updateBorderWarning(snake.head ? snake.head.position : null, snake.boundLimit || 15.5);
  radarMinimap.update(snake, food, powerUpManager, camera);
  updateCamera(delta);

  sceneSetup.render();
}

// ── 启动 ──
gameLoop();
console.log('[3D Snake] 初始化完毕 — 按空格开始');
