/**
 * @fileoverview 眼力大挑战365 — 题目生成器
 *
 * 根据 LEVEL_CURVE 中的配置（题型、网格尺寸、难度）生成
 * 一道完整的题目数据，包括所有格子的内容与正确答案索引。
 *
 * 支持三种题型：
 * - COLOR：颜色差异（亮度差）
 * - DIRECTION：方向差异（箭头朝向）
 * - TEXT：文字/数字差异（相似字符）
 *
 * 纯逻辑模块，无 DOM 依赖。
 * @module core/QuestionGenerator
 */

import {
  QuestionType,
  Difficulty,
  COLOR_DELTA_L,
  DIRECTIONS,
  DIRECTION_SYMBOLS,
  OPPOSITE_DIRECTIONS,
  TEXT_PAIRS,
  NUMBER_PAIRS,
  SIZE_DELTA,
  COUNT_BASE,
  COUNT_DELTA,
} from './LevelConfig.js';

// ─── 类型定义 ───────────────────────────────────────────────

/**
 * 单个格子的数据
 * @typedef {Object} CellData
 * @property {string} type - 'color' | 'direction' | 'text'
 * @property {string} [color]     - HSL 颜色字符串（color 题）
 * @property {string} [direction] - 方向标识（direction 题）
 * @property {string} [symbol]    - Unicode 箭头符号（direction 题）
 * @property {string} [text]      - 显示文字（text 题）
 */

/**
 * 一道题的完整数据
 * @typedef {Object} QuestionData
 * @property {number}   index       - 题目在本局中的索引
 * @property {string}   type        - 题型
 * @property {number}   gridSize    - 网格边长
 * @property {number}   totalCells  - 总格子数 (gridSize²)
 * @property {number}   correctIndex - 正确格子的索引
 * @property {CellData[]} cells     - 所有格子数据
 * @property {string}   difficulty  - 难度标识
 */

// ─── 方向辅助数据 ───────────────────────────────────────────

/**
 * 垂直方向映射（90°）
 * 用于 NORMAL 难度的方向题：从 base 方向出发取垂直方向
 * @type {Object<string, string[]>}
 */
const PERPENDICULAR_DIRECTIONS = {
  up:        ['left', 'right'],
  down:      ['left', 'right'],
  left:      ['up', 'down'],
  right:     ['up', 'down'],
  upLeft:    ['upRight', 'downLeft'],
  upRight:   ['upLeft', 'downRight'],
  downLeft:  ['upLeft', 'downRight'],
  downRight: ['upRight', 'downLeft'],
};

/**
 * 相邻方向映射（45°）
 * 用于 HARD 难度的方向题：取与 base 只差 45° 的方向
 * @type {Object<string, string[]>}
 */
const ADJACENT_DIRECTIONS = {
  up:        ['upLeft', 'upRight'],
  down:      ['downLeft', 'downRight'],
  left:      ['upLeft', 'downLeft'],
  right:     ['upRight', 'downRight'],
  upLeft:    ['up', 'left'],
  upRight:   ['up', 'right'],
  downLeft:  ['down', 'left'],
  downRight: ['down', 'right'],
};

// ─── QuestionGenerator ─────────────────────────────────────

/**
 * 题目生成器
 *
 * @example
 * const gen = new QuestionGenerator();
 * const q = gen.generate(LEVEL_CURVE[0]);
 * // q.correctIndex → 正确格子下标
 *
 * @example 每日挑战模式注入确定性 rng
 * const gen = new QuestionGenerator(createSeededRandom('2026-08-25'));
 */
export class QuestionGenerator {
  /**
   * @param {Function} [rng=Math.random] - 随机源，签名同 Math.random（返回 [0,1)）。
   *   经典/无尽模式不传，默认用 Math.random；每日挑战模式传入确定性 rng 以保证可复现。
   */
  constructor(rng = Math.random) {
    /** @private */
    this._rng = rng;
  }

  /**
   * 根据关卡配置生成一道题目
   *
   * @param {Object} levelConfig - LEVEL_CURVE 中的一项
   * @param {number} levelConfig.questionIndex - 题目索引
   * @param {number} levelConfig.gridSize      - 网格边长
   * @param {string} levelConfig.type          - 题型
   * @param {string} levelConfig.difficulty    - 难度
   * @returns {QuestionData}
   */
  generate(levelConfig) {
    const { type } = levelConfig;

    switch (type) {
      case QuestionType.COLOR:
        return this._generateColorQuestion(levelConfig);
      case QuestionType.DIRECTION:
        return this._generateDirectionQuestion(levelConfig);
      case QuestionType.TEXT:
        return this._generateTextQuestion(levelConfig);
      case QuestionType.SIZE:
        return this._generateSizeQuestion(levelConfig);
      case QuestionType.COUNT:
        return this._generateCountQuestion(levelConfig);
      default:
        throw new Error(`Unknown question type: ${type}`);
    }
  }

  // ─── 颜色题 ───────────────────────────────────────────────

  /**
   * 生成颜色差异题
   *
   * - 随机生成 HSL 基色
   * - 按难度从 COLOR_DELTA_L 中取亮度差范围
   * - 随机决定偏亮还是偏暗
   * - 确保差异色亮度在 10%–90% 有效范围内
   *
   * @param {Object} config - 关卡配置
   * @returns {QuestionData}
   * @private
   */
  _generateColorQuestion(config) {
    const { questionIndex, gridSize, difficulty } = config;
    const totalCells = gridSize * gridSize;
    const correctIndex = this._shuffleIndex(totalCells);

    // 随机基色
    const h = this._randomInt(0, 360);
    const s = this._randomInt(50, 80);
    const l = this._randomInt(40, 65);

    // 亮度差
    const deltaRange = COLOR_DELTA_L[difficulty];
    let deltaL = this._randomInt(deltaRange.min, deltaRange.max);

    // 随机方向（偏亮或偏暗）
    const goLighter = this._rng() < 0.5;
    let diffL = goLighter ? l + deltaL : l - deltaL;

    // 钳位到有效范围
    if (diffL < 10) diffL = 10;
    if (diffL > 90) diffL = 90;

    // 若钳位后差值过小，尝试反向
    if (Math.abs(diffL - l) < deltaRange.min) {
      diffL = goLighter ? l - deltaL : l + deltaL;
      if (diffL < 10) diffL = 10;
      if (diffL > 90) diffL = 90;
    }

    const baseColor = `hsl(${h}, ${s}%, ${l}%)`;
    const diffColor = `hsl(${h}, ${s}%, ${diffL}%)`;

    /** @type {CellData[]} */
    const cells = [];
    for (let i = 0; i < totalCells; i++) {
      cells.push({
        type: 'color',
        color: i === correctIndex ? diffColor : baseColor,
      });
    }

    return {
      index: questionIndex,
      type: QuestionType.COLOR,
      gridSize,
      totalCells,
      correctIndex,
      cells,
      difficulty,
    };
  }

  // ─── 方向题 ───────────────────────────────────────────────

  /**
   * 生成方向差异题
   *
   * - EASY：差异方向 = 相反方向（180°）
   * - NORMAL：差异方向 = 垂直方向（90°）
   * - HARD：差异方向 = 相邻方向（45°）
   *
   * @param {Object} config - 关卡配置
   * @returns {QuestionData}
   * @private
   */
  _generateDirectionQuestion(config) {
    const { questionIndex, gridSize, difficulty } = config;
    const totalCells = gridSize * gridSize;
    const correctIndex = this._shuffleIndex(totalCells);

    // 随机选取基方向
    const baseDir = DIRECTIONS[this._randomInt(0, DIRECTIONS.length - 1)];
    let diffDir;

    switch (difficulty) {
      case Difficulty.EASY:
        // 相反方向
        diffDir = OPPOSITE_DIRECTIONS[baseDir];
        break;
      case Difficulty.NORMAL: {
        // 90° 垂直方向
        const perps = PERPENDICULAR_DIRECTIONS[baseDir];
        diffDir = perps[this._randomInt(0, perps.length - 1)];
        break;
      }
      case Difficulty.HARD: {
        // 45° 相邻方向
        const adjs = ADJACENT_DIRECTIONS[baseDir];
        diffDir = adjs[this._randomInt(0, adjs.length - 1)];
        break;
      }
      default:
        diffDir = OPPOSITE_DIRECTIONS[baseDir];
    }

    /** @type {CellData[]} */
    const cells = [];
    for (let i = 0; i < totalCells; i++) {
      const dir = i === correctIndex ? diffDir : baseDir;
      cells.push({
        type: 'direction',
        direction: dir,
        symbol: DIRECTION_SYMBOLS[dir],
      });
    }

    return {
      index: questionIndex,
      type: QuestionType.DIRECTION,
      gridSize,
      totalCells,
      correctIndex,
      cells,
      difficulty,
    };
  }

  // ─── 文字题 ───────────────────────────────────────────────

  /**
   * 生成文字差异题
   *
   * - EASY：从 TEXT_PAIRS 前半段随机取一对
   * - NORMAL：从 TEXT_PAIRS 后半段或 NUMBER_PAIRS 随机取一对
   * - HARD：生成 4 位数字串，随机交换其中一位
   *
   * @param {Object} config - 关卡配置
   * @returns {QuestionData}
   * @private
   */
  _generateTextQuestion(config) {
    const { questionIndex, gridSize, difficulty } = config;
    const totalCells = gridSize * gridSize;
    const correctIndex = this._shuffleIndex(totalCells);

    let baseText;
    let diffText;

    switch (difficulty) {
      case Difficulty.EASY: {
        // 从前半部分文字对中随机选取
        const halfLen = Math.ceil(TEXT_PAIRS.length / 2);
        const pair = TEXT_PAIRS[this._randomInt(0, halfLen - 1)];
        baseText = pair.base;
        diffText = pair.diff;
        break;
      }
      case Difficulty.NORMAL: {
        // 从后半部分文字对或数字对中选取
        const useNumbers = this._rng() < 0.4;
        if (useNumbers) {
          const pair = NUMBER_PAIRS[this._randomInt(0, NUMBER_PAIRS.length - 1)];
          baseText = pair.base;
          diffText = pair.diff;
        } else {
          const halfStart = Math.floor(TEXT_PAIRS.length / 2);
          const pair = TEXT_PAIRS[this._randomInt(halfStart, TEXT_PAIRS.length - 1)];
          baseText = pair.base;
          diffText = pair.diff;
        }
        break;
      }
      case Difficulty.HARD: {
        // 生成 4 位数字串，随机改变其中一位
        const digits = [];
        for (let d = 0; d < 4; d++) {
          digits.push(this._randomInt(0, 9));
        }
        baseText = digits.join('');

        // 选一个位置进行改变
        const swapIdx = this._randomInt(0, 3);
        const diffDigits = [...digits];
        let newDigit;
        do {
          newDigit = this._randomInt(0, 9);
        } while (newDigit === digits[swapIdx]);
        diffDigits[swapIdx] = newDigit;
        diffText = diffDigits.join('');
        break;
      }
      default: {
        const pair = TEXT_PAIRS[0];
        baseText = pair.base;
        diffText = pair.diff;
      }
    }

    /** @type {CellData[]} */
    const cells = [];
    for (let i = 0; i < totalCells; i++) {
      cells.push({
        type: 'text',
        text: i === correctIndex ? diffText : baseText,
      });
    }

    return {
      index: questionIndex,
      type: QuestionType.TEXT,
      gridSize,
      totalCells,
      correctIndex,
      cells,
      difficulty,
    };
  }

  // ─── 工具方法 ─────────────────────────────────────────────

  /**
   * 生成 [min, max] 范围内的随机整数（含两端）
   *
   * @param {number} min - 最小值
   * @param {number} max - 最大值
   * @returns {number}
   * @private
   */
  _randomInt(min, max) {
    return Math.floor(this._rng() * (max - min + 1)) + min;
  }

  /**
   * 在 [0, totalCells-1] 范围内随机选择一个索引
   *
   * @param {number} totalCells - 总格子数
   * @returns {number}
   * @private
   */
  _shuffleIndex(totalCells) {
    return Math.floor(this._rng() * totalCells);
  }

  // ─── 大小题 ───────────────────────────────────────────────

  /**
   * 生成大小差异题
   *
   * - 所有格子渲染同色圆角方块，正确格子按难度系数缩放
   * - 随机决定偏大还是偏小
   *
   * @param {Object} config - 关卡配置
   * @returns {QuestionData}
   * @private
   */
  _generateSizeQuestion(config) {
    const { questionIndex, gridSize, difficulty } = config;
    const totalCells = gridSize * gridSize;
    const correctIndex = this._shuffleIndex(totalCells);

    const h = this._randomInt(0, 360);
    const s = this._randomInt(50, 75);
    const l = this._randomInt(45, 60);
    const color = `hsl(${h}, ${s}%, ${l}%)`;

    const deltaRange = SIZE_DELTA[difficulty];
    const deltaScale = deltaRange.min + this._rng() * (deltaRange.max - deltaRange.min);
    const goBigger = this._rng() < 0.5;
    const diffScale = goBigger ? 1 + deltaScale : 1 - deltaScale;

    /** @type {CellData[]} */
    const cells = [];
    for (let i = 0; i < totalCells; i++) {
      cells.push({
        type: 'size',
        color,
        scale: i === correctIndex ? diffScale : 1,
      });
    }

    return {
      index: questionIndex,
      type: QuestionType.SIZE,
      gridSize,
      totalCells,
      correctIndex,
      cells,
      difficulty,
    };
  }

  // ─── 数量题 ───────────────────────────────────────────────

  /**
   * 生成数量/点阵差异题
   *
   * - 所有格子渲染同色点阵，正确格子的点数与其余格子不同
   *
   * @param {Object} config - 关卡配置
   * @returns {QuestionData}
   * @private
   */
  _generateCountQuestion(config) {
    const { questionIndex, gridSize, difficulty } = config;
    const totalCells = gridSize * gridSize;
    const correctIndex = this._shuffleIndex(totalCells);

    const h = this._randomInt(0, 360);
    const s = this._randomInt(50, 75);
    const l = this._randomInt(45, 60);
    const color = `hsl(${h}, ${s}%, ${l}%)`;

    const base = COUNT_BASE[difficulty];
    const delta = COUNT_DELTA[difficulty];
    const goMore = this._rng() < 0.5;
    let diffCount = goMore ? base + delta : base - delta;
    if (diffCount < 1) diffCount = base + delta; // 兜底防止点数 <1

    /** @type {CellData[]} */
    const cells = [];
    for (let i = 0; i < totalCells; i++) {
      cells.push({
        type: 'count',
        color,
        count: i === correctIndex ? diffCount : base,
      });
    }

    return {
      index: questionIndex,
      type: QuestionType.COUNT,
      gridSize,
      totalCells,
      correctIndex,
      cells,
      difficulty,
    };
  }
}
