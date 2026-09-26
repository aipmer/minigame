import puppeteer from 'puppeteer';

const BASE_URL = process.env.TEST_URL || 'http://localhost:3456/games/snake3d/';

async function runTest() {
  console.log('🚀 启动 [吸铁石实测 + 移动顺畅度防吞键 + 减速雪天独占绑定] 自动化专项回归测试...\n');
  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });

    const errors = [];
    page.on('pageerror', err => errors.push(err.toString()));

    await page.goto(BASE_URL, { waitUntil: 'networkidle0', timeout: 15000 });
    console.log('✅ 游戏页面加载完毕');

    // 开始游戏
    await page.click('#start-btn');
    await new Promise(r => setTimeout(r, 600));

    // ──────────────────────────────────────────
    // 1. 验证移动顺畅度、步频与双指令转向预输入缓冲（防急转吞键）
    // ──────────────────────────────────────────
    console.log('\n--- 1. 验证移动顺畅度、步频 (0.138s) 与双指令转向缓冲 (防急转弯吞键) ---');
    const inputQueueResult = await page.evaluate(() => {
      const snake = window._snake;
      if (!snake) return { error: '未找到 snake 实例' };

      const baseInterval = snake.baseMoveInterval;

      // 强制蛇处于逻辑起点 (0, 0)，面向 -Z (ArrowUp)
      snake.direction.set(0, 0, -1);
      snake.nextDirection.set(0, 0, -1);
      snake.inputQueue = [];

      // 模拟玩家在极短时间内快速连续敲击两个正交直角转弯：先右 (ArrowRight) 再下 (ArrowDown)
      // 旧版会因为 ArrowDown 与当前前进中的 ArrowUp 相对（点积为 -1）而被直接当成掉头丢弃！
      snake.handleInput('ArrowRight');
      snake.handleInput('ArrowDown');

      const queueLenAfterTwoInputs = snake.inputQueue.length;
      const queueContents = snake.inputQueue.map(v => `(${v.x}, ${v.z})`);

      // 模拟第一次 step()：应消费 ArrowRight 并转向 (+1, 0)
      snake.step();
      const dirAfterStep1 = `(${snake.direction.x}, ${snake.direction.z})`;

      // 模拟第二次 step()：应消费 ArrowDown 并转向 (0, +1)
      snake.step();
      const dirAfterStep2 = `(${snake.direction.x}, ${snake.direction.z})`;

      return {
        baseInterval,
        queueLenAfterTwoInputs,
        queueContents,
        dirAfterStep1,
        dirAfterStep2,
        isAntiDropWorking: dirAfterStep1 === '(1, 0)' && dirAfterStep2 === '(0, 1)'
      };
    });

    console.log('输入缓冲防吞键测试结果:', inputQueueResult);
    if (!inputQueueResult.isAntiDropWorking) {
      throw new Error(`输入缓冲未防止急转弯吞键: ${JSON.stringify(inputQueueResult)}`);
    }
    if (inputQueueResult.baseInterval !== 0.138) {
      throw new Error(`常态步频未优化至 0.138s: 实际为 ${inputQueueResult.baseInterval}`);
    }
    console.log('✅ 步频优化 (0.138s) 与双指令转向预输入缓冲 (防吞键) 验证 100% 满分通过！');

    // ──────────────────────────────────────────
    // 2. 验证减速效果仅雪天出现（晴天、暴雨天绝对不减速且不掉落冰霜）
    // ──────────────────────────────────────────
    console.log('\n--- 2. 验证减速效果仅在雪天出现（晴天/雨天无减速无冰霜） ---');
    const weatherFrostResult = await page.evaluate(() => {
      const pManager = window._powerUpManager;
      const snake = window._snake;
      const wSystem = window._weatherSystem;
      if (!pManager || !snake || !wSystem) return { error: '缺少关键组件' };

      const report = {};

      // 2.1 晴天阶段验证
      wSystem.setWeather('sunny');
      pManager.updateWeatherBinding('sunny', snake);
      snake.setSnowResistance(false);

      const hasFrostInTypesClear = pManager.typesList.includes('frost');
      // 强行尝试拾取 frost
      pManager.collectPowerUp('frost', snake, null, null, null, null);
      const isFrostActiveInClear = pManager.isFrostActive();
      const isSnakeFrostInClear = snake.isFrost;
      const intervalInClear = snake.effectiveInterval;

      report.clear = {
        hasFrostInTypes: hasFrostInTypesClear,
        isFrostActive: isFrostActiveInClear,
        isSnakeFrost: isSnakeFrostInClear,
        effectiveInterval: intervalInClear
      };

      // 2.2 暴雨天阶段验证
      wSystem.setWeather('thunder');
      pManager.updateWeatherBinding('thunder', snake);
      snake.setSnowResistance(false);

      const hasFrostInTypesThunder = pManager.typesList.includes('frost');
      pManager.collectPowerUp('frost', snake, null, null, null, null);
      const isFrostActiveInThunder = pManager.isFrostActive();
      const isSnakeFrostInThunder = snake.isFrost;
      const intervalInThunder = snake.effectiveInterval;

      report.thunder = {
        hasFrostInTypes: hasFrostInTypesThunder,
        isFrostActive: isFrostActiveInThunder,
        isSnakeFrost: isSnakeFrostInThunder,
        effectiveInterval: intervalInThunder
      };

      // 2.3 梦幻雪境阶段验证
      wSystem.setWeather('snow');
      pManager.updateWeatherBinding('snow', snake);
      snake.setSnowResistance(true);

      const hasFrostInTypesSnow = pManager.typesList.includes('frost');
      const intervalBeforeFrostSnow = snake.effectiveInterval; // 带雪地阻力 (约 +18%)

      // 在雪天下拾取冰霜
      pManager.collectPowerUp('frost', snake, null, null, null, null);
      const isFrostActiveInSnow = pManager.isFrostActive();
      const isSnakeFrostInSnow = snake.isFrost;
      const intervalAfterFrostSnow = snake.effectiveInterval; // 冰霜 +45% 叠加雪地

      report.snow = {
        hasFrostInTypes: hasFrostInTypesSnow,
        intervalBeforeFrost: intervalBeforeFrostSnow,
        isFrostActive: isFrostActiveInSnow,
        isSnakeFrost: isSnakeFrostInSnow,
        intervalAfterFrost: intervalAfterFrostSnow
      };

      // 2.4 从雪天切换回晴天，正在生效的冰霜和地面积雪阻力必须立即被注销清空
      wSystem.setWeather('sunny');
      pManager.updateWeatherBinding('sunny', snake);
      snake.setSnowResistance(false);

      report.backToClear = {
        isFrostActive: pManager.isFrostActive(),
        isSnakeFrost: snake.isFrost,
        effectiveInterval: snake.effectiveInterval
      };

      return report;
    });

    console.log('天候与减速绑定测试结果:', JSON.stringify(weatherFrostResult, null, 2));

    // 校验晴天与暴雨天下绝无减速和冰霜道具
    if (weatherFrostResult.clear.hasFrostInTypes || weatherFrostResult.clear.isSnakeFrost || weatherFrostResult.clear.isFrostActive) {
      throw new Error(`晴天下存在冰霜或减速: ${JSON.stringify(weatherFrostResult.clear)}`);
    }
    if (weatherFrostResult.thunder.hasFrostInTypes || weatherFrostResult.thunder.isSnakeFrost || weatherFrostResult.thunder.isFrostActive) {
      throw new Error(`暴雨天下存在冰霜或减速: ${JSON.stringify(weatherFrostResult.thunder)}`);
    }
    // 校验雪天冰霜加入池中且减速生效
    if (!weatherFrostResult.snow.hasFrostInTypes || !weatherFrostResult.snow.isSnakeFrost || !weatherFrostResult.snow.isFrostActive) {
      throw new Error(`雪天下冰霜道具或减速未正常生效: ${JSON.stringify(weatherFrostResult.snow)}`);
    }
    // 校验雪天切回晴天后立即恢复
    if (weatherFrostResult.backToClear.isSnakeFrost || weatherFrostResult.backToClear.isFrostActive) {
      throw new Error(`切回晴天后冰霜减速未注销: ${JSON.stringify(weatherFrostResult.backToClear)}`);
    }
    console.log('✅ 减速效果仅雪天出现（晴天/雨天完全剔除）验证 100% 满分通过！');

    // ──────────────────────────────────────────
    // 3. 验证吸铁石实测发挥作用（向心磁吸飞向蛇嘴 + 嘴前 0.85 即时吞咽）
    // ──────────────────────────────────────────
    console.log('\n--- 3. 验证吸铁石发挥作用（向心引力位移 + 嘴前即时吞咽得分） ---');
    const magnetResult = await page.evaluate(() => {
      const pManager = window._powerUpManager;
      const snake = window._snake;
      const food = window._food;
      const gState = window._gameState;
      if (!pManager || !snake || !food || !gState) return { error: '缺少关键组件' };

      // 激活磁铁
      pManager.collectPowerUp('magnet', snake, null, null, null, null);
      const isMagnetActive = pManager.isMagnetActive();

      // 在蛇嘴 (0, 0.5, 0) 前方 5.0 格放置一颗测试果实
      snake.head.position.set(0, 0.5, 0);
      snake.logicalPos.set(0, 0.5, 0);

      const targetFood = food.foodList && food.foodList[0] ? food.foodList[0] : null;
      if (!targetFood || !targetFood.group) return { error: 'foodList 为空或无 group' };

      targetFood.group.position.set(0, 0.5, -5.0);
      targetFood.logicalPos.set(0, 0.5, -5.0);
      const initialDist = snake.head.position.distanceTo(targetFood.group.position);

      // 执行一次磁力吸引更新 (模拟 0.1s delta)
      pManager.applyMagnetAttraction(0.1, snake, food);
      const distAfterAttraction = snake.head.position.distanceTo(targetFood.group.position);
      const logicPosUpdated = targetFood.logicalPos.z > -5.0; // 逻辑坐标同步前移

      // 测试即时吞咽：将食物吸至距离蛇嘴 0.6 格处（< 0.85 临界值）
      targetFood.group.position.set(0, 0.5, -0.6);
      targetFood.logicalPos.set(0, 0.5, -0.6);

      const scoreBefore = gState.score;
      const lenBefore = snake.length;

      // 模拟碰撞与吞咽
      const ateMagnet = food.checkFoodCollision(snake.head.position, snake.getOccupiedPositions(), []);
      if (ateMagnet) {
        snake.grow(null, false);
        gState.addScore(10, false);
      }

      return {
        isMagnetActive,
        initialDist,
        distAfterAttraction,
        pulledCloser: distAfterAttraction < initialDist,
        logicPosUpdated,
        scoreBefore,
        scoreAfter: gState.score,
        lengthBefore: lenBefore,
        lengthAfter: snake.length,
        ateMagnet
      };
    });

    console.log('吸铁石磁吸测试结果:', magnetResult);
    if (!magnetResult.isMagnetActive) {
      throw new Error('磁铁道具未能成功激活');
    }
    if (!magnetResult.pulledCloser) {
      throw new Error(`磁铁引力未发挥作用: 初始距离 ${magnetResult.initialDist}, 吸引后距离 ${magnetResult.distAfterAttraction}`);
    }
    if (!magnetResult.ateMagnet || magnetResult.scoreAfter <= magnetResult.scoreBefore) {
      throw new Error(`即时吞咽得分未生效: 分数从 ${magnetResult.scoreBefore} 到 ${magnetResult.scoreAfter}`);
    }
    console.log('✅ 吸铁石向心吸引位移与即时吞咽得分验证 100% 满分通过！');

    // ──────────────────────────────────────────
    // 4. 四大铁律全面核查
    // ──────────────────────────────────────────
    console.log('\n--- 4. 执行四大铁律门禁复核 ---');
    const ironLawAudit = await page.evaluate(() => {
      const textNodes = [];
      const walk = (node) => {
        if (node.nodeType === Node.TEXT_NODE) {
          const t = node.nodeValue.trim();
          if (t.length > 0) textNodes.push(t);
        } else if (node.nodeType === Node.ELEMENT_NODE) {
          if (node.tagName === 'IMG' && node.alt) textNodes.push(node.alt);
          for (let child of node.childNodes) walk(child);
        }
      };
      walk(document.body);

      const englishWordRegex = /[a-zA-Z]{2,}/;
      const illegalEnglish = textNodes.filter(t => englishWordRegex.test(t));
      const emojiRegex = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u;
      const illegalEmoji = textNodes.filter(t => emojiRegex.test(t));

      const overflowElements = [];
      document.querySelectorAll('*').forEach(el => {
        const rect = el.getBoundingClientRect();
        if (rect.right > window.innerWidth + 2 && rect.width > 0) {
          overflowElements.push({ tag: el.tagName, className: el.className, right: rect.right });
        }
      });

      return {
        illegalEnglish,
        illegalEmoji,
        overflowElements
      };
    });

    console.log('四大铁律审查结果:', ironLawAudit);
    if (ironLawAudit.illegalEnglish.length > 0) {
      throw new Error(`发现违规英文: ${ironLawAudit.illegalEnglish.join(', ')}`);
    }
    if (ironLawAudit.illegalEmoji.length > 0) {
      throw new Error(`发现系统原生 Emoji: ${ironLawAudit.illegalEmoji.join(', ')}`);
    }
    if (ironLawAudit.overflowElements.length > 0) {
      throw new Error(`发现 UI 溢出: ${JSON.stringify(ironLawAudit.overflowElements)}`);
    }
    console.log('✅ 四大铁律 100% 满分零违规通过！');

    if (errors.length > 0) {
      throw new Error(`页面存在未捕获的错误: ${errors.join('; ')}`);
    }

    console.log('\n🎉 [吸铁石实测 + 移动顺畅度防吞键 + 减速雪天独占绑定] 所有测试 100% 满分通过！');
    await browser.close();
  } catch (err) {
    console.error('❌ 测试失败:', err);
    await browser.close();
    process.exit(1);
  }
}

runTest();
