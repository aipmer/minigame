/**
 * @fileoverview WxAdManager — 微信激励视频广告占位实现。
 * 非微信环境下自动跳过广告，方便开发调试。
 * @module wx/WxAdManager
 */

/**
 * 微信激励视频广告管理器。
 * 在微信环境中创建并管理 RewardedVideoAd；
 * 非微信环境下所有操作为 no-op 或自动通过。
 */
export class WxAdManager {
  constructor() {
    /** @private @type {Object|null} 微信广告实例 */
    this._adInstance = null;

    /** @private @type {boolean} 广告是否已加载就绪 */
    this._loaded = false;
  }

  /* ------------------------------------------------------------------ */
  /*  Public Methods                                                     */
  /* ------------------------------------------------------------------ */

  /**
   * 初始化广告实例。
   * @param {string} adUnitId - 微信广告位 ID
   */
  init(adUnitId) {
    if (this._isWxEnvironment()) {
      // eslint-disable-next-line no-undef
      this._adInstance = wx.createRewardedVideoAd({
        adUnitId,
      });

      this._adInstance.onLoad(() => {
        this._loaded = true;
        console.log('[WxAdManager] 广告加载完成');
      });

      this._adInstance.onError((err) => {
        this._loaded = false;
        console.warn('[WxAdManager] 广告加载失败:', err);
      });
    } else {
      console.log('[WxAdManager] (placeholder) init — 非微信环境，跳过广告初始化');
    }
  }

  /**
   * 展示激励视频广告。
   *
   * @returns {Promise<boolean>} 用户是否完整观看了广告
   *  - true:  完整观看 / 开发模式自动通过
   *  - false: 用户中途关闭
   */
  showRewardedAd() {
    if (this._isWxEnvironment() && this._adInstance) {
      return new Promise((resolve) => {
        this._adInstance
          .show()
          .then(() => {
            // 监听关闭事件
            const onClose = (res) => {
              this._adInstance.offClose(onClose);
              resolve(res && res.isEnded === true);
            };
            this._adInstance.onClose(onClose);
          })
          .catch((err) => {
            console.warn('[WxAdManager] 广告展示失败:', err);
            // 展示失败不阻塞用户
            resolve(true);
          });
      });
    }

    // 非微信环境：开发模式直接通过
    console.log('[WxAdManager] (placeholder) showRewardedAd — dev mode skip');
    return Promise.resolve(true);
  }

  /**
   * 广告是否已加载就绪。
   * @returns {boolean}
   */
  isAvailable() {
    return this._loaded;
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
