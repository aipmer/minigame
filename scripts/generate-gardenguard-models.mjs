import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// 读取 .env
function loadEnv() {
  const envPath = path.join(rootDir, '.env');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf-8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const [key, ...vals] = trimmed.split('=');
      const val = vals.join('=').trim().replace(/^["']|["']$/g, '');
      if (key && !process.env[key.trim()]) {
        process.env[key.trim()] = val;
      }
    }
  }
}

loadEnv();

const API_KEY = process.env.TRIPO_API_KEY;
if (!API_KEY) {
  console.error('\x1b[31m[Error]\x1b[0m 未检测到 TRIPO_API_KEY！');
  process.exit(1);
}

const envDir = path.join(rootDir, 'games', 'gardenguard', 'models', 'environment');
const plantsDir = path.join(rootDir, 'games', 'gardenguard', 'models', 'plants');
const enemiesDir = path.join(rootDir, 'games', 'gardenguard', 'models', 'enemies');

fs.mkdirSync(envDir, { recursive: true });
fs.mkdirSync(plantsDir, { recursive: true });
fs.mkdirSync(enemiesDir, { recursive: true });

const ASSETS_TO_GENERATE = [
  // 1. 场景建筑与环境道具
  {
    name: 'windmill.glb',
    dir: envDir,
    prompt: 'Cute claymation Dutch windmill, miniature toy village style, warm cream plaster walls, red ceramic tiled roof, wooden rotating blades, handcrafted clay texture, Nintendo Animal Crossing style, soft shadows, stylized low-poly, warm sunlight, clean centered 3D model'
  },
  {
    name: 'guardian_tree.glb',
    dir: envDir,
    prompt: 'Cute stylized magical guardian tree, miniature claymation bonsai tree, thick chubby green foliage canopy with tiny pink fruits, warm brown textured clay trunk, Nintendo Pikmin aesthetic, handpainted clay finish, centered pivot'
  },
  {
    name: 'bush_cluster.glb',
    dir: envDir,
    prompt: 'Cute clay bush cluster with tiny colorful yellow and red flowers, soft rounded dough shapes, pastel warm green, claymation miniature plant, stylized game prop, centered pivot'
  },

  // 2. 四大系手办植物炮台
  {
    name: 'plant_sunflower.glb',
    dir: plantsDir,
    prompt: 'Cute clay sunflower cannon plant, large friendly cartoon face, horn-shaped seed nozzle mouth, green leafy base, handcrafted pottery flowerpot, vibrant yellow petals, cute big black eyes with highlight, toy figure style, centered pivot'
  },
  {
    name: 'plant_mushroom.glb',
    dir: plantsDir,
    prompt: 'Chubby cartoon mushroom cannon, purple and magenta polka dot cap, clay dough texture, cute round body, miniature toy creature, fantasy garden defense, centered pivot'
  },
  {
    name: 'plant_frost.glb',
    dir: plantsDir,
    prompt: 'Cute frosted berry plant, translucent icy crystal leaves, cyan and ice blue color palette, handcrafted clay sculpture, cute animated face, chilled winter garden defender, centered pivot'
  },
  {
    name: 'plant_burst.glb',
    dir: plantsDir,
    prompt: 'Spicy chili berry cannon, fiery bright orange and red clay body, cute angry expression, little leafy stem fuse on top, explosive garden defender figure, centered pivot'
  },

  // 3. 核心害虫怪物
  {
    name: 'caterpillar.glb',
    dir: enemiesDir,
    prompt: 'Cute cartoon segmented caterpillar, chunky claymation body segments, pale mint green with yellow dots, adorable big cartoon eyes, tiny feet, harmless silly garden bug, Nintendo style, centered pivot'
  },
  {
    name: 'beetle.glb',
    dir: enemiesDir,
    prompt: 'Cute rounded rhinoceros beetle, warm caramel brown shell, glossy clay texture, single blunt horn, friendly silly cartoon insect, stylized game monster, centered pivot'
  }
];

async function submitTask(prompt) {
  const res = await fetch('https://api.tripo3d.ai/v2/openapi/task', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      type: 'text_to_model',
      prompt: prompt,
      model_version: 'v3.1-20260211'
    }),
  });

  const data = await res.json();
  if (data.code !== 0) {
    throw new Error(`创建任务失败: ${data.message || JSON.stringify(data)}`);
  }
  return data.data.task_id;
}

async function pollTask(taskId, name) {
  const maxAttempts = 60;
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise(r => setTimeout(r, 6000));
    const res = await fetch(`https://api.tripo3d.ai/v2/openapi/task/${taskId}`, {
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
      },
    });
    const data = await res.json();
    if (data.code !== 0) continue;

    const { status, progress, output } = data.data;
    console.log(`[${name}] 进度: ${progress || 0}% (状态: ${status})`);

    if (status === 'success') {
      return output.model || output.pbr_model;
    }
    if (status === 'failed' || status === 'cancelled') {
      throw new Error(`任务异常结束: ${status}`);
    }
  }
  throw new Error('轮询超时');
}

async function downloadFile(url, dest) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`下载失败: ${res.statusText}`);
  const buffer = await res.arrayBuffer();
  fs.writeFileSync(dest, Buffer.from(buffer));
}

// 自动执行 gltfpack 轻量化优化
function optimizeGLB(filePath) {
  try {
    const tempOpt = filePath.replace('.glb', '_opt.glb');
    execSync(`gltfpack -i "${filePath}" -o "${tempOpt}" -si 0.5 -cc`, { stdio: 'pipe' });
    if (fs.existsSync(tempOpt)) {
      const origSize = (fs.statSync(filePath).size / 1024).toFixed(1);
      const newSize = (fs.statSync(tempOpt).size / 1024).toFixed(1);
      fs.renameSync(tempOpt, filePath);
      console.log(`  ⚡ 优化完成: ${origSize} KB -> ${newSize} KB`);
    }
  } catch (e) {
    console.warn(`  ⚠️ 优化跳过 (${e.message})`);
  }
}

async function processAsset(asset) {
  const destPath = path.join(asset.dir, asset.name);
  if (fs.existsSync(destPath)) {
    const size = (fs.statSync(destPath).size / 1024).toFixed(1);
    console.log(`⏩ [跳过] ${asset.name} 已存在 (${size} KB)`);
    return destPath;
  }

  console.log(`🚀 [提交生成] ${asset.name}...`);
  const taskId = await submitTask(asset.prompt);
  console.log(`   ${asset.name} 任务已在云端排队，ID: ${taskId}`);

  const modelUrl = await pollTask(taskId, asset.name);
  console.log(`   ${asset.name} 云端生成完成，正在下载至本地...`);
  await downloadFile(modelUrl, destPath);
  console.log(`   ${asset.name} 下载成功，正在进行 Meshopt 轻量化压缩...`);
  optimizeGLB(destPath);
  console.log(`✅ [完成] ${asset.name} 全部流水线处理完毕！\n`);
  return destPath;
}

async function main() {
  console.log('🌻 [Garden Guard 3D Asset Pipeline] 启动全套手办粘土资产生成管线...\n');

  // 并行批处理：每次并发 3 个，避免 API 速率限制
  const BATCH_SIZE = 3;
  for (let i = 0; i < ASSETS_TO_GENERATE.length; i += BATCH_SIZE) {
    const batch = ASSETS_TO_GENERATE.slice(i, i + BATCH_SIZE);
    console.log(`\n=== 正在处理批次 ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(ASSETS_TO_GENERATE.length / BATCH_SIZE)} ===`);
    await Promise.all(batch.map(asset => 
      processAsset(asset).catch(err => {
        console.error(`❌ [失败] ${asset.name}:`, err.message);
      })
    ));
  }

  console.log('\n🎉 所有 3D 资产批处理流水线全部执行完毕！');
}

main();
