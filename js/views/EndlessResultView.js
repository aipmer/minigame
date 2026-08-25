import { StorageManager } from '../core/StorageManager.js';
import { FeedbackManager } from '../gameplay/FeedbackManager.js';
import { ENDLESS_TITLES } from '../core/LevelConfig.js';

/**
 * EndlessResultView - 无尽模式专属结算页控制器
 * 采用紫金尊贵配色与玻璃态拟物化排版，展示无尽积分、通关数、连击等
 */
export class EndlessResultView {
  /**
   * @param {Object} callbacks
   * @param {Function} callbacks.onReplay - 再挑战无尽模式
   * @param {Function} callbacks.onShare - 分享战报
   * @param {Function} callbacks.onHome - 返回首页
   * @param {import('../core/AudioManager.js').AudioManager} callbacks.audioManager
   */
  constructor(callbacks) {
    this._callbacks = callbacks;
    this._view = document.getElementById('endless-result-view');
    this._feedbackManager = new FeedbackManager(callbacks.audioManager);
    this._bindEvents();
    this._lastResult = null;
  }

  /** 显示无尽模式结算面板 */
  async show(gameState) {
    this._view.classList.add('active');

    // 1. 获取结算数据
    const finalScore = Math.round(gameState.score);
    const waves = gameState.correctCount; // 通关数就是累计答对题数
    const maxCombo = gameState.maxCombo;
    const bestScore = StorageManager.getEndlessBestScore();
    const isNewRecord = finalScore > bestScore;

    // 2. 评定无尽荣誉称号
    let title = '眼力新手';
    for (const entry of ENDLESS_TITLES) {
      if (waves >= entry.min) {
        title = entry.title;
        break;
      }
    }

    // 3. 保存最好成绩与累计经验值
    if (isNewRecord) {
      StorageManager.saveEndlessBestScore(finalScore);
    }
    const currentExp = StorageManager.getTotalExp();
    StorageManager.saveTotalExp(currentExp + finalScore);

    // 4. 获取 DOM 节点并填充数据
    const scoreEl = document.getElementById('endless-result-score');
    const titleEl = document.getElementById('endless-result-title');
    const expRewardEl = document.getElementById('endless-result-exp-gained');
    const wavesEl = document.getElementById('endless-result-waves');
    const comboEl = document.getElementById('endless-result-combo');
    const bestEl = document.getElementById('endless-result-best');
    const newRecordEl = document.getElementById('endless-result-new-record');

    if (wavesEl) wavesEl.textContent = `${waves}关`;
    if (comboEl) comboEl.textContent = `${maxCombo}`;
    if (bestEl) bestEl.textContent = isNewRecord ? finalScore : bestScore;
    if (expRewardEl) expRewardEl.textContent = `+${finalScore} EXP`;

    // 5. 播放结算乐章与新纪录音效
    this._callbacks.audioManager.playResult();

    // 6. 播放大分数递增 countUp 动画
    if (scoreEl) {
      await this._feedbackManager.animateScoreCountUp(scoreEl, finalScore, 1200);
    }

    // 7. 显示称号
    if (titleEl) {
      titleEl.textContent = title;
      titleEl.classList.add('animate-fade-in');
    }

    // 8. 新纪录动画
    if (newRecordEl) {
      if (isNewRecord) {
        this._callbacks.audioManager.playNewRecord();
        this._feedbackManager.showNewRecord(newRecordEl);
      } else {
        newRecordEl.classList.add('hidden');
      }
    }

    // 保存分享上下文供点击时使用
    this._lastResult = {
      score: finalScore,
      grade: 'Endless',
      title,
      accuracy: Math.round(gameState.getAccuracy()),
      timeUsed: waves, // 借用通关数作为属性
    };
  }

  /** 隐藏结算面板 */
  hide() {
    this._view.classList.remove('active');

    const titleEl = document.getElementById('endless-result-title');
    const newRecordEl = document.getElementById('endless-result-new-record');

    if (titleEl) titleEl.classList.remove('animate-fade-in');
    if (newRecordEl) {
      newRecordEl.classList.remove('animate-pulse');
      newRecordEl.classList.add('hidden');
    }
  }

  /** 绑定按钮回调事件 */
  _bindEvents() {
    const replayBtn = document.getElementById('btn-endless-replay');
    if (replayBtn) {
      replayBtn.addEventListener('click', () => {
        this._callbacks.onReplay();
      });
    }

    const shareBtn = document.getElementById('btn-endless-share');
    if (shareBtn) {
      shareBtn.addEventListener('click', () => {
        if (this._lastResult) {
          this._callbacks.onShare(this._lastResult);
        }
      });
    }

    const homeBtn = document.getElementById('btn-endless-home');
    if (homeBtn) {
      homeBtn.addEventListener('click', () => {
        this._callbacks.onHome();
      });
    }
  }
}
