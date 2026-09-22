// Vercel Serverless Function: /api/leaderboard
// 支持 Upstash Redis / Vercel KV REST API，如未配置环境变量则自动优雅降级为静态种子+内存存储

// 内存暂存器（本地或无外部 KV 环境时的服务期存储）
const memoryScores = {
  snake3d: [
    { name: '草莓小星', score: 1860, timestamp: Date.now() - 3600000 },
    { name: '黄金脆脆角', score: 1520, timestamp: Date.now() - 7200000 },
    { name: '森林小旋风', score: 1240, timestamp: Date.now() - 14400000 },
    { name: '泡泡探险家', score: 980, timestamp: Date.now() - 28800000 },
    { name: '软糖小恐龙', score: 820, timestamp: Date.now() - 43200000 },
    { name: '向日葵喵', score: 650, timestamp: Date.now() - 50000000 },
    { name: '果冻甜心', score: 510, timestamp: Date.now() - 60000000 },
    { name: '绿野追踪者', score: 430, timestamp: Date.now() - 70000000 },
    { name: '晨露小蜗牛', score: 320, timestamp: Date.now() - 80000000 },
    { name: '萌新毛毛虫', score: 150, timestamp: Date.now() - 90000000 }
  ],
  skydodge: [
    { name: '银河先驱者', score: 35600, timestamp: Date.now() - 3600000 },
    { name: '星际游侠', score: 28900, timestamp: Date.now() - 7200000 },
    { name: '脉冲幽灵', score: 23400, timestamp: Date.now() - 14400000 },
    { name: '深空领航员', score: 18200, timestamp: Date.now() - 28800000 },
    { name: '量子巡航官', score: 14500, timestamp: Date.now() - 43200000 },
    { name: '超光速猎手', score: 11000, timestamp: Date.now() - 50000000 },
    { name: '极光守望者', score: 8600, timestamp: Date.now() - 60000000 },
    { name: '彗星追风客', score: 6400, timestamp: Date.now() - 70000000 },
    { name: '星尘新手', score: 3200, timestamp: Date.now() - 80000000 },
    { name: '初级飞行员', score: 1500, timestamp: Date.now() - 90000000 }
  ],
  gardenguard: [
    { name: '皇家园艺大师', score: 52000, timestamp: Date.now() - 3600000 },
    { name: '向日葵领主', score: 41000, timestamp: Date.now() - 7200000 },
    { name: '豌豆神射手', score: 33000, timestamp: Date.now() - 14400000 },
    { name: '寒冰掌门', score: 26000, timestamp: Date.now() - 28800000 },
    { name: '坚果守卫队长', score: 19000, timestamp: Date.now() - 43200000 },
    { name: '樱桃爆破手', score: 14000, timestamp: Date.now() - 50000000 },
    { name: '嫩芽学徒', score: 8500, timestamp: Date.now() - 60000000 },
    { name: '初级园丁', score: 3600, timestamp: Date.now() - 70000000 }
  ]
};

function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function sanitizeString(str, maxLen = 16) {
  if (typeof str !== 'string') return '';
  return str.replace(/<[^>]*>?/gm, '').trim().slice(0, maxLen);
}

export default async function handler(req, res) {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const kvUrl = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const kvToken = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

  // GET: 获取排行榜
  if (req.method === 'GET') {
    const { game = 'snake3d', type = 'daily', limit = 50 } = req.query;
    const cleanGame = sanitizeString(game, 32) || 'snake3d';
    const numLimit = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 100);

    // 如果配置了 Redis / KV REST API
    if (kvUrl && kvToken) {
      try {
        const key = `leaderboard:${cleanGame}:${type}`;
        // ZREVRANGEBYSCORE 或 ZREVRANGE key 0 limit-1 WITHSCORES
        const redisReq = await fetch(`${kvUrl}/zrevrange/${encodeURIComponent(key)}/0/${numLimit - 1}/WITHSCORES`, {
          headers: { Authorization: `Bearer ${kvToken}` }
        });
        const redisData = await redisReq.json();

        if (redisData && Array.isArray(redisData.result)) {
          const list = [];
          for (let i = 0; i < redisData.result.length; i += 2) {
            const memberStr = redisData.result[i];
            const score = parseInt(redisData.result[i + 1], 10);
            try {
              const parsed = JSON.parse(memberStr);
              list.push({ ...parsed, score });
            } catch {
              list.push({ name: memberStr, score });
            }
          }
          return res.status(200).json({ success: true, game: cleanGame, type, data: list, source: 'redis' });
        }
      } catch (err) {
        console.error('Redis fetch failed, falling back to memory:', err);
      }
    }

    // 内存降级
    const list = [...(memoryScores[cleanGame] || memoryScores.snake3d)];
    list.sort((a, b) => b.score - a.score);
    return res.status(200).json({
      success: true,
      game: cleanGame,
      type,
      data: list.slice(0, numLimit),
      source: 'memory'
    });
  }

  // POST: 提交新成绩
  if (req.method === 'POST') {
    let body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch { body = {}; }
    }

    const { game = 'snake3d', type = 'daily', score, name = '探险家', userId } = body || {};
    const cleanGame = sanitizeString(game, 32) || 'snake3d';
    const cleanName = sanitizeString(name, 16) || '探险家';
    const cleanUserId = sanitizeString(userId, 64) || 'guest_' + Math.random().toString(36).slice(2, 9);
    const intScore = parseInt(score, 10);

    if (isNaN(intScore) || intScore < 0 || intScore > 5000000) {
      return res.status(400).json({ success: false, error: '得分无效' });
    }

    const record = {
      userId: cleanUserId,
      name: cleanName,
      score: intScore,
      timestamp: Date.now()
    };

    // 如果配置了 Redis
    if (kvUrl && kvToken) {
      try {
        const key = `leaderboard:${cleanGame}:${type}`;
        const member = JSON.stringify(record);
        // ZADD key score member
        await fetch(`${kvUrl}/zadd/${encodeURIComponent(key)}/${intScore}/${encodeURIComponent(member)}`, {
          headers: { Authorization: `Bearer ${kvToken}` }
        });
        return res.status(200).json({ success: true, saved: true, record, source: 'redis' });
      } catch (err) {
        console.error('Redis save failed, falling back to memory:', err);
      }
    }

    // 内存降级保存
    if (!memoryScores[cleanGame]) {
      memoryScores[cleanGame] = [];
    }
    // 去重更新或者追加
    const existingIdx = memoryScores[cleanGame].findIndex(item => item.userId === cleanUserId);
    if (existingIdx >= 0) {
      if (intScore > memoryScores[cleanGame][existingIdx].score) {
        memoryScores[cleanGame][existingIdx] = record;
      }
    } else {
      memoryScores[cleanGame].push(record);
    }
    memoryScores[cleanGame].sort((a, b) => b.score - a.score);

    return res.status(200).json({ success: true, saved: true, record, source: 'memory' });
  }

  return res.status(405).json({ success: false, error: '不支持的请求方法' });
}
