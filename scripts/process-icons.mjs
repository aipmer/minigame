import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// 映射生成的原始图片到目标图标名
const generatedImages = [
  { src: '/Users/hunkwu/.gemini/antigravity/brain/3c70172b-4a8c-439c-88bf-b8067a345cff/icon_refresh_1789903941609.jpg', name: 'icon_refresh.png' },
  { src: '/Users/hunkwu/.gemini/antigravity/brain/3c70172b-4a8c-439c-88bf-b8067a345cff/icon_home_1789903976371.jpg', name: 'icon_home.png' },
  { src: '/Users/hunkwu/.gemini/antigravity/brain/3c70172b-4a8c-439c-88bf-b8067a345cff/icon_collision_1789903991139.jpg', name: 'icon_collision.png' },
  { src: '/Users/hunkwu/.gemini/antigravity/brain/3c70172b-4a8c-439c-88bf-b8067a345cff/icon_rocket_1789904106675.jpg', name: 'icon_rocket.png' },
  { src: '/Users/hunkwu/.gemini/antigravity/brain/3c70172b-4a8c-439c-88bf-b8067a345cff/icon_gamepad_1789904122536.jpg', name: 'icon_gamepad.png' },
  { src: '/Users/hunkwu/.gemini/antigravity/brain/3c70172b-4a8c-439c-88bf-b8067a345cff/icon_fire_1789904136869.jpg', name: 'icon_fire.png' },
  { src: '/Users/hunkwu/.gemini/antigravity/brain/3c70172b-4a8c-439c-88bf-b8067a345cff/icon_boost_1789904153278.jpg', name: 'icon_boost.png' },
  { src: '/Users/hunkwu/.gemini/antigravity/brain/3c70172b-4a8c-439c-88bf-b8067a345cff/icon_crystal_1789904170371.jpg', name: 'icon_crystal.png' },
  { src: '/Users/hunkwu/.gemini/antigravity/brain/3c70172b-4a8c-439c-88bf-b8067a345cff/icon_snake_1789904186220.jpg', name: 'icon_snake.png' },
  { src: '/Users/hunkwu/.gemini/antigravity/brain/3c70172b-4a8c-439c-88bf-b8067a345cff/icon_target_1789904351607.jpg', name: 'icon_target.png' },
];

const targetDirs = [
  path.join(rootDir, 'assets', 'icons'),
  path.join(rootDir, 'games', 'snake3d', 'assets', 'icons'),
  path.join(rootDir, 'games', 'skydodge', 'assets', 'icons'),
];

// 确保目标目录存在
for (const dir of targetDirs) {
  fs.mkdirSync(dir, { recursive: true });
}

async function run() {
  console.log('[Process] 启动 Headless Chrome 抠图处理器...');
  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();

  for (const item of generatedImages) {
    if (!fs.existsSync(item.src)) {
      console.warn(`[Skip] 文件不存在: ${item.src}`);
      continue;
    }
    console.log(`[Process] 处理图标: ${item.name}...`);
    
    // 读取图片为 base64
    const imgData = fs.readFileSync(item.src);
    const base64 = `data:image/jpeg;base64,${imgData.toString('base64')}`;

    // 在页面中渲染并泛洪去白底
    const pngBase64 = await page.evaluate(async (dataUrl) => {
      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
          const width = img.width;
          const height = img.height;
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0);

          const imgData = ctx.getImageData(0, 0, width, height);
          const data = imgData.data;

          // 泛洪填充 (Flood Fill from 4 borders)
          const visited = new Uint8Array(width * height);
          const queue = [];

          function isBg(idx) {
            const r = data[idx];
            const g = data[idx + 1];
            const b = data[idx + 2];
            // 白色或非常接近白色的浅浅灰底/浅阴影
            const max = Math.max(r, g, b);
            const min = Math.min(r, g, b);
            const diff = max - min;
            return min > 225 && diff < 20; // 亮度极高且色彩差异小 (近乎纯白)
          }

          // 将四周边缘的背景像素入队
          for (let x = 0; x < width; x++) {
            const topIdx = (0 * width + x) * 4;
            const bottomIdx = ((height - 1) * width + x) * 4;
            if (isBg(topIdx)) {
              queue.push(x, 0);
              visited[0 * width + x] = 1;
            }
            if (isBg(bottomIdx)) {
              queue.push(x, height - 1);
              visited[(height - 1) * width + x] = 1;
            }
          }
          for (let y = 0; y < height; y++) {
            const leftIdx = (y * width + 0) * 4;
            const rightIdx = (y * width + (width - 1)) * 4;
            if (isBg(leftIdx) && !visited[y * width + 0]) {
              queue.push(0, y);
              visited[y * width + 0] = 1;
            }
            if (isBg(rightIdx) && !visited[y * width + (width - 1)]) {
              queue.push(width - 1, y);
              visited[y * width + (width - 1)] = 1;
            }
          }

          // BFS 扩散
          let head = 0;
          while (head < queue.length) {
            const cx = queue[head++];
            const cy = queue[head++];

            const neighbors = [
              [cx + 1, cy],
              [cx - 1, cy],
              [cx, cy + 1],
              [cx, cy - 1]
            ];

            for (const [nx, ny] of neighbors) {
              if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                const nPixelIdx = ny * width + nx;
                if (!visited[nPixelIdx]) {
                  const nDataIdx = nPixelIdx * 4;
                  if (isBg(nDataIdx)) {
                    visited[nPixelIdx] = 1;
                    queue.push(nx, ny);
                  }
                }
              }
            }
          }

          // 根据 visited 数组将连通背景清空为透明，并进行柔和边缘羽化
          for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
              const pixelIdx = y * width + x;
              const dataIdx = pixelIdx * 4;
              if (visited[pixelIdx]) {
                data[dataIdx + 3] = 0; // 完全透明
              } else {
                // 检查周围是否紧邻背景，若是则按亮度进行微羽化
                let nearBg = false;
                if (x > 0 && visited[pixelIdx - 1]) nearBg = true;
                else if (x < width - 1 && visited[pixelIdx + 1]) nearBg = true;
                else if (y > 0 && visited[pixelIdx - width]) nearBg = true;
                else if (y < height - 1 && visited[pixelIdx + width]) nearBg = true;

                if (nearBg) {
                  const r = data[dataIdx];
                  const g = data[dataIdx + 1];
                  const b = data[dataIdx + 2];
                  const luma = 0.299 * r + 0.587 * g + 0.114 * b;
                  if (luma > 220) {
                    const factor = Math.max(0, Math.min(1, (255 - luma) / 35));
                    data[dataIdx + 3] = Math.round(data[dataIdx + 3] * factor);
                  }
                }
              }
            }
          }

          ctx.putImageData(imgData, 0, 0);
          resolve(canvas.toDataURL('image/png'));
        };
        img.src = dataUrl;
      });
    }, base64);

    // 将生成的透明 PNG 保存到所有目标目录
    const buffer = Buffer.from(pngBase64.replace(/^data:image\/png;base64,/, ''), 'base64');
    for (const dir of targetDirs) {
      const outPath = path.join(dir, item.name);
      fs.writeFileSync(outPath, buffer);
    }
    console.log(`[Success] 图标已保存: ${item.name}`);
  }

  await browser.close();
  console.log('[Done] 全部 3D 图标生成与透明处理完毕！');
}

run().catch(console.error);
