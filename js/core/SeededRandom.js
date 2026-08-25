/**
 * @fileoverview 眼力大挑战365 — 确定性随机数生成器
 *
 * 用于"每日挑战"模式：把日期字符串哈希成 32 位整数种子，
 * 喂给 mulberry32 PRNG，得到一个与 Math.random 同签名（返回 [0,1)）
 * 但完全确定性、可复现的随机函数。
 *
 * 纯逻辑模块，无 DOM 依赖。
 * @module core/SeededRandom
 */

/**
 * 把字符串哈希成 32 位无符号整数（简易 FNV-1a 变体）。
 * @param {string} str
 * @returns {number} 32 位无符号整数
 */
function hashStringToSeed(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * mulberry32 PRNG：输入 32 位整数种子，返回一个可重复调用的
 * 确定性随机函数，签名与 Math.random 一致（返回 [0,1)）。
 * @param {number} seed - 32 位无符号整数种子
 * @returns {Function} () => number
 */
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * 根据字符串种子创建一个确定性随机函数。
 * 相同的 seedStr 永远产出相同的随机数序列。
 *
 * @param {string} seedStr - 种子字符串（如 '2026-08-25'）
 * @returns {Function} () => number，签名同 Math.random
 *
 * @example
 * const rng = createSeededRandom('2026-08-25');
 * rng(); // 每次调用都推进序列，同一天多次调用得到相同的序列
 */
export function createSeededRandom(seedStr) {
  return mulberry32(hashStringToSeed(String(seedStr)));
}

/**
 * 返回本地时区的今天日期字符串 'YYYY-MM-DD'，作为每日挑战的默认种子。
 * @returns {string}
 */
export function getTodaySeed() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
