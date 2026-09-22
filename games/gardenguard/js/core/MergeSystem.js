export class MergeSystem {
  constructor(grid) {
    this.grid = grid;
    this.mergeListeners = [];
    this.ultimateListeners = [];
  }

  canMerge(slotA, slotB) {
    return this.grid.canMerge(slotA, slotB);
  }

  merge(slotA, slotB) {
    if (!this.canMerge(slotA, slotB)) return false;
    
    // 合成规则：两个相同植物类型 + 相同星级 → 升一星
    // slotB 的植物移到 slotA，slotB 清空
    // 新植物星级 = 原星级 + 1
    const pA = slotA.plant;
    const pB = slotB.plant;
    
    const newStar = pA.star + 1;
    pA.star = newStar;
    this.grid.removePlant(slotB);
    
    this.mergeListeners.forEach(cb => cb({ slot: slotA, plant: pA, newStar }));
    
    // 如果达到 5 星 → 触发 'ultimate_skill' 事件
    if (newStar === 5) {
      this.ultimateListeners.forEach(cb => cb({ slot: slotA, plant: pA }));
    }
    
    return true;
  }

  onMerge(callback) {
    this.mergeListeners.push(callback);
  }

  onUltimate(callback) {
    this.ultimateListeners.push(callback);
  }
}
