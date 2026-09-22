import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const asset = {
  name: 'plant_burst.glb',
  dir: 'games/gardenguard/models/plants',
  prompt: 'Spicy chili berry cannon, fiery bright orange and red clay body, cute angry expression, little leafy stem fuse on top, explosive garden defender figure, centered pivot'
};

function downloadAndOptimize(glbUrl, finalPath) {
  const tempDir = `/tmp/opt_burst_${Date.now()}`;
  fs.mkdirSync(tempDir, { recursive: true });
  const rawGlb = path.join(tempDir, 'raw.glb');

  console.log(`  [下载] ${asset.name} 正在下载...`);
  execSync(`curl -s -L "${glbUrl}" -o "${rawGlb}"`, { stdio: 'pipe' });

  console.log(`  [瘦身] ${asset.name} 纹理降采样与 Meshopt 压缩...`);
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
  console.log(`  ✅ [完成] ${asset.name} 已入库 (${size} KB)\n`);
}

async function main() {
  const fullDir = path.resolve(asset.dir);
  fs.mkdirSync(fullDir, { recursive: true });
  const finalPath = path.join(fullDir, asset.name);

  if (fs.existsSync(finalPath)) {
    console.log(`⏩ [跳过] ${asset.name} 已存在`);
    return;
  }

  console.log(`🚀 [提交 Preview] ${asset.name}...`);
  const previewOut = execSync(`meshy text-to-3d create --mode preview --prompt "${asset.prompt}" --async --output-schema v1`, { encoding: 'utf-8' });
  const pId = JSON.parse(previewOut)?.result?.submission?.task_id;
  if (!pId) throw new Error(`Preview 提交失败`);

  // 轮询 Preview
  while (true) {
    await new Promise(r => setTimeout(r, 6000));
    const chk = execSync(`meshy text-to-3d get ${pId} --output-schema v1`, { encoding: 'utf-8' });
    const status = JSON.parse(chk)?.result?.task?.status;
    if (status === 'SUCCEEDED') break;
    if (status === 'FAILED') throw new Error(`Preview 失败`);
  }

  console.log(`🎨 [提交 Refine 贴图] ${asset.name}...`);
  const refineOut = execSync(`meshy text-to-3d create --mode refine --preview-task-id ${pId} --async --output-schema v1`, { encoding: 'utf-8' });
  const rId = JSON.parse(refineOut)?.result?.submission?.task_id;
  if (!rId) throw new Error(`Refine 提交失败`);

  // 轮询 Refine
  while (true) {
    await new Promise(r => setTimeout(r, 6000));
    const chk = execSync(`meshy text-to-3d get ${rId} --output-schema v1`, { encoding: 'utf-8' });
    const t = JSON.parse(chk)?.result?.task;
    if (t?.status === 'SUCCEEDED') {
      const glbUrl = t.model_urls?.glb;
      if (glbUrl) {
        downloadAndOptimize(glbUrl, finalPath);
        break;
      }
    } else if (t?.status === 'FAILED') {
      throw new Error(`Refine 失败`);
    }
  }

  console.log('🎉 plant_burst.glb 处理完成！');
}

main().catch(err => {
  console.error('❌ 异常:', err);
  process.exit(1);
});
