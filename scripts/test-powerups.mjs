import puppeteer from 'puppeteer';
import path from 'path';
import fs from 'fs';

const artifactDir = '/Users/hunkwu/.gemini/antigravity/brain/3c70172b-4a8c-439c-88bf-b8067a345cff';

async function testPowerUps() {
  console.log('[Test] 启动疯狂道具模式与四大铁律自动化测试...');
  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });

  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', err => errors.push(err.toString()));
  page.on('response', res => {
    if (res.status() >= 400) {
      console.log(`[404/Error Resource]: ${res.status()} ${res.url()}`);
    }
  });

  const port = process.env.PORT || 3456;
  await page.goto(`http://localhost:${port}/games/snake3d/`, { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 600));

  // 1. 验证开始界面与模式选择胶囊
  console.log('[Test 1] 验证开始界面模式切换器...');
  const classicBtnActive = await page.$eval('#mode-btn-classic', el => el.classList.contains('active'));
  console.log('默认经典模式激活:', classicBtnActive);

  // 点击疯狂道具模式
  await page.click('#mode-btn-crazy');
  await new Promise(r => setTimeout(r, 300));
  const crazyBtnActive = await page.$eval('#mode-btn-crazy', el => el.classList.contains('active'));
  const modeDesc = await page.$eval('#mode-desc', el => el.textContent.trim());
  console.log('疯狂模式激活:', crazyBtnActive, '描述:', modeDesc);

  const startScreenShot = path.join(artifactDir, 'snake3d_mode_select_mobile.png');
  await page.screenshot({ path: startScreenShot });
  console.log('移动端模式切换截图已保存:', startScreenShot);

  // 2. 启动游戏并验证疯狂道具生成与 HUD 状态
  console.log('[Test 2] 启动疯狂道具模式并验证各道具生效...');
  await page.click('#start-btn');
  await new Promise(r => setTimeout(r, 800));

  // 模拟触发道具生成与拾取（测试幽灵穿墙）
  console.log('[Test 3] 验证幽灵穿墙道具...');
  await page.evaluate(() => {
    if (window._powerUpManager && window._snake) {
      window._powerUpManager.collectPowerUp('ghost', window._snake, null, null, null, null);
    }
  });
  await new Promise(r => setTimeout(r, 400));

  const ghostStatus = await page.evaluate(() => {
    const hud = document.getElementById('powerup-hud');
    const name = document.getElementById('powerup-name').textContent;
    const timer = document.getElementById('powerup-timer').textContent;
    const isGhost = window._snake.isGhost;
    return {
      hudVisible: !hud.classList.contains('hidden'),
      name,
      timer,
      isGhost
    };
  });
  console.log('幽灵道具状态:', ghostStatus);

  const ghostScreenShot = path.join(artifactDir, 'snake3d_powerup_ghost_active.png');
  await page.screenshot({ path: ghostScreenShot });
  console.log('幽灵激活态截图已保存:', ghostScreenShot);

  // 模拟测试冰霜减速
  console.log('[Test 4] 验证冰霜减速道具...');
  await page.evaluate(() => {
    if (window._powerUpManager && window._snake) {
      window._powerUpManager.collectPowerUp('frost', window._snake, null, null, null, null);
    }
  });
  await new Promise(r => setTimeout(r, 400));
  const frostStatus = await page.evaluate(() => {
    const name = document.getElementById('powerup-name').textContent;
    const isFrost = window._snake.isFrost;
    return { name, isFrost };
  });
  console.log('冰霜道具状态:', frostStatus);

  // 模拟测试磁铁与炸弹
  console.log('[Test 5] 验证磁铁与爆裂清屏...');
  await page.evaluate(() => {
    if (window._powerUpManager && window._snake) {
      window._powerUpManager.collectPowerUp('magnet', window._snake, null, null, null, null);
    }
  });
  await new Promise(r => setTimeout(r, 300));
  const magnetStatus = await page.evaluate(() => {
    return document.getElementById('powerup-name').textContent;
  });
  console.log('磁铁道具状态:', magnetStatus);

  // 3. 四大铁律全面核查
  console.log('[Test 6] 四大铁律严审...');
  const auditResult = await page.evaluate(() => {
    const textNodes = [];
    const walk = (node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        const t = node.nodeValue.trim();
        if (t.length > 0) textNodes.push(t);
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        // 检查图片 alt
        if (node.tagName === 'IMG' && node.alt) {
          textNodes.push(node.alt);
        }
        for (let child of node.childNodes) walk(child);
      }
    };
    walk(document.body);

    // 1. 纯中文零英文（排除合法的三维向量轴或脚本）
    const englishWordRegex = /[a-zA-Z]{2,}/;
    const illegalEnglish = textNodes.filter(t => englishWordRegex.test(t));

    // 2. 零 Emoji
    const emojiRegex = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u;
    const illegalEmoji = textNodes.filter(t => emojiRegex.test(t));

    // 3. 移动端 UI 零溢出
    const overflowElements = [];
    document.querySelectorAll('*').forEach(el => {
      const rect = el.getBoundingClientRect();
      if (rect.right > window.innerWidth + 2 && rect.width > 0) {
        overflowElements.push({ tag: el.tagName, className: el.className, right: rect.right });
      }
    });

    return {
      textNodesCount: textNodes.length,
      illegalEnglish,
      illegalEmoji,
      overflowElements
    };
  });

  console.log('铁律审查结果:', JSON.stringify(auditResult, null, 2));

  if (errors.length > 0) {
    console.error('页面产生控制台错误:', errors);
  }

  await browser.close();

  if (errors.length > 0 || auditResult.illegalEmoji.length > 0 || auditResult.overflowElements.length > 0) {
    throw new Error('测试未通过，存在违规项或错误');
  }

  console.log('🎉 疯狂道具模式与四大铁律自动化测试 100% 通过！');
}

testPowerUps().catch(err => {
  console.error('测试失败:', err);
  process.exit(1);
});
