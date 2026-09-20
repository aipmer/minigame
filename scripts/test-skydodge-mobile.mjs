import puppeteer from 'puppeteer';

async function testMobile() {
  console.log('[Test Mobile] 启动移动端仿真测试...');
  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  // iPhone 14 Pro 视口
  await page.setViewport({
    width: 393,
    height: 852,
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 2,
  });

  const errors = [];
  page.on('pageerror', (err) => errors.push(err.toString()));

  await page.goto('http://localhost:3000/games/skydodge/', { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 1500));

  // 截取开始界面
  await page.screenshot({ path: '/Users/hunkwu/.gemini/antigravity/brain/6e9932af-f962-4a6d-aafb-687a5aa2bdae/skydodge_mobile_start.png' });

  // 点击开始起飞
  await page.click('#start-btn');
  await new Promise((r) => setTimeout(r, 1000));

  // 截取移动端运行画面
  const screenshotPath = '/Users/hunkwu/.gemini/antigravity/brain/6e9932af-f962-4a6d-aafb-687a5aa2bdae/skydodge_mobile_gameplay.png';
  await page.screenshot({ path: screenshotPath });
  console.log(`[Test Mobile] 移动端快照已保存: ${screenshotPath}`);

  // 验证移动端触控面板可见性
  const touchVisible = await page.evaluate(() => {
    const tc = document.getElementById('touch-controls');
    const fireBtn = document.getElementById('touch-fire-btn');
    const boostBtn = document.getElementById('touch-boost-btn');
    return {
      touchControls: !tc.classList.contains('hidden'),
      fireBtnExists: !!fireBtn,
      boostBtnExists: !!boostBtn,
    };
  });

  console.log('[Test Mobile] 触控按钮状态:', JSON.stringify(touchVisible, null, 2));
  console.log(`[Test Mobile] 页面错误数量: ${errors.length}`);

  await browser.close();
}

testMobile().catch((err) => {
  console.error('[Test Mobile] 测试失败:', err);
  process.exit(1);
});
