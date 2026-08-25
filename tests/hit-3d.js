/**
 * @fileoverview 回归测试：3D 材质/翻转/抖动动画生效期间，真实坐标点击命中的
 * 仍是视觉对应的格子（呼应规范里"变换后必须重新验证点击命中"的教训）。
 * 用真实 page.mouse.click（而非 __game.answer 直接调用）覆盖坐标换算路径。
 */
import { openGame, assert } from './_helpers.js';

async function clickCellByIndex(page, index) {
  const rect = await page.evaluate((idx) => {
    const el = document.querySelector(`#grid-container [data-index="${idx}"]`);
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }, index);
  await page.mouse.click(rect.x, rect.y);
}

async function run() {
  const { browser, page, errors } = await openGame();

  await page.click('#btn-start');
  await page.waitForFunction(() => window.__game.state === 'PLAYING');

  // 第一步：先真实点一个错误格子，触发 3D 抖动动画（shake3D）
  const q1 = await page.evaluate(() => window.__game.question);
  const wrongIndex = q1.correctIndex === 0 ? 1 : 0;
  await clickCellByIndex(page, wrongIndex);
  await page.waitForTimeout(30); // 动画刚触发，此时格子处于 rotateZ/rotateX 变换状态

  // 断言错误格子确实进入了 wrong 动画状态（证明动画已触发）
  const isWrongAnimating = await page.evaluate(
    (idx) => document.querySelector(`#grid-container [data-index="${idx}"]`).classList.contains('wrong'),
    wrongIndex
  );
  assert(isWrongAnimating, '点错格子后应立即进入 wrong 3D 抖动状态');

  // 等错误反馈流程结束（_processing 释放锁），再用真实坐标点正确格子，
  // 断言此时点击命中的坐标换算仍然准确（格子本身常驻斜面材质变换 + 刚播放完 3D 抖动）
  await page.waitForTimeout(550);
  const scoreBefore = await page.evaluate(() => window.__game.score);
  const questionBefore = q1.index;
  await clickCellByIndex(page, q1.correctIndex);
  await page.waitForTimeout(400);

  const scoreAfter = await page.evaluate(() => window.__game.score);
  const questionAfter = await page.evaluate(() => window.__game.question?.index ?? -1);

  assert(scoreAfter > scoreBefore, `3D 动画期间真实点击正确格子应计分成功（${scoreBefore} → ${scoreAfter}）`);
  assert(
    questionAfter === -1 || questionAfter > questionBefore,
    '点击命中正确格子后应进入下一题（或已结算），说明坐标换算未被 3D 变换带偏'
  );

  // 第三步：连续用真实坐标点击后续几题的正确格子，确认在网格视觉整体有斜面材质/景深的情况下命中依旧准确
  for (let i = 0; i < 3; i++) {
    const q = await page.evaluate(() => window.__game.question);
    if (!q) break;
    const before = await page.evaluate(() => window.__game.score);
    await clickCellByIndex(page, q.correctIndex);
    await page.waitForTimeout(350);
    const after = await page.evaluate(() => window.__game.score);
    assert(after > before, `第 ${i + 2} 题真实坐标点击正确格子应计分成功`);
  }

  assert(errors.length === 0, `不应有 pageerror，实际捕获: ${JSON.stringify(errors)}`);

  await browser.close();
  console.log('✅ hit-3d.js 通过');
}

run().catch((e) => {
  console.error('❌ hit-3d.js 失败:', e.message);
  process.exit(1);
});
