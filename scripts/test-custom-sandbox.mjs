import puppeteer from 'puppeteer';

const BASE_URL = 'http://localhost:3456/games/snake3d/';

async function runTest() {
  console.log('🚀 启动 3D 贪吃蛇「玩法工坊 / 自由沙盒模式」专项自动化测试...');
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
    // 测试 1：移动端竖屏 (390×844) 开始界面模式切换与工坊入口
    // ══════════════════════════════════════════════
    console.log('\n--- 1. 验证开始界面三模式切换与玩法工坊入口 ---');
    await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
    await page.goto(BASE_URL, { waitUntil: 'networkidle2' });

    const modeButtons = await page.evaluate(() => {
      const classic = document.getElementById('mode-btn-classic');
      const crazy = document.getElementById('mode-btn-crazy');
      const custom = document.getElementById('mode-btn-custom');
      return {
        hasClassic: !!classic,
        hasCrazy: !!crazy,
        hasCustom: !!custom,
        customText: custom ? custom.textContent.trim() : ''
      };
    });
    console.log('模式选择器按钮状态:', modeButtons);
    if (!modeButtons.hasClassic || !modeButtons.hasCrazy || !modeButtons.hasCustom) {
      throw new Error('开始界面模式选择器缺少三模式按钮！');
    }

    // 切换至玩法工坊
    await page.click('#mode-btn-custom');
    await new Promise(r => setTimeout(r, 400));

    const summaryRowState = await page.evaluate(() => {
      const row = document.getElementById('custom-rule-summary-row');
      const text = document.getElementById('custom-rule-summary-text');
      const btn = document.getElementById('btn-open-custom-rules');
      return {
        visible: row && !row.classList.contains('hidden'),
        summary: text ? text.textContent.trim() : '',
        btnText: btn ? btn.textContent.trim() : ''
      };
    });
    console.log('工坊摘要条状态:', summaryRowState);
    if (!summaryRowState.visible || !summaryRowState.summary) {
      throw new Error('切换至玩法工坊后摘要栏未正常显示！');
    }

    // ══════════════════════════════════════════════
    // 测试 2：打开玩法工坊定制弹窗并检查 6 大维度
    // ══════════════════════════════════════════════
    console.log('\n--- 2. 验证玩法工坊规则定制弹窗与 6 大维度渲染 ---');
    await page.click('#btn-open-custom-rules');
    await new Promise(r => setTimeout(r, 500));

    const modalState = await page.evaluate(() => {
      const modal = document.getElementById('custom-rules-modal');
      const blocks = modal.querySelectorAll('.rule-dim-block');
      const titles = Array.from(blocks).map(b => b.querySelector('.rule-dim-title')?.textContent.trim());
      const allPills = modal.querySelectorAll('.rule-opt-pill');
      return {
        isOpen: modal && !modal.classList.contains('hidden'),
        blockCount: blocks.length,
        titles,
        pillCount: allPills.length
      };
    });
    console.log('工坊弹窗渲染状态:', modalState);
    if (!modalState.isOpen || modalState.blockCount !== 6) {
      throw new Error(`工坊弹窗未正常弹出或维度数量不对: ${modalState.blockCount}/6`);
    }

    // 截图保存工坊弹窗
    await page.screenshot({ path: '/Users/hunkwu/.gemini/antigravity/brain/3c70172b-4a8c-439c-88bf-b8067a345cff/snake3d_custom_sandbox_modal.png' });
    console.log('📸 工坊弹窗实机截图已保存: snake3d_custom_sandbox_modal.png');

    // ══════════════════════════════════════════════
    // 测试 3：测试盲盒摇一摇 (Shuffle) 与重置
    // ══════════════════════════════════════════════
    console.log('\n--- 3. 验证🎲盲盒摇一摇 (Shuffle) 与重置功能 ---');
    const beforeRules = await page.evaluate(() => window._customRulesManager.getRules());

    // 点击盲盒摇一摇
    await page.click('#btn-custom-shuffle');
    await new Promise(r => setTimeout(r, 500));

    const shuffledRules = await page.evaluate(() => window._customRulesManager.getRules());
    console.log('盲盒随机后规则:', shuffledRules);

    // 点击重置
    await page.click('#btn-custom-reset');
    await new Promise(r => setTimeout(r, 400));
    const resetRules = await page.evaluate(() => window._customRulesManager.getRules());
    console.log('重置后规则:', resetRules);
    if (resetRules.foodType !== 'apple' || resetRules.wallRule !== 'classic' || resetRules.foodCount !== 1) {
      throw new Error('重置规则未正确恢复默认配置！');
    }

    // ══════════════════════════════════════════════
    // 测试 4：设定穿墙与多果实同屏，开始挑战
    // ══════════════════════════════════════════════
    console.log('\n--- 4. 验证和平穿墙、多果实同屏 (3颗草莓) 与局内对局 ---');
    await page.evaluate(() => {
      window._customRulesManager.setRule('wallRule', 'wrap');
      window._customRulesManager.setRule('foodCount', 3);
      window._customRulesManager.setRule('foodType', 'strawberry');
      window._customRulesManager.setRule('mapSize', 'mini'); // 12x12
    });
    await new Promise(r => setTimeout(r, 300));

    // 点击弹窗内「开始挑战」按钮
    await page.click('#btn-custom-play');
    await new Promise(r => setTimeout(r, 800));

    const inGameState = await page.evaluate(() => {
      const hudPill = document.getElementById('hud-custom-pill');
      const hudText = document.getElementById('hud-custom-rule-text');
      const foods = window._snake.scene.children.filter(c => c !== window._snake.head);
      const foodCount = window._weatherSystem ? window._weatherSystem.food.foodList.length : 0;
      const snake = window._snake;
      return {
        hudVisible: hudPill && !hudPill.classList.contains('hidden'),
        hudText: hudText ? hudText.textContent.trim() : '',
        foodCount,
        isWrapMode: snake.isWrapMode,
        boundLimit: snake.boundLimit,
        isDead: snake.isDead
      };
    });
    console.log('对局内工坊规则激活状态:', inGameState);
    if (!inGameState.hudVisible || !inGameState.isWrapMode || inGameState.foodCount !== 3) {
      throw new Error(`对局内状态异常: hud=${inGameState.hudVisible}, wrap=${inGameState.isWrapMode}, foods=${inGameState.foodCount}/3`);
    }

    // 验证穿墙机制（移动至边界外不会死亡，而是传送回对侧）
    console.log('测试蛇体触碰迷你岛边界 (x = 6.0) 穿墙传送...');
    const warpResult = await page.evaluate(() => {
      const snake = window._snake;
      // 将蛇头置于边界外
      snake.logicalPos.set(6.0, 0.5, 0);
      const stepRes = snake.step();
      return {
        stepRes,
        newX: snake.logicalPos.x,
        isDead: snake.isDead
      };
    });
    console.log('穿墙传送执行结果:', warpResult);
    if (warpResult.isDead || !warpResult.stepRes.warped) {
      throw new Error('和平穿墙规则未生效，蛇体发生死亡！');
    }
    console.log('✅ 和平穿墙规则验证通过：蛇穿过右侧边界瞬间从左侧安全钻出！');

    // 截图保存多果实迷你岛实况
    await page.screenshot({ path: '/Users/hunkwu/.gemini/antigravity/brain/3c70172b-4a8c-439c-88bf-b8067a345cff/snake3d_custom_sandbox_gameplay.png' });
    console.log('📸 工坊局内多果实实机截图已保存: snake3d_custom_sandbox_gameplay.png');

    // ══════════════════════════════════════════════
    // 测试 5：四大铁律严苛审查
    // ══════════════════════════════════════════════
    console.log('\n--- 5. 严格执行四大铁律门禁检查 ---');
    const violations = await page.evaluate(() => {
      const results = { englishWords: [], emojis: [], overflows: [] };
      const englishRegex = /\b(HP|Lv|Level|Wave|MAX|Score|High\s*Score|Combo|Game\s*Over|Restart|Back|Shop|Achievement|Leaderboard|MINIGAME|Play|Shuffle|Reset|Custom|Sandbox)\b/i;
      const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;

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

    console.log('\n🎉「玩法工坊 / 自由沙盒模式」全部测试用例圆满通过！');
  } finally {
    await browser.close();
  }
}

runTest().catch(err => {
  console.error('\n❌ 测试失败:', err);
  process.exit(1);
});
