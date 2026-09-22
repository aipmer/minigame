export class GardenHP {
  constructor(maxHP = 10) {
    this.maxHP = maxHP;
    this.hp = maxHP;
    this.damageListeners = [];
    this.deathListeners = [];
  }

  takeDamage(amount) {
    if (this.hp <= 0) return;
    this.hp = Math.max(0, this.hp - amount);
    this.damageListeners.forEach(cb => cb(amount, this.hp));
    
    if (this.hp <= 0) {
      this.deathListeners.forEach(cb => cb());
    }
  }

  heal(amount) {
    if (this.hp <= 0) return;
    this.hp = Math.min(this.maxHP, this.hp + amount);
  }

  getHP() {
    return this.hp;
  }

  getRatio() {
    return this.hp / this.maxHP;
  }

  onDamage(callback) {
    this.damageListeners.push(callback);
  }

  onDeath(callback) {
    this.deathListeners.push(callback);
  }

  reset() {
    this.hp = this.maxHP;
  }
}
