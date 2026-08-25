/**
 * @fileoverview 眼力大挑战365 — 得分管理器
 *
 * 提供静态方法来计算：
 * - 单题得分（基础分 + 时间奖励 + Fever奖励 − 错误惩罚）
 * - 连击奖励
 * - 最终得分（无硬上限）
 * - 段位映射
 *
 * 纯逻辑模块，无 DOM 依赖。
 * @module core/ScoreManager
 */

import {
  BASE_SCORE_PER_QUESTION,
  TIME_LIMIT_FAST,
  TIME_LIMIT_SLOW,
  WRONG_TAP_PENALTY,
  GRADE_MAP,
} from './LevelConfig.js';

/**
 * 得分管理器（全静态方法）
 *
 * @example
 * const qScore = ScoreManager.calculateQuestionScore(3.2, 1, false);
 * const final  = ScoreManager.calculateFinalScore(gameState);
 * const grade  = ScoreManager.getGrade(115);
 */
export class ScoreManager {
  /**
   * 计算单题得分
   *
   * 采用基础分10分 + 速度加成(最高3分) + Fever加成(2分) - 错误点击惩罚(每次3分)
   *
   * @param {number} timeSpent - 答题耗时（秒）
   * @param {number} wrongTaps - 本题点错次数
   * @param {boolean} isFever - 是否处于狂暴状态
   * @returns {number} 本题得分（已取整，且最低为 0）
   */
  static calculateQuestionScore(timeSpent, wrongTaps, isFever = false) {
    const baseScore = BASE_SCORE_PER_QUESTION;

    // 1. 计算时间奖励 (0 ~ 3分)
    let timeBonus = 0;
    if (timeSpent <= TIME_LIMIT_FAST) {
      timeBonus = 3;
    } else if (timeSpent >= TIME_LIMIT_SLOW) {
      timeBonus = 0;
    } else {
      // 线性递减
      const decayRange = TIME_LIMIT_SLOW - TIME_LIMIT_FAST;
      const progress = (timeSpent - TIME_LIMIT_FAST) / decayRange;
      timeBonus = 3 * (1.0 - progress);
    }

    // 2. 计算 Fever 奖励 (+2分)
    const feverBonus = isFever ? 2 : 0;

    // 3. 计算扣分惩罚 (每次点错扣 3 分，扣完为止)
    const wrongPenalty = wrongTaps * WRONG_TAP_PENALTY;

    // 4. 返回净分（取整且最低为0）
    return Math.max(0, Math.round(baseScore + timeBonus + feverBonus - wrongPenalty));
  }

  /**
   * 连击奖励已整合进 Fever Mode 加分。
   * @param {number} currentCombo - 当前连续正确次数
   * @returns {number} 0
   */
  static calculateComboBonus(currentCombo) {
    return 0;
  }

  /**
   * 计算一局游戏的最终得分
   *
   * 逻辑：
   * 1. 遍历并累加所有正确作答题目里记录的单题分数（即在答题那一瞬间由时间/Fever决定的精确得分）
   * 2. 取消了最终的 100 分和犯错 99 分封顶上限，支持连击高分！
   *
   * @param {import('./GameState.js').GameState} gameState - 游戏状态实例
   * @returns {number} 最终得分
   */
  static calculateFinalScore(gameState) {
    let totalScore = 0;

    // 累加每题分数
    for (const answer of gameState.answers) {
      if (answer.correct) {
        totalScore += (answer.score || 0);
      }
    }

    return Math.max(0, Math.round(totalScore));
  }

  /**
   * 根据分数查询段位
   *
   * @param {number} score - 分数（0–100）
   * @returns {{grade: string, title: string}} 段位与中文称号
   */
  static getGrade(score) {
    for (const entry of GRADE_MAP) {
      if (score >= entry.min && score <= entry.max) {
        return { grade: entry.grade, title: entry.title };
      }
    }
    // 兜底（理论上不会到这里）
    return { grade: 'D', title: '今天先休息' };
  }
}
