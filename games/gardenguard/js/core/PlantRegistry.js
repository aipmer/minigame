export class Plant {
  static nextUid = 1;
  
  constructor(config, star = 1) {
    this.id = config.id;
    this.name = config.name;
    this.series = config.series;
    this.rarity = config.rarity;
    this.star = star;
    this.baseATK = config.baseATK;
    this.baseAtkSpeed = config.baseAtkSpeed;
    this.range = config.range;
    this.attackType = config.attackType;
    this.aoeRadius = config.aoeRadius || 0;
    this.projectileType = config.projectileType;
    this.projectileSpeed = config.projectileSpeed;
    this.slowFactor = config.slowFactor || 0;
    this.slowDuration = config.slowDuration || 0;
    this.starMultiplier = config.starMultiplier;
    this.skill5Star = config.skill5Star;
    this.color = config.color;
    this.cooldownTimer = 0; // 攻击冷却
    this.uid = Plant.nextUid++; // 唯一实例 ID
  }
  
  getATK() { 
    return this.baseATK * this.starMultiplier[this.star - 1]; 
  }
  
  getAtkInterval() { 
    return 1.0 / this.baseAtkSpeed; 
  }
}

export class PlantRegistry {
  constructor() {
    this.configs = new Map();
    this.summonCost = 10;
  }

  async load() {
    try {
      const response = await fetch('config/plants.json');
      const data = await response.json();
      if (data.plants) {
        data.plants.forEach(p => {
          this.configs.set(p.id, p);
        });
      }
    } catch (e) {
      console.error('Failed to load plant configs:', e);
    }
  }

  getConfig(plantId) {
    return this.configs.get(plantId);
  }

  getAllConfigs() {
    return Array.from(this.configs.values());
  }

  createPlant(plantId, star = 1) {
    const config = this.getConfig(plantId);
    if (!config) return null;
    return new Plant(config, star);
  }

  getConfigsBySeries(series) {
    return this.getAllConfigs().filter(p => p.series === series);
  }

  getSummonCost() {
    return this.summonCost;
  }
}
