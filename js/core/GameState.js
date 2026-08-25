/**
 * @fileoverview 眼力大挑战365 — 游戏状态机
 *
 * 管理一局游戏的完整生命周期状态：
 *   IDLE → PLAYING ⇄ PAUSED → RESULT
 *
 * 跟踪当前题号、剩余时间、分数、连击、正确/错误计数以及
 * 每道题的作答记录。
 *
 * 纯逻辑模块，无 DOM 依赖。
 * @module core/GameState
 */

import {
  TOTAL_QUESTIONS,
  TOTAL_TIME,
  generateDynamicLevelCurve,
  generateDailyLevelCurve,
  POWERUP_COMBO_STEP,
  POWERUP_POINT_CAP,
} from './LevelConfig.js';
import { createSeededRandom, getTodaySeed } from './SeededRandom.js';

// ─── 状态常量 ───────────────────────────────────────────────

/** @enum {string} */
const State = {
  IDLE:    'IDLE',
  PLAYING: 'PLAYING',
  PAUSED:  'PAUSED',
  RESULT:  'RESULT',
};

// ─── GameState 类 ───────────────────────────────────────────

/**
 * 游戏状态机
 *
 * @example
 * const gs = new GameState();
 * gs.startGame();
 * gs.recordAnswer(true, 2.5, 0);
 * gs.nextQuestion();
 */
export class GameState {
  /**
   * 创建一个初始化为 IDLE 的游戏状态实例
   */
  constructor() {
    /** @type {string} 当前状态 */
    this.state = State.IDLE;

    /** @type {Array} 动态生成的本局关卡配置 */
    this.levelCurve = [];

    /** @type {number} 当前题目索引（0-based, 0–9） */
    this.currentQuestion = 0;

    /** @type {number} 剩余时间（秒） */
    this.timeRemaining = TOTAL_TIME;

    /** @type {number} 累计原始分数 */
    this.score = 0;

    /** @type {number} 当前连续正确次数 */
    this.combo = 0;

    /** @type {number} 本局最高连击 */
    this.maxCombo = 0;

    /** @type {number} 累计答对题数 */
    this.correctCount = 0;

    /** @type {number} 累计答错次数 */
    this.wrongCount = 0;

    /** @type {number} 当前题目的错误点击次数（每题重置） */
    this.wrongCountThisQuestion = 0;

    /** @type {number|null} 当前题目开始时间戳（ms） */
    this.questionStartTime = null;

    /**
     * 每题作答记录
     * @type {Array<{questionIndex: number, correct: boolean, timeSpent: number, wrongTaps: number}>}
     */
    this.answers = [];

    /** @type {number} 本局复活次数 (限1次) */
    this.revivedCount = 0;

    /** @type {string} 游戏模式 ('classic' | 'endless') */
    this.gameMode = 'classic';

    /** @type {number} 无尽模式剩余生命值 */
    this.lives = 3;

    /** @type {boolean} 无尽模式护盾是否激活 */
    this.shieldActive = false;

    /** @type {number} 观察力值（道具货币），连击累积获得 */
    this.powerupPoints = 0;

    /** @type {boolean} 下一题得分是否翻倍（双倍分道具挂起标记） */
    this.pendingDoubleScore = false;

    /** @type {string|null} 每日挑战使用的种子（YYYY-MM-DD），非每日模式为 null */
    this.dailySeed = null;
  }

  // ─── 重置 ─────────────────────────────────────────────────

  /**
   * 重置全部字段到初始值（状态回到 IDLE）
   */
  reset() {
    this.state = State.IDLE;
    this.levelCurve = [];
    this.currentQuestion = 0;
    this.timeRemaining = TOTAL_TIME;
    this.score = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.correctCount = 0;
    this.wrongCount = 0;
    this.wrongCountThisQuestion = 0;
    this.questionStartTime = null;
    this.answers = [];
    this.revivedCount = 0;
    this.gameMode = 'classic';
    this.lives = 3;
    this.shieldActive = false;
    this.powerupPoints = 0;
    this.pendingDoubleScore = false;
    this.dailySeed = null;
  }

  // ─── 状态转换 ─────────────────────────────────────────────

  /**
   * 开始新一局游戏
   * 重置所有数据并将状态切换为 PLAYING
   * @param {string} mode - 游戏模式 ('classic' | 'endless' | 'daily')
   */
  startGame(mode = 'classic') {
    this.reset();
    this.gameMode = mode;
    this.lives = mode === 'endless' ? 3 : 0;
    this.shieldActive = false;
    this.state = State.PLAYING;

    if (mode === 'daily') {
      // 每日挑战：用当天日期做种子，保证同一天题目序列完全一致
      this.dailySeed = getTodaySeed();
      this.levelCurve = generateDailyLevelCurve(createSeededRandom(this.dailySeed));
    } else {
      this.levelCurve = generateDynamicLevelCurve();
    }

    this.questionStartTime = Date.now();
  }

  /**
   * 复活游戏：恢复到播放状态，增加 10 秒时间，累加复活次数
   */
  revive() {
    this.state = State.PLAYING;
    this.timeRemaining += 10;
    this.revivedCount += 1;
    this.questionStartTime = Date.now();
  }

  /**
   * 进入下一题
   * - 递增 currentQuestion
   * - 重置 wrongCountThisQuestion
   * - 刷新 questionStartTime
   */
  nextQuestion() {
    this.currentQuestion += 1;
    this.wrongCountThisQuestion = 0;
    this.questionStartTime = Date.now();
  }

  /**
   * 暂停游戏（PLAYING → PAUSED）
   */
  pause() {
    if (this.state === State.PLAYING) {
      this.state = State.PAUSED;
    }
  }

  /**
   * 恢复游戏（PAUSED → PLAYING）
   */
  resume() {
    if (this.state === State.PAUSED) {
      this.state = State.PLAYING;
    }
  }

  /**
   * 结束游戏，进入结算状态
   */
  finish() {
    this.state = State.RESULT;
  }

  // ─── 状态查询 ─────────────────────────────────────────────

  /** @returns {boolean} 是否正在游戏中 */
  isPlaying() {
    return this.state === State.PLAYING;
  }

  /** @returns {boolean} 是否处于暂停状态 */
  isPaused() {
    return this.state === State.PAUSED;
  }

  /** @returns {boolean} 是否处于结算状态 */
  isResult() {
    return this.state === State.RESULT;
  }

  /** @returns {boolean} 是否处于空闲状态 */
  isIdle() {
    return this.state === State.IDLE;
  }

  // ─── 统计 ─────────────────────────────────────────────────

  /**
   * 计算正确率（百分比）
   *
   * 分母 = correctCount + 有错误的题目数
   * 当总作答数为 0 时返回 100（避免除零）
   *
   * @returns {number} 0–100 的正确率
   */
  getAccuracy() {
    const denominator = this.correctCount + this.wrongCount;
    if (denominator === 0) return 100;

    return Math.round((this.correctCount / denominator) * 100);
  }

  /**
   * 本局已用时间（秒）
   * @returns {number}
   */
  getTimeUsed() {
    return TOTAL_TIME - this.timeRemaining;
  }

  /**
   * 记录一道题的作答结果
   *
   * @param {boolean} correct - 是否答对
   * @param {number}  timeSpent - 答题耗时（秒）
   * @param {number}  wrongTaps - 本题错误点击次数
   */
  recordAnswer(correct, timeSpent, wrongTaps, score = 0) {
    this.answers.push({
      questionIndex: this.currentQuestion,
      correct,
      timeSpent,
      wrongTaps,
      score,
    });

    if (correct) {
      this.correctCount += 1;
      this.combo += 1;
      if (this.combo > this.maxCombo) {
        this.maxCombo = this.combo;
      }

      // 连击每满 POWERUP_COMBO_STEP 次发放 1 点观察力值（封顶 POWERUP_POINT_CAP）
      if (this.combo % POWERUP_COMBO_STEP === 0) {
        this.powerupPoints = Math.min(POWERUP_POINT_CAP, this.powerupPoints + 1);
      }

      // 无尽模式回血和护盾机制
      if (this.gameMode === 'endless') {
        // 1. 每 10 连击恢复 1 点血量
        if (this.combo > 0 && this.combo % 10 === 0) {
          this.lives = Math.min(3, this.lives + 1);
        }
        // 2. 5 连击及以上自动激活 Fever 护盾
        if (this.combo >= 5) {
          this.shieldActive = true;
        }
      }
    } else {
      this.wrongCount += 1;
      this.combo = 0;

      // 无尽模式扣生命值/碎盾逻辑
      if (this.gameMode === 'endless') {
        if (this.shieldActive) {
          this.shieldActive = false; // 护盾抵消本次失误
        } else {
          this.lives = Math.max(0, this.lives - 1);
        }
      }
    }
  }
}

export { State };
