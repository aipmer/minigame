import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const glbUrl = "https://assets.meshy.ai/057597e8-bb9b-4d4e-b648-acb84680c083/tasks/01a0c449-dbf0-7528-b8e0-a8c5457815f4/output/model.glb?Expires=4943548800&Signature=B6btSjqh858QLyU~KW2O14a8wlK2MsY0PSWPjZeYOzbBFaWOeE86z~ntrqGj0F~cwyT6BwpM3Ur63HohJQ6nZg1jPm1giDpKu5eIIDn6C1MfuMfahc3lnr5vcyvm6KkvXYbuIK1v0Y3EvIGbP6sHM8-fI0G8rbANzYnfhLfT0n3JAGFzbDswsb2YlX1roDiqoOgKHiUlYpmnnuwcCGUHAlE5kDCRFLyMjPIFjvf8APp8n6AukMw8R-NSKvAa9AROWZlPfkHTT-zXwq63fWOFb3TNUk~x8Vy8Qit0UqKbQXdvu6SJrUajvPNetskRuT6lUV~ZJ0spualsRxbOxrpmmQ__&Key-Pair-Id=K1VGYTHIYLM9UM";
const finalPath = path.resolve('games/gardenguard/models/plants/plant_burst.glb');

const tempDir = `/tmp/opt_burst_ready_${Date.now()}`;
fs.mkdirSync(tempDir, { recursive: true });
const rawGlb = path.join(tempDir, 'raw.glb');

console.log('正在下载 plant_burst.glb...');
execSync(`curl -s -L "${glbUrl}" -o "${rawGlb}"`, { stdio: 'inherit' });

console.log('正在降采样纹理并进行 Meshopt 压缩...');
try {
  execSync(`npx gltf-pipeline -i "${rawGlb}" -o "${tempDir}/scene.gltf" -s`, { stdio: 'pipe' });
  const imgFiles = fs.readdirSync(tempDir).filter(f => /\.(jpg|jpeg|png)$/i.test(f));
  for (const img of imgFiles) {
    execSync(`sips -Z 512 "${path.join(tempDir, img)}"`, { stdio: 'pipe' });
  }
  execSync(`npx gltf-pipeline -i "${tempDir}/scene.gltf" -o "${tempDir}/repacked.glb" -b`, { stdio: 'pipe' });
  execSync(`gltfpack -i "${tempDir}/repacked.glb" -o "${finalPath}" -si 0.4 -cc`, { stdio: 'pipe' });
} catch (e) {
  execSync(`gltfpack -i "${rawGlb}" -o "${finalPath}" -si 0.4 -cc`, { stdio: 'pipe' });
}

fs.rmSync(tempDir, { recursive: true, force: true });
const size = (fs.statSync(finalPath).size / 1024).toFixed(1);
console.log(`✅ [完成] plant_burst.glb 就绪: ${finalPath} (${size} KB)`);
