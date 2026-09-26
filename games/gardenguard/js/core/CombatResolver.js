export class CombatResolver {
  constructor(grid, getPlantWorldPos) {
    this.grid = grid;
    // 外部提供的方法，返回 { x, y, z } 的世界坐标
    this.getPlantWorldPos = getPlantWorldPos;
    this.projectileListeners = [];
    this.killListeners = [];
  }

  update(dt, activeEnemies) {
    const results = { projectiles: [], kills: [] };

    const slots = this.grid.slots.filter(s => s.plant !== null);
    
    for (const slot of slots) {
      const plant = slot.plant;
      plant.cooldownTimer -= dt;
      
      const plantWorldPos = this.getPlantWorldPos(slot.row, slot.col);
      if (!plantWorldPos) continue;
      
      // 实时索敌：每帧锁定射程内最靠前的活跃目标，供守卫实时瞄准转向
      const target = this.selectTarget(plant, plantWorldPos, activeEnemies);
      plant.currentTarget = target;
      
      if (plant.cooldownTimer <= 0 && target) {
        plant.cooldownTimer = plant.getAtkInterval();
        const projectile = {
          plantUid: plant.uid,
          from: plantWorldPos,
          targetEnemy: target, 
          type: plant.projectileType,
          speed: plant.projectileSpeed,
          damage: plant.getATK(),
          aoeRadius: plant.aoeRadius,
          slowFactor: plant.slowFactor,
          slowDuration: plant.slowDuration
        };
        results.projectiles.push(projectile);
        this.projectileListeners.forEach(cb => cb(projectile));
      }
    }
    return results;
  }
  
  getEnemiesInRange(plant, plantWorldPos, enemies) {
    return enemies.filter(enemy => {
      if (!enemy.alive) return false;
      // 假设外部更新系统会给 enemy.worldPos 赋值
      if (enemy.worldPos && plantWorldPos) {
        const dx = enemy.worldPos.x - plantWorldPos.x;
        const dz = enemy.worldPos.z - plantWorldPos.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        return dist <= plant.range;
      }
      return false; 
    });
  }
  
  selectTarget(plant, plantWorldPos, enemies) {
    const inRange = this.getEnemiesInRange(plant, plantWorldPos, enemies);
    if (inRange.length === 0) return null;
    
    // 选择射程内路径进度最高（最接近终点）的敌人
    let best = inRange[0];
    for (let i = 1; i < inRange.length; i++) {
      if (inRange[i].pathProgress > best.pathProgress) {
        best = inRange[i];
      }
    }
    return best;
  }
  
  onProjectileFired(callback) {
    this.projectileListeners.push(callback);
  }

  onEnemyKilled(callback) {
    this.killListeners.push(callback);
  }
}
