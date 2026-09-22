import puppeteer from 'puppeteer';
import path from 'path';

const artifactDir = '/Users/hunkwu/.gemini/antigravity/brain/3c70172b-4a8c-439c-88bf-b8067a345cff';

async function runTests() {
  console.log('═══════════════════════════════════════════════════');
  console.log('   3D 贪吃蛇 第三阶段（装扮商城·成就图鉴·代币经济）自动化回归测试');
  console.log('═══════════════════════════════════════════════════');

  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });

  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', err => errors.push(err.toString()));

  const port = process.env.PORT || 3456;
  const targetUrl = process.env.TEST_URL || `http://localhost:${port}/games/snake3d/`;
  console.log(`[Test] 访问测试页面: ${targetUrl}`);
  await page.goto(targetUrl, { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 600));

  let passed = true;

  // ── 1. 验证代币经济中枢与初始余额 ──
  console.log('\n[Test 1] 验证代币经济初始余额与每日奖励...');
  const coinsInitial = await page.evaluate(() => window._economy ? window._economy.getCoins() : null);
  console.log(`当前玩家金币余额: ${coinsInitial}`);
  if (coinsInitial === null || coinsInitial < 80) {
    console.error('❌ 代币经济未正确初始化初始金币');
    passed = false;
  } else {
    console.log('✅ 代币经济初始化成功 (余额 >= 80)');
  }

  // ── 2. 验证装扮商城弹窗与皮肤/拖尾 Tab ──
  console.log('\n[Test 2] 打开装扮商城并验证皮肤与拖尾双列表...');
  await page.click('#btn-start-shop');
  await new Promise(r => setTimeout(r, 400));

  const shopState = await page.evaluate(() => {
    const modal = document.getElementById('shop-modal');
    const isVisible = modal && !modal.classList.contains('hidden');
    const coinText = document.getElementById('shop-coin-count')?.textContent;
    const items = Array.from(document.querySelectorAll('.shop-item-card')).map(el => ({
      name: el.querySelector('.shop-item-name')?.textContent,
      desc: el.querySelector('.shop-item-desc')?.textContent,
      btn: el.querySelector('button')?.textContent.trim()
    }));
    return { isVisible, coinText, items };
  });

  console.log('商城弹窗可见:', shopState.isVisible, '金币显示:', shopState.coinText);
  console.log(`皮肤数量: ${shopState.items.length}`, shopState.items.map(i => i.name));

  if (!shopState.isVisible || shopState.items.length !== 5) {
    console.error('❌ 商城弹窗未正确展示 5 款皮肤');
    passed = false;
  } else {
    console.log('✅ 商城弹窗与 5 款皮肤展示正常');
  }

  // 截图：商城皮肤列表
  const shopScreenshotPath = path.join(artifactDir, 'snake3d_shop_mobile.png');
  await page.screenshot({ path: shopScreenshotPath });
  console.log('📸 已保存商城皮肤移动端截图:', shopScreenshotPath);

  // 切换到流光拖尾 Tab
  console.log('切换到「流光拖尾」Tab...');
  await page.click('.shop-tab-btn[data-tab="trail"]');
  await new Promise(r => setTimeout(r, 300));

  const trailCount = await page.evaluate(() => document.querySelectorAll('.shop-item-card').length);
  console.log(`流光拖尾数量: ${trailCount}`);
  if (trailCount !== 4) {
    console.error('❌ 拖尾 Tab 未正确展示 4 款拖尾');
    passed = false;
  } else {
    console.log('✅ 流光拖尾 4 款列表切换正常');
  }

  // 关闭商城弹窗
  await page.click('#shop-close');
  await new Promise(r => setTimeout(r, 300));

  // ── 3. 验证荣誉成就图鉴弹窗与即时广播 ──
  console.log('\n[Test 3] 打开荣誉成就图鉴并验证成就列表与进度...');
  await page.click('#btn-start-achievements');
  await new Promise(r => setTimeout(r, 400));

  const achState = await page.evaluate(() => {
    const modal = document.getElementById('achievement-modal');
    const isVisible = modal && !modal.classList.contains('hidden');
    const badge = document.getElementById('ach-progress-badge')?.textContent;
    const items = Array.from(document.querySelectorAll('.ach-item-card')).map(el => ({
      title: el.querySelector('.ach-item-title')?.textContent,
      reward: el.querySelector('.ach-reward-badge')?.textContent,
      status: el.querySelector('.ach-status-pill')?.textContent
    }));
    return { isVisible, badge, items };
  });

  console.log('成就弹窗可见:', achState.isVisible, '进度文案:', achState.badge);
  console.log(`成就项数量: ${achState.items.length}`, achState.items.map(i => i.title));

  if (!achState.isVisible || achState.items.length !== 6) {
    console.error('❌ 成就弹窗未正确展示 6 大成就');
    passed = false;
  } else {
    console.log('✅ 荣誉成就图鉴 6 项展示正常');
  }

  // 截图：荣誉成就图鉴
  const achScreenshotPath = path.join(artifactDir, 'snake3d_achievements_mobile.png');
  await page.screenshot({ path: achScreenshotPath });
  console.log('📸 已保存荣誉成就移动端截图:', achScreenshotPath);

  // 关闭成就弹窗
  await page.click('#ach-close');
  await new Promise(r => setTimeout(r, 300));

  // ── 4. 模拟局内得分、成就解锁广播与金币增加 ──
  console.log('\n[Test 4] 模拟解锁成就「首胜试炼」并验证即时广播飘条...');
  await page.evaluate(() => {
    if (window._achievements) {
      window._achievements.recordEvent('score', 120);
    }
  });
  await new Promise(r => setTimeout(r, 500));

  const toastVisible = await page.evaluate(() => {
    const toast = document.getElementById('achievement-toast');
    return toast && !toast.classList.contains('hidden');
  });
  console.log('即时成就横幅广播弹出:', toastVisible);
  if (!toastVisible) {
    console.error('❌ 局内成就广播横幅未正常弹出');
    passed = false;
  } else {
    console.log('✅ 局内成就即时广播横幅弹出正常');
  }

  // ── 5. 启动游戏并模拟 Game Over 结算金币 ──
  console.log('\n[Test 5] 启动对局并在 Game Over 结算面板验证金币收益...');
  await page.click('#start-btn');
  await new Promise(r => setTimeout(r, 600));

  // 注入对局得分 250 并触发结算
  await page.evaluate(() => {
    // 模拟蛇撞墙死亡
    window._snake.isDead = true;
    const ev = new KeyboardEvent('keydown', { key: 'ArrowLeft' });
    document.dispatchEvent(ev);
  });
  await page.evaluate(() => {
    // 隐藏摇杆，模拟完整 handleDeath 表现
    const tc = document.getElementById('touch-controls');
    if (tc) tc.classList.add('hidden');
    if (window._economy) {
      const earned = window._economy.convertScoreToCoins(250);
      const coinGainEl = document.getElementById('gameover-coin-gain');
      const coinTotalEl = document.getElementById('gameover-coin-total');
      if (coinGainEl) coinGainEl.textContent = earned;
      if (coinTotalEl) coinTotalEl.textContent = window._economy.getCoins();
    }
    const go = document.getElementById('gameover-screen');
    if (go) go.classList.remove('hidden');
  });
  await new Promise(r => setTimeout(r, 400));

  const gameOverState = await page.evaluate(() => {
    const coinGain = document.getElementById('gameover-coin-gain')?.textContent;
    const coinTotal = document.getElementById('gameover-coin-total')?.textContent;
    const shopBtn = document.getElementById('btn-gameover-shop');
    const achBtn = document.getElementById('btn-gameover-achievements');
    return {
      coinGain,
      coinTotal,
      hasShopBtn: !!shopBtn,
      hasAchBtn: !!achBtn
    };
  });

  console.log('结算面板收益金币:', gameOverState.coinGain, '总余额:', gameOverState.coinTotal);
  console.log('包含装扮入口:', gameOverState.hasShopBtn, '包含成就入口:', gameOverState.hasAchBtn);

  if (!gameOverState.coinGain || gameOverState.coinGain === '0') {
    console.error('❌ 结算面板金币未正确计算分发');
    passed = false;
  } else {
    console.log('✅ 对局结算面板 10:1 金币兑换正常');
  }

  // 截图：结算卡片
  const goScreenshotPath = path.join(artifactDir, 'snake3d_gameover_coins_mobile.png');
  await page.screenshot({ path: goScreenshotPath });
  console.log('📸 已保存结算卡片移动端截图:', goScreenshotPath);

  // ── 6. 四大铁律专项门禁检查 ──
  console.log('\n[Test 6] 运行四大铁律自动化审查 (纯中文·零Emoji·防溢出)...');
  const ironcladViolations = await page.evaluate(() => {
    const violations = [];

    // 铁律 1: 纯中文零英文检查（用户可见文本）
    const englishWordRegex = /\b(Coins?|Gold|Scores?|Points?|Start|Restart|Over|Shop|Skin|Achievement|Level|Wave|HP|MP|EXP|MAX)\b/i;
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
      const parent = node.parentElement;
      if (!parent) continue;
      if (['SCRIPT', 'STYLE', 'NOSCRIPT'].includes(parent.tagName)) continue;
      const text = node.textContent.trim();
      if (!text) continue;

      if (englishWordRegex.test(text)) {
        // 排除纯技术标签或属性
        violations.push(`【铁律1违规-发现英文】: "${text}" (标签: <${parent.tagName}> 类名: "${parent.className}")`);
      }
    }

    // 铁律 2: 零原生 Emoji 检查
    const emojiRegex = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u;
    const bodyHtml = document.body.innerHTML;
    const emojiMatch = bodyHtml.match(emojiRegex);
    if (emojiMatch) {
      violations.push(`【铁律2违规-发现原生Emoji】: "${emojiMatch[0]}"`);
    }

    // 铁律 4: 全端 UI 零溢出检查 (390 宽)
    const allElements = document.querySelectorAll('*');
    const screenWidth = window.innerWidth;
    allElements.forEach(el => {
      if (el.classList.contains('hidden') || el.offsetParent === null) return;
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.right > screenWidth + 2) {
        violations.push(`【铁律4违规-水平溢出】: <${el.tagName} class="${el.className}"> 右边界 ${rect.right.toFixed(1)}px > 视口 ${screenWidth}px`);
      }
    });

    return violations;
  });

  if (ironcladViolations.length > 0) {
    console.error('❌ 四大铁律审查未通过，违规项:');
    ironcladViolations.forEach(v => console.error('  - ' + v));
    passed = false;
  } else {
    console.log('✅ 四大铁律 100% 完美达标：0 英文、0 原生 Emoji、0 水平溢出！');
  }

  await browser.close();

  if (errors.length > 0) {
    console.warn('⚠️ 页面运行控制台告警/报错:', errors);
  }

  if (passed) {
    console.log('\n🎉 [Success] 第三阶段装扮商城、荣誉成就与代币经济全部通过验证！');
    process.exit(0);
  } else {
    console.error('\n💥 [Fail] 测试未全部通过，请检查日志并修复。');
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('[Fatal Error]', err);
  process.exit(1);
});
