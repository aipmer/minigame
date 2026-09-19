import puppeteer from 'puppeteer';
import path from 'path';

async function test() {
  console.log('[Test] 启动浏览器测试...');
  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720 });

  const errors = [];
  const logs = [];

  page.on('console', msg => logs.push(`[${msg.type()}] ${msg.text()}`));
  page.on('pageerror', err => errors.push(err.toString()));

  await page.goto('http://localhost:3000/games/snake3d/', { waitUntil: 'networkidle0' });

  console.log('[Test] 页面加载成功，按空格键开始游戏...');
  await page.keyboard.press('Space');

  // 等待 1.5 秒
  await new Promise(r => setTimeout(r, 1500));

  // 按方向键右
  await page.keyboard.press('ArrowRight');
  await new Promise(r => setTimeout(r, 1000));

  // 截图
  const screenshotPath = '/Users/hunkwu/.gemini/antigravity/brain/3c70172b-4a8c-439c-88bf-b8067a345cff/threejs_snake_gameplay.png';
  await page.screenshot({ path: screenshotPath });
  console.log(`[Test] 运行态截图已保存: ${screenshotPath}`);

  // 提取 HUD 状态
  const hudState = await page.evaluate(() => {
    return {
      hudVisible: !document.getElementById('hud').classList.contains('hidden'),
      score: document.getElementById('hud-score').textContent,
      highScore: document.getElementById('hud-highscore').textContent,
      length: document.getElementById('hud-length').textContent,
      level: document.getElementById('hud-level').textContent,
      startScreenHidden: document.getElementById('start-screen').classList.contains('hidden'),
      gameoverHidden: document.getElementById('gameover-screen').classList.contains('hidden'),
    };
  });

  console.log('[Test] HUD 状态:', JSON.stringify(hudState, null, 2));
  console.log(`[Test] 页面错误数量: ${errors.length}`);
  if (errors.length > 0) {
    console.error('[Test] 错误列表:', errors);
  }

  await browser.close();
}

test().catch(err => {
  console.error('[Test] 运行失败:', err);
  process.exit(1);
});
