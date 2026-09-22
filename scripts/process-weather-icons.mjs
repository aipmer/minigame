import fs from 'fs';
import path from 'path';
import puppeteer from 'puppeteer';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const itemsToProcess = [
  {
    name: 'icon_weather_sun.png',
    src: '/Users/hunkwu/.gemini/antigravity/brain/3c70172b-4a8c-439c-88bf-b8067a345cff/weather_sun_1790056797881.jpg'
  },
  {
    name: 'icon_weather_thunder.png',
    src: '/Users/hunkwu/.gemini/antigravity/brain/3c70172b-4a8c-439c-88bf-b8067a345cff/weather_thunder_1790056971803.jpg'
  }
];

const targetDirs = [
  path.join(rootDir, 'assets/icons'),
  path.join(rootDir, 'games/snake3d/assets/icons'),
  path.join(rootDir, 'games/skydodge/assets/icons'),
  path.join(rootDir, 'games/gardenguard/assets/icons')
];

async function main() {
  console.log('启动浏览器执行天气图标透明去白底处理...');
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

          // 智能去除纯白背景以及周围接近白色的边缘防锯齿过渡
          for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            // 纯白或接近纯白
            if (r > 242 && g > 242 && b > 242) {
              const diff = Math.min(r, g, b) - 242;
              const alphaRatio = Math.max(0, 1 - diff / 13);
              data[i + 3] = Math.round(data[i + 3] * alphaRatio * 0.2);
              if (r > 250 && g > 250 && b > 250) {
                data[i + 3] = 0;
              }
            }
          }

          ctx.putImageData(imgData, 0, 0);
          resolve(cvs.toDataURL('image/png').replace(/^data:image\/png;base64,/, ''));
        };
        img.src = uri;
      });
    }, dataUri);

    const buffer = Buffer.from(pngBase64, 'base64');

    for (const dir of targetDirs) {
      if (fs.existsSync(dir)) {
        const targetPath = path.join(dir, item.name);
        fs.writeFileSync(targetPath, buffer);
        console.log(`成功写入: ${targetPath}`);
      }
    }
  }

  // 复制 icon_frost.png 作为 icon_weather_snow.png
  for (const dir of targetDirs) {
    if (fs.existsSync(dir)) {
      const frostPath = path.join(dir, 'icon_frost.png');
      const snowPath = path.join(dir, 'icon_weather_snow.png');
      if (fs.existsSync(frostPath)) {
        fs.copyFileSync(frostPath, snowPath);
        console.log(`成功复制雪天图标: ${snowPath}`);
      }
    }
  }

  await browser.close();
  console.log('所有天气图标处理完毕！');
}

main().catch(err => {
  console.error('处理失败:', err);
  process.exit(1);
});
