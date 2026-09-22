import fs from 'fs';
import path from 'path';
import puppeteer from 'puppeteer';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const itemsToProcess = [
  {
    name: 'icon_magnet.png',
    src: '/Users/hunkwu/.gemini/antigravity/brain/3c70172b-4a8c-439c-88bf-b8067a345cff/icon_magnet_clean_1790047201015.jpg'
  },
  {
    name: 'icon_ghost.png',
    src: '/Users/hunkwu/.gemini/antigravity/brain/3c70172b-4a8c-439c-88bf-b8067a345cff/icon_ghost_1790047214714.jpg'
  }
];

const targetDirs = [
  path.join(rootDir, 'assets/icons'),
  path.join(rootDir, 'games/snake3d/assets/icons'),
  path.join(rootDir, 'games/skydodge/assets/icons'),
  path.join(rootDir, 'games/gardenguard/assets/icons')
];

async function main() {
  console.log('启动浏览器执行道具图标透明去白底处理...');
  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: 'new',
    args: ['--no-sandbox']
  });

  const page = await browser.newPage();

  for (const item of itemsToProcess) {
    if (!fs.existsSync(item.src)) {
      console.error('未找到源文件:', item.src);
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
            // 纯白与近白色去底 (保留边缘轻微平滑羽化)
            if (brightness > 246 && Math.abs(r - g) < 10 && Math.abs(g - b) < 10) {
              data[i + 3] = 0;
            } else if (brightness > 232 && Math.abs(r - g) < 14 && Math.abs(g - b) < 14) {
              const alpha = Math.max(0, Math.min(255, (246 - brightness) / 14 * 255));
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

  // 同步已有的 icon_frost.png 和 icon_bomb.png
  const copyItems = ['icon_frost.png', 'icon_bomb.png'];
  const srcDir = path.join(rootDir, 'games/gardenguard/assets/icons');
  for (const iconName of copyItems) {
    const srcFile = path.join(srcDir, iconName);
    if (fs.existsSync(srcFile)) {
      const buf = fs.readFileSync(srcFile);
      for (const dir of targetDirs) {
        const destFile = path.join(dir, iconName);
        fs.writeFileSync(destFile, buf);
        console.log(`同步已有图标: ${destFile}`);
      }
    }
  }

  await browser.close();
  console.log('所有四大核心道具透明 3D 图标同步处理完毕！');
}

main().catch(console.error);
