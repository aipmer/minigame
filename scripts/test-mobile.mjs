import puppeteer from 'puppeteer';

async function testMobile() {
  console.log('[Mobile Test] 启动移动端视口测试...');
  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  // 模拟手机视口 (390 x 844, 类似 iPhone)
  await page.setViewport({
    width: 390,
    height: 844,
    isMobile: true,
    hasTouch: true,
  });

  const errors = [];
  page.on('pageerror', err => errors.push(err.toString()));

  await page.goto('http://localhost:3000/games/snake3d/', { waitUntil: 'networkidle0' });

  // 截图 1: 移动端开始界面
  await page.screenshot({ path: '/Users/hunkwu/.gemini/antigravity/brain/3c70172b-4a8c-439c-88bf-b8067a345cff/mobile_start_view.png' });
  console.log('[Mobile Test] 已保存开始界面截图');

  // 轻触屏幕开始
  await page.touchscreen.tap(195, 422);
  await new Promise(r => setTimeout(r, 1500));

  // 模拟手势滑动: 从 (195, 420) 快速向左滑动 80px
  console.log('[Mobile Test] 模拟手势向左划动...');
  await page.evaluate(async () => {
    const el = document.body;
    const tStart = new Touch({ identifier: 1, target: el, clientX: 200, clientY: 400 });
    el.dispatchEvent(new TouchEvent('touchstart', { touches: [tStart], changedTouches: [tStart] }));
    
    await new Promise(r => setTimeout(r, 50));
    const tMove = new Touch({ identifier: 1, target: el, clientX: 130, clientY: 400 });
    el.dispatchEvent(new TouchEvent('touchmove', { touches: [tMove], changedTouches: [tMove] }));

    await new Promise(r => setTimeout(r, 50));
    el.dispatchEvent(new TouchEvent('touchend', { touches: [], changedTouches: [tMove] }));
  });

  await new Promise(r => setTimeout(r, 1000));

  // 模拟轻触右虚拟按键 (D-Pad Right)
  console.log('[Mobile Test] 点击虚拟十字键右键...');
  await page.click('.dpad-right');

  await new Promise(r => setTimeout(r, 1000));

  // 截图 2: 移动端运行态与 D-Pad 渲染
  await page.screenshot({ path: '/Users/hunkwu/.gemini/antigravity/brain/3c70172b-4a8c-439c-88bf-b8067a345cff/mobile_gameplay_view.png' });
  console.log('[Mobile Test] 已保存移动端运行截图');

  console.log('[Mobile Test] 页面错误数量:', errors.length);
  if (errors.length > 0) console.error('[Mobile Test] 错误详情:', errors);

  await browser.close();
}

testMobile().catch(err => {
  console.error('[Mobile Test] 失败:', err);
  process.exit(1);
});
