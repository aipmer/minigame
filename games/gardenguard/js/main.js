import { GameStates, GameState } from './core/GameState.js';
import { Grid } from './core/Grid.js';
import { MergeSystem } from './core/MergeSystem.js';
import { PlantRegistry } from './core/PlantRegistry.js';
import { EnemyRegistry } from './core/EnemyRegistry.js';
import { WaveManager } from './core/WaveManager.js';
import { CombatResolver } from './core/CombatResolver.js';
import { GardenHP } from './core/GardenHP.js';
import { ScoreManager } from './core/ScoreManager.js';
import { SeedPool } from './core/SeedPool.js';
import { SaveManager } from './core/SaveManager.js';
import { FacilityManager } from './core/FacilityManager.js';
import { CompendiumManager } from './core/CompendiumManager.js';

import { SceneManager } from './renderer/SceneManager.js';
import { GridRenderer } from './renderer/GridRenderer.js';
import { PathRenderer } from './renderer/PathRenderer.js';
import { PlantRenderer } from './renderer/PlantRenderer.js';
import { EnemyRenderer } from './renderer/EnemyRenderer.js';
import { ProjectileRenderer } from './renderer/ProjectileRenderer.js';
import { VFXManager } from './renderer/VFXManager.js';
import { GardenCoreRenderer } from './renderer/GardenCoreRenderer.js';
import { EnvironmentRenderer } from './renderer/EnvironmentRenderer.js';

import { HUD } from './ui/HUD.js';
import { StartScreen } from './ui/StartScreen.js';
import { GameOverScreen } from './ui/GameOverScreen.js';
import { PauseScreen } from './ui/PauseScreen.js';
import { DragHandler } from './ui/DragHandler.js';
import { SummonButton } from './ui/SummonButton.js';
import { FacilityModal } from './ui/FacilityModal.js';
import { CompendiumModal } from './ui/CompendiumModal.js';
import { GardenAudio } from './audio/GardenAudio.js';

class GardenGuardGame {
  constructor() {
    this.canvas = document.getElementById('game-canvas');
    this.lastTime = performance.now();
    this.activeEnemies = [];
    this.isInitialized = false;
  }

  async init() {
    // 1. 初始化持久化与局外系统
    this.saveManager = new SaveManager();
    this.saveManager.load();

    this.facilityManager = new FacilityManager(this.saveManager);
    await this.facilityManager.loadConfig();

    this.audio = new GardenAudio();

    // 2. 初始化核心逻辑与注册表
    this.gameState = new GameState();
    this.grid = new Grid(4, 4);
    this.mergeSystem = new MergeSystem(this.grid);
    this.plantRegistry = new PlantRegistry();
    this.enemyRegistry = new EnemyRegistry();
    this.waveManager = new WaveManager(this.enemyRegistry);
    this.gardenHP = new GardenHP(10 + this.facilityManager.getMaxHPBonus());
    this.scoreManager = new ScoreManager();
    this.seedPool = new SeedPool(this.plantRegistry);

    // 加载配置
    await Promise.all([
      this.plantRegistry.load(),
      this.enemyRegistry.load(),
      this.waveManager.loadConfig(),
      this.seedPool.loadConfig()
    ]);

    this.compendiumManager = new CompendiumManager(
      this.plantRegistry, 
      this.enemyRegistry, 
      this.saveManager
    );

    // 3. 初始化 3D 渲染器与场景各层
    this.sceneManager = new SceneManager(this.canvas);
    const scene = this.sceneManager.getScene();

    this.environmentRenderer = new EnvironmentRenderer(scene);
    this.environmentRenderer.create();

    this.gridRenderer = new GridRenderer(scene, 4, 1.5);
    this.gridRenderer.createGrid();
    this.syncGridOccupancy();

    this.pathRenderer = new PathRenderer(scene, 4, 1.5);
    this.pathRenderer.createPath();

    this.plantRenderer = new PlantRenderer(scene);
    this.enemyRenderer = new EnemyRenderer(scene);
    this.projectileRenderer = new ProjectileRenderer(scene);
    this.vfxManager = new VFXManager(scene);

    // 花园核心放置在路径终点
    const waypoints = this.pathRenderer.getWaypoints();
    const corePos = waypoints[waypoints.length - 1].clone();
    this.gardenCoreRenderer = new GardenCoreRenderer(scene);
    this.gardenCoreRenderer.create(corePos);

    // 4. 注入战斗计算器
    this.combatResolver = new CombatResolver(this.grid, (row, col) => {
      return this.gridRenderer.getSlotWorldPosition(row, col);
    });

    // 5. 初始化 UI 层与弹窗
    this.hud = new HUD();
    this.startScreen = new StartScreen();
    this.gameOverScreen = new GameOverScreen();
    this.pauseScreen = new PauseScreen();
    this.summonButton = new SummonButton();
    this.pauseFloatBtn = document.getElementById('btn-pause');

    this.facilityModal = new FacilityModal(this.facilityManager, this.saveManager);
    this.compendiumModal = new CompendiumModal(this.compendiumManager);

    // 拖拽系统
    this.dragHandler = new DragHandler(
      this.canvas, 
      this.sceneManager.getCamera(), 
      this.gridRenderer
    );

    // 6. 绑定所有事件与大厅按钮
    this.setupEvents();
    this.updateLobbyStats();

    this.isInitialized = true;
    this.updateHUD();

    // 启动主循环
    requestAnimationFrame((t) => this.gameLoop(t));
  }

  updateLobbyStats() {
    const coinsNumEl = document.getElementById('lobby-coins-num');
    const highWaveNumEl = document.getElementById('lobby-high-wave-num');
    if (coinsNumEl) {
      coinsNumEl.textContent = this.saveManager.getCoins();
    } else {
      const coinsEl = document.getElementById('lobby-coins');
      if (coinsEl) coinsEl.innerHTML = `<img src="assets/icons/icon_coin.png" class="pill-icon" alt="金币"> ${this.saveManager.getCoins()}`;
    }

    if (highWaveNumEl) {
      const stats = this.saveManager.getStats();
      highWaveNumEl.textContent = stats.highWave || 0;
    } else {
      const highEl = document.getElementById('lobby-high-score');
      if (highEl) {
        const stats = this.saveManager.getStats();
        highEl.innerHTML = `<img src="assets/icons/icon_trophy.png" class="pill-icon" alt="最高"> 最高波次: ${stats.highWave || 0}`;
      }
    }
  }

  setupEvents() {
    // 挂载快捷评测箱
    this.setupDebugPanel();

    // 大厅弹窗按钮绑定
    document.getElementById('btn-open-facility')?.addEventListener('click', () => {
      this.audio.playClick();
      this.facilityModal.show();
    });

    document.getElementById('btn-open-compendium')?.addEventListener('click', () => {
      this.audio.playClick();
      this.compendiumModal.show();
    });

    // 设施升级同步生命与种子
    this.facilityManager.onUpgrade(() => {
      this.audio.playUpgrade();
      this.updateLobbyStats();
    });

    // 状态流转
    this.startScreen.onStart(() => {
      this.audio.playClick();
      this.startScreen.hide();
      this.startGame();
    });

    this.pauseFloatBtn?.addEventListener('click', () => {
      this.audio.playClick();
      if (this.gameState.getState() === GameStates.PLAYING) {
        this.gameState.setState(GameStates.PAUSED);
      }
    });

    this.pauseScreen.onResume(() => {
      this.audio.playClick();
      this.gameState.setState(GameStates.PLAYING);
      this.pauseScreen.hide();
    });

    this.pauseScreen.onQuit(() => {
      this.audio.playClick();
      window.location.href = '../../index.html';
    });

    this.gameOverScreen.onRetry(() => {
      this.audio.playClick();
      this.gameOverScreen.hide();
      this.resetGame();
      this.startGame();
    });

    this.gameOverScreen.onHome(() => {
      this.audio.playClick();
      window.location.href = '../../index.html';
    });

    this.gameState.onStateChange((state) => {
      if (state === GameStates.PLAYING) {
        this.hud.show();
        this.pauseFloatBtn?.classList.remove('hidden');
      } else if (state === GameStates.PAUSED) {
        this.pauseScreen.show();
      } else if (state === GameStates.GAMEOVER) {
        this.audio.playDefeat();
        this.hud.hide();
        this.pauseFloatBtn?.classList.add('hidden');
        const res = this.scoreManager.getResults();
        const currentWave = this.waveManager.getCurrentWave();

        // 计算获得金币：波次奖励 + 击杀奖励 + 肥沃土壤加成
        const baseCoins = (currentWave * 20) + (res.kills * 2);
        const bonusPct = this.facilityManager.getCoinBonusPercent();
        const earnedCoins = Math.floor(baseCoins * (1 + bonusPct / 100));

        this.saveManager.addCoins(earnedCoins);
        this.saveManager.recordGameStats({
          wave: currentWave,
          score: res.score,
          kills: res.kills
        });

        this.updateLobbyStats();

        this.gameOverScreen.show({
          waves: currentWave,
          coins: earnedCoins,
          score: res.score,
          maxStar: res.maxStar,
          kills: res.kills,
          reason: '花园生命值归零'
        });
      }
    });

    // 花园血量事件
    this.gardenHP.onDamage((dmg, currentHP) => {
      this.audio.playCoreDamage();
      this.hud.updateHP(currentHP, this.gardenHP.maxHP);
      this.gardenCoreRenderer.updateHP(this.gardenHP.getRatio());
      this.gardenCoreRenderer.playDamageAnimation();
      this.vfxManager.playDamageFlash();
    });

    this.gardenHP.onDeath(() => {
      this.gameState.setState(GameStates.GAMEOVER);
    });

    // 波次出怪事件
    this.waveManager.onWaveStart((waveNum) => {
      this.hud.updateWave(waveNum);
    });

    this.waveManager.onEnemySpawn((enemy) => {
      if (!enemy) return;
      enemy.pathProgress = 0;
      const spawnPos = this.pathRenderer.getPositionOnPath(0);
      enemy.worldPos = spawnPos;
      this.activeEnemies.push(enemy);
      this.enemyRenderer.addEnemy(enemy, spawnPos);
      this.saveManager.unlockEnemy(enemy.id);
    });

    // 战斗发射子弹
    this.combatResolver.onProjectileFired((proj) => {
      const { from, targetEnemy, speed, damage } = proj;
      if (!targetEnemy || !targetEnemy.alive) return;
      
      const plantCfg = this.plantRegistry.getConfig(proj.type) || {};
      const color = plantCfg.color ? parseInt(plantCfg.color.replace('#', '0x')) : 0xFFD700;

      // 攻击动画与音效
      this.audio.playShoot();
      for (const slot of this.grid.slots) {
        if (slot.plant && slot.plant.projectileType === proj.type) {
          this.plantRenderer.playAttackAnimation(slot.plant.uid);
        }
      }

      this.projectileRenderer.fire(
        from,
        targetEnemy.worldPos,
        proj.type,
        color,
        speed || 8,
        () => {
          // 子弹命中回调
          if (!targetEnemy.alive) return;
          const hitRes = targetEnemy.takeDamage(damage);
          this.audio.playHit(hitRes.died);
          this.enemyRenderer.playHitEffect(targetEnemy.uid);

          // 附带减速
          if (proj.slowFactor > 0 && proj.slowDuration > 0) {
            targetEnemy.applySlow(proj.slowFactor, proj.slowDuration);
          }

          if (hitRes.died) {
            this.handleEnemyDeath(targetEnemy);
          }
        }
      );
    });

    // 召唤按钮
    const summonCost = this.plantRegistry.getSummonCost();
    this.summonButton.setCost(summonCost);
    this.summonButton.onClick(() => {
      if (this.scoreManager.canAfford(summonCost)) {
        const emptySlots = this.grid.getEmptySlots();
        if (emptySlots.length > 0) {
          this.audio.playSummon();
          this.scoreManager.spendSeeds(summonCost);
          const chosenSlot = emptySlots[Math.floor(Math.random() * emptySlots.length)];
          
          // 日光祭坛加成稀有度
          const rBoost = this.facilityManager.getRRateBoost();
          if (this.seedPool.config?.newPlayerBoost) {
            this.seedPool.config.newPlayerBoost.rRateBoost = 15 + rBoost;
          }

          const newPlant = this.seedPool.pull(this.waveManager.getCurrentWave());
          if (newPlant) {
            this.grid.placePlant(chosenSlot, newPlant);
            const pos = this.gridRenderer.getSlotWorldPosition(chosenSlot.row, chosenSlot.col);
            this.plantRenderer.addPlant(newPlant.uid, chosenSlot.row, chosenSlot.col, newPlant, pos);
            this.scoreManager.recordStar(newPlant.star);
            this.saveManager.unlockPlant(newPlant.id, newPlant.star);
            this.syncGridOccupancy();
          }
        }
      }
    });

    // 分数变动通知
    this.scoreManager.onChange((res) => {
      this.hud.updateScore(res.score);
      this.hud.updateSeeds(res.seeds);
      this.summonButton.setEnabled(this.scoreManager.canAfford(summonCost) && this.grid.getEmptySlots().length > 0);
    });

    // 拖拽合成系统
    this.setupDragMerge();

    // 合成与大招事件
    this.mergeSystem.onMerge(({ slot, plant, newStar }) => {
      this.audio.playMerge(newStar);
      const pos = this.gridRenderer.getSlotWorldPosition(slot.row, slot.col);
      this.vfxManager.playMergeEffect(pos, newStar);
      this.plantRenderer.upgradePlant(plant.uid, newStar);
      this.scoreManager.recordStar(newStar);
      this.scoreManager.addScore(newStar * 50);
      this.saveManager.unlockPlant(plant.id, newStar);
    });

    this.mergeSystem.onUltimate(({ slot, plant }) => {
      this.audio.playUltimate();
      const pos = this.gridRenderer.getSlotWorldPosition(slot.row, slot.col);
      this.vfxManager.playUltimateEffect(pos, plant.skill5Star?.id);
      // 5 星大招：对全场敌人造成毁灭性打击
      const ultDamage = plant.skill5Star?.damage || 150;
      for (const enemy of this.activeEnemies) {
        if (enemy.alive) {
          const res = enemy.takeDamage(ultDamage);
          this.enemyRenderer.playHitEffect(enemy.uid);
          if (res.died) {
            this.handleEnemyDeath(enemy);
          }
        }
      }
    });
  }

  setupDebugPanel() {
    const panel = document.getElementById('debug-panel');
    const toggleBtn = document.getElementById('debug-toggle-btn');
    const closeBtn = document.getElementById('debug-close-btn');

    // 1. 若 URL 中包含 debug=1，则允许显示入口
    const urlParams = new URLSearchParams(window.location.search);
    const isDebugMode = urlParams.get('debug') === '1';
    if (isDebugMode) {
      toggleBtn?.classList.remove('hidden');
    }

    // 2. 监听键盘 ~ 键，随时一键弹出/隐藏调试弹窗
    window.addEventListener('keydown', (e) => {
      if (e.key === '`' || e.key === '~' || e.key === 'F2') {
        panel?.classList.toggle('hidden');
        this.audio.playClick();
      }
    });

    // 3. 大厅主标题 5 次连击隐形激活彩蛋
    let clickCount = 0;
    let clickTimer = null;
    const titleEl = document.getElementById('start-title');
    titleEl?.addEventListener('click', () => {
      clickCount++;
      clearTimeout(clickTimer);
      clickTimer = setTimeout(() => { clickCount = 0; }, 1500);
      if (clickCount >= 5) {
        clickCount = 0;
        toggleBtn?.classList.remove('hidden');
        panel?.classList.remove('hidden');
        this.audio.playMerge(5);
        console.log('[系统] 研发与验收评测工具箱已激活！');
      }
    });

    // 4. 战斗开始后自动收起右上角常驻胶囊，杜绝与生命值叠加
    this.gameState.onStateChange((state) => {
      if (state === GameStates.PLAYING) {
        toggleBtn?.classList.add('hidden');
      } else if (state === GameStates.MENU && isDebugMode) {
        toggleBtn?.classList.remove('hidden');
      }
    });

    toggleBtn?.addEventListener('click', () => {
      panel?.classList.remove('hidden');
      this.audio.playClick();
    });

    closeBtn?.addEventListener('click', () => {
      panel?.classList.add('hidden');
      this.audio.playClick();
    });

    panel?.addEventListener('click', (e) => {
      if (e.target === panel) {
        panel.classList.add('hidden');
      }
    });

    document.getElementById('btn-cheat-seeds')?.addEventListener('click', () => {
      this.scoreManager.addSeeds(500);
      this.audio.playClick();
    });

    document.getElementById('btn-cheat-coins')?.addEventListener('click', () => {
      this.saveManager.addCoins(1000);
      this.updateLobbyStats();
      this.audio.playClick();
    });

    document.getElementById('btn-cheat-star4')?.addEventListener('click', () => {
      const emptySlots = this.grid.getEmptySlots();
      if (emptySlots.length > 0) {
        const slot = emptySlots[0];
        const plant = this.plantRegistry.createPlant('sunflower_shooter', 4);
        this.grid.placePlant(slot, plant);
        const pos = this.gridRenderer.getSlotWorldPosition(slot.row, slot.col);
        this.plantRenderer.addPlant(plant.uid, slot.row, slot.col, plant, pos);
        this.plantRenderer.upgradePlant(plant.uid, 4);
        this.audio.playMerge(4);
      }
    });

    document.getElementById('btn-cheat-boss')?.addEventListener('click', () => {
      this.waveManager.currentWave = 9;
      this.waveManager.waveTimer = 0.5;
      this.audio.playClick();
    });

    document.getElementById('btn-cheat-heal')?.addEventListener('click', () => {
      this.gardenHP.heal(999);
      this.hud.updateHP(this.gardenHP.hp, this.gardenHP.maxHP);
      this.gardenCoreRenderer.updateHP(1.0);
      this.audio.playClick();
    });
  }

  setupDragMerge() {
    this.dragHandler.on('dragStart', ({ row, col }) => {
      const slot = this.grid.getSlot(row, col);
      if (slot && slot.plant) {
        this.gridRenderer.highlightSlot(row, col, 'hover');
      }
    });

    this.dragHandler.on('dragMove', ({ from, to }) => {
      if (!to) {
        this.gridRenderer.clearHighlights();
        if (from) this.gridRenderer.highlightSlot(from.row, from.col, 'hover');
        return;
      }
      const slotFrom = this.grid.getSlot(from.row, from.col);
      const slotTo = this.grid.getSlot(to.row, to.col);

      if (slotFrom && slotTo) {
        if (from.row === to.row && from.col === to.col) {
          this.gridRenderer.highlightSlot(to.row, to.col, 'hover');
        } else if (this.grid.canMerge(slotFrom, slotTo)) {
          this.gridRenderer.highlightSlot(to.row, to.col, 'merge');
        } else {
          this.gridRenderer.highlightSlot(to.row, to.col, 'invalid');
        }
      }
    });

    this.dragHandler.on('dragEnd', ({ from, to }) => {
      this.gridRenderer.clearHighlights();
      if (!from || !to) return;
      if (from.row === to.row && from.col === to.col) return;

      const slotFrom = this.grid.getSlot(from.row, from.col);
      const slotTo = this.grid.getSlot(to.row, to.col);

      if (!slotFrom || !slotTo || !slotFrom.plant) return;

      if (this.grid.canMerge(slotFrom, slotTo)) {
        // 执行合成：移除源植物并把目标升级
        const plantB = slotFrom.plant;
        this.plantRenderer.removePlant(plantB.uid);
        this.mergeSystem.merge(slotTo, slotFrom);
      } else if (slotTo.plant === null) {
        // 移入空位
        const plant = this.grid.removePlant(slotFrom);
        this.grid.placePlant(slotTo, plant);
        
        this.plantRenderer.removePlant(plant.uid);
        const toPos = this.gridRenderer.getSlotWorldPosition(slotTo.row, slotTo.col);
        this.plantRenderer.addPlant(plant.uid, slotTo.row, slotTo.col, plant, toPos);
      } else {
        // 交换两个植物
        this.grid.swapPlants(slotFrom, slotTo);

        const pFrom = slotFrom.plant;
        const pTo = slotTo.plant;

        this.plantRenderer.removePlant(pFrom.uid);
        this.plantRenderer.removePlant(pTo.uid);

        const posFrom = this.gridRenderer.getSlotWorldPosition(slotFrom.row, slotFrom.col);
        const posTo = this.gridRenderer.getSlotWorldPosition(slotTo.row, slotTo.col);

        this.plantRenderer.addPlant(pFrom.uid, slotFrom.row, slotFrom.col, pFrom, posFrom);
        this.plantRenderer.addPlant(pTo.uid, slotTo.row, slotTo.col, pTo, posTo);
      }

      this.syncGridOccupancy();

      const summonCost = this.plantRegistry.getSummonCost();
      this.summonButton.setEnabled(this.scoreManager.canAfford(summonCost) && this.grid.getEmptySlots().length > 0);
    });
  }

  handleEnemyDeath(enemy) {
    this.scoreManager.recordKill();
    if (enemy.reward) {
      if (enemy.reward.seeds) this.scoreManager.addSeeds(enemy.reward.seeds);
      if (enemy.reward.score) this.scoreManager.addScore(enemy.reward.score);
    }
    this.vfxManager.playKillEffect(enemy.worldPos, parseInt(enemy.color ? enemy.color.replace('#', '0x') : '0x90EE90'));
    this.enemyRenderer.playDeathEffect(enemy.uid);
    this.saveManager.unlockEnemy(enemy.id);
  }

  startGame() {
    this.gameState.setState(GameStates.PLAYING);

    // 应用生命清泉设施加成
    const maxHP = 10 + this.facilityManager.getMaxHPBonus();
    this.gardenHP.maxHP = maxHP;
    this.gardenHP.hp = maxHP;

    // 开局赠送 3 个基础植物
    const emptySlots = this.grid.getEmptySlots();
    for (let i = 0; i < 3 && emptySlots.length > 0; i++) {
      const idx = Math.floor(Math.random() * emptySlots.length);
      const slot = emptySlots.splice(idx, 1)[0];
      const plant = this.seedPool.pull(1);
      if (plant) {
        this.grid.placePlant(slot, plant);
        const pos = this.gridRenderer.getSlotWorldPosition(slot.row, slot.col);
        this.plantRenderer.addPlant(plant.uid, slot.row, slot.col, plant, pos);
        this.scoreManager.recordStar(plant.star);
        this.saveManager.unlockPlant(plant.id, plant.star);
      }
    }

    // 初始赋予种子：基础 20 + 肥沃土壤设施加成
    const startSeeds = 20 + this.facilityManager.getStartSeedsBonus();
    this.scoreManager.addSeeds(startSeeds);
    this.waveManager.reset();
    this.syncGridOccupancy();
  }

  syncGridOccupancy() {
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        const slot = this.grid.getSlot(r, c);
        this.gridRenderer.setSlotOccupied(r, c, !!slot?.plant);
      }
    }
  }

  resetGame() {
    this.grid.clear();
    this.plantRenderer.clear();
    this.enemyRenderer.clear();
    this.projectileRenderer.clear();
    this.vfxManager.clear();
    this.activeEnemies = [];
    this.gardenHP.reset();
    this.scoreManager.reset();
    this.waveManager.reset();
    this.gardenCoreRenderer.reset();
    this.syncGridOccupancy();
    this.updateHUD();
  }

  updateHUD() {
    this.hud.updateHP(this.gardenHP.getHP(), this.gardenHP.maxHP);
    this.hud.updateWave(this.waveManager.getCurrentWave());
    this.hud.updateSeeds(this.scoreManager.seeds);
    this.hud.updateScore(this.scoreManager.score);
  }

  gameLoop(timestamp) {
    const dt = Math.min((timestamp - this.lastTime) / 1000, 0.1);
    this.lastTime = timestamp;

    if (this.gameState.getState() === GameStates.PLAYING) {
      this.updateGame(dt);
    }

    // 渲染器与场景动画更新
    this.environmentRenderer.update(dt);
    this.gridRenderer.update(dt);
    this.plantRenderer.update(dt);
    this.enemyRenderer.update(dt);
    this.projectileRenderer.update(dt);
    this.vfxManager.update(dt);
    this.gardenCoreRenderer.update(dt);
    this.sceneManager.render();

    requestAnimationFrame((t) => this.gameLoop(t));
  }

  updateGame(dt) {
    // 1. 更新波次出怪
    this.waveManager.update(dt);
    this.hud.updateWaveTimer(this.waveManager.getWaveTimer());

    // 2. 更新怪物移动与生命周期
    const pathLen = this.pathRenderer.getPathLength();
    const thorn = this.facilityManager.getThornEffects();

    for (let i = this.activeEnemies.length - 1; i >= 0; i--) {
      const enemy = this.activeEnemies[i];
      enemy.update(dt);

      if (!enemy.alive) {
        this.activeEnemies.splice(i, 1);
        continue;
      }

      // 荆棘木篱设施效果：进入后半段（> 0.65）被荆棘缠绕与刺伤
      if (thorn.slowPercent > 0 && enemy.pathProgress > 0.65) {
        enemy.applySlow(thorn.slowPercent / 100, 0.2);
        if (thorn.thornDPS > 0) {
          const hit = enemy.takeDamage(thorn.thornDPS * dt);
          if (hit.died) {
            this.handleEnemyDeath(enemy);
            continue;
          }
        }
      }

      if (!enemy.frozen) {
        // 沿路径前进
        const step = (enemy.speed * dt) / pathLen;
        enemy.pathProgress += step;
      }

      if (enemy.pathProgress >= 1.0) {
        // 到达终点，对花园造成伤害
        this.gardenHP.takeDamage(enemy.damage);
        this.enemyRenderer.removeEnemy(enemy.uid);
        this.activeEnemies.splice(i, 1);
      } else {
        const curWorldPos = this.pathRenderer.getPositionOnPath(enemy.pathProgress);
        enemy.worldPos = curWorldPos;
        this.enemyRenderer.updateEnemy(enemy.uid, curWorldPos);
      }
    }

    // 3. 战斗求解：植物索敌与发射
    this.combatResolver.update(dt, this.activeEnemies);
  }
}

// 页面加载完成后启动
window.addEventListener('DOMContentLoaded', () => {
  const game = new GardenGuardGame();
  game.init().catch(err => console.error('GardenGuard init failed:', err));
});
