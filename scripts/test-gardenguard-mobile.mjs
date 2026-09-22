import puppeteer from 'puppeteer';

async function testMobile() {
  console.log('[Mobile Test] 启动 Garden Guard 移动端四大铁律与触控测试 (390×844 iPhone 14 视口)...');
  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  await page.setViewport({
    width: 390,
    height: 844,
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 2
  });

  const errors = [];
  page.on('pageerror', err => errors.push(err.toString()));

  await page.goto('http://localhost:3456/games/gardenguard/', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 1000));

  // 1. 移动端安全区与评测工具隐形设计检测
  const debugDefaultHidden = await page.evaluate(() => {
    const pill = document.getElementById('debug-toggle-btn');
    return !pill || pill.classList.contains('hidden') || getComputedStyle(pill).display === 'none';
  });

  if (!debugDefaultHidden) {
    throw new Error('移动端评测工具箱未默认隐藏！违背隐形调试工具规范。');
  }
  console.log('✅ [移动端门禁通过] 评测胶囊默认 100% 隐藏，零多余 UI 干扰。');

  // 1.1 验证带 ?debug=1 时，胶囊安全显示在视口内（无截断）
  const pageDebug = await browser.newPage();
  await pageDebug.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  await pageDebug.goto('http://localhost:3456/games/gardenguard/?debug=1', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 600));

  const mobilePillCheck = await pageDebug.evaluate(() => {
    const pill = document.getElementById('debug-toggle-btn');
    if (!pill) return { found: false };
    const rect = pill.getBoundingClientRect();
    return {
      found: true,
      left: rect.left,
      right: rect.right,
      windowWidth: window.innerWidth,
      isFullyVisible: rect.right <= window.innerWidth && rect.left >= 0
    };
  });
  await pageDebug.close();

  if (!mobilePillCheck.found || !mobilePillCheck.isFullyVisible) {
    console.error('❌ [移动端门禁失败] 调试模式下评测胶囊在移动端超出视口:', mobilePillCheck);
    throw new Error('移动端评测工具箱存在截断！');
  }
  console.log(`✅ [移动端门禁通过] 调试模式下评测胶囊安全区检测: 右边界 ${mobilePillCheck.right}px <= 视口宽 ${mobilePillCheck.windowWidth}px`);

  // 2. 截图移动端开始界面
  const mobileStart = '/Users/hunkwu/.gemini/antigravity/brain/b1313bdd-d984-40ca-95d8-46e44194790b/gardenguard_mobile_start.png';
  await page.screenshot({ path: mobileStart });
  console.log(`[Mobile Test] 移动端大厅截图保存: ${mobileStart}`);

  // 3. 点击开始按钮
  await page.click('#btn-start');
  await new Promise(r => setTimeout(r, 1200));

  // 召唤植物
  await page.click('#btn-summon');
  await new Promise(r => setTimeout(r, 800));

  // 4. 截图移动端战斗运行态
  const mobilePlay = '/Users/hunkwu/.gemini/antigravity/brain/b1313bdd-d984-40ca-95d8-46e44194790b/gardenguard_mobile_gameplay.png';
  await page.screenshot({ path: mobilePlay });
  console.log(`[Mobile Test] 移动端运行态截图保存: ${mobilePlay}`);

  // 5. 模拟触摸拖拽交互
  console.log('[Mobile Test] 模拟移动端单指拖拽合成...');
  await page.evaluate(async () => {
    const canvas = document.getElementById('game-canvas');
    const rect = canvas.getBoundingClientRect();
    const startX = rect.left + rect.width * 0.45;
    const startY = rect.top + rect.height * 0.45;
    const targetX = rect.left + rect.width * 0.55;
    const targetY = rect.top + rect.height * 0.55;

    const tStart = new Touch({ identifier: Date.now(), target: canvas, clientX: startX, clientY: startY });
    canvas.dispatchEvent(new TouchEvent('touchstart', { touches: [tStart], changedTouches: [tStart], cancelable: true }));

    await new Promise(r => setTimeout(r, 80));
    const tMove = new Touch({ identifier: Date.now(), target: canvas, clientX: targetX, clientY: targetY });
    canvas.dispatchEvent(new TouchEvent('touchmove', { touches: [tMove], changedTouches: [tMove], cancelable: true }));

    await new Promise(r => setTimeout(r, 80));
    canvas.dispatchEvent(new TouchEvent('touchend', { touches: [], changedTouches: [tMove], cancelable: true }));
  });

  await new Promise(r => setTimeout(r, 500));

  console.log('\n--- 移动端控制台错误 ---');
  if (errors.length === 0) {
    console.log('✅ 移动端控制台 0 错误通过！');
  } else {
    errors.forEach(e => console.error('❌', e));
  }

  await browser.close();

  if (errors.length > 0) {
    process.exit(1);
  }
}

testMobile().catch(err => {
  console.error('移动端测试失败:', err);
  process.exit(1);
});
