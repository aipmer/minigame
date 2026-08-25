import { ScoreManager } from '../core/ScoreManager.js';
import { StorageManager } from '../core/StorageManager.js';
import { FeedbackManager } from '../gameplay/FeedbackManager.js';

/**
 * ResultView - 结算页视图控制器
 * 展示挑战分、等级、称号、正确率、用时、最好成绩
 */
export class ResultView {
  /**
   * @param {Object} callbacks
   * @param {Function} callbacks.onReplay - 再挑战一次
   * @param {Function} callbacks.onShowRank - 查看好友榜
   * @param {Function} callbacks.onShare - 分享给好友
   * @param {Function} callbacks.onHome - 返回首页
   * @param {import('../core/AudioManager.js').AudioManager} callbacks.audioManager
   */
  constructor(callbacks) {
    this._callbacks = callbacks;
    this._view = document.getElementById('result-view');
    this._feedbackManager = new FeedbackManager(callbacks.audioManager);
    this._bindEvents();
  }

  /** 显示结算页 */
  async show(gameState) {
    this._view.classList.add('active');

    // 计算最终分数
    const finalScore = ScoreManager.calculateFinalScore(gameState);
    const { grade, title } = ScoreManager.getGrade(finalScore);
    const accuracy = gameState.getAccuracy();
    const timeUsed = gameState.getTimeUsed();
    const bestScore = StorageManager.getBestScore();
    const isNewRecord = finalScore > bestScore;

    // 保存成绩
    if (isNewRecord) {
      StorageManager.saveBestScore(finalScore);
      StorageManager.saveBestGrade(grade, title);
    }

    // 累加经验值
    const currentExp = StorageManager.getTotalExp();
    StorageManager.saveTotalExp(currentExp + finalScore);

    // 保存游戏记录
    StorageManager.saveGameRecord({
      score: finalScore,
      grade,
      title,
      accuracy: Math.round(accuracy),
      timeUsed: Math.round(timeUsed),
      date: new Date().toISOString()
    });

    // 填充数据
    const scoreEl = document.getElementById('result-score');
    const gradeEl = document.getElementById('result-grade');
    const titleEl = document.getElementById('result-title');
    const accuracyEl = document.getElementById('result-accuracy');
    const timeEl = document.getElementById('result-time');
    const bestEl = document.getElementById('result-best');
    const newRecordEl = document.getElementById('result-new-record');
    const expRewardEl = document.getElementById('result-exp-gained');

    // 先设置静态内容
    if (accuracyEl) accuracyEl.textContent = `${Math.round(accuracy)}%`;
    if (timeEl) timeEl.textContent = `${Math.round(timeUsed)}秒`;
    if (bestEl) bestEl.textContent = isNewRecord ? finalScore : Math.max(bestScore, finalScore);
    if (expRewardEl) expRewardEl.textContent = `+${finalScore} EXP`;

    // 播放结算音效
    this._callbacks.audioManager.playResult();

    // 分数动画
    if (scoreEl) {
      await this._feedbackManager.animateScoreCountUp(scoreEl, finalScore, 1200);
    }

    // 等级徽章动画
    if (gradeEl) {
      this._feedbackManager.showGradeBadge(gradeEl, grade, title);
    }

    // 称号
    if (titleEl) {
      titleEl.textContent = title;
      titleEl.classList.add('animate-fade-in');
    }

    // 新纪录
    if (newRecordEl) {
      if (isNewRecord) {
        this._callbacks.audioManager.playNewRecord();
        this._feedbackManager.showNewRecord(newRecordEl);
      } else {
        newRecordEl.classList.add('hidden');
      }
    }

    // 保存分享数据供分享按钮使用；记录本局模式供"再挑战"按钮沿用
    this._lastResult = { score: finalScore, grade, title, accuracy, timeUsed };
    this._lastMode = gameState.gameMode;
  }

  /** 隐藏结算页 */
  hide() {
    this._view.classList.remove('active');

    // 清除动画类
    const gradeEl = document.getElementById('result-grade');
    const titleEl = document.getElementById('result-title');
    const newRecordEl = document.getElementById('result-new-record');

    if (gradeEl) gradeEl.classList.remove('animate-pop-in');
    if (titleEl) titleEl.classList.remove('animate-fade-in');
    if (newRecordEl) {
      newRecordEl.classList.remove('animate-pulse');
      newRecordEl.classList.add('hidden');
    }
  }

  /** 绑定按钮事件 */
  _bindEvents() {
    const replayBtn = document.getElementById('btn-replay');
    if (replayBtn) {
      replayBtn.addEventListener('click', () => {
        this._callbacks.onReplay(this._lastMode || 'classic');
      });
    }

    const rankBtn = document.getElementById('btn-result-rank');
    if (rankBtn) {
      rankBtn.addEventListener('click', () => {
        this._callbacks.onShowRank();
      });
    }

    const shareBtn = document.getElementById('btn-share');
    if (shareBtn) {
      shareBtn.addEventListener('click', () => {
        this._callbacks.onShare(this._lastResult);
      });
    }

    const homeBtn = document.getElementById('btn-home');
    if (homeBtn) {
      homeBtn.addEventListener('click', () => {
        this._callbacks.onHome();
      });
    }
  }
}
