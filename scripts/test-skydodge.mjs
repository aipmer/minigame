import puppeteer from 'puppeteer';

async function testSkyDodge() {
  console.log('[Test SkyDodge] 启动浏览器测试...');
  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720 });

  const errors = [];
  const logs = [];

  page.on('console', (msg) => logs.push(`[${msg.type()}] ${msg.text()}`));
  page.on('pageerror', (err) => errors.push(err.toString()));

  await page.goto('http://localhost:3000/games/skydodge/', { waitUntil: 'networkidle0' });

  // 等待模型异步装载完成
  await new Promise((r) => setTimeout(r, 2000));

  console.log('[Test SkyDodge] 点击开始按钮起飞...');
  await page.click('#start-btn');

  // 等待 1 秒
  await new Promise((r) => setTimeout(r, 1000));

  console.log('[Test SkyDodge] 连续按空格键发射等离子激光...');
  for (let i = 0; i < 5; i++) {
    await page.keyboard.down('Space');
    await new Promise((r) => setTimeout(r, 200));
    await page.keyboard.up('Space');
    await new Promise((r) => setTimeout(r, 100));
  }

  // 按左/右键机动飞行
  await page.keyboard.down('KeyA');
  await new Promise((r) => setTimeout(r, 400));
  await page.keyboard.up('KeyA');

  await page.keyboard.down('KeyD');
  await new Promise((r) => setTimeout(r, 500));
  await page.keyboard.up('KeyD');

  // 截取运行态屏幕快照
  const screenshotPath = '/Users/hunkwu/.gemini/antigravity/brain/6e9932af-f962-4a6d-aafb-687a5aa2bdae/skydodge_gameplay.png';
  await page.screenshot({ path: screenshotPath });
  console.log(`[Test SkyDodge] 快照已保存: ${screenshotPath}`);

  // 检查状态
  const state = await page.evaluate(() => {
    return {
      hudVisible: !document.getElementById('hud').classList.contains('hidden'),
      score: document.getElementById('hud-score').textContent,
      distance: document.getElementById('hud-distance').textContent,
      speed: document.getElementById('hud-speed').textContent,
      shield: document.getElementById('hud-shield').textContent,
    };
  });

  console.log('[Test SkyDodge] HUD 状态:', JSON.stringify(state, null, 2));
  console.log(`[Test SkyDodge] 页面错误数量: ${errors.length}`);
  if (errors.length > 0) {
    console.error('[Test SkyDodge] 错误列表:', errors);
  }

  console.log('[Test SkyDodge] 最近日志:', logs.slice(-15).join('\n'));

  await browser.close();
}

testSkyDodge().catch((err) => {
  console.error('[Test SkyDodge] 测试失败:', err);
  process.exit(1);
});
