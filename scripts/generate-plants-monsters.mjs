import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const ASSETS = [
  {
    name: 'plant_sunflower.glb',
    dir: 'games/gardenguard/models/plants',
    prompt: 'Cute clay sunflower cannon plant, large friendly cartoon face, horn-shaped seed nozzle mouth, green leafy base, handcrafted pottery flowerpot, vibrant yellow petals, cute big black eyes with highlight, toy figure style, centered pivot'
  },
  {
    name: 'plant_mushroom.glb',
    dir: 'games/gardenguard/models/plants',
    prompt: 'Chubby cartoon mushroom cannon, purple and magenta polka dot cap, clay dough texture, cute round body, miniature toy creature, fantasy garden defense, centered pivot'
  },
  {
    name: 'beetle.glb',
    dir: 'games/gardenguard/models/enemies',
    prompt: 'Cute rounded rhinoceros beetle, warm caramel brown shell, glossy clay texture, single blunt horn, friendly silly cartoon insect, stylized game monster, centered pivot'
  }
];

function downloadAndOptimize(glbUrl, finalPath) {
  const tempDir = `/tmp/opt_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  fs.mkdirSync(tempDir, { recursive: true });
  const rawGlb = path.join(tempDir, 'raw.glb');

  console.log(`  [下载] ${path.basename(finalPath)} 正在下载...`);
  execSync(`curl -s -L "${glbUrl}" -o "${rawGlb}"`, { stdio: 'pipe' });

  console.log(`  [瘦身] ${path.basename(finalPath)} 纹理降采样与 Meshopt 压缩...`);
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
  console.log(`  ✅ [完成] ${path.basename(finalPath)} 已入库 (${size} KB)\n`);
}

async function processOne(asset) {
  const fullDir = path.resolve(asset.dir);
  fs.mkdirSync(fullDir, { recursive: true });
  const finalPath = path.join(fullDir, asset.name);

  if (fs.existsSync(finalPath)) {
    console.log(`⏩ [跳过] ${asset.name} 已存在`);
    return;
  }

  console.log(`🚀 [提交 Preview] ${asset.name}: "${asset.prompt.slice(0, 45)}..."`);
  const previewOut = execSync(`meshy text-to-3d create --mode preview --prompt "${asset.prompt}" --async --output-schema v1`, { encoding: 'utf-8' });
  const pId = JSON.parse(previewOut)?.result?.submission?.task_id;
  if (!pId) throw new Error(`Preview 提交失败: ${asset.name}`);

  // 轮询 Preview
  while (true) {
    await new Promise(r => setTimeout(r, 6000));
    const chk = execSync(`meshy text-to-3d get ${pId} --output-schema v1`, { encoding: 'utf-8' });
    const status = JSON.parse(chk)?.result?.task?.status;
    if (status === 'SUCCEEDED') break;
    if (status === 'FAILED') throw new Error(`Preview 失败: ${asset.name}`);
  }

  console.log(`🎨 [提交 Refine 贴图] ${asset.name}...`);
  const refineOut = execSync(`meshy text-to-3d create --mode refine --preview-task-id ${pId} --async --output-schema v1`, { encoding: 'utf-8' });
  const rId = JSON.parse(refineOut)?.result?.submission?.task_id;
  if (!rId) throw new Error(`Refine 提交失败: ${asset.name}`);

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
      throw new Error(`Refine 失败: ${asset.name}`);
    }
  }
}

async function main() {
  console.log('🌱 [植物与害虫 3D 模型生成流水线] 启动...\n');
  // 并发处理
  await Promise.all(ASSETS.map(a => processOne(a).catch(e => console.error(`❌ 失败 [${a.name}]:`, e.message))));
  console.log('🎉 植物与害虫批次生成全部完成！');
}

main();
