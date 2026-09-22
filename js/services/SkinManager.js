// SkinManager.js — MiniGame 3D 角色装扮与拖尾中枢
// 严格执行四大铁律：纯中文零英文、零原生 Emoji、本地持久化

export class SkinManager {
  constructor() {
    this.STORAGE_SKIN_KEY = 'minigame_equipped_skin';
    this.STORAGE_TRAIL_KEY = 'minigame_equipped_trail';
    this.STORAGE_UNLOCKED_SKINS_KEY = 'minigame_unlocked_skins';
    this.STORAGE_UNLOCKED_TRAILS_KEY = 'minigame_unlocked_trails';
    this.listeners = new Set();

    // 5 款参数化粘土与 PBR 皮肤定义表 (100% 纯中文、零 Emoji)
    this.SKINS = [
      {
        id: 'classic',
        name: '经典萌绿',
        desc: '温润苹果绿粘土质感，暖奶黄腹部',
        price: 0,
        headColor: 0x22C55E,
        bodyColor1: 0x22C55E,
        bodyColor2: 0x4ADE80,
        bellyColor: 0xFEF08A,
        roughness: 0.25,
        metalness: 0.1,
        emissive: 0x000000,
        emissiveIntensity: 0.0
      },
      {
        id: 'rainbow',
        name: '彩虹糖果',
        desc: '炫彩粉桃与果汁橙黄渐变糖果身段',
        price: 80,
        headColor: 0xEC4899,
        bodyColor1: 0xF43F5E,
        bodyColor2: 0xFB923C,
        bellyColor: 0xFEF08A,
        roughness: 0.2,
        metalness: 0.12,
        emissive: 0xDB2777,
        emissiveIntensity: 0.18
      },
      {
        id: 'gold',
        name: '黄金尊享',
        desc: '赤金高反光拉丝贵族金属，璀璨尊贵',
        price: 200,
        headColor: 0xFFD700,
        bodyColor1: 0xF59E0B,
        bodyColor2: 0xFBBF24,
        bellyColor: 0xFEF3C7,
        roughness: 0.15,
        metalness: 0.85,
        emissive: 0xD97706,
        emissiveIntensity: 0.35
      },
      {
        id: 'ghost',
        name: '幽灵幻影',
        desc: '常态微透轻盈身躯，青白夜光荧光环绕',
        price: 350,
        headColor: 0xF8FAFC,
        bodyColor1: 0xE0F2FE,
        bodyColor2: 0xBAE6FD,
        bellyColor: 0xF0F9FF,
        roughness: 0.15,
        metalness: 0.1,
        transparent: true,
        opacity: 0.76,
        emissive: 0x38BDF8,
        emissiveIntensity: 0.4
      },
      {
        id: 'cyber',
        name: '赛博紫晶',
        desc: '成就「登峰造极」免费解锁，紫晶霓虹晶体',
        price: 0,
        isAchievementOnly: true,
        achievementId: 'legend_snake',
        achievementName: '登峰造极',
        headColor: 0xA855F7,
        bodyColor1: 0x9333EA,
        bodyColor2: 0xC084FC,
        bellyColor: 0xF3E8FF,
        roughness: 0.18,
        metalness: 0.5,
        emissive: 0x7E22CE,
        emissiveIntensity: 0.55
      }
    ];

    // 4 款流光拖尾粒子效果
    this.TRAILS = [
      {
        id: 'none',
        name: '无拖尾',
        desc: '经典极简，纯粹专注',
        price: 0
      },
      {
        id: 'stardust',
        name: '萌动星尘',
        desc: '金黄四角星光粒子随游动闪烁',
        price: 60,
        colorHex: 0xFBBF24
      },
      {
        id: 'cherry',
        name: '浪漫樱花',
        desc: '粉白娇嫩花瓣缓慢旋舞飘散',
        price: 120,
        colorHex: 0xF472B6
      },
      {
        id: 'bubbles',
        name: '梦幻泡泡',
        desc: '七彩微光半透明皂泡啵啵升腾',
        price: 180,
        colorHex: 0x38BDF8
      }
    ];

    this.unlockedSkins = this._loadUnlocked(this.STORAGE_UNLOCKED_SKINS_KEY, ['classic']);
    this.unlockedTrails = this._loadUnlocked(this.STORAGE_UNLOCKED_TRAILS_KEY, ['none']);
    this.equippedSkinId = localStorage.getItem(this.STORAGE_SKIN_KEY) || 'classic';
    this.equippedTrailId = localStorage.getItem(this.STORAGE_TRAIL_KEY) || 'none';
  }

  _loadUnlocked(key, defaultList) {
    try {
      const saved = localStorage.getItem(key);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('[SkinManager] 读取已解锁数据失败:', e);
    }
    return defaultList;
  }

  _saveUnlocked(key, list) {
    try {
      localStorage.setItem(key, JSON.stringify(list));
    } catch (e) {
      console.warn('[SkinManager] 保存已解锁数据失败:', e);
    }
  }

  // 购买皮肤
  buySkin(skinId, economyManager) {
    const skin = this.SKINS.find(s => s.id === skinId);
    if (!skin || this.unlockedSkins.includes(skinId)) return false;
    if (skin.isAchievementOnly) return false;

    const success = economyManager.spendCoins(skin.price);
    if (success) {
      this.unlockedSkins.push(skinId);
      this._saveUnlocked(this.STORAGE_UNLOCKED_SKINS_KEY, this.unlockedSkins);
      this.equipSkin(skinId);
      this._notify();
      return true;
    }
    return false;
  }

  // 购买拖尾
  buyTrail(trailId, economyManager) {
    const trail = this.TRAILS.find(t => t.id === trailId);
    if (!trail || this.unlockedTrails.includes(trailId)) return false;

    const success = economyManager.spendCoins(trail.price);
    if (success) {
      this.unlockedTrails.push(trailId);
      this._saveUnlocked(this.STORAGE_UNLOCKED_TRAILS_KEY, this.unlockedTrails);
      this.equipTrail(trailId);
      this._notify();
      return true;
    }
    return false;
  }

  // 免费解锁皮肤（如成就奖励）
  unlockFreeSkin(skinId) {
    if (!this.unlockedSkins.includes(skinId)) {
      this.unlockedSkins.push(skinId);
      this._saveUnlocked(this.STORAGE_UNLOCKED_SKINS_KEY, this.unlockedSkins);
      this._notify();
    }
  }

  // 装备皮肤
  equipSkin(skinId) {
    if (!this.unlockedSkins.includes(skinId)) return false;
    this.equippedSkinId = skinId;
    localStorage.setItem(this.STORAGE_SKIN_KEY, skinId);
    this._notify();
    return true;
  }

  // 装备拖尾
  equipTrail(trailId) {
    if (!this.unlockedTrails.includes(trailId)) return false;
    this.equippedTrailId = trailId;
    localStorage.setItem(this.STORAGE_TRAIL_KEY, trailId);
    this._notify();
    return true;
  }

  // 获取当前生效的皮肤定义
  getActiveSkinDef() {
    return this.SKINS.find(s => s.id === this.equippedSkinId) || this.SKINS[0];
  }

  // 获取当前生效的拖尾定义
  getActiveTrailDef() {
    return this.TRAILS.find(t => t.id === this.equippedTrailId) || this.TRAILS[0];
  }

  // 监听器注册
  subscribe(callback) {
    this.listeners.add(callback);
    callback(this.getActiveSkinDef(), this.getActiveTrailDef());
    return () => this.listeners.delete(callback);
  }

  _notify() {
    const skin = this.getActiveSkinDef();
    const trail = this.getActiveTrailDef();
    this.listeners.forEach(cb => {
      try {
        cb(skin, trail);
      } catch (e) {
        console.error('[SkinManager] 通知异常:', e);
      }
    });
  }
}
