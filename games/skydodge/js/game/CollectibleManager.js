// ═══════════════════════════════════════════
// 能量与道具收集系统 (CollectibleManager)
// ═══════════════════════════════════════════
import * as THREE from 'three';

export class CollectibleManager {
  constructor(scene, modelLoader) {
    this.scene = scene;
    this.modelLoader = modelLoader;
    this.items = [];

    this.spawnDistance = 220;
    this.nextSpawnZ = -20;
    this.spacing = 18;
  }

  reset() {
    for (const item of this.items) {
      this.scene.remove(item.mesh);
    }
    this.items = [];
    this.nextSpawnZ = -20;
  }

  update(delta, playerPos, isBoosting) {
    // 1. 随航程持续向前生成能量球与稀有道具
    while (this.nextSpawnZ > playerPos.z - this.spawnDistance) {
      this.spawnWave(this.nextSpawnZ);
      this.nextSpawnZ -= this.spacing;
    }

    // 磁吸与自转更新
    const magnetRadius = isBoosting ? 10.0 : 4.5;
    const magnetSpeed = isBoosting ? 26.0 : 18.0;

    for (let i = this.items.length - 1; i >= 0; i--) {
      const item = this.items[i];
      const mesh = item.mesh;

      // 自转动画
      mesh.rotation.y += delta * 2.5;
      mesh.rotation.x += delta * 1.5;

      // 磁吸吸附逻辑
      const dist = mesh.position.distanceTo(playerPos);
      if (dist < magnetRadius) {
        const dir = new THREE.Vector3().subVectors(playerPos, mesh.position).normalize();
        mesh.position.addScaledVector(dir, magnetSpeed * delta);
      }

      // 超出身后则移除
      if (mesh.position.z > playerPos.z + 20) {
        this.scene.remove(mesh);
        this.items.splice(i, 1);
      }
    }
  }

  spawnWave(z) {
    const rand = Math.random();

    if (rand < 0.12) {
      // 12% 概率生成稀有等离子护盾球
      this.spawnShield(
        (Math.random() - 0.5) * 12,
        -1.5 + Math.random() * 6,
        z
      );
    } else {
      // 串状引导能量晶石 (3 ~ 5 颗连成直线或弧线，引导安全通道)
      const count = 3 + Math.floor(Math.random() * 3);
      const startX = (Math.random() - 0.5) * 12;
      const startY = -1 + Math.random() * 5;
      const deltaX = (Math.random() - 0.5) * 1.2;

      for (let i = 0; i < count; i++) {
        this.spawnEnergyCore(
          startX + i * deltaX,
          startY,
          z - i * 4.5
        );
      }
    }
  }

  spawnEnergyCore(x, y, z) {
    const mesh = this.modelLoader.getModel('energy_core');
    mesh.position.set(x, y, z);
    this.scene.add(mesh);

    this.items.push({
      type: 'energy_core',
      mesh: mesh,
      radius: 1.1,
      points: 100,
    });
  }

  spawnShield(x, y, z) {
    const mesh = this.modelLoader.getModel('shield_orb');
    mesh.position.set(x, y, z);
    this.scene.add(mesh);

    this.items.push({
      type: 'shield_orb',
      mesh: mesh,
      radius: 1.3,
      points: 250,
    });
  }

  // 拾取碰撞检测
  checkPickup(playerSphere) {
    const collected = [];

    for (let i = this.items.length - 1; i >= 0; i--) {
      const item = this.items[i];
      const distSq = item.mesh.position.distanceToSquared(playerSphere.center);
      const minDist = item.radius + playerSphere.radius;

      if (distSq < minDist * minDist) {
        collected.push(item);
        this.scene.remove(item.mesh);
        this.items.splice(i, 1);
      }
    }

    return collected;
  }
}
