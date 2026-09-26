import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const asset = {
  name: 'caterpillar.glb',
  dir: 'games/gardenguard/models/enemies',
  prompt: 'Cute cartoon chubby caterpillar monster, vibrant warm grass green segmented body, soft creamy yellow underbelly, cute cartoon face with big black shiny eyes and tiny pink blush, two little antennas with yellow tips, miniature handpainted clay figurine style, toy animal, centered pivot'
};

function downloadAndOptimize(glbUrl, finalPath) {
  const tempDir = `/tmp/opt_caterpillar_${Date.now()}`;
  fs.mkdirSync(tempDir, { recursive: true });
  const rawGlb = path.join(tempDir, 'raw.glb');

  console.log(`  [下载] ${asset.name} 正在下载原始手绘高模...`);
  execSync(`curl -s -L "${glbUrl}" -o "${rawGlb}"`, { stdio: 'pipe' });

  console.log(`  [瘦身] ${asset.name} 纹理降采样 (512px) 与 Meshopt 压缩...`);
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
  console.log(`  ✅ [完成] ${asset.name} 手绘贴图模型已入库: ${finalPath} (${size} KB)\n`);
}

async function main() {
  console.log('🐛 [翠绿萌系毛毛虫手办生成流水线] 启动...\n');
  const fullDir = path.resolve(asset.dir);
  fs.mkdirSync(fullDir, { recursive: true });
  const finalPath = path.join(fullDir, asset.name);

  console.log(`🚀 [1. 提交 Preview] ${asset.name}: "${asset.prompt.slice(0, 45)}..."`);
  const previewOut = execSync(`meshy text-to-3d create --mode preview --prompt "${asset.prompt}" --async --output-schema v1`, { encoding: 'utf-8' });
  const pId = JSON.parse(previewOut)?.result?.submission?.task_id;
  if (!pId) throw new Error(`Preview 提交失败`);
  console.log(`  Preview Task ID: ${pId}`);

  // 轮询 Preview
  while (true) {
    await new Promise(r => setTimeout(r, 5000));
    const chk = execSync(`meshy text-to-3d get ${pId} --output-schema v1`, { encoding: 'utf-8' });
    const task = JSON.parse(chk)?.result?.task;
    process.stdout.write(`\r  Preview 状态: ${task?.status} (${task?.progress || 0}%)`);
    if (task?.status === 'SUCCEEDED') {
      console.log('');
      break;
    }
    if (task?.status === 'FAILED') throw new Error(`Preview 失败: ${task?.task_error}`);
  }

  console.log(`🎨 [2. 提交 Refine 手绘贴图烘焙] ${asset.name}...`);
  const refineOut = execSync(`meshy text-to-3d create --mode refine --preview-task-id ${pId} --async --output-schema v1`, { encoding: 'utf-8' });
  const rId = JSON.parse(refineOut)?.result?.submission?.task_id;
  if (!rId) throw new Error(`Refine 提交失败`);
  console.log(`  Refine Task ID: ${rId}`);

  // 轮询 Refine
  while (true) {
    await new Promise(r => setTimeout(r, 6000));
    const chk = execSync(`meshy text-to-3d get ${rId} --output-schema v1`, { encoding: 'utf-8' });
    const task = JSON.parse(chk)?.result?.task;
    process.stdout.write(`\r  Refine 烘焙状态: ${task?.status} (${task?.progress || 0}%)`);
    if (task?.status === 'SUCCEEDED') {
      console.log('');
      const glbUrl = task.model_urls?.glb;
      if (glbUrl) {
        downloadAndOptimize(glbUrl, finalPath);
        break;
      }
    } else if (task?.status === 'FAILED') {
      throw new Error(`Refine 失败: ${task?.task_error}`);
    }
  }

  console.log('🎉 翠绿呆萌毛毛虫 3D 手绘手办已彻底完成！');
}

main().catch(err => {
  console.error('❌ 异常:', err);
  process.exit(1);
});
