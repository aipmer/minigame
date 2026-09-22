export class CompendiumModal {
  constructor(compendiumManager) {
    this.compendiumManager = compendiumManager;
    this.modalEl = document.getElementById('compendium-modal');
    this.listEl = document.getElementById('compendium-list');
    this.tabPlantsBtn = document.getElementById('tab-plants');
    this.tabEnemiesBtn = document.getElementById('tab-enemies');
    this.closeBtn = document.getElementById('btn-close-compendium');
    this.statsEl = document.getElementById('compendium-stats-text');

    this.activeTab = 'plants'; // 'plants' | 'enemies'

    if (this.tabPlantsBtn) {
      this.tabPlantsBtn.addEventListener('click', () => {
        this.activeTab = 'plants';
        this.updateTabs();
        this.render();
      });
    }

    if (this.tabEnemiesBtn) {
      this.tabEnemiesBtn.addEventListener('click', () => {
        this.activeTab = 'enemies';
        this.updateTabs();
        this.render();
      });
    }

    if (this.closeBtn) {
      this.closeBtn.addEventListener('click', () => this.hide());
    }
  }

  show() {
    if (!this.modalEl) return;
    this.modalEl.classList.remove('hidden');
    this.updateTabs();
    this.render();
  }

  hide() {
    if (!this.modalEl) return;
    this.modalEl.classList.add('hidden');
  }

  updateTabs() {
    if (this.tabPlantsBtn && this.tabEnemiesBtn) {
      if (this.activeTab === 'plants') {
        this.tabPlantsBtn.classList.add('active-tab');
        this.tabEnemiesBtn.classList.remove('active-tab');
      } else {
        this.tabEnemiesBtn.classList.add('active-tab');
        this.tabPlantsBtn.classList.remove('active-tab');
      }
    }
  }

  render() {
    if (!this.listEl) return;

    const stats = this.compendiumManager.getStats();
    if (this.statsEl) {
      this.statsEl.textContent = `收集进度: ${stats.overallPercent}% (植物 ${stats.plantCount}/${stats.totalPlants} · 害虫 ${stats.enemyCount}/${stats.totalEnemies})`;
    }

    this.listEl.innerHTML = '';

    if (this.activeTab === 'plants') {
      const plants = this.compendiumManager.getPlantEntries();
      const seriesMap = {
        'shooter': { name: '射击系', icon: 'icon_target.png' },
        'aoe': { name: '群伤系', icon: 'icon_fire.png' },
        'slow': { name: '减速系', icon: 'icon_frost.png' },
        'burst': { name: '爆发系', icon: 'icon_bomb.png' },
      };
      const rarityMap = {
        'N': '普通',
        'R': '稀有',
        'SR': '卓越',
        'SSR': '史诗'
      };

      plants.forEach(p => {
        const card = document.createElement('div');
        card.className = `compendium-card ${p.unlocked ? 'unlocked' : 'locked'}`;

        let starIcons = '';
        for (let s = 1; s <= 5; s++) {
          if (s <= p.maxStar) {
            starIcons += `<img src="assets/icons/icon_star.png" class="comp-star-icon" alt="星级">`;
          } else {
            starIcons += `<span class="comp-star-empty"></span>`;
          }
        }

        const seriesInfo = seriesMap[p.series] || { name: '综合系', icon: 'icon_sprout.png' };
        const rarityText = rarityMap[p.rarity] || p.rarity;

        if (p.unlocked) {
          card.innerHTML = `
            <div class="comp-icon-box" style="background-color: ${p.color || '#4CAF50'}22; border-color: ${p.color || '#4CAF50'}">
              <span class="comp-badge-rarity">${rarityText}</span>
              <img src="assets/icons/${seriesInfo.icon}" class="comp-icon-img" alt="${p.name}">
            </div>
            <div class="comp-details">
              <div class="comp-name">${p.name}</div>
              <div class="comp-series">系列: ${seriesInfo.name}</div>
              <div class="comp-stars">${starIcons}</div>
              <div class="comp-desc">${p.description}</div>
              <div class="comp-skill"><strong>5 星绝技:</strong> ${p.skill5Star?.name || '无'} - ${p.skill5Star?.desc || ''}</div>
            </div>
          `;
        } else {
          card.innerHTML = `
            <div class="comp-icon-box locked-box">
              <span class="comp-icon-question">？</span>
            </div>
            <div class="comp-details">
              <div class="comp-name">未解锁植物</div>
              <div class="comp-desc">在战斗中通过抽卡与合成即可解锁此图鉴。</div>
            </div>
          `;
        }
        this.listEl.appendChild(card);
      });
    } else {
      const enemies = this.compendiumManager.getEnemyEntries();
      enemies.forEach(e => {
        const card = document.createElement('div');
        card.className = `compendium-card ${e.encountered ? 'unlocked' : 'locked'}`;

        if (e.encountered) {
          card.innerHTML = `
            <div class="comp-icon-box" style="background-color: ${e.color || '#E91E63'}22; border-color: ${e.color || '#E91E63'}">
              <span class="comp-badge-rarity">${e.type === 'elite' ? '精英' : '普通'}</span>
              <img src="assets/icons/icon_skull.png" class="comp-icon-img" alt="${e.name}">
            </div>
            <div class="comp-details">
              <div class="comp-name">${e.name}</div>
              <div class="comp-stats">生命: ${e.baseHP} · 速度: ${e.speed} · 伤害: ${e.damage}</div>
              <div class="comp-desc">${e.description}</div>
              <div class="comp-kills">击败次数: <span class="kills-val">${e.kills}</span></div>
            </div>
          `;
        } else {
          card.innerHTML = `
            <div class="comp-icon-box locked-box">
              <span class="comp-icon-question">？</span>
            </div>
            <div class="comp-details">
              <div class="comp-name">未知害虫</div>
              <div class="comp-desc">在守卫波次推进中遭遇即可点亮此图鉴。</div>
            </div>
          `;
        }
        this.listEl.appendChild(card);
      });
    }
  }
}
