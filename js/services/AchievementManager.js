// AchievementManager.js — MiniGame 全局荣誉成就中枢
// 严格执行四大铁律：纯中文零英文、零原生 Emoji、本地持久化

export class AchievementManager {
  constructor(economyManager, skinManager = null) {
    this.economy = economyManager;
    this.skinManager = skinManager;
    this.STORAGE_KEY = 'minigame_achievements';
    this.STATS_KEY = 'minigame_stats';
    this.unlockListeners = new Set();

    // 预置成就定义表 (100% 纯中文、透明 3D 图标)
    this.DEFINITIONS = [
      {
        id: 'first_win',
        title: '首胜试炼',
        desc: '单局得分达到 100 分',
        icon: 'assets/icons/icon_target.png',
        rewardType: 'coins',
        rewardCoins: 50,
        rewardText: '+50 金币',
        check: (stats) => (stats.maxScore || 0) >= 100
      },
      {
        id: 'power_collector',
        title: '超能探索者',
        desc: '单局拾取 3 次超能道具',
        icon: 'assets/icons/icon_crystal.png',
        rewardType: 'coins',
        rewardCoins: 80,
        rewardText: '+80 金币',
        check: (stats, session) => (session.powerUpsCollected || 0) >= 3
      },
      {
        id: 'ghost_walker',
        title: '幽灵漫步',
        desc: '幽灵形态下穿墙 3 次',
        icon: 'assets/icons/icon_ghost.png',
        rewardType: 'coins',
        rewardCoins: 120,
        rewardText: '+120 金币',
        check: (stats, session) => (session.ghostWarps || 0) >= 3
      },
      {
        id: 'rock_crusher',
        title: '爆破专家',
        desc: '累计粉碎 10 块障碍石',
        icon: 'assets/icons/icon_bomb.png',
        rewardType: 'coins',
        rewardCoins: 150,
        rewardText: '+150 金币',
        check: (stats) => (stats.totalRocksCrushed || 0) >= 10
      },
      {
        id: 'combo_storm',
        title: '连击风暴',
        desc: '单局达成 4 次连击',
        icon: 'assets/icons/icon_fire.png',
        rewardType: 'coins',
        rewardCoins: 150,
        rewardText: '+150 金币',
        check: (stats, session) => (session.maxCombo || 0) >= 4
      },
      {
        id: 'legend_snake',
        title: '登峰造极',
        desc: '单局得分突破 1000 分',
        icon: 'assets/icons/icon_crown.png',
        rewardType: 'skin',
        rewardSkinId: 'cyber',
        rewardText: '免费解锁至尊皮肤「赛博紫晶」',
        check: (stats) => (stats.maxScore || 0) >= 1000
      }
    ];

    this.unlocked = this._loadUnlocked();
    this.cumulativeStats = this._loadStats();
    this.sessionStats = this._initSessionStats();
  }

  setSkinManager(skinManager) {
    this.skinManager = skinManager;
  }

  _initSessionStats() {
    return {
      score: 0,
      powerUpsCollected: 0,
      ghostWarps: 0,
      rocksCrushedInSession: 0,
      maxCombo: 0
    };
  }

  _loadUnlocked() {
    try {
      const saved = localStorage.getItem(this.STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('[AchievementManager] 读取成就数据失败:', e);
    }
    return {};
  }

  _saveUnlocked() {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.unlocked));
    } catch (e) {
      console.warn('[AchievementManager] 保存成就数据失败:', e);
    }
  }

  _loadStats() {
    try {
      const saved = localStorage.getItem(this.STATS_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('[AchievementManager] 读取统计数据失败:', e);
    }
    return {
      maxScore: 0,
      totalGames: 0,
      totalRocksCrushed: 0,
      totalPowerUps: 0
    };
  }

  _saveStats() {
    try {
      localStorage.setItem(this.STATS_KEY, JSON.stringify(this.cumulativeStats));
    } catch (e) {
      console.warn('[AchievementManager] 保存统计数据失败:', e);
    }
  }

  // 开启新一局，重置局内统计
  resetSession() {
    this.sessionStats = this._initSessionStats();
  }

  // 记录行为事件并实时检测成就达成
  recordEvent(eventName, value = 1) {
    switch (eventName) {
      case 'score':
        this.sessionStats.score = value;
        if (value > (this.cumulativeStats.maxScore || 0)) {
          this.cumulativeStats.maxScore = value;
          this._saveStats();
        }
        break;
      case 'powerup':
        this.sessionStats.powerUpsCollected = (this.sessionStats.powerUpsCollected || 0) + 1;
        this.cumulativeStats.totalPowerUps = (this.cumulativeStats.totalPowerUps || 0) + 1;
        this._saveStats();
        break;
      case 'ghost_warp':
        this.sessionStats.ghostWarps = (this.sessionStats.ghostWarps || 0) + 1;
        break;
      case 'rock_crushed':
        this.sessionStats.rocksCrushedInSession = (this.sessionStats.rocksCrushedInSession || 0) + value;
        this.cumulativeStats.totalRocksCrushed = (this.cumulativeStats.totalRocksCrushed || 0) + value;
        this._saveStats();
        break;
      case 'combo':
        if (value > (this.sessionStats.maxCombo || 0)) {
          this.sessionStats.maxCombo = value;
        }
        break;
      case 'game_end':
        this.cumulativeStats.totalGames = (this.cumulativeStats.totalGames || 0) + 1;
        this._saveStats();
        break;
    }

    this._checkAllConditions();
  }

  _checkAllConditions() {
    for (const def of this.DEFINITIONS) {
      if (this.unlocked[def.id]) continue; // 已解锁

      if (def.check(this.cumulativeStats, this.sessionStats)) {
        this.unlockAchievement(def.id);
      }
    }
  }

  unlockAchievement(id) {
    const def = this.DEFINITIONS.find(d => d.id === id);
    if (!def || this.unlocked[id]) return;

    const timestamp = Date.now();
    this.unlocked[id] = {
      unlockedAt: timestamp
    };
    this._saveUnlocked();

    // 奖励发放
    if (def.rewardType === 'coins' && this.economy) {
      this.economy.addCoins(def.rewardCoins, `成就：${def.title}`);
    } else if (def.rewardType === 'skin' && this.skinManager) {
      this.skinManager.unlockFreeSkin(def.rewardSkinId);
    }

    // 广播通知
    this._notifyUnlock(def);
  }

  onUnlock(callback) {
    this.unlockListeners.add(callback);
    return () => this.unlockListeners.delete(callback);
  }

  _notifyUnlock(achievement) {
    this.unlockListeners.forEach(cb => {
      try {
        cb(achievement);
      } catch (e) {
        console.error('[AchievementManager] 解锁回调异常:', e);
      }
    });
  }

  // 获取所有成就列表与当前完成态
  getAllAchievements() {
    return this.DEFINITIONS.map(def => ({
      ...def,
      isUnlocked: !!this.unlocked[def.id],
      unlockedAt: this.unlocked[def.id] ? this.unlocked[def.id].unlockedAt : null
    }));
  }

  // 获取达成总进度
  getProgress() {
    const total = this.DEFINITIONS.length;
    const completed = Object.keys(this.unlocked).length;
    return {
      completed,
      total,
      percent: Math.round((completed / total) * 100)
    };
  }
}
