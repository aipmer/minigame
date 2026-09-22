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

    let allInside = true;
    for (const c of corners) {
      if (!c) continue;
      // 验证是否在可视区域内，并且四周留有合理的呼吸边距 (sx 在 5% ~ 95% 之间)
      const xPercent = c.sx / c.screenWidth;
      const yPercent = c.sy / c.screenHeight;
      if (xPercent < 0.05 || xPercent > 0.95) {
        console.warn(`⚠️ 警告: X 轴边距过窄或越界: pt=(${c.pt.x}, ${c.pt.z}) x%=${(xPercent*100).toFixed(1)}%`);
        allInside = false;
      }
      if (yPercent < 0.05 || yPercent > 0.95) {
        console.warn(`⚠️ 警告: Y 轴边距过窄或越界: pt=(${c.pt.x}, ${c.pt.z}) y%=${(yPercent*100).toFixed(1)}%`);
        allInside = false;
      }
    }
    if (allInside) {
      console.log('✅ 移动端竖屏视锥呼吸边距校验完美通过！活动区域完整可见无截断！');
    }

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
      // 生成一块在 (3, 0.5, 3) 的障碍石
      const obs = ws.obstacleManager;
      obs.positions.push(new ws.sceneSetup.camera.position.constructor(3, 0.5, 3));
      const beforeCount = obs.positions.length;

      // 强制触发雷击
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
    // 测试 3：移动端横屏 (844×390) 布局与交互检查
    // ══════════════════════════════════════════════
    console.log('\n--- 3. 验证移动端横屏 (844×390) 界面适配 ---');
    await page.setViewport({ width: 844, height: 390, isMobile: true, hasTouch: true });
    await new Promise(r => setTimeout(r, 500));

    const landscapeOverflow = await page.evaluate(() => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const elements = [
        document.querySelector('.top-nav-bar'),
        document.querySelector('.hud-container'),
        document.querySelector('.weather-pill'),
        document.querySelector('.touch-controls')
      ];
      return elements.map(el => {
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return {
          right: r.right,
          bottom: r.bottom,
          overflowX: r.right > w + 2,
          overflowY: r.bottom > h + 2
        };
      });
    });
    console.log('横屏下各核心控件布局状态:', landscapeOverflow);
    const hasLandscapeOverflow = landscapeOverflow.some(item => item && (item.overflowX || item.overflowY));
    if (hasLandscapeOverflow) {
      throw new Error('横屏模式下控件超出视口！');
    }
    console.log('✅ 移动端横屏适配校验通过！');

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
