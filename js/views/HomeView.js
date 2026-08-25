import { StorageManager } from '../core/StorageManager.js';
import { getLevelInfo } from '../core/LevelConfig.js';
import { getTodaySeed } from '../core/SeededRandom.js';

/**
 * HomeView - 首页视图控制器
 * 负责首页的渲染和交互：标题、开始挑战、好友排行、玩法说明、设置
 */
export class HomeView {
  /**
   * @param {Object} callbacks - 回调函数集合
   * @param {Function} callbacks.onStartGame - 开始游戏
   * @param {Function} callbacks.onShowRank - 显示排行榜
   * @param {Function} callbacks.onToggleSound - 切换音效
   * @param {Function} callbacks.getSoundEnabled - 获取音效状态
   */
  constructor(callbacks) {
    this._callbacks = callbacks;
    this._view = document.getElementById('home-view');
    this._bindEvents();
  }

  /** 显示首页 */
  show() {
    this._view.classList.add('active');
    this._updateSoundButton();
    this._updateLevelProgress();
    this._updateDailyEntry();
  }

  /** 更新每日挑战入口的日期与完成状态 */
  _updateDailyEntry() {
    const todaySeed = getTodaySeed();
    const dateEl = document.getElementById('daily-entry-date');
    const statusEl = document.getElementById('daily-entry-status');
    const btnEl = document.getElementById('btn-daily');

    if (dateEl) dateEl.textContent = `每日挑战 · ${todaySeed}`;

    const record = StorageManager.getDailyRecord(todaySeed);
    if (statusEl) {
      if (record) {
        statusEl.textContent = `今日已挑战 · 最高 ${record.score} 分`;
        statusEl.classList.add('done');
      } else {
        statusEl.textContent = '今日挑战未完成';
        statusEl.classList.remove('done');
      }
    }
    if (btnEl) {
      btnEl.textContent = record ? '再挑战' : '去挑战';
    }
  }

  /** 更新经验等级进度条 */
  _updateLevelProgress() {
    const totalExp = StorageManager.getTotalExp();
    const levelInfo = getLevelInfo(totalExp);
    const levelContainer = document.getElementById('level-progress-container');
    
    if (levelContainer) {
      const expText = levelInfo.nextLevelExp === Infinity ? 'MAX' : `${levelInfo.currentLevelExp}/${levelInfo.nextLevelExp}`;
      levelContainer.innerHTML = `
        <div class="level-text-row">
          <span class="level-badge">Lv.${levelInfo.level}</span>
          <span class="level-title">${levelInfo.title}</span>
          <span class="level-exp">${expText} EXP</span>
        </div>
        <div class="level-bar-bg">
          <div class="level-bar-fill" style="width: ${levelInfo.progressRatio * 100}%"></div>
        </div>
      `;
    }
  }

  /** 隐藏首页 */
  hide() {
    this._view.classList.remove('active');
  }

  /** 绑定事件 */
  _bindEvents() {
    // 开始挑战按钮 (经典模式)
    const startBtn = document.getElementById('btn-start');
    if (startBtn) {
      startBtn.addEventListener('click', () => {
        this._callbacks.onStartGame('classic');
      });
    }

    // 无尽挑战按钮
    const endlessBtn = document.getElementById('btn-endless');
    if (endlessBtn) {
      endlessBtn.addEventListener('click', () => {
        this._callbacks.onStartGame('endless');
      });
    }

    // 每日挑战按钮
    const dailyBtn = document.getElementById('btn-daily');
    if (dailyBtn) {
      dailyBtn.addEventListener('click', () => {
        this._callbacks.onStartGame('daily');
      });
    }

    // 好友排行按钮
    const rankBtn = document.getElementById('btn-rank');
    if (rankBtn) {
      rankBtn.addEventListener('click', () => {
        this._callbacks.onShowRank();
      });
    }

    // 玩法说明按钮
    const helpBtn = document.getElementById('btn-help');
    if (helpBtn) {
      helpBtn.addEventListener('click', () => {
        this._showHelpModal();
      });
    }

    // 设置（音效）按钮
    const settingsBtn = document.getElementById('btn-settings');
    if (settingsBtn) {
      settingsBtn.addEventListener('click', () => {
        this._callbacks.onToggleSound();
        this._updateSoundButton();
      });
    }
  }

  /** 更新音效按钮状态 */
  _updateSoundButton() {
    const settingsBtn = document.getElementById('btn-settings');
    if (settingsBtn) {
      const enabled = this._callbacks.getSoundEnabled();
      settingsBtn.innerHTML = `<img src="${enabled ? 'assets/icon_sound.png' : 'assets/icon_sound_off.png'}" class="btn-icon-img" id="btn-sound-img" alt="Sound">音效${enabled ? '开' : '关'}`;
    }
  }

  /** 显示玩法说明弹窗 */
  _showHelpModal() {
    // 创建弹窗
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal">
        <button class="modal-close" id="modal-close-btn">&times;</button>
        <h2 class="modal-title">玩法说明</h2>
        <div class="modal-body">
          <p>在每一题中，从一组相似图形、颜色、方向或文字中<strong>找出唯一不同项</strong>。</p>
          <div class="help-rules">
            <div class="help-rule">
              <span class="help-icon-svg"><svg viewBox="0 0 24 24"><path fill="currentColor" d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10s10-4.5 10-10S17.5 2 12 2zm4.2 14.2L11 13V7h1.5v5.2l4.5 2.7l-.8 1.3z"/></svg></span>
              <span>限时 <strong>60 秒</strong>，完成 <strong>10 道题</strong></span>
            </div>
            <div class="help-rule">
              <span class="help-icon-svg"><svg class="svg-correct" viewBox="0 0 24 24"><path fill="currentColor" d="M9 16.2L4.8 12l-1.4 1.4L9 19L21 7l-1.4-1.4L9 16.2z"/></svg></span>
              <span>答对进入下一题，速度越快加分越多</span>
            </div>
            <div class="help-rule">
              <span class="help-icon-svg"><svg class="svg-wrong" viewBox="0 0 24 24"><path fill="currentColor" d="M19 6.41L17.59 5L12 10.59L6.41 5L5 6.41L10.59 12L5 17.59L6.41 19L12 13.41L17.59 19L19 17.59L13.41 12L19 6.41z"/></svg></span>
              <span>答错扣 3 秒时间和分数，增加点错次数</span>
            </div>
            <div class="help-rule">
              <img src="assets/icon_flame.png" class="help-icon-img" alt="Flame">
              <span>连续答对触发<strong>连击及狂暴状态</strong></span>
            </div>
            <div class="help-rule">
              <img src="assets/icon_rank.png" class="help-icon-img" alt="Trophy">
              <span>挑战结束后生成分数、等级和好友排名</span>
            </div>
          </div>
          <p class="help-disclaimer">本游戏为休闲娱乐挑战，结果仅供娱乐参考，不代表医学、心理或专业能力评估。</p>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    // 动画显示
    requestAnimationFrame(() => {
      overlay.classList.add('active');
    });

    // 关闭事件
    const closeBtn = overlay.querySelector('#modal-close-btn');
    const closeModal = () => {
      overlay.classList.remove('active');
      setTimeout(() => overlay.remove(), 300);
    };

    closeBtn.addEventListener('click', closeModal);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeModal();
    });
  }
}
