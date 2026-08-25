import { StorageManager } from '../core/StorageManager.js';

/**
 * @fileoverview WxRankManager — 微信开放数据域排行榜占位实现。
 * 非微信环境下使用 mock 数据，方便本地开发调试。
 * @module wx/WxRankManager
 */

/**
 * 微信好友排行榜管理器。
 * 在微信环境中使用 wx.setUserCloudStorage 提交分数，
 * 通过开放数据域展示好友排行。
 */
export class WxRankManager {
  /**
   * 提交分数到微信云存储。
   *
   * @param {Object} scoreData
   * @param {number} scoreData.score    - 游戏得分
   * @param {number} scoreData.timeUsed - 用时（秒）
   * @param {number} scoreData.accuracy - 正确率 (0‑1)
   * @param {string} scoreData.grade    - 等级 (S/A/B/C/D)
   * @param {string} scoreData.title    - 称号
   */
  submitScore(scoreData) {
    if (this.isWxEnvironment()) {
      // eslint-disable-next-line no-undef
      wx.setUserCloudStorage({
        KVDataList: [
          { key: 'score', value: String(scoreData.score) },
          { key: 'timeUsed', value: String(scoreData.timeUsed) },
          { key: 'accuracy', value: String(scoreData.accuracy) },
          { key: 'grade', value: scoreData.grade },
          { key: 'title', value: scoreData.title },
        ],
        success: () => {
          console.log('[WxRankManager] 分数已提交到云存储');
        },
        fail: (err) => {
          console.warn('[WxRankManager] 提交分数失败:', err);
        },
      });
    } else {
      console.log('[WxRankManager] (placeholder) submitScore:', scoreData);
    }
  }

  /**
   * 展示好友排行榜。
   * 微信环境中向开放数据域发送消息以触发排行榜渲染；
   * 非微信环境下返回 mock 数据。
   *
   * @returns {Array|void} 非微信环境返回 mock 排行数据
   */
  showFriendRanking() {
    if (this.isWxEnvironment()) {
      // eslint-disable-next-line no-undef
      const openDataContext = wx.getOpenDataContext();
      openDataContext.postMessage({
        type: 'showFriendRanking',
      });
    } else {
      console.log('[WxRankManager] (placeholder) showFriendRanking');
      return this.getMockRankData();
    }
  }

  /**
   * 获取模拟的好友排行数据，用于本地开发。
   *
   * @returns {Array<Object>} mock 好友排行条目
   */
  getMockRankData() {
    const bestScore = StorageManager.getBestScore() || 0;
    const bestGrade = StorageManager.getBestGrade() || { grade: 'D', title: '今天先休息' };

    const mockData = [
      { name: '细节猎人', avatar: '🐱', score: 96, grade: 'SS', title: '鹰眼玩家' },
      { name: '小明同学', avatar: '🦊', score: 86, grade: 'S', title: '细节猎人' },
      { name: '阿花同学', avatar: '🐰', score: 72, grade: 'A', title: '观察高手' },
      { name: '路人甲',   avatar: '🐼', score: 58, grade: 'C', title: '眼神飘忽' },
      { name: '打酱油的', avatar: '🐸', score: 35, grade: 'D', title: '今天先休息' },
    ];

    // 只有当玩家玩过至少一次（有成绩记录）时才加入排行
    if (bestScore > 0) {
      mockData.push({
        name: '我 (你)',
        avatar: '😊',
        score: bestScore,
        grade: bestGrade.grade || 'D',
        title: bestGrade.title || '今天先休息',
        isMe: true
      });
    }

    return mockData;
  }

  /**
   * 检测当前是否处于微信小游戏环境。
   * @returns {boolean}
   */
  isWxEnvironment() {
    return typeof wx !== 'undefined';
  }
}
