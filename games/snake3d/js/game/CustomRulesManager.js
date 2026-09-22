/**
 * CustomRulesManager.js
 * 3D 贪吃蛇「玩法工坊 / 自由沙盒模式」核心规则管理器
 * 支持 6 大规则自由定制、LocalStorage 自动持久化、魔性盲盒随机 (Shuffle) 与摘要生成
 */

export class CustomRulesManager {
  constructor() {
    this.storageKey = 'snake3d_custom_rules_v1';

    // 6 大核心维度元数据定义 (100% 纯中文，严禁原生 Emoji)
    this.meta = {
      foodType: {
        title: '食物风味',
        options: [
          { key: 'apple', name: '经典苹果', icon: 'assets/icons/icon_target.png' },
          { key: 'strawberry', name: '多汁草莓', icon: 'assets/icons/icon_strawberry.png' },
          { key: 'donut', name: '甜蜜圆环', icon: 'assets/icons/icon_donut.png' },
          { key: 'star', name: '能量金星', icon: 'assets/icons/icon_crown.png' }
        ]
      },
      wallRule: {
        title: '边界规则',
        options: [
          { key: 'classic', name: '经典碰撞', icon: 'assets/icons/icon_collision.png', desc: '触碰边界即告失败' },
          { key: 'wrap', name: '和平穿墙', icon: 'assets/icons/icon_portal.png', desc: '穿过边界从对侧钻出' },
          { key: 'minefield', name: '暴走地雷', icon: 'assets/icons/icon_bomb.png', desc: '边界浮空地雷阵' }
        ]
      },
      foodCount: {
        title: '果实密度',
        options: [
          { key: 1, name: '单颗寻觅', icon: 'assets/icons/icon_target.png', desc: '场上常驻 1 颗食物' },
          { key: 3, name: '三颗同乐', icon: 'assets/icons/icon_coin.png', desc: '场上常驻 3 颗食物' },
          { key: 5, name: '五星连珠', icon: 'assets/icons/icon_crown.png', desc: '场上常驻 5 颗食物' }
        ]
      },
      speed: {
        title: '移动航速',
        options: [
          { key: 'slow', name: '悠闲漫步', icon: 'assets/icons/icon_refresh.png', interval: 0.22, desc: '舒缓慢速，治愈解压' },
          { key: 'normal', name: '标准竞速', icon: 'assets/icons/icon_snake.png', interval: 0.16, desc: '官方黄金基准节奏' },
          { key: 'fast', name: '极速狂飙', icon: 'assets/icons/icon_boost.png', interval: 0.11, desc: '手速与反应极致考验' },
          { key: 'extreme', name: '超音速', icon: 'assets/icons/icon_rocket.png', interval: 0.075, desc: '硬核极限心跳狂飙' }
        ]
      },
      mapSize: {
        title: '地台尺寸',
        options: [
          { key: 'mini', name: '袖珍迷你 (12×12)', icon: 'assets/icons/icon_target.png', dimension: 12, desc: '紧凑空间，毫厘腾挪' },
          { key: 'standard', name: '标准浮空 (20×20)', icon: 'assets/icons/icon_home.png', dimension: 20, desc: '经典开阔平衡尺寸' },
          { key: 'large', name: '辽阔庄园 (28×28)', icon: 'assets/icons/icon_crystal.png', dimension: 28, desc: '超大面积，巨蟒巡游' }
        ]
      },
      weather: {
        title: '天幕气候',
        options: [
          { key: 'auto', name: '四季流转', icon: 'assets/icons/icon_refresh.png', desc: '每45秒平滑自然演进' },
          { key: 'sunny', name: '晴空暖阳', icon: 'assets/icons/icon_weather_sun.png', desc: '温暖阳光微风和畅' },
          { key: 'thunder', name: '暴雨惊雷', icon: 'assets/icons/icon_weather_thunder.png', desc: '倾盆雷雨惊雷破石' },
          { key: 'snow', name: '梦幻雪境', icon: 'assets/icons/icon_weather_snow.png', desc: '漫天飘雪霜白素裹' }
        ]
      }
    };

    this.defaultRules = {
      foodType: 'apple',
      wallRule: 'classic',
      foodCount: 1,
      speed: 'normal',
      mapSize: 'standard',
      weather: 'auto'
    };

    this.rules = { ...this.defaultRules };
    this.load();
  }

  // 从本地存储载入
  load() {
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        this.rules = { ...this.defaultRules, ...parsed };
      }
    } catch (e) {
      console.warn('读取工坊规则失败，使用默认规则', e);
      this.rules = { ...this.defaultRules };
    }
  }

  // 保存到本地存储
  save() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.rules));
    } catch (e) {
      console.warn('保存工坊规则失败', e);
    }
  }

  // 获取当前全部规则
  getRules() {
    return { ...this.rules };
  }

  // 单项规则设置
  setRule(dimension, value) {
    if (this.meta[dimension]) {
      this.rules[dimension] = value;
      this.save();
    }
  }

  // 🎲 盲盒摇一摇：一键随机组合奇葩沙盒规则
  shuffle() {
    for (const [dim, config] of Object.entries(this.meta)) {
      const opts = config.options;
      const randomIdx = Math.floor(Math.random() * opts.length);
      this.rules[dim] = opts[randomIdx].key;
    }
    this.save();
    return this.getRules();
  }

  // ↺ 重置默认
  reset() {
    this.rules = { ...this.defaultRules };
    this.save();
    return this.getRules();
  }

  // 计算当前设定的步频基础间隔 (秒)
  getSpeedInterval() {
    const opt = this.meta.speed.options.find(o => o.key === this.rules.speed);
    return opt ? opt.interval : 0.16;
  }

  // 计算当前网格跨度 (12, 20, 28)
  getGridDimension() {
    const opt = this.meta.mapSize.options.find(o => o.key === this.rules.mapSize);
    return opt ? opt.dimension : 20;
  }

  // 获取精炼的中文标签文本（用于局内 HUD 胶囊与战报印章）
  getSummaryBadgeText() {
    const foodName = this.meta.foodType.options.find(o => o.key === this.rules.foodType)?.name || '苹果';
    const wallName = this.meta.wallRule.options.find(o => o.key === this.rules.wallRule)?.name || '碰撞';
    const speedName = this.meta.speed.options.find(o => o.key === this.rules.speed)?.name || '标准';
    const countText = `${this.rules.foodCount}果`;
    return `${wallName} · ${countText} · ${speedName} · ${foodName}`;
  }

  // 获取简短描述（用于模式选择器下方说明）
  getShortDesc() {
    const summary = this.getSummaryBadgeText();
    return `自定义工坊：${summary}`;
  }
}
