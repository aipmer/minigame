/**
 * @fileoverview smoke 测试：首页 → 经典模式 → 连续答对 10 题 → 进入结算页。
 * 覆盖主流程，监听 pageerror（Canvas/DOM 抛错不会白屏，只有这里能抓到）。
 */
import { openGame, assert } from './_helpers.js';

async function run() {
  const { browser, page, errors } = await openGame();

  await page.click('#btn-start');
  await page.waitForFunction(() => window.__game.state === 'PLAYING');

  for (let i = 0; i < 10; i++) {
    const correctIndex = await page.evaluate(() => window.__game.question.correctIndex);
    await page.evaluate((idx) => window.__game.answer(idx), correctIndex);
    // 等待下一题渲染或进入结算
    await page.waitForFunction(
      () => window.__game.state !== 'PLAYING' || window.__game.question !== null,
      { timeout: 5000 }
    );
  }

  await page.waitForFunction(() => window.__game.state === 'RESULT', { timeout: 5000 });
  const finalState = await page.evaluate(() => window.__game.state);
  const finalView = await page.evaluate(() => window.__game.view);
  const finalScore = await page.evaluate(() => window.__game.score);

  assert(finalState === 'RESULT', `游戏应结束于 RESULT，实际为 ${finalState}`);
  assert(finalView === 'result', `应导航到 result 视图，实际为 ${finalView}`);
  assert(finalScore > 0, `10 题全对分数应 > 0，实际为 ${finalScore}`);
  assert(errors.length === 0, `不应有 pageerror，实际捕获: ${JSON.stringify(errors)}`);

  await browser.close();
  console.log(`✅ smoke.js 通过（最终分数 ${finalScore}）`);
}

run().catch((e) => {
  console.error('❌ smoke.js 失败:', e.message);
  process.exit(1);
});
