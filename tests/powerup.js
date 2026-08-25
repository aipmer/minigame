/**
 * @fileoverview 断言道具系统：刷连击攒观察力值 → 使用提示/冻结/双倍分 → 断言各自效果。
 */
import { openGame, assert } from './_helpers.js';

async function answerCorrect(page) {
  const idx = await page.evaluate(() => window.__game.question.correctIndex);
  await page.evaluate((i) => window.__game.answer(i), idx);
  await page.waitForTimeout(150);
}

async function run() {
  const { browser, page, errors } = await openGame();

  await page.evaluate(() => window.__game.start('endless'));
  await page.waitForFunction(() => window.__game.state === 'PLAYING');

  // 连续答对直到攒够 4 点观察力值（提示1 + 冻结1 + 双倍分2）
  let guard = 0;
  while ((await page.evaluate(() => window.__game.powerupPoints)) < 4 && guard < 20) {
    await answerCorrect(page);
    guard++;
  }
  const pointsAfterCombo = await page.evaluate(() => window.__game.powerupPoints);
  assert(pointsAfterCombo >= 4, `连续答对后观察力值应 >= 4，实际 ${pointsAfterCombo}`);

  // ── 提示：排除 2 个错误格子 ──────────────────────────────
  const eliminatedBefore = await page.evaluate(
    () => document.querySelectorAll('#grid-container .grid-cell.eliminated').length
  );
  await page.evaluate(() => window.__game.usePowerup('hint'));
  await page.waitForTimeout(100);
  const eliminatedAfter = await page.evaluate(
    () => document.querySelectorAll('#grid-container .grid-cell.eliminated').length
  );
  assert(
    eliminatedAfter - eliminatedBefore === 2,
    `提示应排除 2 个错误格子，实际新增 ${eliminatedAfter - eliminatedBefore}`
  );

  // ── 冻结：计时器进入 timer-frozen 状态 ───────────────────
  await page.evaluate(() => window.__game.usePowerup('freeze'));
  const frozen = await page.evaluate(
    () => document.getElementById('timer-display').classList.contains('timer-frozen')
  );
  assert(frozen, '冻结道具应给计时器加上 timer-frozen 样式');

  const pointsAfterTwoUses = await page.evaluate(() => window.__game.powerupPoints);
  assert(pointsAfterTwoUses === pointsAfterCombo - 2, `使用提示+冻结应各消耗1点，剩余应为 ${pointsAfterCombo - 2}，实际 ${pointsAfterTwoUses}`);

  // ── 双倍分：挂起标记 + 下一题答对后消费 ───────────────────
  await page.evaluate(() => window.__game.usePowerup('double'));
  const pendingAfterUse = await page.evaluate(() => window.__game.pendingDoubleScore);
  assert(pendingAfterUse === true, '使用双倍分道具后 pendingDoubleScore 应为 true');

  await answerCorrect(page);
  const pendingAfterAnswer = await page.evaluate(() => window.__game.pendingDoubleScore);
  assert(pendingAfterAnswer === false, '答对一题后双倍分标记应被消费为 false');

  assert(errors.length === 0, `不应有 pageerror，实际捕获: ${JSON.stringify(errors)}`);

  await browser.close();
  console.log('✅ powerup.js 通过');
}

run().catch((e) => {
  console.error('❌ powerup.js 失败:', e.message);
  process.exit(1);
});
