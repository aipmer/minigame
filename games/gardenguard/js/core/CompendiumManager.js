export class CompendiumManager {
  constructor(plantRegistry, enemyRegistry, saveManager) {
    this.plantRegistry = plantRegistry;
    this.enemyRegistry = enemyRegistry;
    this.saveManager = saveManager;
  }

  getPlantEntries() {
    const allConfigs = this.plantRegistry.getAllConfigs();
    const compData = this.saveManager.getCompendium().plants || {};

    return allConfigs.map(cfg => {
      const record = compData[cfg.id];
      const isUnlocked = Boolean(record && record.unlocked);
      const maxStar = record ? record.maxStar : 0;

      return {
        id: cfg.id,
        name: cfg.name,
        series: cfg.series,
        rarity: cfg.rarity,
        color: cfg.color,
        description: cfg.description,
        attackType: cfg.attackType,
        baseATK: cfg.baseATK,
        baseAtkSpeed: cfg.baseAtkSpeed,
        range: cfg.range,
        skill5Star: cfg.skill5Star,
        unlocked: isUnlocked,
        maxStar: maxStar
      };
    });
  }

  getEnemyEntries() {
    const allEnemies = Array.from(this.enemyRegistry.configs.values());
    const compData = this.saveManager.getCompendium().enemies || {};

    return allEnemies.map(cfg => {
      const record = compData[cfg.id];
      const isEncountered = Boolean(record && record.encountered);
      const kills = record ? (record.kills || 0) : 0;

      return {
        id: cfg.id,
        name: cfg.name,
        type: cfg.type,
        color: cfg.color,
        description: cfg.description,
        baseHP: cfg.baseHP,
        speed: cfg.speed,
        damage: cfg.damage,
        reward: cfg.reward,
        ability: cfg.ability || null,
        splitOnDeath: cfg.splitOnDeath || null,
        encountered: isEncountered,
        kills: kills
      };
    });
  }

  getStats() {
    const plants = this.getPlantEntries();
    const enemies = this.getEnemyEntries();

    const unlockedPlants = plants.filter(p => p.unlocked).length;
    const encounteredEnemies = enemies.filter(e => e.encountered).length;

    const totalPlants = plants.length || 8;
    const totalEnemies = enemies.length || 6;

    return {
      plantCount: unlockedPlants,
      totalPlants,
      enemyCount: encounteredEnemies,
      totalEnemies,
      overallPercent: Math.round(((unlockedPlants + encounteredEnemies) / (totalPlants + totalEnemies)) * 100)
    };
  }
}
