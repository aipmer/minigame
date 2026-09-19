// ═══════════════════════════════════════════
// 能量与道具收集系统 (CollectibleManager)
// ═══════════════════════════════════════════
import * as THREE from 'three';

export class CollectibleManager {
  constructor(scene, modelLoader) {
    this.scene = scene;
    this.modelLoader = modelLoader;
    this.items = [];

    this.spawnDistance = 240;
    this.spawnDistanceTraveled = 0;
    this.spacing = 16;
  }

  reset() {
    for (const item of this.items) {
      this.scene.remove(item.mesh);
    }
    this.items = [];
    this.spawnDistanceTraveled = 0;

    // 初始在前方排布一组引导晶石
    this.spawnWave(-35);
    this.spawnWave(-65);
    this.spawnWave(-100);
  }

  update(delta, playerPos, isBoosting, currentSpeed = 36) {
    // 1. 随航程极速向前持续生成
    this.spawnDistanceTraveled += currentSpeed * delta;
    while (this.spawnDistanceTraveled >= this.spacing) {
      this.spawnWave(-this.spawnDistance);
      this.spawnDistanceTraveled -= this.spacing;
    }

    // 2. 道具向玩家迎面飞来 (+Z 轴运动)
    const moveZ = currentSpeed * delta;
    const magnetRadius = isBoosting ? 11.0 : 5.0;
    const magnetSpeed = isBoosting ? 28.0 : 18.0;

    for (let i = this.items.length - 1; i >= 0; i--) {
      const item = this.items[i];
      const mesh = item.mesh;

      // 沿 Z 轴向玩家推进
      mesh.position.z += moveZ;

      // 自转动画
      mesh.rotation.y += delta * 2.8;
      mesh.rotation.x += delta * 1.6;

      // 磁吸吸附逻辑
      const dist = mesh.position.distanceTo(playerPos);
      if (dist < magnetRadius) {
        const dir = new THREE.Vector3().subVectors(playerPos, mesh.position).normalize();
        mesh.position.addScaledVector(dir, magnetSpeed * delta);
      }

      // 超出玩家身后则销毁回收
      if (mesh.position.z > 20) {
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
