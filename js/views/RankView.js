import { WxRankManager } from '../wx/WxRankManager.js';

/**
 * RankView - 排行榜视图控制器
 * 展示好友排行榜（MVP 阶段使用本地 mock 数据 + 历史成绩）
 */
export class RankView {
  /**
   * @param {Object} callbacks
   * @param {Function} callbacks.onBack - 返回上一页
   */
  constructor(callbacks) {
    this._callbacks = callbacks;
    this._view = document.getElementById('rank-view');
    this._rankList = document.getElementById('rank-list');
    this._wxRankManager = new WxRankManager();
    this._bindEvents();
  }

  /** 显示排行榜 */
  show() {
    this._view.classList.add('active');
    this._loadRankData();
  }

  /** 隐藏排行榜 */
  hide() {
    this._view.classList.remove('active');
  }

  /** 加载排行数据 */
  _loadRankData() {
    if (!this._rankList) return;

    // 获取排行数据（微信环境用真实数据，否则用 mock）
    const rankData = this._wxRankManager.showFriendRanking();

    this._rankList.innerHTML = '';

    if (!rankData || rankData.length === 0) {
      this._rankList.innerHTML = `
        <div class="rank-empty">
          <p>🏆</p>
          <p>暂无排行数据</p>
          <p class="text-secondary">完成一局挑战后即可上榜</p>
        </div>
      `;
      return;
    }

    // 按分数排序
    rankData.sort((a, b) => b.score - a.score);

    rankData.forEach((item, index) => {
      const rankItem = document.createElement('div');
      rankItem.className = `rank-item${item.isMe ? ' me' : ''}`;
      rankItem.style.animationDelay = `${index * 0.08}s`;

      const rankNum = index + 1;
      let rankNumClass = 'rank-num';
      if (rankNum === 1) rankNumClass += ' gold';
      else if (rankNum === 2) rankNumClass += ' silver';
      else if (rankNum === 3) rankNumClass += ' bronze';

      rankItem.innerHTML = `
        <span class="${rankNumClass}">${rankNum}</span>
        <div class="rank-avatar">${item.avatar || '😊'}</div>
        <div class="rank-info">
          <span class="rank-name">${item.name}</span>
          <span class="rank-grade">${item.grade || ''} ${item.title || ''}</span>
        </div>
        <div class="rank-score-col">
          <span class="rank-score">${item.score}</span>
          <span class="rank-label">分</span>
        </div>
      `;

      this._rankList.appendChild(rankItem);
    });
  }

  /** 绑定事件 */
  _bindEvents() {
    const backBtn = document.getElementById('btn-rank-back');
    if (backBtn) {
      backBtn.addEventListener('click', () => {
        this._callbacks.onBack();
      });
    }
  }
}
