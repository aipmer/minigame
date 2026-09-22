export class Enemy {
  static nextUid = 1;
  
  constructor(config, hpMultiplier = 1, speedMultiplier = 1) {
    this.id = config.id;
    this.name = config.name;
    this.type = config.type;
    this.maxHP = Math.floor(config.baseHP * hpMultiplier);
    this.hp = this.maxHP;
    this.baseSpeed = config.speed * speedMultiplier;
    this.speed = this.baseSpeed;
    this.damage = config.damage;
    this.reward = { ...config.reward };
    this.splitOnDeath = config.splitOnDeath || null;
    this.ability = config.ability || null;
    this.color = config.color;
    this.scale = config.scale || 0.6;
    this.pathProgress = 0; // 0~1 路径进度
    this.alive = true;
    this.slowTimer = 0;
    this.frozen = false;
    this.uid = Enemy.nextUid++;
  }

  takeDamage(amount) {
    this.hp -= amount;
    if (this.hp <= 0) {
      this.alive = false;
      return { died: true, rewards: this.reward };
    }
    return { died: false, rewards: null };
  }

  applySlow(factor, duration) {
    this.speed = this.baseSpeed * (1 - factor);
    this.slowTimer = Math.max(this.slowTimer, duration);
  }

  applyFreeze(duration) {
    this.frozen = true;
    this.slowTimer = Math.max(this.slowTimer, duration);
  }

  update(dt) {
    if (this.slowTimer > 0) {
      this.slowTimer -= dt;
      if (this.slowTimer <= 0) {
        this.speed = this.baseSpeed;
        this.frozen = false;
      }
    }
  }
}

export class EnemyRegistry {
  constructor() {
    this.configs = new Map();
  }

  async load() {
    try {
      const response = await fetch('config/enemies.json');
      const data = await response.json();
      if (data.enemies) {
        data.enemies.forEach(e => {
          this.configs.set(e.id, e);
        });
      }
    } catch (e) {
      console.error('Failed to load enemy configs:', e);
    }
  }

  getConfig(enemyId) {
    return this.configs.get(enemyId);
  }

  createEnemy(enemyId, hpMult = 1, speedMult = 1) {
    const config = this.getConfig(enemyId);
    if (!config) return null;
    return new Enemy(config, hpMult, speedMult);
  }
}
