// ShopModalUI.js — MiniGame 3D 装扮商城与荣誉成就弹窗
// 严格执行四大铁律：100% 纯中文零英文、零原生 Emoji、3D 粘土质感、全端 UI 零溢出

export class ShopModalUI {
  constructor({
    economyManager,
    skinManager,
    achievementManager,
    soundManager,
    iconBasePath = 'assets/icons/'
  }) {
    this.economy = economyManager;
    this.skin = skinManager;
    this.achievements = achievementManager;
    this.sound = soundManager;
    this.iconBasePath = iconBasePath.endsWith('/') ? iconBasePath : iconBasePath + '/';
    this.currentTab = 'skin'; // 'skin' | 'trail'

    this._injectStyles();
    this._createDOM();
    this._bindEvents();

    // 监听金币变动以实时更新界面金币显示
    this.economy.subscribe(() => this.updateCoinDisplay());

    // 监听成就达成以触发实时横幅广播
    this.achievements.onUnlock((ach) => {
      this.showAchievementToast(ach);
      if (this.sound && this.sound.playLevelUp) {
        this.sound.playLevelUp();
      }
    });
  }

  _injectStyles() {
    if (!document.getElementById('shop-global-css')) {
      const link = document.createElement('link');
      link.id = 'shop-global-css';
      link.rel = 'stylesheet';
      link.href = '/css/shop.css';
      document.head.appendChild(link);
    }
  }

  _createDOM() {
    // ── 1. 装扮商城弹窗 ──
    const shopModal = document.createElement('div');
    shopModal.id = 'shop-modal';
    shopModal.className = 'shop-modal-overlay hidden';
    shopModal.innerHTML = `
      <div class="shop-modal-card">
        <div class="shop-header">
          <div class="shop-header-top">
            <div class="shop-title-wrap">
              <img src="${this.iconBasePath}icon_wardrobe.png" alt="装扮商城" class="shop-title-icon">
              <h2 class="shop-title">装扮商城</h2>
            </div>
            <div class="shop-coin-pill">
              <img src="${this.iconBasePath}icon_coin.png" alt="金币" class="shop-coin-icon">
              <span id="shop-coin-count" class="shop-coin-text">0</span>
            </div>
            <button class="shop-close-btn" id="shop-close" title="关闭" aria-label="关闭">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
          </div>
          <div class="shop-tabs">
            <button class="shop-tab-btn active" data-tab="skin">角色皮肤</button>
            <button class="shop-tab-btn" data-tab="trail">流光拖尾</button>
          </div>
        </div>
        <div class="shop-list-container" id="shop-list"></div>
      </div>
    `;
    document.body.appendChild(shopModal);
    this.shopModal = shopModal;

    // ── 2. 荣誉成就图鉴弹窗 ──
    const achModal = document.createElement('div');
    achModal.id = 'achievement-modal';
    achModal.className = 'shop-modal-overlay hidden';
    achModal.innerHTML = `
      <div class="shop-modal-card">
        <div class="shop-header">
          <div class="shop-header-top">
            <div class="shop-title-wrap">
              <img src="${this.iconBasePath}icon_crown.png" alt="荣誉成就" class="shop-title-icon">
              <h2 class="shop-title">荣誉成就</h2>
            </div>
            <div class="shop-progress-badge" id="ach-progress-badge">达成 0/6 项</div>
            <button class="shop-close-btn" id="ach-close" title="关闭" aria-label="关闭">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
          </div>
        </div>
        <div class="ach-list-container" id="ach-list"></div>
      </div>
    `;
    document.body.appendChild(achModal);
    this.achModal = achModal;

    // ── 3. 局内成就即时荣誉广播横幅 ──
    const toast = document.createElement('div');
    toast.id = 'achievement-toast';
    toast.className = 'ach-toast-banner hidden';
    toast.innerHTML = `
      <img src="${this.iconBasePath}icon_crown.png" alt="成就" class="ach-toast-icon">
      <div class="ach-toast-content">
        <div class="ach-toast-title">荣誉解锁！</div>
        <div class="ach-toast-desc" id="ach-toast-desc">首胜试炼 (+50 金币)</div>
      </div>
    `;
    document.body.appendChild(toast);
    this.toast = toast;
  }

  _bindEvents() {
    // 关闭按钮
    document.getElementById('shop-close').addEventListener('click', () => this.closeShop());
    document.getElementById('ach-close').addEventListener('click', () => this.closeAchievements());

    // 点击遮罩空白区域关闭
    this.shopModal.addEventListener('click', (e) => {
      if (e.target === this.shopModal) this.closeShop();
    });
    this.achModal.addEventListener('click', (e) => {
      if (e.target === this.achModal) this.closeAchievements();
    });

    // 阻止弹窗内触控冒泡
    const stopPropagation = (e) => e.stopPropagation();
    this.shopModal.querySelector('.shop-modal-card').addEventListener('touchstart', stopPropagation, { passive: true });
    this.achModal.querySelector('.shop-modal-card').addEventListener('touchstart', stopPropagation, { passive: true });

    // 商城 Tab 切换
    const tabs = this.shopModal.querySelectorAll('.shop-tab-btn');
    tabs.forEach(btn => {
      btn.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        btn.classList.add('active');
        this.currentTab = btn.getAttribute('data-tab');
        this.renderShopItems();
      });
    });
  }

  updateCoinDisplay() {
    const el = document.getElementById('shop-coin-count');
    if (el) {
      el.textContent = this.economy.getCoins();
    }
  }

  openShop() {
    this.updateCoinDisplay();
    this.renderShopItems();
    this.shopModal.classList.remove('hidden');
  }

  closeShop() {
    this.shopModal.classList.add('hidden');
  }

  openAchievements() {
    this.renderAchievements();
    this.achModal.classList.remove('hidden');
  }

  closeAchievements() {
    this.achModal.classList.add('hidden');
  }

  // 渲染商城列表（皮肤或拖尾）
  renderShopItems() {
    const listEl = document.getElementById('shop-list');
    if (!listEl) return;
    listEl.innerHTML = '';

    const currentCoins = this.economy.getCoins();

    if (this.currentTab === 'skin') {
      const skins = this.skin.SKINS;
      skins.forEach(skin => {
        const isEquipped = (this.skin.equippedSkinId === skin.id);
        const isUnlocked = this.skin.unlockedSkins.includes(skin.id);

        const card = document.createElement('div');
        card.className = `shop-item-card ${isEquipped ? 'equipped' : ''}`;

        // 颜色渐变圆盘预览
        const colorHex = '#' + skin.headColor.toString(16).padStart(6, '0');
        const colorHex2 = '#' + skin.bodyColor2.toString(16).padStart(6, '0');

        card.innerHTML = `
          <div class="shop-item-preview" style="background: linear-gradient(135deg, ${colorHex} 0%, ${colorHex2} 100%);">
            ${isEquipped ? '<div class="shop-item-tag">当前使用</div>' : ''}
          </div>
          <div class="shop-item-info">
            <div class="shop-item-name">${skin.name}</div>
            <div class="shop-item-desc">${skin.desc}</div>
          </div>
          <div class="shop-item-action">
            ${isEquipped
              ? '<button class="shop-btn-state equipped" disabled>已装备</button>'
              : isUnlocked
                ? `<button class="shop-btn-action use" data-action="equip" data-id="${skin.id}">使用</button>`
                : skin.isAchievementOnly
                  ? `<button class="shop-btn-state locked" disabled>需成就「${skin.achievementName}」</button>`
                  : `<button class="shop-btn-action buy ${currentCoins < skin.price ? 'disabled' : ''}" data-action="buy" data-id="${skin.id}">
                      <img src="${this.iconBasePath}icon_coin.png" alt="金币" class="ui-icon-btn-xs"> ${skin.price} 金币
                    </button>`
            }
          </div>
        `;

        const btn = card.querySelector('.shop-btn-action');
        if (btn) {
          btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const action = btn.getAttribute('data-action');
            const id = btn.getAttribute('data-id');
            if (action === 'equip') {
              this.skin.equipSkin(id);
              this.renderShopItems();
            } else if (action === 'buy') {
              const success = this.skin.buySkin(id, this.economy);
              if (success) {
                if (this.sound && this.sound.playEatCombo) this.sound.playEatCombo(2);
                this.renderShopItems();
              }
            }
          });
        }

        listEl.appendChild(card);
      });
    } else {
      // 流光拖尾
      const trails = this.skin.TRAILS;
      trails.forEach(trail => {
        const isEquipped = (this.skin.equippedTrailId === trail.id);
        const isUnlocked = this.skin.unlockedTrails.includes(trail.id);

        const card = document.createElement('div');
        card.className = `shop-item-card ${isEquipped ? 'equipped' : ''}`;

        const colorHex = trail.colorHex ? '#' + trail.colorHex.toString(16).padStart(6, '0') : '#94A3B8';

        card.innerHTML = `
          <div class="shop-item-preview" style="background: radial-gradient(circle, ${colorHex} 0%, #0F172A 100%);">
            ${isEquipped ? '<div class="shop-item-tag">当前使用</div>' : ''}
          </div>
          <div class="shop-item-info">
            <div class="shop-item-name">${trail.name}</div>
            <div class="shop-item-desc">${trail.desc}</div>
          </div>
          <div class="shop-item-action">
            ${isEquipped
              ? '<button class="shop-btn-state equipped" disabled>已装备</button>'
              : isUnlocked
                ? `<button class="shop-btn-action use" data-action="equip-trail" data-id="${trail.id}">使用</button>`
                : `<button class="shop-btn-action buy ${currentCoins < trail.price ? 'disabled' : ''}" data-action="buy-trail" data-id="${trail.id}">
                    <img src="${this.iconBasePath}icon_coin.png" alt="金币" class="ui-icon-btn-xs"> ${trail.price} 金币
                  </button>`
            }
          </div>
        `;

        const btn = card.querySelector('.shop-btn-action');
        if (btn) {
          btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const action = btn.getAttribute('data-action');
            const id = btn.getAttribute('data-id');
            if (action === 'equip-trail') {
              this.skin.equipTrail(id);
              this.renderShopItems();
            } else if (action === 'buy-trail') {
              const success = this.skin.buyTrail(id, this.economy);
              if (success) {
                if (this.sound && this.sound.playEatCombo) this.sound.playEatCombo(2);
                this.renderShopItems();
              }
            }
          });
        }

        listEl.appendChild(card);
      });
    }
  }

  // 渲染成就图鉴
  renderAchievements() {
    const listEl = document.getElementById('ach-list');
    const badgeEl = document.getElementById('ach-progress-badge');
    if (!listEl) return;

    const progress = this.achievements.getProgress();
    if (badgeEl) {
      badgeEl.textContent = `达成 ${progress.completed}/${progress.total} 项 (${progress.percent}%)`;
    }

    listEl.innerHTML = '';
    const items = this.achievements.getAllAchievements();

    items.forEach(ach => {
      const card = document.createElement('div');
      card.className = `ach-item-card ${ach.isUnlocked ? 'unlocked' : 'locked'}`;

      card.innerHTML = `
        <div class="ach-item-icon-wrap">
          <img src="${ach.icon}" alt="${ach.title}" class="ach-item-icon">
        </div>
        <div class="ach-item-main">
          <div class="ach-item-title-row">
            <span class="ach-item-title">${ach.title}</span>
            <span class="ach-reward-badge">${ach.rewardText}</span>
          </div>
          <div class="ach-item-desc">${ach.desc}</div>
        </div>
        <div class="ach-item-status">
          ${ach.isUnlocked
            ? '<span class="ach-status-pill done">已达成</span>'
            : '<span class="ach-status-pill todo">进行中</span>'
          }
        </div>
      `;
      listEl.appendChild(card);
    });
  }

  // 局内成就达成即时广播
  showAchievementToast(achievement) {
    if (!this.toast) return;
    const descEl = document.getElementById('ach-toast-desc');
    if (descEl) {
      descEl.textContent = `${achievement.title} (${achievement.rewardText})`;
    }

    this.toast.classList.remove('hidden');
    this.toast.classList.add('pop-in');

    setTimeout(() => {
      this.toast.classList.add('pop-out');
      setTimeout(() => {
        this.toast.classList.add('hidden');
        this.toast.classList.remove('pop-in', 'pop-out');
      }, 400);
    }, 3600);
  }
}
