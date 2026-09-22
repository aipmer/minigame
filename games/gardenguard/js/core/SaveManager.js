export class SaveManager {
  static STORAGE_KEY = 'gardenguard_save_data';

  constructor() {
    this.data = this.getDefaultData();
    this.listeners = [];
  }

  getDefaultData() {
    return {
      version: 1,
      coins: 0,
      stats: {
        highWave: 0,
        highScore: 0,
        totalKills: 0,
        totalGames: 0
      },
      facilities: {
        soil_quality: 0,
        fountain: 0,
        sun_altar: 0,
        thorn_fence: 0
      },
      compendium: {
        plants: {},
        enemies: {}
      }
    };
  }

  load() {
    try {
      const raw = localStorage.getItem(SaveManager.STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        this.data = {
          ...this.getDefaultData(),
          ...parsed,
          stats: { ...this.getDefaultData().stats, ...(parsed.stats || {}) },
          facilities: { ...this.getDefaultData().facilities, ...(parsed.facilities || {}) },
          compendium: { ...this.getDefaultData().compendium, ...(parsed.compendium || {}) }
        };
      }
    } catch (e) {
      console.warn('Failed to read save from localStorage, fallback to default:', e);
      this.data = this.getDefaultData();
    }
    return this.data;
  }

  save() {
    try {
      localStorage.setItem(SaveManager.STORAGE_KEY, JSON.stringify(this.data));
      this.notify();
    } catch (e) {
      console.error('Failed to write save to localStorage:', e);
    }
  }

  getCoins() {
    return this.data.coins || 0;
  }

  addCoins(amount) {
    if (amount <= 0) return;
    this.data.coins = (this.data.coins || 0) + amount;
    this.save();
  }

  spendCoins(amount) {
    if (this.data.coins >= amount) {
      this.data.coins -= amount;
      this.save();
      return true;
    }
    return false;
  }

  getFacilityLevel(facilityId) {
    return this.data.facilities[facilityId] || 0;
  }

  setFacilityLevel(facilityId, level) {
    this.data.facilities[facilityId] = level;
    this.save();
  }

  recordGameStats({ wave, score, kills }) {
    this.data.stats.totalGames = (this.data.stats.totalGames || 0) + 1;
    this.data.stats.totalKills = (this.data.stats.totalKills || 0) + (kills || 0);
    if (wave > (this.data.stats.highWave || 0)) {
      this.data.stats.highWave = wave;
    }
    if (score > (this.data.stats.highScore || 0)) {
      this.data.stats.highScore = score;
    }
    this.save();
  }

  unlockPlant(plantId, star = 1) {
    if (!this.data.compendium.plants[plantId]) {
      this.data.compendium.plants[plantId] = {
        unlocked: true,
        maxStar: star,
        firstUnlockedAt: Date.now()
      };
    } else {
      if (star > this.data.compendium.plants[plantId].maxStar) {
        this.data.compendium.plants[plantId].maxStar = star;
      }
    }
    this.save();
  }

  unlockEnemy(enemyId) {
    if (!this.data.compendium.enemies[enemyId]) {
      this.data.compendium.enemies[enemyId] = {
        encountered: true,
        kills: 1,
        firstSeenAt: Date.now()
      };
    } else {
      this.data.compendium.enemies[enemyId].kills = (this.data.compendium.enemies[enemyId].kills || 0) + 1;
    }
    this.save();
  }

  getStats() {
    return this.data.stats;
  }

  getCompendium() {
    return this.data.compendium;
  }

  onChange(callback) {
    this.listeners.push(callback);
  }

  notify() {
    this.listeners.forEach(cb => cb(this.data));
  }
}
