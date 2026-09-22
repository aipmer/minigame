export class SummonButton {
  constructor() {
    this.btn = document.getElementById('btn-summon');
    if (this.btn) {
      this.costLabel = this.btn.querySelector('.btn-cost');
    }
  }

  setEnabled(enabled) { 
    if (this.btn) {
      this.btn.disabled = !enabled; 
    }
  }

  setCost(cost) { 
    const costVal = document.getElementById('btn-summon-cost-val');
    if (costVal) {
      costVal.textContent = cost;
    } else if (this.costLabel) {
      this.costLabel.innerHTML = `<img src="assets/icons/icon_sprout.png" class="btn-cost-icon" alt="消耗"> ${cost}`; 
    }
  }

  onClick(callback) { 
    if (this.btn) {
      this.btn.addEventListener('click', callback); 
    }
  }
}
