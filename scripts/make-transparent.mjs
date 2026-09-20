import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

async function processImages() {
  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();

  const files = [
    { in: 'games/snake3d/assets/ui/snake3d_gameover_badge.jpg', out: 'games/snake3d/assets/ui/snake3d_gameover_badge.png' },
    { in: 'games/snake3d/assets/ui/snake3d_start_badge.jpg', out: 'games/snake3d/assets/ui/snake3d_start_badge.png' }
  ];

  for (const item of files) {
    const absIn = path.resolve(item.in);
    const absOut = path.resolve(item.out);
    const dataUrl = `data:image/jpeg;base64,${fs.readFileSync(absIn).toString('base64')}`;

    const pngBase64 = await page.evaluate(async (dataUrl) => {
      const img = new Image();
      await new Promise(r => { img.onload = r; img.src = dataUrl; });

      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);

      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const d = imgData.data;

      for (let i = 0; i < d.length; i += 4) {
        const r = d[i], g = d[i+1], b = d[i+2];
        if (r > 248 && g > 248 && b > 248) {
          d[i+3] = 0;
        } else if (r > 235 && g > 235 && b > 235) {
          const maxVal = Math.max(r, g, b);
          d[i+3] = Math.max(0, Math.floor((255 - maxVal) / (255 - 235) * 255));
        }
      }

      ctx.putImageData(imgData, 0, 0);
      return canvas.toDataURL('image/png').split(',')[1];
    }, dataUrl);

    fs.writeFileSync(absOut, Buffer.from(pngBase64, 'base64'));
    console.log(`[Asset] Created transparent PNG: ${item.out}`);
  }

  await browser.close();
}

processImages().catch(console.error);
