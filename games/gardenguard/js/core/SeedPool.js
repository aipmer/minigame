export class SeedPool {
  constructor(plantRegistry) {
    this.plantRegistry = plantRegistry;
    this.config = null;
    this.pullsSinceR = 0;
  }

  async loadConfig() {
    try {
      const response = await fetch('config/drops.json');
      this.config = await response.json();
    } catch (e) {
      console.error('Failed to load drops config:', e);
      // Fallback
      this.config = {
        rates: { N: 0.7, R: 0.25, SR: 0.05 },
        pity: 10
      };
    }
  }

  pull(currentWave = 0) {
    const allPlants = this.plantRegistry.getAllConfigs();
    if (allPlants.length === 0) return null;
    
    const weights = this.config?.seedPoolWeights || { N: 70, R: 30 };
    let rWeight = weights.R || 30;
    let nWeight = weights.N || 70;

    // 新手 boost: 前 3 波 R 概率 +15%
    const boost = this.config?.newPlayerBoost;
    if (boost?.enabled && currentWave <= (boost.boostWaves || 3)) {
      rWeight += (boost.rRateBoost || 15);
    }

    // 保底：连续 N 次没出 R，下一次必出 R
    const maxPity = this.config?.pitySystem?.maxPullsWithoutR || 5;
    if (this.pullsSinceR >= maxPity) {
      rWeight = 100;
      nWeight = 0;
    }

    const totalWeight = nWeight + rWeight;
    const rand = Math.random() * totalWeight;
    let rarity = rand < rWeight ? 'R' : 'N';
    
    if (rarity !== 'N') {
      this.pullsSinceR = 0;
    } else {
      this.pullsSinceR++;
    }
    
    const candidates = allPlants.filter(p => p.rarity === rarity);
    const chosen = candidates.length > 0 
      ? candidates[Math.floor(Math.random() * candidates.length)] 
      : allPlants[0];
    
    return this.plantRegistry.createPlant(chosen.id, 1);
  }

  reset() {
    this.pullsSinceR = 0;
  }
}
