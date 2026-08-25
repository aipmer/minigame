/**
 * @fileoverview WxShareManager — 微信分享功能占位实现。
 * 非微信环境下使用 alert 模拟分享，方便开发调试。
 * @module wx/WxShareManager
 */

/**
 * 微信分享管理器。
 * 在微信环境中配置分享菜单及分享内容；
 * 非微信环境下通过 alert 展示分享文案。
 */
export class WxShareManager {
  /* ------------------------------------------------------------------ */
  /*  Public Methods                                                     */
  /* ------------------------------------------------------------------ */

  /**
   * 初始化分享配置。
   * 在微信环境中启用分享菜单并注册默认分享内容。
   */
  init() {
    if (this._isWxEnvironment()) {
      // eslint-disable-next-line no-undef
      wx.showShareMenu({
        withShareTicket: true,
        menus: ['shareAppMessage', 'shareTimeline'],
      });

      // eslint-disable-next-line no-undef
      wx.onShareAppMessage(() => ({
        title: '眼力大挑战365 — 你的眼力够犀利吗？',
        imageUrl: '', // TODO: 替换为实际分享图片 URL
      }));

      console.log('[WxShareManager] 分享菜单已配置');
    } else {
      console.log('[WxShareManager] (placeholder) init — 非微信环境');
    }
  }

  /**
   * 分享游戏成绩。
   *
   * @param {Object} scoreData
   * @param {number} scoreData.score - 游戏得分
   * @param {string} scoreData.grade - 等级 (S/A/B/C/D)
   * @param {string} scoreData.title - 称号
   */
  shareResult(scoreData) {
    const text = this.getShareText(scoreData);

    if (this._isWxEnvironment()) {
      // eslint-disable-next-line no-undef
      wx.shareAppMessage({
        title: text,
        imageUrl: '', // TODO: 替换为实际分享结果图片 URL
      });
    } else {
      // 非微信环境：弹窗模拟分享
      // eslint-disable-next-line no-alert
      alert(text);
    }
  }

  /**
   * 生成分享文案。
   *
   * @param {Object} scoreData
   * @param {number} scoreData.score - 游戏得分
   * @param {string} scoreData.grade - 等级
   * @param {string} scoreData.title - 称号
   * @returns {string} 格式化的分享文本
   */
  getShareText(scoreData) {
    const { score, grade, title } = scoreData;
    return `我在「眼力大挑战365」拿到 ${score} 分，等级 ${grade} ${title}，你能超过我吗？`;
  }

  /* ------------------------------------------------------------------ */
  /*  Private Helpers                                                    */
  /* ------------------------------------------------------------------ */

  /**
   * 检测当前是否处于微信小游戏环境。
   * @private
   * @returns {boolean}
   */
  _isWxEnvironment() {
    return typeof wx !== 'undefined';
  }
}
