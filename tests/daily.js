/**
 * @fileoverview 断言"每日挑战"用当天种子生成的题目序列可复现：
 * 两个独立的浏览器会话，同一天各开一局 daily 模式，
 * 应得到完全相同的 10 题（题型/网格尺寸/难度/正确格子/格子内容）。
 */
import { chromium } from 'playwright';
import { assert, BASE_URL } from './_helpers.js';

async function collectDailyRun() {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(`${BASE_URL}/index.html`);
  await page.waitForFunction(() => typeof window.__game !== 'undefined');

  await page.evaluate(() => window.__game.start('daily'));
  await page.waitForFunction(() => window.__game.state === 'PLAYING');

  const seed = await page.evaluate(() => window.__game.dailySeed);
  const levelCurve = await page.evaluate(() => window.__game.levelCurve);

  // 逐题记录正确格子索引与题目内容摘要，覆盖"每题具体内容也确定性"这一点
  const questionSnapshots = [];
  for (let i = 0; i < levelCurve.length; i++) {
    const q = await page.evaluate(() => window.__game.question);
    questionSnapshots.push({
      type: q.type,
      gridSize: q.gridSize,
      correctIndex: q.correctIndex,
      cells: q.cells,
    });
    await page.evaluate((idx) => window.__game.answer(idx), q.correctIndex);
    await page.waitForTimeout(120);
  }

  await browser.close();
  return { seed, levelCurve, questionSnapshots, errors };
}

async function run() {
  const runA = await collectDailyRun();
  const runB = await collectDailyRun();

  assert(runA.seed === runB.seed, `两次运行的 dailySeed 应一致（同一天），实际 ${runA.seed} vs ${runB.seed}`);
  assert(
    JSON.stringify(runA.levelCurve) === JSON.stringify(runB.levelCurve),
    '两次每日挑战的题型/网格尺寸/难度序列应完全一致'
  );
  assert(
    JSON.stringify(runA.questionSnapshots) === JSON.stringify(runB.questionSnapshots),
    '两次每日挑战每题的正确格子与格子内容应完全一致（seed 复现）'
  );
  assert(runA.errors.length === 0 && runB.errors.length === 0, '两次运行都不应有 pageerror');

  console.log(`✅ daily.js 通过（种子 ${runA.seed}，10 题内容完全一致）`);
}

run().catch((e) => {
  console.error('❌ daily.js 失败:', e.message);
  process.exit(1);
});
