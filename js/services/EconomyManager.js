// EconomyManager.js — MiniGame 全局代币经济中枢
// 严格执行四大铁律：纯中文零英文、零原生 Emoji、本地持久化

export class EconomyManager {
  constructor() {
    this.STORAGE_KEY = 'minigame_coins';
    this.DAILY_KEY = 'minigame_daily_reward_date';
    this.listeners = new Set();
    this.coins = this._loadCoins();
  }

  _loadCoins() {
    try {
      const saved = localStorage.getItem(this.STORAGE_KEY);
      if (saved !== null) {
        const val = parseInt(saved, 10);
        return isNaN(val) ? 80 : val;
      }
    } catch (e) {
      console.warn('[EconomyManager] 读取金币失败:', e);
    }
    // 新玩家初始赠送 80 金币
    this._saveCoins(80);
    return 80;
  }

  _saveCoins(amount) {
    try {
      localStorage.setItem(this.STORAGE_KEY, amount.toString());
    } catch (e) {
      console.warn('[EconomyManager] 保存金币失败:', e);
    }
  }

  // 获取当前金币余额
  getCoins() {
    return this.coins;
  }

  // 增加金币
  addCoins(amount, reason = '') {
    if (amount <= 0) return this.coins;
    this.coins += amount;
    this._saveCoins(this.coins);
    this._notifyListeners('add', amount, reason);
    return this.coins;
  }

  // 消费金币
  spendCoins(amount) {
    if (amount <= 0) return true;
    if (this.coins < amount) return false;
    this.coins -= amount;
    this._saveCoins(this.coins);
    this._notifyListeners('spend', amount, '');
    return true;
  }

  // 局末得分转换为金币 (10 分 = 1 金币)
  convertScoreToCoins(score) {
    if (!score || score <= 0) return 0;
    const earned = Math.max(1, Math.floor(score / 10));
    this.addCoins(earned, '对局结算');
    return earned;
  }

  // 检查并领取每日首次登录奖励 (+50 金币)
  checkDailyBonus() {
    try {
      const today = new Date().toISOString().slice(0, 10);
      const lastDate = localStorage.getItem(this.DAILY_KEY);
      if (lastDate !== today) {
        localStorage.setItem(this.DAILY_KEY, today);
        this.addCoins(50, '每日登录');
        return 50;
      }
    } catch (e) {
      console.warn('[EconomyManager] 检查每日奖励失败:', e);
    }
    return 0;
  }

  // 注册余额变动监听器
  subscribe(callback) {
    this.listeners.add(callback);
    // 立即通知一次当前余额
    callback(this.coins);
    return () => this.listeners.delete(callback);
  }

  _notifyListeners(action, delta, reason) {
    this.listeners.forEach(cb => {
      try {
        cb(this.coins, { action, delta, reason });
      } catch (e) {
        console.error('[EconomyManager] 监听回调执行异常:', e);
      }
    });
  }
}
