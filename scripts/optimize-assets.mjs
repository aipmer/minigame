import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const targets = [
  { input: 'games/skydodge/models/spaceship.glb', maxTex: 1024, simplify: 0.7 },
  { input: 'games/skydodge/models/asteroid.glb', maxTex: 1024, simplify: 0.5 },
  { input: 'games/skydodge/models/shield_orb.glb', maxTex: 1024, simplify: 0.5 },
  { input: 'games/skydodge/models/energy_core.glb', maxTex: 1024, simplify: 0.5 },
  { input: 'games/snake3d/models/food_star.glb', maxTex: 512, simplify: 0.5 },
  { input: 'games/snake3d/models/obstacle.glb', maxTex: 512, simplify: 0.5 },
  { input: 'games/snake3d/models/snake_body.glb', maxTex: 512, simplify: 0.5 },
  { input: 'games/snake3d/models/snake_head.glb', maxTex: 512, simplify: 0.6 },
];

const tempDir = '/tmp/asset_opt';

for (const t of targets) {
  const filePath = path.resolve(t.input);
  if (!fs.existsSync(filePath)) {
    console.log(`[Skip] File not found: ${t.input}`);
    continue;
  }

  const origSize = (fs.statSync(filePath).size / (1024 * 1024)).toFixed(2);
  console.log(`\n=== 优化: ${t.input} (原始体积: ${origSize} MB) ===`);

  try {
    fs.rmSync(tempDir, { recursive: true, force: true });
    fs.mkdirSync(tempDir, { recursive: true });

    // 1. gltf-pipeline 拆分解包
    execSync(`npx gltf-pipeline -i "${filePath}" -o "${tempDir}/scene.gltf" -s`, { stdio: 'pipe' });

    // 2. 使用 macOS 原生 sips 批量降采样纹理
    const extractedFiles = fs.readdirSync(tempDir);
    const imgFiles = extractedFiles.filter(f => /\.(jpg|jpeg|png)$/i.test(f));
    for (const img of imgFiles) {
      const imgPath = path.join(tempDir, img);
      execSync(`sips -Z ${t.maxTex} "${imgPath}"`, { stdio: 'pipe' });
    }

    // 3. gltf-pipeline 重新组装为二进制 GLB
    execSync(`npx gltf-pipeline -i "${tempDir}/scene.gltf" -o "${tempDir}/repacked.glb" -b`, { stdio: 'pipe' });

    // 4. gltfpack 进行网格拓扑压缩与网格简化 (Meshopt)
    const backupPath = filePath + '.bak';
    if (!fs.existsSync(backupPath)) {
      fs.copyFileSync(filePath, backupPath);
    }

    execSync(`gltfpack -i "${tempDir}/repacked.glb" -o "${filePath}" -si ${t.simplify} -cc`, { stdio: 'pipe' });

    const newSize = (fs.statSync(filePath).size / (1024 * 1024)).toFixed(2);
    const ratio = (((origSize - newSize) / origSize) * 100).toFixed(1);
    console.log(`✓ 优化完成: ${newSize} MB (瘦身 ${ratio}%)`);
  } catch (err) {
    console.error(`✗ 优化失败: ${err.message}`);
  }
}

fs.rmSync(tempDir, { recursive: true, force: true });
console.log('\n=== 全部资产批处理完成 ===');
