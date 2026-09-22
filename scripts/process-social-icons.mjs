import fs from 'fs';
import path from 'path';
import puppeteer from 'puppeteer';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const items = [
  {
    name: 'icon_trophy.png',
    src: '/Users/hunkwu/.gemini/antigravity/brain/3c70172b-4a8c-439c-88bf-b8067a345cff/icon_trophy_1790044356880.jpg'
  },
  {
    name: 'icon_share.png',
    src: '/Users/hunkwu/.gemini/antigravity/brain/3c70172b-4a8c-439c-88bf-b8067a345cff/icon_share_1790044425666.jpg'
  },
  {
    name: 'icon_medal_1.png',
    src: '/Users/hunkwu/.gemini/antigravity/brain/3c70172b-4a8c-439c-88bf-b8067a345cff/icon_gold_medal_1790044570683.jpg'
  },
  {
    name: 'icon_medal_2.png',
    src: '/Users/hunkwu/.gemini/antigravity/brain/3c70172b-4a8c-439c-88bf-b8067a345cff/icon_silver_medal_1790044599894.jpg'
  },
  {
    name: 'icon_medal_3.png',
    src: '/Users/hunkwu/.gemini/antigravity/brain/3c70172b-4a8c-439c-88bf-b8067a345cff/icon_bronze_medal_1790044613850.jpg'
  }
];

const targetDirs = [
  path.join(rootDir, 'assets/icons'),
  path.join(rootDir, 'games/snake3d/assets/icons'),
  path.join(rootDir, 'games/skydodge/assets/icons'),
  path.join(rootDir, 'games/gardenguard/assets/icons')
];

async function main() {
  console.log('Starting Puppeteer for icon transparent processing...');
  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: 'new',
    args: ['--no-sandbox']
  });

  const page = await browser.newPage();

  for (const item of items) {
    if (!fs.existsSync(item.src)) {
      console.error('Source not found:', item.src);
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

          // Flood-fill / corner color check or pure white detection
          for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i+1];
            const b = data[i+2];

            const brightness = (r + g + b) / 3;
            // 纯白与近白色去底
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
      console.log(`Saved: ${destPath}`);
    }
  }

  await browser.close();
  console.log('Done processing all social icons!');
}

main().catch(console.error);
