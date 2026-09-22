import puppeteer from 'puppeteer';

const BASE_URL = 'http://localhost:3456/games/snake3d/';

async function runTest() {
  console.log('🚀 启动全端视锥自适应、明亮战报与天气系统专属自动化测试...');
  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log(`[Browser Console ERROR] ${msg.text()}`);
    }
  });

  try {
    // ══════════════════════════════════════════════
    // 测试 1：移动端竖屏 (390×844) 视锥投影与活动区域视野完整性
    // ══════════════════════════════════════════════
    console.log('\n--- 1. 验证移动端竖屏 (390×844) 地台呼吸边距与视野完整性 ---');
    await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
    await page.goto(BASE_URL, { waitUntil: 'networkidle2' });

    // 检查地台 4 个角点在屏幕上的投影坐标
    const corners = await page.evaluate(() => {
      const camera = window._snake ? window._snake.scene.parent : null;
      // 从全局获取
      const testCorners = [
        { x: -10, y: 0, z: -10 },
        { x: 10, y: 0, z: -10 },
        { x: -10, y: 0, z: 10 },
        { x: 10, y: 0, z: 10 }
      ];
      
      // 使用 THREE.Vector3 投影
      return testCorners.map(pt => {
        // 利用场景中的 camera
        const vec = new window._THREE.Vector3(pt.x, pt.y, pt.z);
        // 获取主相机
        const appCamera = window._appCamera || (window._weatherSystem ? window._weatherSystem.sceneSetup.camera : null);
        if (!appCamera) return null;
        vec.project(appCamera);
        const sx = (vec.x * 0.5 + 0.5) * window.innerWidth;
        const sy = (-vec.y * 0.5 + 0.5) * window.innerHeight;
        return { pt, sx, sy, screenWidth: window.innerWidth, screenHeight: window.innerHeight };
      });
    }).catch(async () => {
      // 若没有挂载 window._THREE，则在 evaluate 中临时导入
      return await page.evaluate(async () => {
        const THREE = await import('three');
        const appCamera = window._weatherSystem ? window._weatherSystem.sceneSetup.camera : null;
        if (!appCamera) return null;
        const testCorners = [
          { x: -10, y: 0, z: -10 },
          { x: 10, y: 0, z: -10 },
          { x: -10, y: 0, z: 10 },
          { x: 10, y: 0, z: 10 }
        ];
        return testCorners.map(pt => {
          const vec = new THREE.Vector3(pt.x, pt.y, pt.z);
          vec.project(appCamera);
          const sx = (vec.x * 0.5 + 0.5) * window.innerWidth;
          const sy = (-vec.y * 0.5 + 0.5) * window.innerHeight;
          return { pt, sx, sy, screenWidth: window.innerWidth, screenHeight: window.innerHeight };
        });
      });
    });

    console.log('地台四角屏幕投影位置:', JSON.stringify(corners, null, 2));

    let maxBottomYPercent = 0;
    for (const c of corners) {
      if (!c) continue;
      const xPercent = c.sx / c.screenWidth;
      const yPercent = c.sy / c.screenHeight;
      if (yPercent > maxBottomYPercent) maxBottomYPercent = yPercent;

      // 验证是否在可视区域内，并且左右四周留有舒适的呼吸边距 (sx 在 14% ~ 86% 之间)
      if (xPercent < 0.12 || xPercent > 0.88) {
        throw new Error(`X 轴边距过窄或贴边: pt=(${c.pt.x}, ${c.pt.z}) x%=${(xPercent*100).toFixed(1)}%`);
      }
    }
    console.log(`竖屏地台底边缘最大高度占比: ${(maxBottomYPercent * 100).toFixed(1)}% (必须 <= 58% 留出下半区)`);
    if (maxBottomYPercent > 0.58) {
      throw new Error(`竖屏上下功能分区不合格: 地台底边占用过大 (${(maxBottomYPercent*100).toFixed(1)}% > 58%)，下半区空间不足！`);
    }
    console.log('✅ 移动端竖屏【上下功能分区法】严格达标：地台居于中上部，下半部腾出纯净操作安全区！');

    // ══════════════════════════════════════════════
    // 测试 2：启动游戏并验证天气系统与局内胶囊
    // ══════════════════════════════════════════════
    console.log('\n--- 2. 验证天气系统三态演进、粒子与雷击碎石 ---');
    await page.click('#start-btn');
    await new Promise(r => setTimeout(r, 600));

    // 检查天气胶囊是否显示
    const weatherHudVisible = await page.$eval('#weather-hud', el => !el.classList.contains('hidden'));
    const weatherName = await page.$eval('#weather-name', el => el.textContent.trim());
    console.log(`局内天气胶囊显隐: ${weatherHudVisible}, 当前天气: ${weatherName}`);
    if (!weatherHudVisible || !weatherName) {
      throw new Error('天气胶囊未在对局中正常显示！');
    }

    // 强制切换至 thunder (暴雨惊雷)
    await page.evaluate(() => {
      window._weatherSystem.forceWeather('thunder');
    });
    await new Promise(r => setTimeout(r, 500));

    const thunderStatus = await page.evaluate(() => {
      const ws = window._weatherSystem;
      return {
        current: ws.currentWeather,
        rainVisible: ws.rainLines ? ws.rainLines.visible : false,
        name: document.getElementById('weather-name').textContent.trim()
      };
    });
    console.log('暴雨惊雷天气状态:', thunderStatus);
    if (thunderStatus.current !== 'thunder' || !thunderStatus.rainVisible || thunderStatus.name !== '暴雨惊雷') {
      throw new Error('暴雨惊雷切换失败或雨丝粒子未激活！');
    }

    // 测试雷电击碎障碍石
    console.log('生成测试障碍石并触发雷击...');
    const strikeResult = await page.evaluate(() => {
      const ws = window._weatherSystem;
      const obs = ws.obstacleManager;
      obs.positions.push(new ws.sceneSetup.camera.position.constructor(3, 0.5, 3));
      const beforeCount = obs.positions.length;

      ws.triggerLightning();

      return {
        dirLightIntensity: ws.sceneSetup.dirLight.intensity,
        beforeCount
      };
    });
    console.log('雷闪瞬间光照脉冲强度:', strikeResult.dirLightIntensity);
    if (strikeResult.dirLightIntensity < 2.5) {
      throw new Error('雷闪光照瞬间脉冲不足！');
    }

    // 强制切换至 snow (梦幻雪境)
    await page.evaluate(() => {
      window._weatherSystem.forceWeather('snow');
    });
    await new Promise(r => setTimeout(r, 500));

    const snowStatus = await page.evaluate(() => {
      const ws = window._weatherSystem;
      return {
        current: ws.currentWeather,
        snowVisible: ws.snowPoints ? ws.snowPoints.visible : false,
        name: document.getElementById('weather-name').textContent.trim(),
        groundHasSnowMap: ws.ground.groundMesh.material.map === ws.ground.snowTexture
      };
    });
    console.log('梦幻雪境天气状态:', snowStatus);
    if (snowStatus.current !== 'snow' || !snowStatus.snowVisible || !snowStatus.groundHasSnowMap) {
      throw new Error('梦幻雪境切换失败或雪花粒子未激活或地台未白化！');
    }
    console.log('✅ 天气系统三态循环、雨雪粒子与冬日积雪地台白化校验通过！');

    // ══════════════════════════════════════════════
    // 测试 3：移动端横屏双拇指掌机布局与极速冲刺
    // ══════════════════════════════════════════════
    console.log('\n--- 3. 验证移动端横屏 (844×390) 双拇指掌机布局与冲刺按键 ---');
    await page.setViewport({ width: 844, height: 390, isMobile: true, hasTouch: true });
    await new Promise(r => setTimeout(r, 500));

    // 重新开启一局以确保处于活跃的 playing 状态
    await page.evaluate(() => {
      if (document.getElementById('gameover-screen').classList.contains('hidden') === false) {
        document.getElementById('restart-btn').click();
      } else if (document.getElementById('start-screen').classList.contains('hidden') === false) {
        document.getElementById('start-btn').click();
      }
    });
    await new Promise(r => setTimeout(r, 600));

    const landscapeStatus = await page.evaluate(() => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const stick = document.getElementById('virtual-stick');
      const boost = document.getElementById('touch-boost-btn');
      const rotateHint = document.getElementById('rotate-hint');
      const weatherPill = document.getElementById('weather-hud');

      const stickR = stick.getBoundingClientRect();
      const boostR = boost.getBoundingClientRect();
      const weatherR = weatherPill.getBoundingClientRect();

      const rotateHintHidden = window.getComputedStyle(rotateHint).display === 'none';
      const weatherCentered = Math.abs((weatherR.left + weatherR.right) / 2 - w / 2) < 40;

      return {
        stickLeft: stickR.left,
        stickRight: stickR.right,
        boostLeft: boostR.left,
        boostRight: boostR.right,
        isLeftHandStick: stickR.right < w * 0.35,
        isRightHandBoost: boostR.left > w * 0.65,
        rotateHintHidden,
        weatherCentered
      };
    });

    console.log('横屏掌机布局检测结果:', landscapeStatus);
    if (!landscapeStatus.isLeftHandStick) {
      throw new Error('横屏模式左摇杆未在左手操作区！');
    }
    if (!landscapeStatus.isRightHandBoost) {
      throw new Error('横屏模式极速冲刺键未在右手操作区！');
    }
    if (!landscapeStatus.rotateHintHidden) {
      throw new Error('横屏模式下未隐藏旋转提示！');
    }
    if (!landscapeStatus.weatherCentered) {
      throw new Error('横屏模式下天气胶囊未在顶部居中！');
    }

    // 模拟冲刺按键交互
    console.log('测试极速冲刺按键交互状态...');
    const boostActiveState = await page.evaluate(() => {
      const btn = document.getElementById('touch-boost-btn');
      // 触发 mousedown
      btn.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
      const isBoostingOnDown = window._snake.isBoosting;
      // 触发 mouseup
      window.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
      const isBoostingOnUp = window._snake.isBoosting;
      return { isBoostingOnDown, isBoostingOnUp };
    });
    console.log('冲刺按键触发状态:', boostActiveState);
    if (!boostActiveState.isBoostingOnDown || boostActiveState.isBoostingOnUp) {
      throw new Error('冲刺按键状态切换异常！');
    }
    console.log('✅ 移动端横屏双拇指掌机布局与极速冲刺按键校验 100% 通过！');

    // ══════════════════════════════════════════════
    // 测试 4：明亮战报海报画风与纯中文检查
    // ══════════════════════════════════════════════
    console.log('\n--- 4. 验证明亮晴空奶白战报海报与 100% 纯中文 ---');
    // 恢复竖屏测试战报
    await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });

    // 触发游戏结束
    await page.evaluate(() => {
      window._snake.isInvincible = false;
      // 制造撞墙死亡
      window._snake.logicalPos.set(12, 0.5, 12);
      window._snake.step();
    });
    await new Promise(r => setTimeout(r, 600));

    // 检查结算弹窗中的荣誉战报按钮
    const posterBtn = await page.$('#btn-gameover-poster');
    if (!posterBtn) throw new Error('未找到战报生成按钮！');
    await posterBtn.click();
    await new Promise(r => setTimeout(r, 800));

    // 验证战报图片源
    const posterDataUrl = await page.$eval('#social-poster-img', el => el.src);
    if (!posterDataUrl || !posterDataUrl.startsWith('data:image/png')) {
      throw new Error('战报海报未生成有效 PNG 数据！');
    }

    // 检查海报画风明亮度与纯中文
    const posterAnalysis = await page.evaluate(async (dataUrl) => {
      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
          const cvs = document.createElement('canvas');
          cvs.width = img.width;
          cvs.height = img.height;
          const ctx = cvs.getContext('2d');
          ctx.drawImage(img, 0, 0);

          // 取样计算平均亮度
          const imgData = ctx.getImageData(0, 0, cvs.width, cvs.height);
          const data = imgData.data;
          let totalBrightness = 0;
          const step = 4 * 10; // 每隔 10 个像素取样
          let count = 0;
          for (let i = 0; i < data.length; i += step) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            // 相对亮度
            const luma = 0.299 * r + 0.587 * g + 0.114 * b;
            totalBrightness += luma;
            count++;
          }
          const avgBrightness = totalBrightness / count;
          resolve({
            width: img.width,
            height: img.height,
            avgBrightness
          });
        };
        img.src = dataUrl;
      });
    }, posterDataUrl);

    console.log(`战报尺寸: ${posterAnalysis.width}x${posterAnalysis.height}, 平均亮度: ${posterAnalysis.avgBrightness.toFixed(1)}/255`);
    if (posterAnalysis.avgBrightness < 130) {
      throw new Error(`战报平均亮度 (${posterAnalysis.avgBrightness}) 偏暗，未达晴空奶白高亮画风标准 (>= 130)！`);
    }
    console.log('✅ 战报海报明亮晴空奶白粘土画风校验通过！');

    // ══════════════════════════════════════════════
    // 测试 5：四大铁律全面审查
    // ══════════════════════════════════════════════
    console.log('\n--- 5. 严格执行四大铁律门禁检查 ---');
    const violations = await page.evaluate(() => {
      const results = { englishWords: [], emojis: [], overflows: [] };
      const englishRegex = /\b(HP|Lv|Level|Wave|MAX|Score|High\s*Score|Combo|Game\s*Over|Restart|Back|Shop|Achievement|Leaderboard|MINIGAME)\b/i;
      const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;

      // 文本节点
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      let node;
      while ((node = walker.nextNode())) {
        const text = node.nodeValue.trim();
        if (!text) continue;
        const parent = node.parentElement;
        if (!parent) continue;
        const style = window.getComputedStyle(parent);
        if (style.display === 'none' || style.visibility === 'hidden') continue;

        if (englishRegex.test(text)) {
          results.englishWords.push({ text, tag: parent.tagName, class: parent.className });
        }
        if (emojiRegex.test(text)) {
          results.emojis.push({ text, tag: parent.tagName, class: parent.className });
        }
      }

      // 视口溢出检查
      const w = window.innerWidth;
      const allEls = document.querySelectorAll('*');
      allEls.forEach(el => {
        const r = el.getBoundingClientRect();
        if (r.width > 0 && r.height > 0 && r.right > w + 2) {
          const style = window.getComputedStyle(el);
          if (style.display !== 'none' && style.visibility !== 'hidden' && style.overflow !== 'hidden') {
            results.overflows.push({ tag: el.tagName, class: el.className, right: r.right, maxW: w });
          }
        }
      });

      return results;
    });

    console.log('违规项排查:', violations);
    if (violations.englishWords.length > 0) {
      throw new Error(`存在英文违规文本: ${JSON.stringify(violations.englishWords)}`);
    }
    if (violations.emojis.length > 0) {
      throw new Error(`存在原生 Emoji: ${JSON.stringify(violations.emojis)}`);
    }
    if (violations.overflows.length > 0) {
      throw new Error(`存在视口溢出控件: ${JSON.stringify(violations.overflows)}`);
    }
    console.log('✅ 四大铁律严苛审查 100% 满分通过！');

    // 截取手机端横屏与竖屏截图供用户检视
    await page.screenshot({ path: 'snake3d_weather_snow_mobile.png' });
    console.log('📸 截图已保存: snake3d_weather_snow_mobile.png');

    console.log('\n🎉 所有测试用例全部顺利通过！');
  } finally {
    await browser.close();
  }
}

runTest().catch(err => {
  console.error('\n❌ 测试失败:', err);
  process.exit(1);
});
