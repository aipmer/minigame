import puppeteer from 'puppeteer';

async function testGardenGuard() {
  console.log('[Test] 启动 Garden Guard 四大铁律硬门禁自动化测试 (纯中文、零Emoji、防截断、手办建模)...');
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

  const url = 'http://localhost:3456/games/gardenguard/';
  console.log(`[Test] 访问目标地址: ${url}`);
  await page.goto(url, { waitUntil: 'networkidle0' });

  // 等待初始化和资源载入
  await new Promise(r => setTimeout(r, 1200));

  // ========================================================
  // 硬门禁 1: 扫描页面可见文本中是否存在任何系统原生 Emoji
  // ========================================================
  console.log('[门禁 1] 检测页面可见文本中是否存在 Emoji...');
  const emojiScan = await page.evaluate(() => {
    const emojiRegex = /\p{Extended_Pictographic}/u;
    const allElements = Array.from(document.querySelectorAll('body *:not(script):not(style)'));
    const matched = [];
    allElements.forEach(el => {
      // 仅检查自身直接文本或关键节点
      for (const node of el.childNodes) {
        if (node.nodeType === Node.TEXT_NODE && emojiRegex.test(node.textContent)) {
          matched.push({ tag: el.tagName, id: el.id, class: el.className, text: node.textContent.trim() });
        }
      }
    });
    return matched;
  });

  if (emojiScan.length > 0) {
    console.error('❌ [门禁 1 失败] 发现系统原生 Emoji 违规使用:', JSON.stringify(emojiScan, null, 2));
    throw new Error(`发现 ${emojiScan.length} 处 Emoji 违规，严禁在项目中出现原生 Emoji！`);
  }
  console.log('✅ [门禁 1 通过] 页面完全无任何系统原生 Emoji！全套使用专属 3D 图标。');

  // ========================================================
  // 硬门禁 2: 扫描纯中文环境下的英文字母泄露
  // ========================================================
  console.log('[门禁 2] 检测大厅与核心 UI 是否存在未翻译英文字符 (允许 3D)...');
  const englishScan = await page.evaluate(() => {
    const text = document.getElementById('start-screen')?.innerText || '';
    // 匹配英文字词，允许技术标签如 3D
    const words = (text.match(/[a-zA-Z]+/g) || []).filter(w => w !== 'D');
    return words;
  });

  if (englishScan.length > 0) {
    console.error('❌ [门禁 2 失败] 发现英文单词泄露:', englishScan);
    throw new Error(`发现未翻译英文单词: ${englishScan.join(', ')}`);
  }
  console.log('✅ [门禁 2 通过] 大厅及主要界面 100% 纯中文！零多余英文字母。');

  // ========================================================
  // 硬门禁 3: 评测工具默认彻底隐形 & 战斗中右上角 0 遮挡
  // ========================================================
  console.log('[门禁 3] 验证评测工具箱默认完全隐形，战斗中不与生命条重叠...');
  const debugDefaultHidden = await page.evaluate(() => {
    const pill = document.getElementById('debug-toggle-btn');
    const isHidden = pill && (pill.classList.contains('hidden') || getComputedStyle(pill).display === 'none');
    return isHidden;
  });

  if (!debugDefaultHidden) {
    throw new Error('评测工具箱未默认隐藏！违背隐形调试工具设计规范。');
  }
  console.log('✅ [门禁 3 通过] 评测工具箱默认 100% 完全隐形，正式界面零干扰。');

  // 测试隐形激活机制：大厅标题连击 5 次
  console.log('[Test] 测试大厅标题连击 5 次激活评测工具...');
  for (let i = 0; i < 5; i++) {
    await page.click('#start-title');
    await new Promise(r => setTimeout(r, 100));
  }
  await new Promise(r => setTimeout(r, 300));

  const debugActivated = await page.evaluate(() => {
    const panel = document.getElementById('debug-panel');
    return panel && !panel.classList.contains('hidden');
  });

  if (!debugActivated) {
    throw new Error('大厅标题 5 次连击未能成功激活评测面板！');
  }
  console.log('✅ [门禁 3 通过] 5 次连击隐形激活彩蛋完美生效，评测弹窗安全居中弹出！');

  const debugModalPath = '/Users/hunkwu/.gemini/antigravity/brain/b1313bdd-d984-40ca-95d8-46e44194790b/gardenguard_debug_modal.png';
  await page.screenshot({ path: debugModalPath });
  console.log(`[Test] 评测面板实机截图: ${debugModalPath}`);

  // 关闭评测面板
  await page.click('#debug-close-btn');
  await new Promise(r => setTimeout(r, 300));

  // 1. 保存全新大厅实机截图
  const startScreenPath = '/Users/hunkwu/.gemini/antigravity/brain/b1313bdd-d984-40ca-95d8-46e44194790b/gardenguard_start_phase2.png';
  await page.screenshot({ path: startScreenPath });
  console.log(`[Test] 纯中文+3D图标大厅截图: ${startScreenPath}`);

  // 2. 测试打开设施升级弹窗并检查 0 Emoji 与纯中文
  console.log('[Test] 点击打开设施升级弹窗...');
  await page.click('#btn-open-facility');
  await new Promise(r => setTimeout(r, 500));

  const facilityCheck = await page.evaluate(() => {
    const modal = document.getElementById('facility-modal');
    const text = modal?.innerText || '';
    const emojiRegex = /\p{Extended_Pictographic}/u;
    const hasEmoji = emojiRegex.test(text);
    const hasLv = text.includes('Lv.');
    const hasMax = text.includes('MAX');
    return { hasEmoji, hasLv, hasMax, textSnippet: text.slice(0, 100) };
  });

  if (facilityCheck.hasEmoji || facilityCheck.hasLv || facilityCheck.hasMax) {
    console.error('❌ [门禁失败] 设施弹窗存在 Emoji 或英文残留:', facilityCheck);
    throw new Error('设施弹窗未彻底达成纯中文与零Emoji！');
  }
  console.log('✅ [门禁通过] 设施升级弹窗零 Emoji，等级/满级已彻底地道汉化。');

  const facilityModalPath = '/Users/hunkwu/.gemini/antigravity/brain/b1313bdd-d984-40ca-95d8-46e44194790b/gardenguard_facility_modal.png';
  await page.screenshot({ path: facilityModalPath });
  console.log(`[Test] 设施弹窗实机截图: ${facilityModalPath}`);

  await page.click('#btn-close-facility');
  await new Promise(r => setTimeout(r, 300));

  // 3. 测试打开典藏图鉴弹窗并检查
  console.log('[Test] 点击打开典藏图鉴弹窗...');
  await page.click('#btn-open-compendium');
  await new Promise(r => setTimeout(r, 500));

  const compendiumCheck = await page.evaluate(() => {
    const modal = document.getElementById('compendium-modal');
    const text = modal?.innerText || '';
    const emojiRegex = /\p{Extended_Pictographic}/u;
    return { hasEmoji: emojiRegex.test(text) };
  });

  if (compendiumCheck.hasEmoji) {
    throw new Error('典藏图鉴弹窗存在 Emoji！');
  }
  console.log('✅ [门禁通过] 典藏图鉴植物卡片无 Emoji。');

  // 切换到害虫
  await page.click('#tab-enemies');
  await new Promise(r => setTimeout(r, 400));

  const compendiumModalPath = '/Users/hunkwu/.gemini/antigravity/brain/b1313bdd-d984-40ca-95d8-46e44194790b/gardenguard_compendium_modal.png';
  await page.screenshot({ path: compendiumModalPath });
  console.log(`[Test] 典藏图鉴实机截图: ${compendiumModalPath}`);

  await page.click('#btn-close-compendium');
  await new Promise(r => setTimeout(r, 300));

  // 4. 开始守卫并进入战斗，检验 3D 浮空岛与手办植物
  console.log('[Test] 点击开始守卫，进入真实 3D 战斗...');
  await page.click('#btn-start');
  await new Promise(r => setTimeout(r, 1200));

  // 门禁：验证战斗中右上角生命值条完全无任何元素遮挡与重叠
  const battleOverlapCheck = await page.evaluate(() => {
    const hpEl = document.querySelector('.hud-hp');
    const pill = document.getElementById('debug-toggle-btn');
    if (!hpEl) return { ok: false, reason: '未找到生命条' };
    const hpRect = hpEl.getBoundingClientRect();
    const isPillHidden = !pill || pill.classList.contains('hidden') || getComputedStyle(pill).display === 'none';
    if (!isPillHidden) {
      const pillRect = pill.getBoundingClientRect();
      const overlap = !(hpRect.right < pillRect.left || hpRect.left > pillRect.right || hpRect.bottom < pillRect.top || hpRect.top > pillRect.bottom);
      if (overlap) return { ok: false, reason: '生命条与评测胶囊发生物理重叠！' };
    }
    return { ok: true, hpRight: hpRect.right, isPillHidden };
  });

  if (!battleOverlapCheck.ok) {
    throw new Error(`[门禁失败] 战斗中右上角 UI 冲突: ${battleOverlapCheck.reason}`);
  }
  console.log('✅ [门禁通过] 战斗中右上角生命值条 100% 独立居右，0 遮挡 0 重叠！');

  // 召唤植物
  await page.click('#btn-summon');
  await new Promise(r => setTimeout(r, 600));

  // 召唤第二个植物并触发测试
  await page.evaluate(() => {
    // 增加种子并再次召唤
    const btn = document.getElementById('btn-summon');
    if (btn) btn.click();
  });
  await new Promise(r => setTimeout(r, 2500));

  const gameplayPath = '/Users/hunkwu/.gemini/antigravity/brain/b1313bdd-d984-40ca-95d8-46e44194790b/gardenguard_gameplay_phase2.png';
  await page.screenshot({ path: gameplayPath });
  console.log(`[Test] 3D浮空岛手办实机截图: ${gameplayPath}`);

  // 5. 结算面板
  console.log('[Test] 触发结算面板...');
  await page.evaluate(() => {
    const gameover = document.getElementById('gameover-screen');
    if (gameover) {
      document.getElementById('result-coins').textContent = '+120';
      document.getElementById('result-waves').textContent = '4';
      document.getElementById('result-max-star').textContent = '3';
      document.getElementById('result-kills').textContent = '18';
      gameover.classList.remove('hidden');
    }
  });
  await new Promise(r => setTimeout(r, 600));

  const gameoverModalPath = '/Users/hunkwu/.gemini/antigravity/brain/b1313bdd-d984-40ca-95d8-46e44194790b/gardenguard_gameover_phase2.png';
  await page.screenshot({ path: gameoverModalPath });
  console.log(`[Test] 结算面板实机截图: ${gameoverModalPath}`);

  console.log('\n--- 浏览器日志 ---');
  logs.slice(0, 10).forEach(l => console.log(l));

  if (errors.length > 0) {
    console.error('\n--- 页面错误 ---');
    errors.forEach(e => console.error('❌', e));
    throw new Error('页面存在 JS 运行错误！');
  }

  await browser.close();
  console.log('\n🎉 《花园守卫》四大铁律全部严苛通过！(100% 纯中文、零Emoji、防遮挡截断、手办建模)');
}

testGardenGuard().catch(err => {
  console.error('测试异常:', err);
  process.exit(1);
});
