import fs from 'fs';
import path from 'path';
import puppeteer from 'puppeteer';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const iconMappings = [
  { 
    src: '/Users/hunkwu/.gemini/antigravity/brain/b1313bdd-d984-40ca-95d8-46e44194790b/icon_heart_1789995687105.jpg', 
    dest: path.join(rootDir, 'games/gardenguard/assets/icons/icon_heart.png') 
  },
  { 
    src: '/Users/hunkwu/.gemini/antigravity/brain/b1313bdd-d984-40ca-95d8-46e44194790b/icon_sprout_1789995709838.jpg', 
    dest: path.join(rootDir, 'games/gardenguard/assets/icons/icon_sprout.png') 
  },
  { 
    src: '/Users/hunkwu/.gemini/antigravity/brain/b1313bdd-d984-40ca-95d8-46e44194790b/icon_coin_1789995790523.jpg', 
    dest: path.join(rootDir, 'games/gardenguard/assets/icons/icon_coin.png') 
  },
  { 
    src: '/Users/hunkwu/.gemini/antigravity/brain/b1313bdd-d984-40ca-95d8-46e44194790b/icon_facility_1789995941512.jpg', 
    dest: path.join(rootDir, 'games/gardenguard/assets/icons/icon_facility.png') 
  },
  { 
    src: '/Users/hunkwu/.gemini/antigravity/brain/b1313bdd-d984-40ca-95d8-46e44194790b/icon_book_1789996041477.jpg', 
    dest: path.join(rootDir, 'games/gardenguard/assets/icons/icon_compendium.png') 
  },
  { 
    src: '/Users/hunkwu/.gemini/antigravity/brain/b1313bdd-d984-40ca-95d8-46e44194790b/icon_star_1789996112235.jpg', 
    dest: path.join(rootDir, 'games/gardenguard/assets/icons/icon_star.png') 
  },
  { 
    src: '/Users/hunkwu/.gemini/antigravity/brain/b1313bdd-d984-40ca-95d8-46e44194790b/icon_wave_1789996255021.jpg', 
    dest: path.join(rootDir, 'games/gardenguard/assets/icons/icon_wave.png') 
  },
  { 
    src: '/Users/hunkwu/.gemini/antigravity/brain/b1313bdd-d984-40ca-95d8-46e44194790b/icon_skull_1789996460562.jpg', 
    dest: path.join(rootDir, 'games/gardenguard/assets/icons/icon_skull.png') 
  },
  { 
    src: '/Users/hunkwu/.gemini/antigravity/brain/b1313bdd-d984-40ca-95d8-46e44194790b/icon_trophy_1789996580355.jpg', 
    dest: path.join(rootDir, 'games/gardenguard/assets/icons/icon_trophy.png') 
  },
  { 
    src: '/Users/hunkwu/.gemini/antigravity/brain/b1313bdd-d984-40ca-95d8-46e44194790b/icon_frost_1789996820521.jpg', 
    dest: path.join(rootDir, 'games/gardenguard/assets/icons/icon_frost.png') 
  },
  { 
    src: '/Users/hunkwu/.gemini/antigravity/brain/b1313bdd-d984-40ca-95d8-46e44194790b/icon_bomb_1789996856663.jpg', 
    dest: path.join(rootDir, 'games/gardenguard/assets/icons/icon_bomb.png') 
  }
];

async function main() {
  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: 'new',
    args: ['--no-sandbox']
  });

  const page = await browser.newPage();

  for (const item of iconMappings) {
    if (!fs.existsSync(item.src)) {
      console.log('Skipping missing:', item.src);
      continue;
    }
    const b64 = fs.readFileSync(item.src).toString('base64');
    const dataUri = `data:image/jpeg;base64,${b64}`;

    const pngBase64 = await page.evaluate(async (uri) => {
      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
          const cvs = document.createElement('canvas');
          cvs.width = img.width;
          cvs.height = img.height;
          const ctx = cvs.getContext('2d');
          ctx.drawImage(img, 0, 0);

          const imgData = ctx.getImageData(0, 0, cvs.width, cvs.height);
          const data = imgData.data;

          // 纯白与微近白色背景抠图
          for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i+1];
            const b = data[i+2];

            // 白色阈值与平滑羽化
            const brightness = (r + g + b) / 3;
            if (brightness > 248 && Math.abs(r - g) < 8 && Math.abs(g - b) < 8) {
              data[i + 3] = 0; // 完全透明
            } else if (brightness > 235 && Math.abs(r - g) < 12 && Math.abs(g - b) < 12) {
              // 渐变羽化
              const alpha = Math.max(0, Math.min(255, (248 - brightness) / 13 * 255));
              data[i + 3] = Math.min(data[i + 3], alpha);
            }
          }

          ctx.putImageData(imgData, 0, 0);
          resolve(cvs.toDataURL('image/png').split(',')[1]);
        };
        img.src = uri;
      });
    }, dataUri);

    fs.writeFileSync(item.dest, Buffer.from(pngBase64, 'base64'));
    console.log('Processed transparent PNG:', item.dest);
  }

  await browser.close();
  console.log('All icons converted to transparent PNG!');
}

main();
