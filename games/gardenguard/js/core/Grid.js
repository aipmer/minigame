export class GridSlot {
  constructor(row, col) {
    this.row = row;
    this.col = col;
    this.plant = null;
  }
}

export class Grid {
  constructor(rows = 4, cols = 4) {
    this.rows = rows;
    this.cols = cols;
    this.slots = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        this.slots.push(new GridSlot(r, c));
      }
    }
  }

  getSlot(row, col) {
    if (row < 0 || row >= this.rows || col < 0 || col >= this.cols) return null;
    return this.slots[row * this.cols + col];
  }

  getSlotByIndex(index) {
    if (index < 0 || index >= this.slots.length) return null;
    return this.slots[index];
  }

  getEmptySlots() {
    return this.slots.filter(slot => slot.plant === null);
  }

  placePlant(slot, plant) {
    if (slot && slot.plant === null) {
      slot.plant = plant;
      return true;
    }
    return false;
  }

  removePlant(slot) {
    if (slot && slot.plant !== null) {
      const plant = slot.plant;
      slot.plant = null;
      return plant;
    }
    return null;
  }

  swapPlants(slotA, slotB) {
    if (slotA && slotB) {
      const temp = slotA.plant;
      slotA.plant = slotB.plant;
      slotB.plant = temp;
      return true;
    }
    return false;
  }

  canMerge(slotA, slotB) {
    if (!slotA || !slotB || !slotA.plant || !slotB.plant) return false;
    if (slotA === slotB) return false;
    const pA = slotA.plant;
    const pB = slotB.plant;
    return pA.id === pB.id && pA.star === pB.star && pA.star < 5;
  }

  getAllPlants() {
    return this.slots.filter(slot => slot.plant !== null).map(slot => slot.plant);
  }

  clear() {
    this.slots.forEach(slot => slot.plant = null);
  }
}
