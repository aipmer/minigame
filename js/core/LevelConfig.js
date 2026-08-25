/**
 * @fileoverview 眼力大挑战365 — 关卡配置与难度曲线
 *
 * 本模块定义了一局游戏（10 道题）的全部配置常量，包括：
 * - 基础参数（总题数、时间、惩罚值等）
 * - 题型枚举与难度枚举
 * - 10 题难度曲线 LEVEL_CURVE
 * - 颜色题亮度差值 COLOR_DELTA_L
 * - 方向题相关映射
 * - 文字题相似字对
 * - 评分参数与段位映射
 *
 * 纯数据模块，无任何 DOM / 运行时依赖。
 * @module core/LevelConfig
 */

// ─── 基础参数 ───────────────────────────────────────────────

/** @constant {number} 每局总题数 */
export const TOTAL_QUESTIONS = 10;

/** @constant {number} 每局总时间（秒） */
export const TOTAL_TIME = 60;

/** @constant {number} 每次答错扣除的时间（秒） */
export const WRONG_TIME_PENALTY = 3;

/** @constant {number} 每次答错扣除的分数 */
export const WRONG_SCORE_PENALTY = 3;

/** @constant {number} 每道题最多计入惩罚的错误点击次数 */
export const MAX_WRONG_PER_QUESTION = 5;

// ─── 枚举 ───────────────────────────────────────────────────

/**
 * 题目类型枚举
 * @enum {string}
 */
export const QuestionType = {
  /** 颜色差异题 */
  COLOR: 'color',
  /** 方向差异题 */
  DIRECTION: 'direction',
  /** 文字/数字差异题 */
  TEXT: 'text',
  /** 大小差异题 */
  SIZE: 'size',
  /** 数量/点阵差异题 */
  COUNT: 'count',
};

/**
 * 难度枚举
 * @enum {string}
 */
export const Difficulty = {
  EASY: 'easy',
  NORMAL: 'normal',
  HARD: 'hard',
};

// ─── 10 题难度曲线 ──────────────────────────────────────────

/**
 * 每道题的网格尺寸、题型与难度配置
 * @type {Array<{questionIndex: number, gridSize: number, type: string, difficulty: string}>}
 */
export const LEVEL_CURVE = [
  { questionIndex: 0, gridSize: 3, type: QuestionType.COLOR,     difficulty: Difficulty.EASY   },
  { questionIndex: 1, gridSize: 3, type: QuestionType.DIRECTION, difficulty: Difficulty.EASY   },
  { questionIndex: 2, gridSize: 4, type: QuestionType.TEXT,      difficulty: Difficulty.EASY   },
  { questionIndex: 3, gridSize: 4, type: QuestionType.COLOR,     difficulty: Difficulty.NORMAL },
  { questionIndex: 4, gridSize: 5, type: QuestionType.DIRECTION, difficulty: Difficulty.NORMAL },
  { questionIndex: 5, gridSize: 5, type: QuestionType.COLOR,     difficulty: Difficulty.NORMAL },
  { questionIndex: 6, gridSize: 5, type: QuestionType.TEXT,      difficulty: Difficulty.NORMAL },
  { questionIndex: 7, gridSize: 6, type: QuestionType.COLOR,     difficulty: Difficulty.HARD   },
  { questionIndex: 8, gridSize: 6, type: QuestionType.DIRECTION, difficulty: Difficulty.HARD   },
  { questionIndex: 9, gridSize: 6, type: QuestionType.TEXT,      difficulty: Difficulty.HARD   },
];

// ─── 颜色题配置 ─────────────────────────────────────────────

/**
 * 颜色题亮度差值范围（百分比），按难度划分
 * deltaL 越小，差异越难察觉
 * @type {Object<string, {min: number, max: number}>}
 */
export const COLOR_DELTA_L = {
  [Difficulty.EASY]:   { min: 12, max: 20 },
  [Difficulty.NORMAL]: { min: 6,  max: 12 },
  [Difficulty.HARD]:   { min: 3,  max: 6  },
};

// ─── 大小题配置 ─────────────────────────────────────────────

/**
 * 大小差异题的缩放比例差值范围，按难度划分
 * 差值越小越难察觉；正确格子在 1.0 基准上偏大或偏小 deltaScale
 * @type {Object<string, {min: number, max: number}>}
 */
export const SIZE_DELTA = {
  [Difficulty.EASY]:   { min: 0.22, max: 0.32 },
  [Difficulty.NORMAL]: { min: 0.13, max: 0.20 },
  [Difficulty.HARD]:   { min: 0.06, max: 0.11 },
};

// ─── 数量题配置 ─────────────────────────────────────────────

/**
 * 数量/点阵差异题的基础点数，按难度划分
 * @type {Object<string, number>}
 */
export const COUNT_BASE = {
  [Difficulty.EASY]:   4,
  [Difficulty.NORMAL]: 5,
  [Difficulty.HARD]:   6,
};

/**
 * 数量/点阵差异题正确格子与基础点数的差值，按难度划分
 * 差值越小越难察觉
 * @type {Object<string, number>}
 */
export const COUNT_DELTA = {
  [Difficulty.EASY]:   2,
  [Difficulty.NORMAL]: 1,
  [Difficulty.HARD]:   1,
};

// ─── 方向题配置 ─────────────────────────────────────────────

/** @constant {string[]} 全部 8 个方向标识 */
export const DIRECTIONS = [
  'up', 'down', 'left', 'right',
  'upLeft', 'upRight', 'downLeft', 'downRight',
];

/**
 * 各方向对应的 Unicode 箭头符号
 * @type {Object<string, string>}
 */
export const DIRECTION_SYMBOLS = {
  up:        '↑',
  down:      '↓',
  left:      '←',
  right:     '→',
  upLeft:    '↖',
  upRight:   '↗',
  downLeft:  '↙',
  downRight: '↘',
};

/**
 * 相反方向映射
 * @type {Object<string, string>}
 */
export const OPPOSITE_DIRECTIONS = {
  up:        'down',
  down:      'up',
  left:      'right',
  right:     'left',
  upLeft:    'downRight',
  upRight:   'downLeft',
  downLeft:  'upRight',
  downRight: 'upLeft',
};

// ─── 文字题配置 ─────────────────────────────────────────────

/**
 * 相似汉字对（base 为"大众"字符，diff 为与之相似的字符）
 * @type {Array<{base: string, diff: string}>}
 */
export const TEXT_PAIRS = [
  { base: '日', diff: '目' },
  { base: '土', diff: '士' },
  { base: '未', diff: '末' },
  { base: '己', diff: '已' },
  { base: '大', diff: '太' },
  { base: '人', diff: '入' },
  { base: '天', diff: '夫' },
  { base: '干', diff: '千' },
  { base: '万', diff: '方' },
  { base: '王', diff: '玉' },
  { base: '刀', diff: '力' },
  { base: '木', diff: '本' },
  { base: '人', diff: '八' },
  { base: '已', diff: '巳' },
  { base: '王', diff: '主' },
  { base: '九', diff: '丸' },
  { base: '大', diff: '犬' },
  { base: '早', diff: '草' },
  { base: '竞', diff: '竟' },
  { base: '折', diff: '拆' },
  { base: '戌', diff: '戍' },
  { base: '戌', diff: '成' },
  { base: '哀', diff: '衰' },
  { base: '亨', diff: '享' },
  { base: '汩', diff: '汨' },
  { base: '尘', diff: '尖' },
  { base: '免', diff: '兔' },
  { base: '由', diff: '甲' },
  { base: '由', diff: '申' },
  { base: '买', diff: '卖' },
  { base: '币', diff: '市' },
  { base: '崇', diff: '祟' },
  { base: '幕', diff: '墓' },
  { base: '洒', diff: '酒' },
  { base: '陡', diff: '徒' },
  { base: '狠', diff: '狼' },
];

/**
 * 相似数字/字母对
 * @type {Array<{base: string, diff: string}>}
 */
export const NUMBER_PAIRS = [
  { base: '6',  diff: '9'  },
  { base: '68', diff: '89' },
  { base: '96', diff: '69' },
  { base: '12', diff: '21' },
  { base: '3',  diff: '8'  },
  { base: '5',  diff: '6'  },
  { base: '2',  diff: 'Z'  },
  { base: '1',  diff: '7'  },
  { base: '0',  diff: '8'  },
  { base: '5',  diff: 'S'  },
  { base: '0',  diff: 'O'  },
  { base: '1',  diff: 'l'  },
  { base: '8',  diff: 'B'  },
  { base: '9',  diff: 'g'  },
];

// ─── 评分与段位 ─────────────────────────────────────────────

/**
 * 段位映射表（按 min 降序排列，遍历时取第一个匹配即可）
 * @type {Array<{min: number, max: number, grade: string, title: string}>}
 */
export const GRADE_MAP = [
  { min: 130, max: 999, grade: 'SSS', title: '人形扫描仪' },
  { min: 115, max: 129, grade: 'SS',  title: '鹰眼玩家'   },
  { min: 100, max: 114, grade: 'S',   title: '细节猎人'   },
  { min: 85,  max: 99,  grade: 'A',   title: '观察高手'   },
  { min: 70,  max: 84,  grade: 'B',   title: '稳定发挥'   },
  { min: 55,  max: 69,  grade: 'C',   title: '眼神飘忽'   },
  { min: 0,   max: 54,  grade: 'D',   title: '今天先休息' },
];

/** 每个题目的基础分（10题基础分为100分） */
export const BASE_SCORE_PER_QUESTION = 10;

/** 获得满额速度奖励的时间上限（秒） */
export const TIME_LIMIT_FAST = 3;

/** 速度奖励完全衰减为0的时间上限（秒） */
export const TIME_LIMIT_SLOW = 8;

/** 超时未作答的最低分数比例（0.5 表示最慢可得 50% 的分数） */
export const DECAY_MIN_RATIO = 0.5;

/** 每次点错扣除的分数 */
export const WRONG_TAP_PENALTY = 3;

/**
 * 辅助函数：随机洗牌数组
 * @param {Array} array
 * @returns {Array} 洗牌后的新数组
 */
function shuffleArray(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * 动态生成一局游戏（10 道题）的关卡配置。
 * 保持难度与网格尺寸的平滑递增，但随机化每档难度下的题型顺序。
 * @returns {Array<{questionIndex: number, gridSize: number, type: string, difficulty: string}>}
 */
/**
 * 全部题型池（用于难度曲线随机抽取）
 * @type {string[]}
 */
const ALL_TYPES = [
  QuestionType.COLOR,
  QuestionType.DIRECTION,
  QuestionType.TEXT,
  QuestionType.SIZE,
  QuestionType.COUNT,
];

export function generateDynamicLevelCurve(rng = Math.random) {
  const pickRandom = (arr) => arr[Math.floor(rng() * arr.length)];
  const shuffle = (arr) => {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  // 1. EASY 档 (Q0 - Q2): 2个 3x3, 1个 4x4 — 从全部题型池里抽 3 个不重复的
  const easyTypes = shuffle(ALL_TYPES).slice(0, 3);
  const easyCurve = [
    { gridSize: 3, type: easyTypes[0], difficulty: Difficulty.EASY },
    { gridSize: 3, type: easyTypes[1], difficulty: Difficulty.EASY },
    { gridSize: 4, type: easyTypes[2], difficulty: Difficulty.EASY },
  ];

  // 2. NORMAL 档 (Q3 - Q6): 1个 4x4, 3个 5x5 — 从全部题型池里抽 4 个不重复的
  const normalTypes = shuffle(ALL_TYPES).slice(0, 4);
  const normalCurve = [
    { gridSize: 4, type: normalTypes[0], difficulty: Difficulty.NORMAL },
    { gridSize: 5, type: normalTypes[1], difficulty: Difficulty.NORMAL },
    { gridSize: 5, type: normalTypes[2], difficulty: Difficulty.NORMAL },
    { gridSize: 5, type: normalTypes[3], difficulty: Difficulty.NORMAL },
  ];

  // 3. HARD 档 (Q7 - Q9): 3个 6x6 — 从全部题型池里抽 3 个不重复的
  const hardTypes = shuffle(ALL_TYPES).slice(0, 3);
  const hardCurve = [
    { gridSize: 6, type: hardTypes[0], difficulty: Difficulty.HARD },
    { gridSize: 6, type: hardTypes[1], difficulty: Difficulty.HARD },
    { gridSize: 6, type: hardTypes[2], difficulty: Difficulty.HARD },
  ];

  // 合并并重新生成 0-based 题目索引
  return [...easyCurve, ...normalCurve, ...hardCurve].map((item, index) => ({
    questionIndex: index,
    ...item,
  }));
}

/**
 * 生成"每日挑战"关卡曲线：用注入的确定性 rng 代替 Math.random，
 * 保证同一天所有玩家跑出完全相同的 10 题序列。
 * @param {Function} rng - 返回 [0,1) 的确定性随机函数
 * @returns {Array<{questionIndex: number, gridSize: number, type: string, difficulty: string}>}
 */
export function generateDailyLevelCurve(rng) {
  return generateDynamicLevelCurve(rng);
}

/**
 * 永久等级阈值与称号配置
 * @type {Array<{level: number, title: string, expNeeded: number}>}
 */
export const EXP_LEVELS = [
  { level: 1, title: '见习观察员', expNeeded: 100  },
  { level: 2, title: '见习侦探',   expNeeded: 300  },
  { level: 3, title: '寻宝猎人',   expNeeded: 600  },
  { level: 4, title: '细节搜寻者', expNeeded: 1000 },
  { level: 5, title: '王牌侦探',   expNeeded: 1500 },
  { level: 6, title: '鹰眼特工',   expNeeded: 2100 },
  { level: 7, title: '人形扫描仪', expNeeded: 2800 },
  { level: 8, title: '眼力主宰',   expNeeded: Infinity },
];

/**
 * 根据玩家累计的总经验值，计算出等级、称号、当前等级经验及下一级所需经验。
 * @param {number} totalExp - 玩家累计的总 EXP
 * @returns {{level: number, title: string, currentLevelExp: number, nextLevelExp: number, progressRatio: number, absoluteExp: number}}
 */
export function getLevelInfo(totalExp) {
  for (let i = 0; i < EXP_LEVELS.length; i++) {
    const config = EXP_LEVELS[i];
    const prevNeeded = i === 0 ? 0 : EXP_LEVELS[i - 1].expNeeded;
    
    if (totalExp < config.expNeeded) {
      const currentLevelExp = totalExp - prevNeeded;
      const nextLevelExp = config.expNeeded - prevNeeded;
      const progressRatio = nextLevelExp === Infinity ? 1.0 : currentLevelExp / nextLevelExp;
      
      return {
        level: config.level,
        title: config.title,
        currentLevelExp,
        nextLevelExp,
        progressRatio,
        absoluteExp: totalExp
      };
    }
  }
  
  const maxConfig = EXP_LEVELS[EXP_LEVELS.length - 1];
  return {
    level: maxConfig.level,
    title: maxConfig.title,
    currentLevelExp: 0,
    nextLevelExp: 0,
    progressRatio: 1.0,
    absoluteExp: totalExp
  };
}

// ─── 道具配置 ─────────────────────────────────────────────

/** @constant {number} 每满多少连击发放 1 点观察力值 */
export const POWERUP_COMBO_STEP = 3;

/** @constant {number} 观察力值上限 */
export const POWERUP_POINT_CAP = 5;

/**
 * 道具数据表：id / 名称 / 消耗点数 / 图标
 * @type {Array<{id: string, name: string, cost: number, icon: string}>}
 */
export const POWERUP_CONFIG = [
  { id: 'hint',   name: '提示',   cost: 1, icon: '💡' },
  { id: 'freeze', name: '冻结',   cost: 1, icon: '❄️' },
  { id: 'double', name: '双倍分', cost: 2, icon: '✨' },
];

/** @constant {number} 冻结道具暂停计时的秒数 */
export const FREEZE_DURATION = 3;

/** @constant {number} 提示道具排除的错误格子数 */
export const HINT_ELIMINATE_COUNT = 2;

/**
 * 无尽模式通关数对应的荣誉称号评定
 */
export const ENDLESS_TITLES = [
  { min: 46, title: '眼力宗师' },
  { min: 26, title: '观察大师' },
  { min: 11, title: '细节精英' },
  { min: 0,  title: '眼力新手' }
];

/**
 * 根据无尽模式的答题序号动态获取关卡难度配置（每 5 道题阶梯式升级一次）
 * @param {number} questionIndex - 答题索引(从0开始)
 * @returns {{questionIndex: number, gridSize: number, type: string, difficulty: string}} 题目难度配置
 */
export function getEndlessLevelConfig(questionIndex) {
  let gridSize = 3;
  let difficulty = Difficulty.EASY;

  if (questionIndex < 5) {
    gridSize = 3;
    difficulty = Difficulty.EASY;
  } else if (questionIndex < 10) {
    gridSize = 4;
    difficulty = Difficulty.NORMAL;
  } else if (questionIndex < 15) {
    gridSize = 5;
    difficulty = Difficulty.HARD;
  } else {
    gridSize = 6;
    difficulty = Difficulty.HARD;
  }

  // 五种题型交替轮转
  const types = ALL_TYPES;
  const type = types[questionIndex % types.length];

  return {
    questionIndex,
    gridSize,
    type,
    difficulty
  };
}
