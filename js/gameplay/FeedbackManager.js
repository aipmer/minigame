/**
 * @fileoverview FeedbackManager — 统一管理答题反馈（音效、动画、得分展示）。
 * @module gameplay/FeedbackManager
 */

/**
 * 协调音效播放、网格反馈动画、分数动画等交互反馈。
 */
export class FeedbackManager {
  /**
   * @param {Object} audioManager - 音频管理器实例，需提供 playCorrect / playWrong / playCountdown 方法
   */
  constructor(audioManager) {
    /** @private */
    this._audio = audioManager;
    /** @private */
    this._comboTimeoutId = null;
  }

  /* ------------------------------------------------------------------ */
  /*  Answer Feedback                                                    */
  /* ------------------------------------------------------------------ */

  /**
   * 处理回答正确的反馈流程。
   * @param {import('./GridRenderer').GridRenderer} gridRenderer
   * @param {number} cellIndex - 被点击的格子索引
   * @param {number} score     - 当前得分（预留用途）
   * @returns {Promise<void>}
   */
  async onCorrectAnswer(gridRenderer, cellIndex, score, combo = 1) {
    this._audio.playCorrect(combo);
    // 微信小游戏轻微震动反馈
    if (typeof wx !== 'undefined' && typeof wx.vibrateShort === 'function') {
      wx.vibrateShort({ type: combo >= 5 ? 'medium' : 'light' });
    }
    await gridRenderer.showCorrectFeedback(cellIndex);
  }

  /**
   * 处理回答错误的反馈流程。
   * @param {import('./GridRenderer').GridRenderer}       gridRenderer
   * @param {number}                                       cellIndex
   * @param {import('./TimerController').TimerController}  timerController
   * @returns {Promise<void>}
   */
  async onWrongAnswer(gridRenderer, cellIndex, timerController) {
    this._audio.playWrong();
    // 微信小游戏重度震动反馈
    if (typeof wx !== 'undefined' && typeof wx.vibrateShort === 'function') {
      wx.vibrateShort({ type: 'heavy' });
    }
    timerController.deductTime(3);
    await gridRenderer.showWrongFeedback(cellIndex);
  }

  /**
   * 倒计时预警音效。
   */
  onCountdownWarning() {
    this._audio.playCountdown();
    // 微信小游戏轻度警告震动
    if (typeof wx !== 'undefined' && typeof wx.vibrateShort === 'function') {
      wx.vibrateShort({ type: 'light' });
    }
  }

  /* ------------------------------------------------------------------ */
  /*  Score & Grade Animations                                           */
  /* ------------------------------------------------------------------ */

  /**
   * 分数从 0 递增到 targetScore 的动画。
   * 使用 ease-out 缓动: t * (2 - t)
   *
   * @param {HTMLElement} element     - 显示分数的 DOM 元素
   * @param {number}      targetScore - 目标分数
   * @param {number}      [duration=1000] - 动画时长（ms）
   * @returns {Promise<void>}
   */
  animateScoreCountUp(element, targetScore, duration = 1000) {
    return new Promise((resolve) => {
      const startTime = performance.now();

      /**
       * @param {number} now - requestAnimationFrame 提供的时间戳
       */
      function step(now) {
        const elapsed = now - startTime;
        let t = Math.min(elapsed / duration, 1);

        // ease-out 缓动
        const eased = t * (2 - t);
        const current = Math.round(eased * targetScore);
        element.textContent = current;

        if (t < 1) {
          requestAnimationFrame(step);
        } else {
          element.textContent = targetScore;
          resolve();
        }
      }

      requestAnimationFrame(step);
    });
  }

  /**
   * 展示等级徽章。
   * @param {HTMLElement} element - 等级显示元素
   * @param {string}      grade   - 等级字符 (S / A / B / C / D)
   * @param {string}      title   - 等级称号
   */
  showGradeBadge(element, grade, title) {
    element.textContent = grade;
    element.classList.add('animate-pop-in');

    // title 可能是独立元素，通过 element 的 nextElementSibling 或传入
    const titleEl = element.nextElementSibling;
    if (titleEl) {
      titleEl.textContent = title;
    }
  }

  /**
   * 展示"新纪录"提示。
   * @param {HTMLElement} element - 新纪录提示元素
   */
  showNewRecord(element) {
    element.classList.remove('hidden');
    element.classList.add('animate-pulse');
  }

  /* ------------------------------------------------------------------ */
  /*  Floating Score                                                     */
  /* ------------------------------------------------------------------ */

  /**
   * 在指定位置创建浮动得分文字（如 "+10"）。
   *
   * @param {HTMLElement}  parentElement - 浮动元素的父容器
   * @param {string}       text          - 显示文本，例如 '+10'
   * @param {DOMRect}      rect          - 触发格子的 getBoundingClientRect
   */
  createFloatingScore(parentElement, text, rect) {
    const float = document.createElement('div');
    float.classList.add('float-score');
    float.textContent = text;

    // 定位在格子上方中心
    float.style.position = 'absolute';
    float.style.left = `${rect.left + rect.width / 2}px`;
    float.style.top = `${rect.top}px`;
    float.style.transform = 'translateX(-50%)';
    float.style.pointerEvents = 'none';

    parentElement.appendChild(float);

    // 动画结束后移除（与 CSS 动画时长匹配）
    setTimeout(() => {
      if (float.parentElement) {
        float.parentElement.removeChild(float);
      }
    }, 800);
  }

  /**
   * 展示连击气泡动画特效。
   * @param {HTMLElement} element - 连击气泡 DOM 元素
   * @param {number} combo - 当前连击数
   */
  showComboStreak(element, combo) {
    if (!element || combo < 3) return;

    element.innerHTML = `${combo} 连击 <img src="assets/icon_flame.png" class="badge-icon-img" alt="Flame">`;
    element.classList.remove('hidden');

    // 重新播放 CSS 动画
    element.classList.remove('animate-combo-pop');
    void element.offsetWidth; // 触发重绘
    element.classList.add('animate-combo-pop');

    // 在 1.2 秒后自动淡出隐藏
    if (this._comboTimeoutId) {
      clearTimeout(this._comboTimeoutId);
    }
    this._comboTimeoutId = setTimeout(() => {
      element.classList.add('hidden');
    }, 1200);
  }
}
