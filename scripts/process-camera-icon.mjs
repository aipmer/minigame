import fs from 'fs';
import path from 'path';
import puppeteer from 'puppeteer';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const itemsToProcess = [
  {
    name: 'icon_camera.png',
    src: '/Users/hunkwu/.gemini/antigravity/brain/3c70172b-4a8c-439c-88bf-b8067a345cff/icon_camera_1790078080183.jpg'
  }
];

const targetDirs = [
  path.join(rootDir, 'assets/icons'),
  path.join(rootDir, 'games/snake3d/assets/icons')
];

async function main() {
  console.log('处理 3D 摄像机图标...');
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

          const w = size;
          const h = size;
          const visited = new Uint8Array(w * h);
          const queue = [];

          function isBg(idx) {
            const r = data[idx * 4];
            const g = data[idx * 4 + 1];
            const b = data[idx * 4 + 2];
            return r > 240 && g > 240 && b > 240;
          }

          // 注入四周边界上的背景点
          for (let x = 0; x < w; x++) {
            const topIdx = x;
            const bottomIdx = (h - 1) * w + x;
            if (isBg(topIdx)) { visited[topIdx] = 1; queue.push(topIdx); }
            if (isBg(bottomIdx)) { visited[bottomIdx] = 1; queue.push(bottomIdx); }
          }
          for (let y = 0; y < h; y++) {
            const leftIdx = y * w;
            const rightIdx = y * w + (w - 1);
            if (isBg(leftIdx) && !visited[leftIdx]) { visited[leftIdx] = 1; queue.push(leftIdx); }
            if (isBg(rightIdx) && !visited[rightIdx]) { visited[rightIdx] = 1; queue.push(rightIdx); }
          }

          // BFS 扩散
          let head = 0;
          while (head < queue.length) {
            const curr = queue[head++];
            const cx = curr % w;
            const cy = Math.floor(curr / w);

            const neighbors = [
              cx > 0 ? curr - 1 : -1,
              cx < w - 1 ? curr + 1 : -1,
              cy > 0 ? curr - w : -1,
              cy < h - 1 ? curr + w : -1
            ];

            for (const n of neighbors) {
              if (n !== -1 && !visited[n] && isBg(n)) {
                visited[n] = 1;
                queue.push(n);
              }
            }
          }

          // 将连通到外圈的纯白背景像素设为透明
          for (let i = 0; i < visited.length; i++) {
            if (visited[i]) {
              const r = data[i * 4];
              const g = data[i * 4 + 1];
              const b = data[i * 4 + 2];
              if (r > 248 && g > 248 && b > 248) {
                data[i * 4 + 3] = 0;
              } else {
                const diff = Math.min(r, g, b) - 240;
                data[i * 4 + 3] = Math.max(0, Math.round(data[i * 4 + 3] * (1 - diff / 10)));
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
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      const dest = path.join(dir, item.name);
      fs.writeFileSync(dest, buffer);
      console.log('写入透明图标:', dest);
    }
  }

  await browser.close();
  console.log('3D 相机图标去底完成!');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
