// SocialManager.js — MiniGame 社交中枢与排行榜管理器
// 支持云端 API 与本地模拟双模无缝降级、战报海报 2D 绘制、好友 PK 挑战链接解析

const STORAGE_KEY_PROFILE = 'minigame_social_profile';
const STORAGE_KEY_SCORES = 'minigame_social_highscores';

const AI_SEEDS = {
  snake3d: [
    { name: '草莓小星', score: 1860 },
    { name: '黄金脆脆角', score: 1520 },
    { name: '森林小旋风', score: 1240 },
    { name: '泡泡探险家', score: 980 },
    { name: '软糖小恐龙', score: 820 },
    { name: '向日葵喵', score: 650 },
    { name: '果冻甜心', score: 510 },
    { name: '绿野追踪者', score: 430 },
    { name: '晨露小蜗牛', score: 320 },
    { name: '萌新毛毛虫', score: 150 }
  ],
  skydodge: [
    { name: '银河先驱者', score: 35600 },
    { name: '星际游侠', score: 28900 },
    { name: '脉冲幽灵', score: 23400 },
    { name: '深空领航员', score: 18200 },
    { name: '量子巡航官', score: 14500 },
    { name: '超光速猎手', score: 11000 },
    { name: '极光守望者', score: 8600 },
    { name: '彗星追风客', score: 6400 },
    { name: '星尘新手', score: 3200 },
    { name: '初级飞行员', score: 1500 }
  ],
  gardenguard: [
    { name: '皇家园艺师', score: 52000 },
    { name: '向日葵领主', score: 41000 },
    { name: '豌豆神射手', score: 33000 },
    { name: '寒冰掌门', score: 26000 },
    { name: '坚果守卫队长', score: 19000 },
    { name: '樱桃爆破手', score: 14000 },
    { name: '嫩芽学徒', score: 8500 },
    { name: '初级园丁', score: 3600 }
  ]
};

const RANDOM_NAMES = [
  '快乐小土豆', '极速小飞侠', '星光漫游者', '爆米花探员', '蓝莓甜甜圈',
  '飞天小仓鼠', '晨曦微风', '闪电小马达', '脆脆小浣熊', '糖霜小饼干'
];

export class SocialManager {
  constructor() {
    this.profile = this._loadProfile();
    this.highScores = this._loadHighScores();
  }

  _loadProfile() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_PROFILE);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.warn('读取本地玩家档案失败:', e);
    }

    const randomName = RANDOM_NAMES[Math.floor(Math.random() * RANDOM_NAMES.length)];
    const newProfile = {
      userId: 'user_' + Math.random().toString(36).slice(2, 10),
      name: randomName,
      createdAt: Date.now()
    };
    this._saveProfile(newProfile);
    return newProfile;
  }

  _saveProfile(profile) {
    try {
      localStorage.setItem(STORAGE_KEY_PROFILE, JSON.stringify(profile));
    } catch (e) {
      console.warn('保存本地玩家档案失败:', e);
    }
  }

  _loadHighScores() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SCORES);
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return {};
  }

  _saveHighScores() {
    try {
      localStorage.setItem(STORAGE_KEY_SCORES, JSON.stringify(this.highScores));
    } catch (e) {}
  }

  getProfile() {
    return { ...this.profile };
  }

  setUserName(newName) {
    const trimmed = (newName || '').trim().slice(0, 12);
    if (!trimmed) return false;
    this.profile.name = trimmed;
    this._saveProfile(this.profile);
    return true;
  }

  getLocalHighScore(game) {
    return this.highScores[game] || 0;
  }

  // 获取排行榜列表（云端优先，自动降级）
  async getLeaderboard(game = 'snake3d', type = 'daily') {
    let remoteList = null;
    try {
      const res = await fetch(`/api/leaderboard?game=${encodeURIComponent(game)}&type=${type}&limit=50`, {
        signal: AbortSignal.timeout(3000)
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data) && json.data.length > 0) {
          remoteList = json.data;
        }
      }
    } catch (err) {
      // 离线或本地环境，静默降级
    }

    let list = remoteList ? [...remoteList] : [...(AI_SEEDS[game] || AI_SEEDS.snake3d)];

    // 将本玩家的最高分融合进去
    const myScore = this.getLocalHighScore(game);
    const myIndex = list.findIndex(item => item.userId === this.profile.userId || item.name === this.profile.name);

    if (myIndex >= 0) {
      if (myScore > list[myIndex].score) {
        list[myIndex].score = myScore;
      }
    } else if (myScore > 0) {
      list.push({
        userId: this.profile.userId,
        name: this.profile.name,
        score: myScore,
        isSelf: true
      });
    }

    list.sort((a, b) => b.score - a.score);

    // 标记当前玩家
    return list.map((item, idx) => ({
      ...item,
      rank: idx + 1,
      isSelf: item.userId === this.profile.userId || item.name === this.profile.name
    }));
  }

  // 上报成绩
  async submitScore(game, score) {
    if (typeof score !== 'number' || score <= 0) return;

    // 本地更新
    if (!this.highScores[game] || score > this.highScores[game]) {
      this.highScores[game] = score;
      this._saveHighScores();
    }

    // 异步上报云端
    try {
      await fetch('/api/leaderboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          game,
          score,
          userId: this.profile.userId,
          name: this.profile.name
        }),
        signal: AbortSignal.timeout(3000)
      });
    } catch (e) {
      // 静默失败，保持本地记录
    }
  }

  // 计算排名与超越比例
  calculateRank(score, list) {
    if (!list || list.length === 0) return { rank: 1, percentile: 99.9 };
    let rank = 1;
    for (let i = 0; i < list.length; i++) {
      if (score < list[i].score) {
        rank = i + 2;
      } else {
        break;
      }
    }
    const total = Math.max(list.length, 100);
    const beaten = total - rank;
    const percentile = Math.min(99.9, Math.max(10.0, (beaten / total * 100))).toFixed(1);
    return { rank, percentile };
  }

  // 好友挑战链接
  generateChallengeUrl(game, score) {
    const origin = window.location.origin;
    const path = window.location.pathname;
    const challenger = encodeURIComponent(this.profile.name);
    return `${origin}${path}?challenge=${score}&from=${challenger}`;
  }

  parseChallengeUrl() {
    const params = new URLSearchParams(window.location.search);
    const challenge = params.get('challenge');
    const from = params.get('from');
    if (challenge && !isNaN(parseInt(challenge, 10))) {
      return {
        hasChallenge: true,
        targetScore: parseInt(challenge, 10),
        challenger: from ? decodeURIComponent(from) : '神秘好友'
      };
    }
    return { hasChallenge: false, targetScore: 0, challenger: '' };
  }

  // 绘制 9:16 高清战报海报 (纯中文、零原生 Emoji、3D 质感)
  async generatePoster({ gameTitle, score, rank, percentile, iconPath = 'assets/icons/icon_trophy.png' }) {
    const width = 720;
    const height = 1280;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    // 1. 梦幻渐变大背景 (暖金与深邃双色)
    const bgGrad = ctx.createLinearGradient(0, 0, width, height);
    bgGrad.addColorStop(0, '#13192B');
    bgGrad.addColorStop(0.4, '#1E2945');
    bgGrad.addColorStop(1, '#0B0F1A');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // 2. 装饰星光粒子
    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    for (let i = 0; i < 40; i++) {
      const rx = (i * 12347) % width;
      const ry = (i * 98765) % height;
      const rSize = (i % 3) + 1.5;
      ctx.beginPath();
      ctx.arc(rx, ry, rSize, 0, Math.PI * 2);
      ctx.fill();
    }

    // 3. 顶部大标题与副标
    ctx.textAlign = 'center';
    ctx.fillStyle = '#6EE7B7';
    ctx.font = 'bold 32px "PingFang SC", "Microsoft YaHei", sans-serif';
    ctx.fillText('MINIGAME · 荣誉战报', width / 2, 110);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = '900 52px "PingFang SC", "Microsoft YaHei", sans-serif';
    ctx.fillText(gameTitle, width / 2, 185);

    // 4. 中间 3D 拟态卡片背景
    const cardX = 48;
    const cardY = 240;
    const cardW = width - 96;
    const cardH = 740;
    const radius = 36;

    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
    ctx.shadowBlur = 30;
    ctx.shadowOffsetY = 15;
    ctx.fillStyle = 'rgba(30, 41, 69, 0.85)';
    this._roundRect(ctx, cardX, cardY, cardW, cardH, radius);
    ctx.fill();
    ctx.restore();

    // 卡片内发光边框
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.lineWidth = 2;
    this._roundRect(ctx, cardX, cardY, cardW, cardH, radius);
    ctx.stroke();

    // 5. 绘制 3D 奖杯图标
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      await new Promise((res, rej) => {
        img.onload = res;
        img.onerror = rej;
        img.src = iconPath;
      });
      const iconSize = 180;
      ctx.drawImage(img, (width - iconSize) / 2, 280, iconSize, iconSize);
    } catch (e) {
      console.warn('海报奖杯绘制降级:', e);
    }

    // 6. 玩家昵称
    ctx.fillStyle = '#94A3B8';
    ctx.font = 'bold 28px "PingFang SC", "Microsoft YaHei", sans-serif';
    ctx.fillText(`探险家 · ${this.profile.name}`, width / 2, 515);

    // 7. 最终得分
    ctx.fillStyle = '#F8FAFC';
    ctx.font = '500 28px "PingFang SC", "Microsoft YaHei", sans-serif';
    ctx.fillText('最终战绩', width / 2, 575);

    ctx.fillStyle = '#F59E0B';
    ctx.font = '900 96px "PingFang SC", "Microsoft YaHei", sans-serif';
    ctx.fillText(score.toLocaleString(), width / 2, 680);

    // 8. 荣誉勋章胶囊
    const pillW = 440;
    const pillH = 72;
    const pillX = (width - pillW) / 2;
    const pillY = 730;

    const pillGrad = ctx.createLinearGradient(pillX, 0, pillX + pillW, 0);
    pillGrad.addColorStop(0, '#10B981');
    pillGrad.addColorStop(1, '#059669');
    ctx.fillStyle = pillGrad;
    this._roundRect(ctx, pillX, pillY, pillW, pillH, 36);
    ctx.fill();

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 30px "PingFang SC", "Microsoft YaHei", sans-serif';
    ctx.fillText(`超越了 ${percentile}% 的挑战者`, width / 2, pillY + 48);

    // 9. 排名信息
    ctx.fillStyle = '#E2E8F0';
    ctx.font = 'bold 32px "PingFang SC", "Microsoft YaHei", sans-serif';
    ctx.fillText(`荣登风云榜 第 ${rank} 名`, width / 2, 860);

    // 10. 底部行动呼吁与挑战提示
    ctx.fillStyle = '#38BDF8';
    ctx.font = 'bold 30px "PingFang SC", "Microsoft YaHei", sans-serif';
    ctx.fillText('扫描或点击链接 · 即刻发起挑战', width / 2, 1070);

    ctx.fillStyle = '#64748B';
    ctx.font = '500 24px "PingFang SC", "Microsoft YaHei", sans-serif';
    ctx.fillText('长按图片即可保存至相册并分享好友', width / 2, 1120);

    return canvas.toDataURL('image/png');
  }

  _roundRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }
}
