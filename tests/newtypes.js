/**
 * @fileoverview 断言新增的 size / count 题型能被生成、渲染，并且点击判定正确。
 * 用无尽模式循环出题（五种题型轮转），逮到 size/count 各测一次即可提前退出。
 */
import { openGame, assert } from './_helpers.js';

async function run() {
  const { browser, page, errors } = await openGame();

  await page.evaluate(() => window.__game.start('endless'));
  await page.waitForFunction(() => window.__game.state === 'PLAYING');

  const seenTypes = new Set();
  let guard = 0;

  while (!(seenTypes.has('size') && seenTypes.has('count')) && guard < 30) {
    guard++;
    const q = await page.evaluate(() => window.__game.question);
    if (!q) break;

    if (q.type === 'size' || q.type === 'count') {
      seenTypes.add(q.type);

      // 断言 DOM 实际渲染出了对应结构
      const rendered = await page.evaluate((type) => {
        if (type === 'size') return document.querySelectorAll('#grid-container .shape-content').length;
        return document.querySelectorAll('#grid-container .dot-grid').length;
      }, q.type);
      assert(rendered === q.totalCells, `${q.type} 题应渲染 ${q.totalCells} 个格子内容，实际 ${rendered}`);

      // 点击正确格子，断言判定为正确（分数应增加）
      const scoreBefore = await page.evaluate(() => window.__game.score);
      await page.evaluate((idx) => window.__game.answer(idx), q.correctIndex);
      await page.waitForTimeout(300);
      const scoreAfter = await page.evaluate(() => window.__game.score);
      assert(scoreAfter > scoreBefore, `${q.type} 题点击正确格子后分数应增加（${scoreBefore} → ${scoreAfter}）`);
    } else {
      // 其他题型：随便点一个格子推进到下一题（不必答对）
      await page.evaluate((idx) => window.__game.answer(idx), q.correctIndex);
      await page.waitForTimeout(200);
    }

    if (await page.evaluate(() => window.__game.state) !== 'PLAYING') break;
  }

  assert(seenTypes.has('size'), '应至少遇到一次 size 题型');
  assert(seenTypes.has('count'), '应至少遇到一次 count 题型');
  assert(errors.length === 0, `不应有 pageerror，实际捕获: ${JSON.stringify(errors)}`);

  await browser.close();
  console.log('✅ newtypes.js 通过');
}

run().catch((e) => {
  console.error('❌ newtypes.js 失败:', e.message);
  process.exit(1);
});
