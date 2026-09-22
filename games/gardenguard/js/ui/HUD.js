export class HUD {
  constructor() {
    this.elements = {
      waveNum: document.getElementById('hud-wave-num'),
      waveTimerFill: document.getElementById('wave-timer-fill'),
      hpBarFill: document.getElementById('hp-bar-fill'),
      hpText: document.getElementById('hud-hp-text'),
      seedsNum: document.getElementById('hud-seeds-num'),
      scoreNum: document.getElementById('hud-score-num'),
      summonBtn: document.getElementById('btn-summon'),
    };
  }

  show() {
    document.getElementById('hud').classList.remove('hidden');
  }

  hide() {
    document.getElementById('hud').classList.add('hidden');
  }

  updateWave(waveNum) {
    if (this.elements.waveNum) {
      this.elements.waveNum.textContent = waveNum;
    }
  }

  updateWaveTimer(ratio) {
    if (this.elements.waveTimerFill) {
      this.elements.waveTimerFill.style.width = `${ratio * 100}%`;
    }
  }

  updateHP(current, max) {
    if (this.elements.hpBarFill) {
      const ratio = Math.max(0, Math.min(1, current / max));
      this.elements.hpBarFill.style.width = `${ratio * 100}%`;
      
      // Update color based on ratio
      if (ratio > 0.6) {
        this.elements.hpBarFill.style.backgroundColor = '#4CAF50'; // Green
      } else if (ratio > 0.3) {
        this.elements.hpBarFill.style.backgroundColor = '#FFC107'; // Yellow
      } else {
        this.elements.hpBarFill.style.backgroundColor = '#F44336'; // Red
      }
    }
    if (this.elements.hpText) {
      this.elements.hpText.textContent = `${current}/${max}`;
    }
  }

  updateSeeds(amount) {
    if (this.elements.seedsNum) {
      this.elements.seedsNum.textContent = amount;
    }
  }

  updateScore(score) {
    if (this.elements.scoreNum) {
      this.elements.scoreNum.textContent = score;
    }
  }

  setSummonEnabled(enabled) {
    if (this.elements.summonBtn) {
      this.elements.summonBtn.disabled = !enabled;
    }
  }

  setSummonCost(cost) {
    const costVal = document.getElementById('btn-summon-cost-val');
    if (costVal) {
      costVal.textContent = cost;
    } else if (this.elements.summonBtn) {
      const costLabel = this.elements.summonBtn.querySelector('.btn-cost');
      if (costLabel) {
        costLabel.innerHTML = `<img src="assets/icons/icon_sprout.png" class="btn-cost-icon" alt="消耗"> ${cost}`;
      }
    }
  }
}
