import fs from 'fs';
import path from 'path';
import puppeteer from 'puppeteer';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const itemsToProcess = [
  {
    name: 'icon_wardrobe.png',
    src: '/Users/hunkwu/.gemini/antigravity/brain/3c70172b-4a8c-439c-88bf-b8067a345cff/icon_wardrobe_1790048866364.jpg'
  },
  {
    name: 'icon_crown.png',
    src: '/Users/hunkwu/.gemini/antigravity/brain/3c70172b-4a8c-439c-88bf-b8067a345cff/icon_crown_1790048959570.jpg'
  }
];

const targetDirs = [
  path.join(rootDir, 'assets/icons'),
  path.join(rootDir, 'games/snake3d/assets/icons'),
  path.join(rootDir, 'games/skydodge/assets/icons'),
  path.join(rootDir, 'games/gardenguard/assets/icons')
];

async function main() {
  console.log('启动浏览器处理商城与成就 3D 图标透明化去底...');
  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: 'new',
    args: ['--no-sandbox']
  });

  const page = await browser.newPage();

  for (const item of itemsToProcess) {
    if (!fs.existsSync(item.src)) {
      console.error('未找到源图像:', item.src);
      continue;
    }
    const b64 = fs.readFileSync(item.src).toString('base64');
    const dataUri = `data:image/jpeg;base64,${b64}`;

    const pngBase64 = await page.evaluate(async (uri) => {
      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
          const cvs = document.createElement('canvas');
          const size = 256;
          cvs.width = size;
          cvs.height = size;
          const ctx = cvs.getContext('2d');
          ctx.drawImage(img, 0, 0, size, size);

          const imgData = ctx.getImageData(0, 0, cvs.width, cvs.height);
          const data = imgData.data;

          for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i+1];
            const b = data[i+2];

            const brightness = (r + g + b) / 3;
            // 纯白与近白色去底 (保留平滑微羽化)
            if (brightness > 246 && Math.abs(r - g) < 10 && Math.abs(g - b) < 10) {
              data[i + 3] = 0;
            } else if (brightness > 230 && Math.abs(r - g) < 15 && Math.abs(g - b) < 15) {
              const alpha = Math.max(0, Math.min(255, (246 - brightness) / 16 * 255));
              data[i + 3] = Math.min(data[i + 3], alpha);
            }
          }

          ctx.putImageData(imgData, 0, 0);
          resolve(cvs.toDataURL('image/png').split(',')[1]);
        };
        img.src = uri;
      });
    }, dataUri);

    const buffer = Buffer.from(pngBase64, 'base64');
    for (const dir of targetDirs) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      const destPath = path.join(dir, item.name);
      fs.writeFileSync(destPath, buffer);
      console.log(`已成功保存透明图标: ${destPath}`);
    }
  }

  // 同步已有的 icon_coin.png
  const srcCoin = path.join(rootDir, 'games/gardenguard/assets/icons/icon_coin.png');
  if (fs.existsSync(srcCoin)) {
    const buf = fs.readFileSync(srcCoin);
    for (const dir of targetDirs) {
      const destFile = path.join(dir, 'icon_coin.png');
      fs.writeFileSync(destFile, buf);
      console.log(`同步金币图标: ${destFile}`);
    }
  }

  await browser.close();
  console.log('商城与成就 3D 图标库全部准备就绪！');
}

main().catch(console.error);
