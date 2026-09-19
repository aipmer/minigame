import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// 简单读取 .env
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

const modelsDir = path.join(rootDir, 'games', 'skydodge', 'models');
if (!fs.existsSync(modelsDir)) {
  fs.mkdirSync(modelsDir, { recursive: true });
}

// 待生成的 Sky Dodge 3D 核心资产配置
const ASSETS = [
  {
    name: 'spaceship.glb',
    prompt: 'A futuristic sci-fi supersonic fighter aircraft, sleek aerodynamic body, forward-swept wings, twin ion thruster nozzles, dark titanium and neon cyan accents, clean hard-surface low-poly 3D game asset, centered pivot, front facing, no text',
  },
  {
    name: 'asteroid.glb',
    prompt: 'A stylized space meteorite asteroid rock, dark obsidian cratered stone with glowing cyan crystal veins, clean low-poly 3D game obstacle',
  },
  {
    name: 'laser_gate.glb',
    prompt: 'A sci-fi cyber tech energy gate with twin vertical metallic pylons and glowing neon laser hazard barrier, clean low-poly 3D game obstacle',
  },
  {
    name: 'energy_core.glb',
    prompt: 'A glowing quantum energy crystal core, floating faceted octahedron gemstone with glowing cyan emissive light, clean low-poly game collectible',
  },
  {
    name: 'shield_orb.glb',
    prompt: 'A glowing golden energy shield orb with orbital holographic tech rings, vibrant metallic gold and amber glow, clean low-poly game powerup',
  },
];

async function createModelTask(prompt) {
  const res = await fetch('https://openapi.tripo3d.ai/v3/generation/text-to-model', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      prompt: prompt,
      model: 'v3.1-20260211',
    }),
  });

  const data = await res.json();
  if (!res.ok || data.code !== 0 && !data.data?.task_id) {
    throw new Error(`创建任务失败: ${JSON.stringify(data)}`);
  }
  return data.data.task_id;
}

async function pollTask(taskId) {
  process.stdout.write(`等待任务 ${taskId} 完成: `);
  while (true) {
    const res = await fetch(`https://openapi.tripo3d.ai/v3/tasks/${taskId}`, {
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
      },
    });
    const data = await res.json();
    const task = data.data;

    if (!task) {
      throw new Error(`获取任务失败: ${JSON.stringify(data)}`);
    }

    if (task.status === 'success') {
      console.log('\x1b[32m成功!\x1b[0m');
      const modelUrl = task.output?.model || task.output?.pbr_model || task.result?.model;
      if (!modelUrl) {
        throw new Error(`未找到模型下载链接: ${JSON.stringify(task.output)}`);
      }
      return modelUrl;
    } else if (task.status === 'failed' || task.status === 'cancelled') {
      console.log('\x1b[31m失败!\x1b[0m');
      throw new Error(`任务失败: ${task.status} - ${task.message || '未知原因'}`);
    } else {
      process.stdout.write('.');
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }
  }
}

async function downloadFile(url, destPath) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`下载失败 HTTP ${res.status}`);
  const arrayBuffer = await res.arrayBuffer();
  fs.writeFileSync(destPath, Buffer.from(arrayBuffer));
  console.log(`已保存到: ${destPath} (${(arrayBuffer.byteLength / 1024).toFixed(1)} KB)`);
}

async function main() {
  console.log(`=== 开始生成 Sky Dodge 3D 资产 (共 ${ASSETS.length} 个) ===\n`);

  for (let i = 0; i < ASSETS.length; i++) {
    const asset = ASSETS[i];
    const targetFile = path.join(modelsDir, asset.name);
    console.log(`[${i + 1}/${ASSETS.length}] 生成: ${asset.name}`);
    console.log(`提示词: "${asset.prompt}"`);

    if (fs.existsSync(targetFile)) {
      console.log(`-> 文件已存在，跳过生成: ${asset.name}\n`);
      continue;
    }

    try {
      const taskId = await createModelTask(asset.prompt);
      const downloadUrl = await pollTask(taskId);
      await downloadFile(downloadUrl, targetFile);
      console.log(`[${i + 1}/${ASSETS.length}] 完成: ${asset.name}\n`);
    } catch (err) {
      console.error(`\x1b[31m[Error]\x1b[0m 生成 ${asset.name} 发生错误:`, err.message);
    }
  }

  console.log('=== Tripo3D 资产生成流程结束 ===');
}

main().catch(console.error);
