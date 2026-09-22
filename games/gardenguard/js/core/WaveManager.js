export class WaveManager {
  constructor(enemyRegistry) {
    this.enemyRegistry = enemyRegistry;
    this.wavesConfig = null;
    this.currentWave = 0;
    this.waveTimer = 0;
    this.waveInterval = 10; 
    this.spawnQueue = [];
    this.spawnTimer = 0;
    this.waveStartListeners = [];
    this.enemySpawnListeners = [];
  }

  async loadConfig() {
    try {
      const response = await fetch('config/waves.json');
      this.wavesConfig = await response.json();
      if (this.wavesConfig && this.wavesConfig.waveInterval) {
        this.waveInterval = this.wavesConfig.waveInterval;
      }
    } catch (e) {
      console.error('Failed to load wave configs:', e);
    }
  }

  getCurrentWave() {
    return this.currentWave;
  }

  update(dt) {
    if (this.spawnQueue.length > 0) {
      this.spawnTimer -= dt;
      if (this.spawnTimer <= 0) {
        const nextEnemy = this.spawnQueue.shift();
        this.enemySpawnListeners.forEach(cb => cb(nextEnemy.enemy));
        if (this.spawnQueue.length > 0) {
          this.spawnTimer = this.spawnQueue[0].delay;
        }
      }
    } else {
      this.waveTimer -= dt;
      if (this.waveTimer <= 0) {
        this.spawnWave();
      }
    }
  }

  spawnWave() {
    this.currentWave++;
    this.waveTimer = this.waveInterval;
    
    // 计算倍率
    let hpMult = 1 + this.currentWave * 0.08;
    let speedMult = Math.min(2.0, 1 + this.currentWave * 0.01);
    
    const enemiesToSpawn = [];
    const count = 5 + Math.floor(this.currentWave / 2);
    
    // 取出配置的敌人id，简单假设 config 中存在 'normal' 与 'elite'
    const basicEnemyPool = ['caterpillar', 'beetle', 'moth', 'ladybug'];
    const elitePool = ['scorpion', 'mushroom_king'];

    for (let i = 0; i < count; i++) {
      const isElite = (this.currentWave % 5 === 0) && (i === count - 1);
      let enemyId;
      if (isElite) {
        enemyId = elitePool[Math.floor(Math.random() * elitePool.length)];
      } else {
        if (this.currentWave <= 2) {
          enemyId = 'caterpillar';
        } else if (this.currentWave <= 5) {
          enemyId = Math.random() < 0.7 ? 'caterpillar' : 'beetle';
        } else {
          enemyId = basicEnemyPool[Math.floor(Math.random() * basicEnemyPool.length)];
        }
      }
      const enemy = this.enemyRegistry.createEnemy(enemyId, hpMult, speedMult);
      if (enemy) {
        enemiesToSpawn.push({ enemy, delay: 0.8 });
      }
    }
    
    if (enemiesToSpawn.length > 0) {
      this.spawnQueue = enemiesToSpawn;
      this.spawnTimer = this.spawnQueue[0].delay;
    }
    
    this.waveStartListeners.forEach(cb => cb(this.currentWave, enemiesToSpawn.map(e => e.enemy)));
    return enemiesToSpawn.map(e => e.enemy);
  }

  onWaveStart(callback) {
    this.waveStartListeners.push(callback);
  }

  onEnemySpawn(callback) {
    this.enemySpawnListeners.push(callback);
  }

  getWaveTimer() {
    return Math.max(0, this.waveTimer / this.waveInterval);
  }

  reset() {
    this.currentWave = 0;
    this.waveTimer = 2; // 初次波次前 2 秒缓冲后自动出怪
    this.spawnQueue = [];
    this.spawnTimer = 0;
  }
}
