export class FacilityModal {
  constructor(facilityManager, saveManager) {
    this.facilityManager = facilityManager;
    this.saveManager = saveManager;
    this.modalEl = document.getElementById('facility-modal');
    this.listEl = document.getElementById('facility-list');
    this.coinsEl = document.getElementById('facility-coins');
    this.closeBtn = document.getElementById('btn-close-facility');

    if (this.closeBtn) {
      this.closeBtn.addEventListener('click', () => this.hide());
    }

    this.facilityManager.onUpgrade(() => {
      this.render();
    });

    this.saveManager.onChange(() => {
      if (this.isOpen()) {
        this.renderCoins();
      }
    });
  }

  show() {
    if (!this.modalEl) return;
    this.modalEl.classList.remove('hidden');
    this.render();
  }

  hide() {
    if (!this.modalEl) return;
    this.modalEl.classList.add('hidden');
  }

  isOpen() {
    return this.modalEl && !this.modalEl.classList.contains('hidden');
  }

  renderCoins() {
    const numEl = document.getElementById('facility-coins-num');
    if (numEl) {
      numEl.textContent = this.saveManager.getCoins();
    } else if (this.coinsEl) {
      this.coinsEl.innerHTML = `<img src="assets/icons/icon_coin.png" class="pill-icon" alt="金币"> ${this.saveManager.getCoins()}`;
    }
  }

  render() {
    this.renderCoins();
    if (!this.listEl) return;

    const facilities = this.facilityManager.getAllFacilities();
    const userCoins = this.saveManager.getCoins();

    this.listEl.innerHTML = '';

    facilities.forEach(f => {
      const item = document.createElement('div');
      item.className = 'facility-card';

      const canAfford = !f.isMax && userCoins >= f.cost;
      const costHtml = f.isMax ? '已满级' : `<img src="assets/icons/icon_coin.png" class="pill-icon" alt=""> ${f.cost}`;
      const iconSrc = f.icon?.startsWith('icon_') ? `assets/icons/${f.icon}` : 'assets/icons/icon_facility.png';

      // 等级显示
      item.innerHTML = `
        <div class="facility-header">
          <div class="facility-icon">
            <img src="${iconSrc}" class="facility-icon-img" alt="${f.name}">
          </div>
          <div class="facility-info">
            <div class="facility-title-row">
              <span class="facility-name">${f.name}</span>
              <span class="facility-level">等级 ${f.level}/${f.maxLevel}</span>
            </div>
            <p class="facility-desc">${f.description}</p>
          </div>
        </div>
        <div class="facility-action">
          <button class="toy-btn upgrade-btn ${f.isMax ? 'btn-max' : ''}" data-id="${f.id}" ${(!canAfford || f.isMax) ? 'disabled' : ''}>
            <span class="btn-label">${f.isMax ? '已满级' : '升级'}</span>
            <span class="btn-cost">${costHtml}</span>
          </button>
        </div>
      `;

      const btn = item.querySelector('.upgrade-btn');
      if (btn && !f.isMax) {
        btn.addEventListener('click', () => {
          this.facilityManager.upgrade(f.id);
        });
      }

      this.listEl.appendChild(item);
    });
  }
}
