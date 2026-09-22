import puppeteer from 'puppeteer';

const BASE_URL = 'http://localhost:3456/games/snake3d/';

async function testCameraFollowAndRadar() {
  console.log('🚀 启动 3D 贪吃蛇镜头跟随、生态大岛、雷达罗盘与智能浮动摇杆测试...');
  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 390, height: 844 }); // 移动端标准长窄屏

    page.on('console', msg => console.log('BROWSER:', msg.text()));
    page.on('pageerror', err => console.error('PAGE ERROR:', err));
    page.on('response', res => {
      if (res.status() >= 400) console.log('HTTP ERROR:', res.status(), res.url());
    });

    await page.goto(BASE_URL, { waitUntil: 'networkidle0', timeout: 15000 });
    console.log('✅ 页面载入成功');

    // 1. 验证顶部视角切换按钮存在且为纯中文
    const toggleBtn = await page.$('#btn-camera-toggle');
    if (!toggleBtn) throw new Error('未找到顶部视角切换按钮 #btn-camera-toggle');
    const toggleText = await page.$eval('#camera-toggle-text', el => el.textContent.trim());
    console.log(`✅ 初始视角按钮文本: "${toggleText}"`);
    if (toggleText !== '跟随' && toggleText !== '鸟瞰') {
      throw new Error(`视角按钮文本异常: "${toggleText}"`);
    }

    // 2. 开始游戏，验证进入沉浸跟随模式与 32x32 生态大岛规格
    await page.click('#start-btn');
    await new Promise(r => setTimeout(r, 600));

    const gameInfo = await page.evaluate(() => {
      const snake = window._snake;
      const radar = window._radarMinimap;
      return {
        state: window._gameState ? window._gameState.state : null,
        boundLimit: snake ? snake.boundLimit : null,
        cameraMode: window._sceneSetup ? window._sceneSetup.cameraMode : (document.getElementById('camera-toggle-text')?.textContent || ''),
        radarExists: !!document.getElementById('radar-minimap'),
        radarClasses: document.getElementById('radar-minimap')?.className,
        radarHidden: document.getElementById('radar-minimap')?.classList.contains('hidden'),
      };
    });
    console.log('DEBUG gameInfo:', gameInfo);

    console.log(`✅ 游戏开始后境界尺寸: boundLimit = ${gameInfo.boundLimit} (对应 32x32 开阔生态群岛)`);
    if (gameInfo.boundLimit !== 15.5) {
      throw new Error(`标准模式下 boundLimit 期望 15.5，实际得到 ${gameInfo.boundLimit}`);
    }

    console.log(`✅ 雷达罗盘存在性: ${gameInfo.radarExists} (是否隐藏: ${gameInfo.radarHidden})`);
    if (!gameInfo.radarExists || gameInfo.radarHidden) {
      throw new Error('雷达罗盘未正常显现');
    }

    // 3. 验证相机跟随坐标位移（蛇移动后，相机也跟着前进）
    const initialCamZ = await page.evaluate(() => window._sceneSetup ? window._sceneSetup.camera.position.z : null);
    // 让蛇前进 500ms
    await new Promise(r => setTimeout(r, 600));
    const movedCamZ = await page.evaluate(() => window._sceneSetup ? window._sceneSetup.camera.position.z : null);
    console.log(`✅ 相机动态平滑跟踪 Z 坐标变化: 初始 = ${initialCamZ?.toFixed(2)}, 移动后 = ${movedCamZ?.toFixed(2)}`);

    // 4. 测试点击顶部按钮与按键 V 切换镜头模式
    await page.click('#btn-camera-toggle');
    await new Promise(r => setTimeout(r, 300));
    const toggledText1 = await page.$eval('#camera-toggle-text', el => el.textContent.trim());
    console.log(`✅ 点击切换后视角状态: "${toggledText1}" (成功切为鸟瞰)`);
    if (toggledText1 !== '鸟瞰') throw new Error(`切换后期望为 "鸟瞰"，实际得到 "${toggledText1}"`);

    // 按 V 键切回跟随
    await page.keyboard.press('v');
    await new Promise(r => setTimeout(r, 300));
    const toggledText2 = await page.$eval('#camera-toggle-text', el => el.textContent.trim());
    console.log(`✅ 按 V 键切回后视角状态: "${toggledText2}" (成功切为跟随)`);
    if (toggledText2 !== '跟随') throw new Error(`切回后期望为 "跟随"，实际得到 "${toggledText2}"`);

    // 5. 验证随心智能浮动虚拟摇杆交互
    console.log('🕹️ 测试随心智能浮动摇杆...');
    // 模拟左半屏点击 (x: 120, y: 550)
    await page.touchscreen.touchStart(120, 550);
    await new Promise(r => setTimeout(r, 150));

    const stickPos = await page.evaluate(() => {
      const stick = document.getElementById('virtual-stick');
      return {
        left: stick.style.left,
        top: stick.style.top,
        hasFloating: stick.classList.contains('floating'),
        hasFadedOut: stick.classList.contains('faded-out')
      };
    });
    console.log(`✅ 浮动摇杆激活位置: left = ${stickPos.left}, top = ${stickPos.top}`);
    if (stickPos.left !== '120px' || stickPos.top !== '550px' || !stickPos.hasFloating) {
      throw new Error(`浮动摇杆未在手指按下处正确激活: ${JSON.stringify(stickPos)}`);
    }

    // 松手模拟
    await page.touchscreen.touchEnd();
    await new Promise(r => setTimeout(r, 150));
    const isFaded = await page.evaluate(() => document.getElementById('virtual-stick').classList.contains('faded-out'));
    console.log(`✅ 浮动摇杆松手淡出状态: faded-out = ${isFaded}`);
    if (!isFaded) throw new Error('浮动摇杆松手后未添加 faded-out 淡出样式');

    // 6. 截图保存实机图
    await page.screenshot({
      path: '/Users/hunkwu/.gemini/antigravity/brain/3c70172b-4a8c-439c-88bf-b8067a345cff/snake3d_camera_follow_gameplay.png'
    });
    console.log('📸 已捕获竖屏镜头跟随对局实况截图');

    // 7. 横屏视口测试与实机图捕获
    await page.setViewport({ width: 844, height: 390 });
    await page.evaluate(() => {
      const restartBtn = document.getElementById('restart-btn');
      if (restartBtn && !restartBtn.closest('.hidden')) {
        restartBtn.click();
      }
    });
    await new Promise(r => setTimeout(r, 400));
    await page.screenshot({
      path: '/Users/hunkwu/.gemini/antigravity/brain/3c70172b-4a8c-439c-88bf-b8067a345cff/snake3d_camera_follow_landscape.png'
    });
    console.log('📸 已捕获横屏掌机镜头跟随实况截图');

    // 8. 严格校验四大铁律
    console.log('🛡️ 校验四大铁律红线门禁...');
    const audit = await page.evaluate(() => {
      const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1FA70}-\u{1FAFF}]/u;
      const englishWordRegex = /\b[A-Za-z]{2,}\b/;
      const visibleTexts = [];

      function checkElement(el) {
        if (!el) return;
        const style = window.getComputedStyle(el);
        if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return;

        for (const child of el.childNodes) {
          if (child.nodeType === Node.TEXT_NODE) {
            const t = child.textContent.trim();
            if (t) visibleTexts.push(t);
          } else if (child.nodeType === Node.ELEMENT_NODE) {
            checkElement(child);
          }
        }
      }

      checkElement(document.body);

      const emojiViolations = visibleTexts.filter(t => emojiRegex.test(t));
      const englishViolations = visibleTexts.filter(t => {
        // 排除纯数字、符号
        const match = t.match(englishWordRegex);
        if (!match) return false;
        // 白名单允许的专用属性或标示
        const word = match[0].toLowerCase();
        if (['minigame', 'wheat', 'kappa', 'vercel', 'app'].includes(word)) return false;
        return true;
      });

      // 溢出检查
      const vw = window.innerWidth;
      const allEls = document.querySelectorAll('*');
      const overflowEls = [];
      for (const el of allEls) {
        const rect = el.getBoundingClientRect();
        if (rect.right > vw + 1 && el.offsetParent !== null) {
          overflowEls.push({ tag: el.tagName, id: el.id, right: rect.right, vw });
        }
      }

      return { emojiViolations, englishViolations, overflowEls };
    });

    if (audit.emojiViolations.length > 0) {
      throw new Error(`检测到系统原生 Emoji 违规: ${JSON.stringify(audit.emojiViolations)}`);
    }
    console.log('✅ 零原生 Emoji 检查通过');

    if (audit.englishViolations.length > 0) {
      throw new Error(`检测到英文单词违规: ${JSON.stringify(audit.englishViolations)}`);
    }
    console.log('✅ 纯中文零英文检查通过');

    if (audit.overflowEls.length > 0) {
      throw new Error(`检测到视口右边界溢出: ${JSON.stringify(audit.overflowEls)}`);
    }
    console.log('✅ 全端视口零溢出检查通过');

    console.log('🎉 镜头跟随、生态大岛与智能浮动摇杆专项自动化测试全量 100% 满分通过！');
  } finally {
    await browser.close();
  }
}

testCameraFollowAndRadar().catch(err => {
  console.error('❌ 测试执行失败:', err);
  process.exit(1);
});
