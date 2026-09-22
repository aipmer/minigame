export class FacilityManager {
  constructor(saveManager) {
    this.saveManager = saveManager;
    this.configs = new Map();
    this.listeners = [];
  }

  async loadConfig() {
    try {
      const res = await fetch('config/facilities.json');
      const data = await res.json();
      if (data && data.facilities) {
        data.facilities.forEach(f => {
          this.configs.set(f.id, f);
        });
      }
    } catch (e) {
      console.error('Failed to load facilities.json:', e);
    }
  }

  getAllFacilities() {
    return Array.from(this.configs.values()).map(cfg => {
      const level = this.saveManager.getFacilityLevel(cfg.id);
      const isMax = level >= cfg.maxLevel;
      const cost = isMax ? null : Math.floor(cfg.baseCost * Math.pow(cfg.costMultiplier, level));
      return {
        ...cfg,
        level,
        isMax,
        cost
      };
    });
  }

  getFacility(facilityId) {
    const cfg = this.configs.get(facilityId);
    if (!cfg) return null;
    const level = this.saveManager.getFacilityLevel(facilityId);
    const isMax = level >= cfg.maxLevel;
    const cost = isMax ? null : Math.floor(cfg.baseCost * Math.pow(cfg.costMultiplier, level));
    return {
      ...cfg,
      level,
      isMax,
      cost
    };
  }

  canUpgrade(facilityId) {
    const f = this.getFacility(facilityId);
    if (!f || f.isMax) return false;
    return this.saveManager.getCoins() >= f.cost;
  }

  upgrade(facilityId) {
    const f = this.getFacility(facilityId);
    if (!f || f.isMax) return false;
    if (this.saveManager.spendCoins(f.cost)) {
      const newLevel = f.level + 1;
      this.saveManager.setFacilityLevel(facilityId, newLevel);
      this.notify(facilityId, newLevel);
      return true;
    }
    return false;
  }

  // 计算加成数值
  getStartSeedsBonus() {
    const lvl = this.saveManager.getFacilityLevel('soil_quality');
    const cfg = this.configs.get('soil_quality');
    return lvl * (cfg?.bonusPerLevel?.startSeeds || 5);
  }

  getCoinBonusPercent() {
    const lvl = this.saveManager.getFacilityLevel('soil_quality');
    const cfg = this.configs.get('soil_quality');
    return lvl * (cfg?.bonusPerLevel?.coinBonusPercent || 10);
  }

  getMaxHPBonus() {
    const lvl = this.saveManager.getFacilityLevel('fountain');
    const cfg = this.configs.get('fountain');
    return lvl * (cfg?.bonusPerLevel?.maxHP || 2);
  }

  getRRateBoost() {
    const lvl = this.saveManager.getFacilityLevel('sun_altar');
    const cfg = this.configs.get('sun_altar');
    return lvl * (cfg?.bonusPerLevel?.rRateBoost || 3);
  }

  getThornEffects() {
    const lvl = this.saveManager.getFacilityLevel('thorn_fence');
    const cfg = this.configs.get('thorn_fence');
    if (lvl <= 0) return { slowPercent: 0, thornDPS: 0 };
    return {
      slowPercent: lvl * (cfg?.bonusPerLevel?.slowPercent || 10),
      thornDPS: lvl * (cfg?.bonusPerLevel?.thornDPS || 5)
    };
  }

  onUpgrade(callback) {
    this.listeners.push(callback);
  }

  notify(facilityId, level) {
    this.listeners.forEach(cb => cb({ facilityId, level }));
  }
}
