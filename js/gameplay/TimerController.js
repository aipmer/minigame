/**
 * @fileoverview TimerController — 基于 Date.now() 的高精度倒计时控制器。
 * 支持暂停/恢复、扣时、低时间预警等功能。
 * @module gameplay/TimerController
 */

/**
 * 管理游戏倒计时，提供暂停、恢复、扣时等功能。
 */
export class TimerController {
  /**
   * @param {HTMLElement} displayElement - 显示剩余秒数的 DOM 元素
   * @param {Function}    onTick        - 每秒回调 (remainingSeconds)
   * @param {Function}    onTimeUp      - 倒计时归零回调
   */
  constructor(displayElement, onTick, onTimeUp) {
    /** @private @type {HTMLElement} */
    this._display = displayElement;

    /** @private @type {Function} */
    this._onTick = onTick;

    /** @private @type {Function} */
    this._onTimeUp = onTimeUp;

    /** @private @type {number|null} */
    this._intervalId = null;

    /** @private @type {number} */
    this._remaining = 0;

    /** @private @type {boolean} */
    this._running = false;

    /** @private @type {number} */
    this._startTimestamp = 0;

    /** @private @type {number} */
    this._pausedRemaining = 0;
  }

  /* ------------------------------------------------------------------ */
  /*  Public Methods                                                     */
  /* ------------------------------------------------------------------ */

  /**
   * 启动倒计时。
   * @param {number} totalSeconds - 倒计时总秒数
   */
  start(totalSeconds) {
    this.stop();
    this._remaining = totalSeconds;
    this._warningThreshold = totalSeconds <= 5 ? 2 : 5; // 5秒内题型的警告阈值设为 2秒
    this._startTimestamp = Date.now();
    this._running = true;
    this._updateDisplay();
    this._intervalId = setInterval(() => this._tick(), 1000);
  }

  /**
   * 暂停倒计时，保存剩余时间。
   */
  pause() {
    if (!this._running) return;
    clearInterval(this._intervalId);
    this._intervalId = null;
    this._pausedRemaining = this._remaining;
    this._running = false;
  }

  /**
   * 从暂停处恢复倒计时。
   */
  resume() {
    if (this._running) return;
    this._remaining = this._pausedRemaining;
    this._startTimestamp = Date.now();
    this._running = true;
    this._intervalId = setInterval(() => this._tick(), 1000);
  }

  /**
   * 扣除指定秒数，触发视觉反馈。
   * @param {number} seconds - 要扣除的秒数
   */
  deductTime(seconds) {
    this._remaining = Math.max(0, this._remaining - seconds);
    // 重新校准时间戳，避免下一次 _tick 产生偏差
    this._startTimestamp = Date.now();
    this._pausedRemaining = this._remaining;
    this._updateDisplay();

    // 扣时闪烁效果
    this._display.classList.add('timer-deduct');
    setTimeout(() => {
      this._display.classList.remove('timer-deduct');
    }, 500);

    if (this._remaining <= 0) {
      this.stop();
      this._onTimeUp();
    }
  }

  /**
   * 增加指定秒数，并触发奖励闪烁效果。
   * @param {number} seconds - 要增加的秒数
   */
  addTime(seconds) {
    const maxTime = this._warningThreshold === 2 ? 5 : 60;
    this._remaining = Math.min(maxTime, this._remaining + seconds);
    this._startTimestamp = Date.now();
    this._pausedRemaining = this._remaining;
    this._updateDisplay();

    // 增加闪烁效果
    this._display.classList.add('timer-add');
    setTimeout(() => {
      this._display.classList.remove('timer-add');
    }, 500);
  }

  /**
   * 获取剩余秒数（整数）。
   * @returns {number}
   */
  getRemaining() {
    return Math.ceil(this._remaining);
  }

  /**
   * "冻结"道具效果：暂停倒计时 N 秒后自动恢复（与 pause() 的手动恢复不同）。
   * 冻结期间倒计时不推进，也不会触发 onTick。
   * @param {number} seconds - 冻结持续秒数
   */
  freeze(seconds) {
    if (!this._running) return;
    this.pause();
    this._display.classList.add('timer-frozen');
    clearTimeout(this._freezeTimeoutId);
    this._freezeTimeoutId = setTimeout(() => {
      this._display.classList.remove('timer-frozen');
      this.resume();
    }, seconds * 1000);
  }

  /**
   * 调试/测试用：立即让倒计时归零并触发 onTimeUp，跳过等待过程。
   * 对应规范里 Canvas 版调试接口的 advance(sec) 快进精神，
   * 但本项目是事件驱动倒计时，直接触发终点更贴切。
   */
  forceExpire() {
    if (this._intervalId !== null) {
      clearInterval(this._intervalId);
      this._intervalId = null;
    }
    clearTimeout(this._freezeTimeoutId);
    this._remaining = 0;
    this._running = false;
    this._updateDisplay();
    this._onTimeUp();
  }

  /**
   * 停止倒计时并重置状态。
   */
  stop() {
    if (this._intervalId !== null) {
      clearInterval(this._intervalId);
      this._intervalId = null;
    }
    clearTimeout(this._freezeTimeoutId);
    this._running = false;
    this._remaining = 0;
    this._pausedRemaining = 0;
    this._startTimestamp = 0;
  }

  /* ------------------------------------------------------------------ */
  /*  Private Methods                                                    */
  /* ------------------------------------------------------------------ */

  /**
   * 每秒 tick：基于 Date.now() 计算实际剩余时间。
   * @private
   */
  _tick() {
    const elapsed = (Date.now() - this._startTimestamp) / 1000;
    this._remaining = Math.max(0, this._pausedRemaining || this._remaining) - elapsed;

    // 校准：把 _startTimestamp 重置为当前，_pausedRemaining 清零
    this._startTimestamp = Date.now();
    this._pausedRemaining = this._remaining;

    this._updateDisplay();
    this._onTick(Math.ceil(this._remaining));

    if (this._remaining <= 0) {
      this.stop();
      this._onTimeUp();
    }
  }

  /**
   * 更新显示元素文本及预警样式。
   * @private
   */
  _updateDisplay() {
    const seconds = Math.ceil(this._remaining);
    this._display.textContent = seconds;

    const threshold = this._warningThreshold || 5;
    if (seconds <= threshold) {
      this._display.classList.add('timer-warning');
    } else {
      this._display.classList.remove('timer-warning');
    }
  }
}
