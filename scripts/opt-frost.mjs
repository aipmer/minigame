import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const glbUrl = "https://assets.meshy.ai/057597e8-bb9b-4d4e-b648-acb84680c083/tasks/01a0c448-1ae5-752d-843d-e64a010a16e0/output/model.glb?Expires=4943548800&Signature=nxav~8xEEW2c2xoahKpvQV3KABfB02zOMzTWJ7ZR0Mg42kTk5cyW-I6xQbV-uJ-YXjVz8g9qnnOhSJzUdqTvXvc7gZyQZ0APg-WJS8EReAjpoV3RQNh3DfxHYXhnB6mKlM40nXP87MbgwzPuwC1mOIcn4P7nQOY0kKeLUo8x2h2WXkDUWzFcC7Vj2LLegci2cihSfvLMS9DHC~icSdN7vQ9IzpDY7VvxQo-UnCB9U345263MyagpzKtnt2mWzAg7BWknPo~xCMbXV-pAP-Oi1CES8Ox9HysxcLQaIDfkWw4L6kIGCkpNe~Zzol3IL7xSTnbbanv8DNCFoG3rpEOC7A__&Key-Pair-Id=K1VGYTHIYLM9UM";
const finalPath = path.resolve('games/gardenguard/models/plants/plant_frost.glb');

const tempDir = `/tmp/opt_frost_${Date.now()}`;
fs.mkdirSync(tempDir, { recursive: true });
const rawGlb = path.join(tempDir, 'raw.glb');

console.log('正在下载 plant_frost.glb...');
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
console.log(`✅ [完成] plant_frost.glb 就绪: ${finalPath} (${size} KB)`);
