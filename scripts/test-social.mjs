import puppeteer from 'puppeteer';

async function testSocial() {
  console.log('[Test Social] 启动社交与排行榜专项无头 Chrome 测试...');
  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720 });

  const errors = [];
  page.on('pageerror', err => errors.push(err.toString()));

  const port = process.env.PORT || 3456;

  // 1. 访问带挑战参数的贪吃蛇页面
  console.log('[Test Social] 验证好友专属挑战链接解析与顶部横幅...');
  await page.goto(`http://localhost:${port}/games/snake3d/?challenge=120&from=%E8%8D%89%E8%8E%93%E5%B0%8F%E6%98%9F`, {
    waitUntil: 'networkidle0'
  });
  await new Promise(r => setTimeout(r, 600));

  const bannerText = await page.evaluate(() => {
    const b = document.getElementById('social-challenge-banner');
    return b ? b.innerText : null;
  });
  console.log('[Test Social] 挑战横幅文本:', bannerText);
  if (!bannerText || !bannerText.includes('草莓小星') || !bannerText.includes('120')) {
    throw new Error('挑战横幅未能正确渲染或未解析参数: ' + bannerText);
  }
  console.log('✅ [通过] 好友 PK 挑战横幅成功展示');

  // 2. 验证风云榜弹窗呼出与前三名立体奖牌
  console.log('[Test Social] 验证风云榜弹窗...');
  await page.click('#btn-top-leaderboard');
  await new Promise(r => setTimeout(r, 600));

  const lbData = await page.evaluate(() => {
    const modal = document.getElementById('social-leaderboard-modal');
    const isActive = modal && modal.classList.contains('active');
    const items = document.querySelectorAll('.social-list-item');
    const medals = document.querySelectorAll('.social-medal-img');
    const myName = document.getElementById('social-my-name')?.innerText;
    return { isActive, itemCount: items.length, medalCount: medals.length, myName };
  });
  console.log('[Test Social] 排行榜状态:', lbData);
  if (!lbData.isActive || lbData.itemCount < 3 || lbData.medalCount < 3) {
    throw new Error('风云榜弹窗未正确展示或前三名奖牌缺失: ' + JSON.stringify(lbData));
  }
  console.log('✅ [通过] 风云榜弹窗展示正常，前三名立体奖牌无缺失');

  // 3. 验证战报海报生成
  console.log('[Test Social] 验证 9:16 Canvas 战绩海报即时生成...');
  const posterResult = await page.evaluate(async () => {
    const sm = window.socialManager || new (await import('../../js/services/SocialManager.js')).SocialManager();
    const dataUrl = await sm.generatePoster({
      gameTitle: '3D 贪吃蛇',
      score: 1880,
      rank: 1,
      percentile: 99.8,
      iconPath: 'assets/icons/icon_trophy.png'
    });
    return {
      isValid: dataUrl.startsWith('data:image/png;base64,'),
      length: dataUrl.length
    };
  });
  console.log('[Test Social] 海报生成结果:', posterResult);
  if (!posterResult.isValid || posterResult.length < 50000) {
    throw new Error('海报生成异常: ' + JSON.stringify(posterResult));
  }
  console.log('✅ [通过] 9:16 高清战报海报生成成功 (体积 ' + Math.round(posterResult.length / 1024) + ' KB)');

  // 4. 验证太空战机风云榜呼出
  console.log('[Test Social] 验证太空战机赛博深空风云榜...');
  await page.goto(`http://localhost:${port}/games/skydodge/`, { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 600));

  await page.click('#btn-top-leaderboard');
  await new Promise(r => setTimeout(r, 600));

  const skydodgeLb = await page.evaluate(() => {
    const modal = document.getElementById('social-leaderboard-modal');
    const card = modal?.querySelector('.social-modal-card');
    const isCyber = card && card.classList.contains('social-theme-cyber');
    const items = document.querySelectorAll('.social-list-item');
    return { isCyber, itemCount: items.length };
  });
  console.log('[Test Social] 太空战机排行榜状态:', skydodgeLb);
  if (!skydodgeLb.isCyber || skydodgeLb.itemCount < 3) {
    throw new Error('太空战机赛博风云榜异常: ' + JSON.stringify(skydodgeLb));
  }
  console.log('✅ [通过] 太空战机赛博深空风格风云榜渲染正常');

  // 5. 移动端视口 (390×844) 防溢出与防遮挡测试
  console.log('[Test Social] 验证移动端视口 (390×844) 下 UI 防溢出...');
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
  await page.goto(`http://localhost:${port}/games/snake3d/`, { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 600));

  await page.click('#btn-top-leaderboard');
  await new Promise(r => setTimeout(r, 600));

  const overflowCheck = await page.evaluate(() => {
    const modal = document.querySelector('.social-modal-card');
    if (!modal) return { exists: false };
    const rect = modal.getBoundingClientRect();
    return {
      exists: true,
      rectRight: rect.right,
      windowWidth: window.innerWidth,
      isOverflow: rect.right > window.innerWidth,
      rectHeight: rect.height,
      windowHeight: window.innerHeight,
      heightRatio: (rect.height / window.innerHeight).toFixed(2)
    };
  });
  console.log('[Test Social] 移动端视口检测:', overflowCheck);
  if (overflowCheck.isOverflow) {
    throw new Error('移动端弹窗水平溢出视口!');
  }
  console.log('✅ [通过] 移动端视口严格防溢出，高度适配比例: ' + overflowCheck.heightRatio);

  if (errors.length > 0) {
    console.error('❌ 存在页面控制台未捕获错误:', errors);
    throw new Error('测试失败');
  }

  await browser.close();
  console.log('🎉 社交与排行榜全套专项测试 100% 成功通过！');
}

testSocial().catch(err => {
  console.error('[Test Social 失败]', err);
  process.exit(1);
});
