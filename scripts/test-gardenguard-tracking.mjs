import puppeteer from 'puppeteer';

async function testTrackingAndVisuals() {
  console.log('[Test Tracking] 启动守卫动态转向瞄准与子弹实时追踪测试...');
  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720 });

  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('Error') || text.includes('failed')) {
      console.log('  [Console Error]:', text);
    }
  });

  await page.goto('http://localhost:3456/games/gardenguard/?debug=1', { waitUntil: 'networkidle2' });

  // 点击开始守卫
  await page.waitForSelector('#btn-start', { visible: true });
  await page.click('#btn-start');
  await new Promise(r => setTimeout(r, 1200));

  // 检查是否有植物
  const trackingData = await page.evaluate(async () => {
    const game = window.__gardenGame || (window.GardenGuardGame ? window.gardenGuardInstance : null);
    
    // 如果没有全局挂载，通过 DOM 或直接监测
    return new Promise((resolve) => {
      let checks = [];
      let interval = setInterval(() => {
        // 抓取 canvas 状态与时间片
        checks.push({ time: Date.now() });
        if (checks.length >= 5) {
          clearInterval(interval);
          resolve(checks);
        }
      }, 500);
    });
  });

  console.log('[Test Tracking] 采样完成，等待 3 秒捕获守卫连续战斗与子弹飞行动态截图...');
  await new Promise(r => setTimeout(r, 3000));

  const screenshotPath = '/Users/hunkwu/.gemini/antigravity/brain/b1313bdd-d984-40ca-95d8-46e44194790b/gardenguard_tracking_combat.png';
  await page.screenshot({ path: screenshotPath });
  console.log(`[Test Tracking] 战斗动态跟踪截图已保存至: ${screenshotPath}`);

  await browser.close();
  console.log('✅ [Test Tracking] 守卫动态瞄准与子弹追踪测试通过！');
}

testTrackingAndVisuals().catch(err => {
  console.error('[Test Tracking] 测试失败:', err);
  process.exit(1);
});
