// ═══════════════════════════════════════════
// 障碍物管理与生成调度 (ObstacleManager)
// ═══════════════════════════════════════════
import * as THREE from 'three';

export class ObstacleManager {
  constructor(scene, modelLoader) {
    this.scene = scene;
    this.modelLoader = modelLoader;
    this.obstacles = [];

    this.spawnDistance = 220; // 在玩家前方多远生成
    this.nextSpawnZ = -30;
    this.minZSpacing = 28;
    this.maxZSpacing = 42;

    // 复用临时碰撞向量
    this._tempPos = new THREE.Vector3();
  }

  reset() {
    for (const obs of this.obstacles) {
      this.scene.remove(obs.mesh);
    }
    this.obstacles = [];
    this.nextSpawnZ = -35;
  }

  update(delta, playerZ, currentSpeed, level) {
    // 1. 随着速度与关卡向前滚动更新与生成
    // 难度越高，生成间距越紧凑
    const dynamicSpacing = Math.max(18, this.maxZSpacing - (level - 1) * 2.5);

    while (this.nextSpawnZ > playerZ - this.spawnDistance) {
      this.spawnPattern(this.nextSpawnZ, level);
      this.nextSpawnZ -= dynamicSpacing;
    }

    // 2. 更新每个障碍物的运动与自转
    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      const obs = this.obstacles[i];

      // 障碍物自身微动 (自转或悬浮)
      if (obs.rotSpeed) {
        obs.mesh.rotation.x += obs.rotSpeed.x * delta;
        obs.mesh.rotation.y += obs.rotSpeed.y * delta;
        obs.mesh.rotation.z += obs.rotSpeed.z * delta;
      }

      // 横向摆动型障碍
      if (obs.oscillation) {
        obs.oscTimer += delta * obs.oscFreq;
        obs.mesh.position.x = obs.baseX + Math.sin(obs.oscTimer) * obs.oscAmp;
      }

      // 超出玩家身后则销毁回收
      if (obs.mesh.position.z > playerZ + 25) {
        this.scene.remove(obs.mesh);
        this.obstacles.splice(i, 1);
      }
    }
  }

  spawnPattern(z, level) {
    const patternType = Math.random();

    if (patternType < 0.55 || level < 2) {
      // 模式 A: 散布陨石群 (1 ~ 3 颗)
      const count = Math.min(1 + Math.floor(Math.random() * (level > 2 ? 3 : 2)), 3);
      for (let i = 0; i < count; i++) {
        const x = (Math.random() - 0.5) * 18;
        const y = -2 + Math.random() * 8;
        this.spawnAsteroid(x, y, z + (Math.random() - 0.5) * 8);
      }
    } else if (patternType < 0.85) {
      // 模式 B: 激光屏障门 (留出安全缝隙供穿梭)
      this.spawnLaserGate(z);
    } else {
      // 模式 C: 左右巡逻/摆动的动态陨石
      this.spawnMovingAsteroid(z);
    }
  }

  spawnAsteroid(x, y, z) {
    const mesh = this.modelLoader.getModel('asteroid');
    const scale = 0.9 + Math.random() * 1.1;
    mesh.scale.set(scale, scale, scale);
    mesh.position.set(x, y, z);

    this.scene.add(mesh);

    this.obstacles.push({
      type: 'asteroid',
      mesh: mesh,
      radius: 1.35 * scale,
      rotSpeed: new THREE.Vector3(
        (Math.random() - 0.5) * 1.5,
        (Math.random() - 0.5) * 1.5,
        (Math.random() - 0.5) * 1.5
      ),
      passed: false,
    });
  }

  spawnMovingAsteroid(z) {
    const mesh = this.modelLoader.getModel('asteroid');
    const scale = 1.3;
    mesh.scale.set(scale, scale, scale);
    const baseX = (Math.random() - 0.5) * 8;
    const y = 0 + Math.random() * 5;
    mesh.position.set(baseX, y, z);

    this.scene.add(mesh);

    this.obstacles.push({
      type: 'moving_asteroid',
      mesh: mesh,
      radius: 1.35 * scale,
      baseX: baseX,
      oscillation: true,
      oscTimer: Math.random() * Math.PI * 2,
      oscAmp: 3.5,
      oscFreq: 1.8,
      rotSpeed: new THREE.Vector3(1, 0.5, 0),
      passed: false,
    });
  }

  spawnLaserGate(z) {
    const gate = this.modelLoader.getModel('laser_gate');
    // 随机上下位置，让玩家做俯仰穿越
    const openY = Math.random() < 0.5 ? 4.5 : -0.5;
    gate.position.set(0, openY, z);

    this.scene.add(gate);

    this.obstacles.push({
      type: 'laser_gate',
      mesh: gate,
      radius: 2.2,
      passed: false,
    });
  }

  // 碰撞检测：判断玩家是否与任一障碍物发生碰撞
  checkCollision(playerSphere) {
    for (const obs of this.obstacles) {
      if (obs.type === 'laser_gate') {
        // 门框及光束的简易盒体碰撞
        const dz = Math.abs(obs.mesh.position.z - playerSphere.center.z);
        if (dz < 1.2) {
          const dy = Math.abs(obs.mesh.position.y - playerSphere.center.y);
          const dx = Math.abs(obs.mesh.position.x - playerSphere.center.x);
          // 如果未穿过空隙或者撞到了侧边立柱
          if (dx < 3.2 && dy < 1.8) {
            return { hit: true, obstacle: obs };
          }
        }
      } else {
        // 球体碰撞检测
        const distSq = obs.mesh.position.distanceToSquared(playerSphere.center);
        const minDist = obs.radius + playerSphere.radius;
        if (distSq < minDist * minDist) {
          return { hit: true, obstacle: obs };
        }
      }
    }
    return { hit: false };
  }
}
