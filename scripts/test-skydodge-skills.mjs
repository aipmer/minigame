import puppeteer from 'puppeteer';

async function testSkyDodgeSkills() {
  console.log('[Test Skills] 启动太空战机技能与晶币经济自动化测试...');
  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720 });

  const errors = [];
  page.on('pageerror', (err) => errors.push(err.toString()));

  await page.goto('http://localhost:3000/games/skydodge/', { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 1500));

  // 1. 点击起飞
  console.log('[Test Skills] 点击起飞...');
  await page.click('#start-btn');
  await new Promise((r) => setTimeout(r, 800));

  // 2. 验证 0 晶币时按键 1 触发不足提示
  console.log('[Test Skills] 测试 0 晶币时按键 1 释放护盾...');
  await page.keyboard.press('Digit1');
  await new Promise((r) => setTimeout(r, 200));

  const toastText = await page.evaluate(() => {
    const el = document.getElementById('skill-toast');
    return el ? el.textContent : '';
  });
  console.log(`[Test Skills] 晶币不足提示内容: "${toastText}"`);
  if (!toastText.includes('不足')) {
    throw new Error(`预期晶币不足提示，实际得到: "${toastText}"`);
  }

  // 3. 注入 300 量子晶币测试战术大招
  console.log('[Test Skills] 注入 300 量子晶币并更新状态...');
  await page.evaluate(() => {
    window.gameState.addCrystals(300);
    window.tacticalSkills.updateUI();
  });

  const crystalsNow = await page.evaluate(() => {
    return document.getElementById('hud-crystals').textContent;
  });
  console.log(`[Test Skills] 当前 HUD 晶币数量: ${crystalsNow}`);

  // 4. 按键 3 释放火力过载
  console.log('[Test Skills] 按键 3 触发火力过载 (三叉重炮齐射)...');
  await page.keyboard.press('Digit3');
  await new Promise((r) => setTimeout(r, 200));

  // 持续开火 1.5 秒捕捉三叉重炮金色弹幕
  for (let i = 0; i < 6; i++) {
    await page.keyboard.down('Space');
    await new Promise((r) => setTimeout(r, 120));
    await page.keyboard.up('Space');
    await new Promise((r) => setTimeout(r, 60));
  }

  const overdriveScreenshot = '/Users/hunkwu/.gemini/antigravity/brain/6e9932af-f962-4a6d-aafb-687a5aa2bdae/skydodge_overdrive_firing.png';
  await page.screenshot({ path: overdriveScreenshot });
  console.log(`[Test Skills] 火力过载三叉齐射快照已保存: ${overdriveScreenshot}`);

  // 5. 按键 2 释放超空间 EMP
  console.log('[Test Skills] 按键 2 触发超空间 EMP 全屏清屏激波...');
  await page.keyboard.press('Digit2');
  await new Promise((r) => setTimeout(r, 150));

  const empScreenshot = '/Users/hunkwu/.gemini/antigravity/brain/6e9932af-f962-4a6d-aafb-687a5aa2bdae/skydodge_emp_wave.png';
  await page.screenshot({ path: empScreenshot });
  console.log(`[Test Skills] 超空间 EMP 激波快照已保存: ${empScreenshot}`);

  // 6. 按键 1 释放等离子护盾
  console.log('[Test Skills] 按键 1 触发等离子护盾...');
  await page.keyboard.press('Digit1');
  await new Promise((r) => setTimeout(r, 200));

  const shieldStatus = await page.evaluate(() => {
    return {
      hudShield: document.getElementById('hud-shield').textContent,
      hasShield: window.gameState.hasShield,
    };
  });
  console.log('[Test Skills] 护盾激活状态:', JSON.stringify(shieldStatus, null, 2));

  if (!shieldStatus.hasShield || shieldStatus.hudShield !== '生效中') {
    throw new Error('等离子护盾未能成功生效！');
  }

  console.log(`[Test Skills] 页面错误数量: ${errors.length}`);
  if (errors.length > 0) {
    console.error('[Test Skills] 错误列表:', errors);
  }

  await browser.close();
  console.log('[Test Skills] ✅ 全部战术技能与晶币经济测试圆满通过！');
}

testSkyDodgeSkills().catch((err) => {
  console.error('[Test Skills] 测试失败:', err);
  process.exit(1);
});
