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

  const port = process.env.PORT || 3456;
  await page.goto(`http://localhost:${port}/games/snake3d/`, { waitUntil: 'networkidle0' });

  // 等待纹理加载
  await new Promise(r => setTimeout(r, 800));

  // 1. 截图：全新 3D 粘土质感开始画面
  const startScreenPath = '/Users/hunkwu/.gemini/antigravity/brain/7933faa5-951d-4997-81be-da87775ddbb5/snake3d_start_screen.png';
  await page.screenshot({ path: startScreenPath });
  console.log(`[Test] 开始画面截图已保存: ${startScreenPath}`);

  // 2. 点击开始按钮
  console.log('[Test] 点击开始游戏按钮...');
  await page.click('#start-btn');
  await new Promise(r => setTimeout(r, 1200));

  // 操纵蛇转向并生长身体（验证锥度收束、尾尖与游动弯曲形态）
  await page.keyboard.press('ArrowRight');
  await page.evaluate(() => {
    if (window._snake) {
      window._snake.grow();
      window._snake.grow();
      window._snake.grow();
      window._snake.grow();
      window._snake.grow();
    }
  });
  await new Promise(r => setTimeout(r, 800));

  // 3. 截图：全新 3D 浮空岛与拟真有机萌系蛇身运行态
  const gameplayPath = '/Users/hunkwu/.gemini/antigravity/brain/7933faa5-951d-4997-81be-da87775ddbb5/snake3d_gameplay.png';
  await page.screenshot({ path: gameplayPath });
  console.log(`[Test] 运行态截图已保存: ${gameplayPath}`);

  // 4. 继续直行撞击边界以触发 GameOver 弹窗
  console.log('[Test] 继续前进触发游戏结束...');
  await new Promise(r => setTimeout(r, 2200));

  // 5. 截图：全新 3D 粘土质感 GameOver 弹窗（验证对比度与美观度）
  const gameoverPath = '/Users/hunkwu/.gemini/antigravity/brain/7933faa5-951d-4997-81be-da87775ddbb5/snake3d_gameover_modal.png';
  await page.screenshot({ path: gameoverPath });
  console.log(`[Test] GameOver 弹窗截图已保存: ${gameoverPath}`);

  // 提取状态
  const endState = await page.evaluate(() => {
    return {
      gameoverVisible: !document.getElementById('gameover-screen').classList.contains('hidden'),
      reason: document.getElementById('gameover-reason').textContent,
      score: document.getElementById('gameover-score').textContent,
      hudScore: document.getElementById('hud-score').textContent,
    };
  });

  console.log('[Test] 游戏结束状态:', JSON.stringify(endState, null, 2));
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
