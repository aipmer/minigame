import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const TASKS = [
  // 场景环境
  {
    name: 'guardian_tree.glb',
    outDir: 'games/gardenguard/models/environment',
    refineTaskId: '01a0c43e-ab19-777b-b6bd-98259441a3b0' // 正在 refine 中 (49%)
  },
  {
    name: 'bush_cluster.glb',
    outDir: 'games/gardenguard/models/environment',
    prompt: 'Cute clay bush cluster with tiny colorful yellow and red flowers, soft rounded dough shapes, pastel warm green, claymation miniature plant, stylized game prop, centered pivot'
  },
  // 四大植物
  {
    name: 'plant_sunflower.glb',
    outDir: 'games/gardenguard/models/plants',
    prompt: 'Cute clay sunflower cannon plant, large friendly cartoon face, horn-shaped seed nozzle mouth, green leafy base, handcrafted pottery flowerpot, vibrant yellow petals, cute big black eyes with highlight, toy figure style, centered pivot'
  },
  {
    name: 'plant_mushroom.glb',
    outDir: 'games/gardenguard/models/plants',
    prompt: 'Chubby cartoon mushroom cannon, purple and magenta polka dot cap, clay dough texture, cute round body, miniature toy creature, fantasy garden defense, centered pivot'
  },
  {
    name: 'plant_frost.glb',
    outDir: 'games/gardenguard/models/plants',
    prompt: 'Cute frosted berry plant, translucent icy crystal leaves, cyan and ice blue color palette, handcrafted clay sculpture, cute animated face, chilled winter garden defender, centered pivot'
  },
  {
    name: 'plant_burst.glb',
    outDir: 'games/gardenguard/models/plants',
    prompt: 'Spicy chili berry cannon, fiery bright orange and red clay body, cute angry expression, little leafy stem fuse on top, explosive garden defender figure, centered pivot'
  },
  // 害虫
  {
    name: 'beetle.glb',
    outDir: 'games/gardenguard/models/enemies',
    prompt: 'Cute rounded rhinoceros beetle, warm caramel brown shell, glossy clay texture, single blunt horn, friendly silly cartoon insect, stylized game monster, centered pivot'
  }
];

function downloadAndOptimize(glbUrl, finalPath) {
  const tempDir = `/tmp/opt_${Date.now()}`;
  fs.mkdirSync(tempDir, { recursive: true });
  const rawGlb = path.join(tempDir, 'raw.glb');

  console.log(`  [下载] 从 Meshy 下载原始 GLB...`);
  execSync(`curl -s -L "${glbUrl}" -o "${rawGlb}"`, { stdio: 'pipe' });

  console.log(`  [瘦身] 解包降采样纹理 (512px) 并执行 Meshopt 压缩...`);
  try {
    execSync(`npx gltf-pipeline -i "${rawGlb}" -o "${tempDir}/scene.gltf" -s`, { stdio: 'pipe' });
    const imgFiles = fs.readdirSync(tempDir).filter(f => /\.(jpg|jpeg|png)$/i.test(f));
    for (const img of imgFiles) {
      execSync(`sips -Z 512 "${path.join(tempDir, img)}"`, { stdio: 'pipe' });
    }
    execSync(`npx gltf-pipeline -i "${tempDir}/scene.gltf" -o "${tempDir}/repacked.glb" -b`, { stdio: 'pipe' });
    execSync(`gltfpack -i "${tempDir}/repacked.glb" -o "${finalPath}" -si 0.4 -cc`, { stdio: 'pipe' });
  } catch (e) {
    // 降级使用基础 gltfpack
    execSync(`gltfpack -i "${rawGlb}" -o "${finalPath}" -si 0.5 -cc`, { stdio: 'pipe' });
  }

  fs.rmSync(tempDir, { recursive: true, force: true });
  const size = (fs.statSync(finalPath).size / 1024).toFixed(1);
  console.log(`  [成功] 资产就绪: ${finalPath} (${size} KB)\n`);
}

async function waitAndProcessTask(taskId, finalPath) {
  console.log(`⏳ [轮询] 等待任务完成: ${taskId}...`);
  while (true) {
    await new Promise(r => setTimeout(r, 6000));
    try {
      const stdout = execSync(`meshy text-to-3d get ${taskId} --output-schema v1`, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] });
      const res = JSON.parse(stdout);
      const task = res?.result?.task;
      if (!task) continue;

      process.stdout.write(`\r  任务 ${taskId.slice(0, 8)}... 状态: ${task.status} (${task.progress || 0}%)`);

      if (task.status === 'SUCCEEDED') {
        console.log('');
        const glbUrl = task.model_urls?.glb;
        if (glbUrl) {
          downloadAndOptimize(glbUrl, finalPath);
          return true;
        }
      } else if (task.status === 'FAILED') {
        console.log(`\n❌ 任务失败: ${task.task_error}`);
        return false;
      }
    } catch (e) {
      // 忽略网络瞬时重试
    }
  }
}

async function createAndProcess(prompt, finalPath) {
  console.log(`🚀 [创建] 提交 Meshy text-to-3d preview: "${prompt.slice(0, 50)}..."`);
  const previewOut = execSync(`meshy text-to-3d create --mode preview --prompt "${prompt}" --async --output-schema v1`, { encoding: 'utf-8' });
  const previewRes = JSON.parse(previewOut);
  const previewId = previewRes?.result?.submission?.task_id;
  if (!previewId) throw new Error('未能获取 preview task id');

  console.log(`  Preview 任务已创建: ${previewId}`);
  // 等待 preview 完成
  let previewDone = false;
  while (!previewDone) {
    await new Promise(r => setTimeout(r, 5000));
    const chk = execSync(`meshy text-to-3d get ${previewId} --output-schema v1`, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] });
    const cRes = JSON.parse(chk);
    const pStatus = cRes?.result?.task?.status;
    process.stdout.write(`\r  Preview 状态: ${pStatus} (${cRes?.result?.task?.progress || 0}%)`);
    if (pStatus === 'SUCCEEDED') {
      previewDone = true;
      console.log('');
    } else if (pStatus === 'FAILED') {
      throw new Error(`Preview 失败: ${cRes?.result?.task?.task_error}`);
    }
  }

  // 提交 refine
  console.log(`  提交 Refine (手绘贴图生成)...`);
  const refineOut = execSync(`meshy text-to-3d create --mode refine --preview-task-id ${previewId} --async --output-schema v1`, { encoding: 'utf-8' });
  const refineRes = JSON.parse(refineOut);
  const refineId = refineRes?.result?.submission?.task_id;
  if (!refineId) throw new Error('未能获取 refine task id');
  console.log(`  Refine 任务已创建: ${refineId}`);

  return waitAndProcessTask(refineId, finalPath);
}

async function main() {
  console.log('🌟 [Meshy 手办粘土 3D 资产生成器] 启动...\n');

  for (const item of TASKS) {
    const fullDir = path.resolve(rootDir, item.outDir);
    fs.mkdirSync(fullDir, { recursive: true });
    const finalPath = path.join(fullDir, item.name);

    if (fs.existsSync(finalPath)) {
      const size = (fs.statSync(finalPath).size / 1024).toFixed(1);
      console.log(`⏩ [跳过] ${item.name} 已存在 (${size} KB)`);
      continue;
    }

    console.log(`\n========================================`);
    console.log(`🎯 正在处理资产: ${item.name}`);
    console.log(`========================================`);

    try {
      if (item.refineTaskId) {
        await waitAndProcessTask(item.refineTaskId, finalPath);
      } else if (item.prompt) {
        await createAndProcess(item.prompt, finalPath);
      }
    } catch (err) {
      console.error(`❌ 处理 ${item.name} 失败:`, err.message);
    }
  }

  console.log('\n🎉 所有资产处理完成！');
}

main();
