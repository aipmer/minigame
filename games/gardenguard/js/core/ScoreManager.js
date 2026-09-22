export class ScoreManager {
  constructor() {
    this.score = 0;
    this.seeds = 0;
    this.kills = 0;
    this.maxStar = 0;
    this.listeners = [];
  }

  addScore(amount) {
    this.score += amount;
    this.notify();
  }

  addSeeds(amount) {
    this.seeds += amount;
    this.notify();
  }

  spendSeeds(amount) {
    if (this.seeds >= amount) {
      this.seeds -= amount;
      this.notify();
      return true;
    }
    return false;
  }

  canAfford(amount) {
    return this.seeds >= amount;
  }

  recordKill() {
    this.kills += 1;
    this.notify();
  }

  recordStar(star) {
    if (star > this.maxStar) {
      this.maxStar = star;
      this.notify();
    }
  }

  getResults() {
    return { score: this.score, seeds: this.seeds, kills: this.kills, maxStar: this.maxStar };
  }

  onChange(callback) {
    this.listeners.push(callback);
  }
  
  notify() {
    const results = this.getResults();
    this.listeners.forEach(cb => cb(results));
  }

  reset() {
    this.score = 0;
    this.seeds = 0;
    this.kills = 0;
    this.maxStar = 0;
    this.notify();
  }
}
