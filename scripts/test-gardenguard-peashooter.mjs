import puppeteer from 'puppeteer';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const brainDir = '/Users/hunkwu/.gemini/antigravity/brain/b1313bdd-d984-40ca-95d8-46e44194790b';

async function run() {
  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720 });

  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('Browser error:', msg.text());
    }
  });

  await page.goto('http://localhost:3456/games/gardenguard/', { waitUntil: 'networkidle0' });

  // 点击开始守卫
  await page.click('#btn-start');
  await new Promise(r => setTimeout(r, 800));

  // 点击工具箱展开
  await page.click('#debug-toggle');
  await new Promise(r => setTimeout(r, 300));

  // 连续召唤 4 星豌豆射手
  await page.click('#btn-cheat-star4');
  await page.click('#btn-cheat-seeds');
  await new Promise(r => setTimeout(r, 2500)); // 充分等待 GLB 加载与归一化渲染

  const screenshotPath = path.join(brainDir, 'gardenguard_3d_peashooter_in_game.png');
  await page.screenshot({ path: screenshotPath });
  console.log('[Test] 3D 豌豆射手在局内真实模型渲染截图已保存至:', screenshotPath);

  await browser.close();
}

run();
