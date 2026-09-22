// ═══════════════════════════════════════════
// 障碍物管理与动态穿梭调度 (ObstacleManager)
// ═══════════════════════════════════════════
import * as THREE from 'three';

export class ObstacleManager {
  constructor(scene, modelLoader) {
    this.scene = scene;
    this.modelLoader = modelLoader;
    this.obstacles = [];

    this.spawnDistance = 240; // 在玩家前方 240 米处生成
    this.spawnDistanceTraveled = 0;
    this.minZSpacing = 24;
    this.maxZSpacing = 42;
  }

  reset() {
    for (const obs of this.obstacles) {
      this.scene.remove(obs.mesh);
    }
    this.obstacles = [];
    this.spawnDistanceTraveled = 0;

    // 初始在前方铺设几组障碍物，开局即可看到并需要机动躲避
    this.spawnPattern(-70, 1);
    this.spawnPattern(-130, 1);
    this.spawnPattern(-190, 1);
  }

  update(delta, playerZ, currentSpeed, level) {
    // 1. 随航程速度持续生成障碍物
    this.spawnDistanceTraveled += currentSpeed * delta;
    const dynamicSpacing = Math.max(this.minZSpacing, this.maxZSpacing - (level - 1) * 2.2);

    while (this.spawnDistanceTraveled >= dynamicSpacing) {
      this.spawnPattern(-this.spawnDistance, level);
      this.spawnDistanceTraveled -= dynamicSpacing;
    }

    // 2. 障碍物迎面极速飞向玩家 (+Z 轴运动)
    const moveZ = currentSpeed * delta;

    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      const obs = this.obstacles[i];
      obs.mesh.position.z += moveZ;

      // 障碍物自身自转微动
      if (obs.rotSpeed) {
        obs.mesh.rotation.x += obs.rotSpeed.x * delta;
        obs.mesh.rotation.y += obs.rotSpeed.y * delta;
        obs.mesh.rotation.z += obs.rotSpeed.z * delta;
      }

      // 横向巡逻摆动型障碍
      if (obs.oscillation) {
        obs.oscTimer += delta * obs.oscFreq;
        obs.mesh.position.x = obs.baseX + Math.sin(obs.oscTimer) * obs.oscAmp;
      }

      // 飞越玩家身后 (+20米) 自动回收销毁
      if (obs.mesh.position.z > 20) {
        this.scene.remove(obs.mesh);
        this.obstacles.splice(i, 1);
      }
    }
  }

  spawnPattern(z, level) {
    const patternType = Math.random();

    if (patternType < 0.52 || level < 2) {
      // 模式 A: 散布发光巨石群 (1 ~ 3 颗)
      const count = Math.min(1 + Math.floor(Math.random() * (level > 2 ? 3 : 2)), 3);
      for (let i = 0; i < count; i++) {
        const x = (Math.random() - 0.5) * 16;
        const y = -2 + Math.random() * 7.5;
        this.spawnAsteroid(x, y, z + (Math.random() - 0.5) * 10);
      }
    } else if (patternType < 0.82) {
      // 模式 B: 激光屏障门 (上下或左右缝隙)
      this.spawnLaserGate(z);
    } else {
      // 模式 C: 左右巡逻的动态陨石
      this.spawnMovingAsteroid(z);
    }
  }

  spawnAsteroid(x, y, z) {
    const mesh = this.modelLoader.getModel('asteroid');
    const scale = 0.95 + Math.random() * 1.0;
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
    });
  }

  spawnLaserGate(z) {
    const gate = this.modelLoader.getModel('laser_gate');
    const openY = Math.random() < 0.5 ? 4.5 : -0.5;
    gate.position.set(0, openY, z);

    this.scene.add(gate);

    this.obstacles.push({
      type: 'laser_gate',
      mesh: gate,
      radius: 2.2,
    });
  }

  // 碰撞检测：判断玩家战机是否与任一障碍发生碰撞
  checkCollision(playerSphere) {
    for (const obs of this.obstacles) {
      if (obs.type === 'laser_gate') {
        const dz = Math.abs(obs.mesh.position.z - playerSphere.center.z);
        if (dz < 1.4) {
          const dy = Math.abs(obs.mesh.position.y - playerSphere.center.y);
          const dx = Math.abs(obs.mesh.position.x - playerSphere.center.x);
          // 如果未穿过空隙或者撞到了侧边立柱
          if (dx < 3.2 && dy < 1.9) {
            return { hit: true, obstacle: obs };
          }
        }
      } else {
        const distSq = obs.mesh.position.distanceToSquared(playerSphere.center);
        const minDist = obs.radius + playerSphere.radius;
        if (distSq < minDist * minDist) {
          return { hit: true, obstacle: obs };
        }
      }
    }
    return { hit: false };
  }

  // 超空间 EMP 震荡波：清空前方 maxDistance 米范围内的所有障碍物
  clearAhead(maxDistance = 120, onExplode = null) {
    const cleared = [];
    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      const obs = this.obstacles[i];
      // 处于战机前方且在指定距离内 (z <= 5 && z >= -maxDistance)
      if (obs.mesh.position.z <= 5 && obs.mesh.position.z >= -maxDistance) {
        const pos = obs.mesh.position.clone();
        this.scene.remove(obs.mesh);
        this.obstacles.splice(i, 1);
        cleared.push(pos);
        if (onExplode) {
          onExplode(pos, obs.type);
        }
      }
    }
    return cleared;
  }
}
