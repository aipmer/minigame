// SocialUI.js — MiniGame 社交界面组件
// 严格执行四大铁律：纯中文零英文、零原生 Emoji、粘土/赛博主题风格、全端防溢出

export class SocialUI {
  constructor({
    game = 'snake3d',
    gameTitle = '3D 贪吃蛇',
    theme = 'clay',
    socialManager,
    iconBasePath = 'assets/icons/'
  }) {
    this.game = game;
    this.gameTitle = gameTitle;
    this.theme = theme; // 'clay' | 'cyber'
    this.socialManager = socialManager;
    this.iconBasePath = iconBasePath.endsWith('/') ? iconBasePath : iconBasePath + '/';
    this.currentTab = 'daily';
    this.challengeInfo = this.socialManager.parseChallengeUrl();
    this.hasCelebratedChallenge = false;

    this._injectStyles();
    this._createDOM();
    this._bindEvents();
    this._checkInitialChallenge();
  }

  _injectStyles() {
    if (!document.getElementById('social-global-css')) {
      const link = document.createElement('link');
      link.id = 'social-global-css';
      link.rel = 'stylesheet';
      link.href = '/css/social.css';
      document.head.appendChild(link);
    }
  }

  _createDOM() {
    // 1. 排行榜弹窗
    const lbModal = document.createElement('div');
    lbModal.id = 'social-leaderboard-modal';
    lbModal.className = 'social-modal-overlay';
    lbModal.innerHTML = `
      <div class="social-modal-card social-theme-${this.theme}">
        <div class="social-header">
          <div class="social-header-top">
            <div class="social-title-wrap">
              <img src="${this.iconBasePath}icon_trophy.png" alt="风云榜" class="social-title-icon">
              <h2 class="social-title">风云榜</h2>
            </div>
            <button class="social-close-btn" id="social-lb-close" title="关闭" aria-label="关闭">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
          </div>
          <div class="social-tabs">
            <button class="social-tab-btn active" data-tab="daily">今日日榜</button>
            <button class="social-tab-btn" data-tab="weekly">本周周榜</button>
            <button class="social-tab-btn" data-tab="all">历史总榜</button>
          </div>
        </div>
        <div class="social-list-container" id="social-lb-list">
          <div class="social-empty">正在加载排行榜...</div>
        </div>
        <div class="social-my-rank" id="social-lb-my-rank">
          <div class="social-my-info">
            <button class="social-my-name-btn" id="social-btn-edit-name" title="点击修改昵称">
              <span id="social-my-name">探险家</span>
              <span class="social-edit-hint">(修改)</span>
            </button>
          </div>
          <div class="social-my-score-box">
            <div class="social-my-score-label">我的纪录</div>
            <div class="social-my-score-num" id="social-my-score">0</div>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(lbModal);
    this.lbModal = lbModal;

    // 2. 战报海报弹窗
    const posterModal = document.createElement('div');
    posterModal.id = 'social-poster-modal';
    posterModal.className = 'social-modal-overlay';
    posterModal.innerHTML = `
      <div class="social-modal-card social-poster-card social-theme-${this.theme}">
        <img id="social-poster-img" class="social-poster-preview-img" alt="荣誉战报">
        <div class="social-poster-actions">
          <button id="social-poster-download" class="social-btn social-btn-primary">
            <img src="${this.iconBasePath}icon_trophy.png" class="ui-icon" alt="保存">
            <span>保存战报</span>
          </button>
          <button id="social-poster-share" class="social-btn social-btn-secondary">
            <img src="${this.iconBasePath}icon_share.png" class="ui-icon" alt="挑战">
            <span>发起挑战</span>
          </button>
          <button id="social-poster-close" class="social-btn social-btn-secondary">
            <span>关闭</span>
          </button>
        </div>
      </div>
    `;
    document.body.appendChild(posterModal);
    this.posterModal = posterModal;

    // 3. 轻提示 Toast
    const toast = document.createElement('div');
    toast.id = 'social-toast';
    toast.className = 'social-toast';
    document.body.appendChild(toast);
    this.toastEl = toast;
  }

  _bindEvents() {
    // 榜单关闭
    this.lbModal.querySelector('#social-lb-close').addEventListener('click', () => {
      this.closeLeaderboard();
    });
    this.lbModal.addEventListener('click', (e) => {
      if (e.target === this.lbModal) this.closeLeaderboard();
    });

    // 标签切换
    const tabs = this.lbModal.querySelectorAll('.social-tab-btn');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        this.currentTab = tab.dataset.tab;
        this.loadLeaderboard(this.currentTab);
      });
    });

    // 修改昵称
    const editBtn = this.lbModal.querySelector('#social-btn-edit-name');
    editBtn.addEventListener('click', () => {
      const currentName = this.socialManager.getProfile().name;
      const newName = window.prompt('请输入新的玩家昵称 (最多 12 个字):', currentName);
      if (newName && newName.trim() && newName.trim() !== currentName) {
        this.socialManager.setUserName(newName.trim());
        this.loadLeaderboard(this.currentTab);
        this.showToast('昵称修改成功！');
      }
    });

    // 海报弹窗关闭
    this.posterModal.querySelector('#social-poster-close').addEventListener('click', () => {
      this.closePoster();
    });
    this.posterModal.addEventListener('click', (e) => {
      if (e.target === this.posterModal) this.closePoster();
    });

    // 海报保存下载
    this.posterModal.querySelector('#social-poster-download').addEventListener('click', () => {
      const img = this.posterModal.querySelector('#social-poster-img');
      if (img.src) {
        const link = document.createElement('a');
        link.download = `${this.gameTitle}_战绩海报.png`;
        link.href = img.src;
        link.click();
        this.showToast('正在下载战报海报');
      }
    });

    // 发起挑战
    this.posterModal.querySelector('#social-poster-share').addEventListener('click', () => {
      const score = this.lastGeneratedScore || this.socialManager.getLocalHighScore(this.game);
      this.copyChallengeLink(score);
    });
  }

  _checkInitialChallenge() {
    if (this.challengeInfo.hasChallenge) {
      const banner = document.createElement('div');
      banner.id = 'social-challenge-banner';
      banner.className = 'social-challenge-banner';
      banner.innerHTML = `
        <img src="${this.iconBasePath}icon_trophy.png" alt="挑战" class="ui-icon">
        <span>正在迎战 <strong>${this.challengeInfo.challenger}</strong> 的 <strong>${this.challengeInfo.targetScore}</strong> 分纪录！</span>
      `;
      document.body.appendChild(banner);
    }
  }

  // 局内分数更新检测是否击败好友挑战
  checkScoreForChallenge(currentScore) {
    if (!this.challengeInfo.hasChallenge || this.hasCelebratedChallenge) return;

    if (currentScore >= this.challengeInfo.targetScore) {
      this.hasCelebratedChallenge = true;
      this.showChallengeSuccessToast();
    }
  }

  showChallengeSuccessToast() {
    const toast = document.createElement('div');
    toast.className = 'social-challenge-success-toast';
    toast.innerHTML = `
      <img src="${this.iconBasePath}icon_medal_1.png" alt="胜利" class="ui-icon-lg">
      <span>挑战成功！已超越 ${this.challengeInfo.challenger} 的纪录！</span>
    `;
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.style.transition = 'opacity 0.4s ease';
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 400);
    }, 3500);
  }

  async openLeaderboard(type = 'daily') {
    this.currentTab = type;
    this.lbModal.classList.add('active');
    await this.loadLeaderboard(type);
  }

  closeLeaderboard() {
    this.lbModal.classList.remove('active');
  }

  async loadLeaderboard(type = 'daily') {
    const listEl = this.lbModal.querySelector('#social-lb-list');
    listEl.innerHTML = '<div class="social-empty">正在加载排行榜...</div>';

    // 底部自身信息更新
    const profile = this.socialManager.getProfile();
    this.lbModal.querySelector('#social-my-name').textContent = profile.name;
    const myScore = this.socialManager.getLocalHighScore(this.game);
    this.lbModal.querySelector('#social-my-score').textContent = myScore.toLocaleString();

    const list = await this.socialManager.getLeaderboard(this.game, type);

    if (!list || list.length === 0) {
      listEl.innerHTML = '<div class="social-empty">暂无排行数据，快来开辟新纪录！</div>';
      return;
    }

    let html = '';
    list.forEach(item => {
      let rankContent = '';
      if (item.rank === 1) {
        rankContent = `<img src="${this.iconBasePath}icon_medal_1.png" class="social-medal-img" alt="冠军">`;
      } else if (item.rank === 2) {
        rankContent = `<img src="${this.iconBasePath}icon_medal_2.png" class="social-medal-img" alt="亚军">`;
      } else if (item.rank === 3) {
        rankContent = `<img src="${this.iconBasePath}icon_medal_3.png" class="social-medal-img" alt="季军">`;
      } else {
        rankContent = `<span class="social-rank-badge">${item.rank}</span>`;
      }

      html += `
        <div class="social-list-item ${item.isSelf ? 'is-self' : ''}">
          <div class="social-rank-col">${rankContent}</div>
          <div class="social-player-col">
            <span class="social-player-name">
              ${item.name}
              ${item.isSelf ? '<span class="social-self-tag">我</span>' : ''}
            </span>
          </div>
          <div class="social-score-col">${item.score.toLocaleString()}</div>
        </div>
      `;
    });

    listEl.innerHTML = html;
  }

  async openPoster(score) {
    this.lastGeneratedScore = score;
    this.showToast('正在生成高清战报...');

    const list = await this.socialManager.getLeaderboard(this.game, 'daily');
    const { rank, percentile } = this.socialManager.calculateRank(score, list);

    const dataUrl = await this.socialManager.generatePoster({
      gameTitle: this.gameTitle,
      score: score,
      rank: rank,
      percentile: percentile,
      iconPath: `${this.iconBasePath}icon_trophy.png`
    });

    const img = this.posterModal.querySelector('#social-poster-img');
    img.src = dataUrl;
    this.posterModal.classList.add('active');
  }

  closePoster() {
    this.posterModal.classList.remove('active');
  }

  copyChallengeLink(score) {
    const url = this.socialManager.generateChallengeUrl(this.game, score);
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(() => {
        this.showToast('挑战链接已复制！快发送给好友吧');
      }).catch(() => {
        this._fallbackCopy(url);
      });
    } else {
      this._fallbackCopy(url);
    }
  }

  _fallbackCopy(text) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand('copy');
      this.showToast('挑战链接已复制！快发送给好友吧');
    } catch (e) {
      window.prompt('请手动长按复制以下挑战链接：', text);
    }
    ta.remove();
  }

  showToast(msg) {
    if (!this.toastEl) return;
    this.toastEl.textContent = msg;
    this.toastEl.classList.add('show');
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => {
      this.toastEl.classList.remove('show');
    }, 2400);
  }
}
