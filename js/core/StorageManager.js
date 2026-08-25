/**
 * @fileoverview 眼力大挑战365 — 存储管理器
 *
 * 提供静态方法来持久化游戏数据，支持两种运行时环境：
 * - 微信小游戏：wx.setStorageSync / wx.getStorageSync
 * - 浏览器：localStorage
 *
 * 所有键名使用统一前缀 'eyeChallenge_'。
 * 全部方法均包含 try-catch，存储故障不影响游戏运行。
 *
 * 纯逻辑模块，无 DOM 依赖。
 * @module core/StorageManager
 */

/** @constant {string} 所有存储键的前缀 */
const KEY_PREFIX = 'eyeChallenge_';

/** @constant {number} 历史记录最多保留条数 */
const MAX_HISTORY_RECORDS = 50;

// ─── 具体键名 ───────────────────────────────────────────────

const KEYS = {
  BEST_SCORE:         `${KEY_PREFIX}bestScore`,
  BEST_GRADE:         `${KEY_PREFIX}bestGrade`,
  HISTORY:            `${KEY_PREFIX}history`,
  SOUND_ENABLED:      `${KEY_PREFIX}soundEnabled`,
  TOTAL_EXP:          `${KEY_PREFIX}totalExp`,
  ENDLESS_BEST_SCORE: `${KEY_PREFIX}endlessBestScore`,
  DAILY_RECORDS:      `${KEY_PREFIX}dailyRecords`,
};

// ─── StorageManager ─────────────────────────────────────────

/**
 * 存储管理器（全静态方法）
 *
 * @example
 * StorageManager.saveBestScore(92);
 * const best = StorageManager.getBestScore(); // 92
 */
export class StorageManager {
  // ─── 无尽挑战最佳分数 ───────────────────────────────────────

  /**
   * 保存无尽模式最佳分数
   * @param {number} score
   */
  static saveEndlessBestScore(score) {
    StorageManager._setItem(KEYS.ENDLESS_BEST_SCORE, score);
  }

  /**
   * 获取无尽模式最佳分数
   * @returns {number} 默认 0
   */
  static getEndlessBestScore() {
    const val = StorageManager._getItem(KEYS.ENDLESS_BEST_SCORE);
    return typeof val === 'number' ? val : 0;
  }

  // ─── 最佳分数 ─────────────────────────────────────────────

  /**
   * 保存最佳分数
   * @param {number} score
   */
  static saveBestScore(score) {
    StorageManager._setItem(KEYS.BEST_SCORE, score);
  }

  /**
   * 获取最佳分数
   * @returns {number} 默认 0
   */
  static getBestScore() {
    const val = StorageManager._getItem(KEYS.BEST_SCORE);
    return typeof val === 'number' ? val : 0;
  }

  // ─── 最佳段位 ─────────────────────────────────────────────

  /**
   * 保存最佳段位
   * @param {string} grade - 段位字母（如 'SSS'）
   * @param {string} title - 中文称号
   */
  static saveBestGrade(grade, title) {
    StorageManager._setItem(KEYS.BEST_GRADE, { grade, title });
  }

  /**
   * 获取最佳段位
   * @returns {{grade: string, title: string}|null}
   */
  static getBestGrade() {
    const val = StorageManager._getItem(KEYS.BEST_GRADE);
    return val && typeof val === 'object' && val.grade ? val : null;
  }

  // ─── 历史记录 ─────────────────────────────────────────────

  /**
   * 保存一条游戏记录，自动截断到 MAX_HISTORY_RECORDS 条
   *
   * @param {Object} record
   * @param {number} record.score
   * @param {string} record.grade
   * @param {string} record.title
   * @param {number} record.accuracy
   * @param {number} record.timeUsed
   * @param {string} record.date - ISO 日期字符串
   */
  static saveGameRecord(record) {
    const history = StorageManager.getHistory();
    history.unshift(record);

    // 截断
    if (history.length > MAX_HISTORY_RECORDS) {
      history.length = MAX_HISTORY_RECORDS;
    }

    StorageManager._setItem(KEYS.HISTORY, history);
  }

  /**
   * 获取全部历史记录
   * @returns {Array<{score: number, grade: string, title: string, accuracy: number, timeUsed: number, date: string}>}
   */
  static getHistory() {
    const val = StorageManager._getItem(KEYS.HISTORY);
    return Array.isArray(val) ? val : [];
  }

  // ─── 音效开关 ─────────────────────────────────────────────

  /**
   * 获取音效是否启用
   * @returns {boolean} 默认 true
   */
  static getSoundEnabled() {
    const val = StorageManager._getItem(KEYS.SOUND_ENABLED);
    // 未设置过时默认启用
    return val === null || val === undefined ? true : !!val;
  }

  /**
   * 设置音效开关
   * @param {boolean} val
   */
  static setSoundEnabled(val) {
    StorageManager._setItem(KEYS.SOUND_ENABLED, !!val);
  }

  // ─── 每日挑战记录 ─────────────────────────────────────────

  /**
   * 获取指定日期的每日挑战记录
   * @param {string} dateStr - 'YYYY-MM-DD'
   * @returns {{score: number, grade: string, title: string}|null}
   */
  static getDailyRecord(dateStr) {
    const all = StorageManager._getItem(KEYS.DAILY_RECORDS);
    const map = all && typeof all === 'object' ? all : {};
    return map[dateStr] || null;
  }

  /**
   * 保存指定日期的每日挑战最佳成绩（只在打破当天记录时覆盖）
   * @param {string} dateStr - 'YYYY-MM-DD'
   * @param {{score: number, grade: string, title: string}} record
   */
  static setDailyRecord(dateStr, record) {
    const all = StorageManager._getItem(KEYS.DAILY_RECORDS);
    const map = all && typeof all === 'object' ? all : {};
    const prev = map[dateStr];
    if (!prev || record.score > prev.score) {
      map[dateStr] = record;
      StorageManager._setItem(KEYS.DAILY_RECORDS, map);
    }
  }

  // ─── 永久经验值 ───────────────────────────────────────────

  /**
   * 保存玩家的总经验值 (EXP)
   * @param {number} exp
   */
  static saveTotalExp(exp) {
    StorageManager._setItem(KEYS.TOTAL_EXP, exp);
  }

  /**
   * 获取玩家累计的总经验值 (EXP)
   * @returns {number} 默认 0
   */
  static getTotalExp() {
    const val = StorageManager._getItem(KEYS.TOTAL_EXP);
    return typeof val === 'number' ? val : 0;
  }

  // ─── 清除 ─────────────────────────────────────────────────

  /**
   * 清除所有 eyeChallenge_ 开头的存储项
   */
  static clear() {
    try {
      if (StorageManager._isWx()) {
        Object.values(KEYS).forEach((key) => {
          try {
            // eslint-disable-next-line no-undef
            wx.removeStorageSync(key);
          } catch (_) {
            // 忽略单项删除失败
          }
        });
      } else if (typeof localStorage !== 'undefined') {
        Object.values(KEYS).forEach((key) => {
          try {
            localStorage.removeItem(key);
          } catch (_) {
            // 忽略
          }
        });
      }
    } catch (_) {
      // 静默失败
    }
  }

  // ─── 私有工具方法 ─────────────────────────────────────────

  /**
   * 检测是否运行在微信小游戏环境
   * @returns {boolean}
   * @private
   */
  static _isWx() {
    try {
      // eslint-disable-next-line no-undef
      return typeof wx !== 'undefined' && typeof wx.setStorageSync === 'function';
    } catch (_) {
      return false;
    }
  }

  /**
   * 写入存储
   *
   * @param {string} key   - 完整键名
   * @param {*}      value - 要序列化的值
   * @private
   */
  static _setItem(key, value) {
    try {
      if (StorageManager._isWx()) {
        // eslint-disable-next-line no-undef
        wx.setStorageSync(key, value);
      } else if (typeof localStorage !== 'undefined') {
        localStorage.setItem(key, JSON.stringify(value));
      }
    } catch (_) {
      // 静默失败 — 存储不可用不应影响游戏
    }
  }

  /**
   * 读取存储
   *
   * @param {string} key - 完整键名
   * @returns {*} 反序列化后的值，读取失败返回 null
   * @private
   */
  static _getItem(key) {
    try {
      if (StorageManager._isWx()) {
        // eslint-disable-next-line no-undef
        return wx.getStorageSync(key);
      } else if (typeof localStorage !== 'undefined') {
        const raw = localStorage.getItem(key);
        if (raw === null) return null;
        return JSON.parse(raw);
      }
    } catch (_) {
      // 静默失败
    }
    return null;
  }
}
