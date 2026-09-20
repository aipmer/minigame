// ═══════════════════════════════════════════
// 机载等离子激光武器系统 (WeaponSystem)
// ═══════════════════════════════════════════
import * as THREE from 'three';

export class WeaponSystem {
  constructor(scene) {
    this.scene = scene;

    // 弹药池与射速控制
    this.poolSize = 40;
    this.boltPool = [];
    this.fireCooldown = 0.16; // 约 6 发/秒，射击节奏爽快
    this.cooldownTimer = 0;
    this.useLeftWing = true;

    // 激光弹道初速度 (极速向前方 -Z 飞行)
    this.boltSpeed = -190;
    this.maxBoltLife = 1.6;

    // 初始化弹道对象池
    this.initPool();
  }

  initPool() {
    // 激光束几何体 (沿 Z 轴拉长的圆柱光束)
    const boltGeo = new THREE.CylinderGeometry(0.08, 0.08, 2.4, 8);
    boltGeo.rotateX(Math.PI / 2); // 转向前方

    // 核心发光材质 + 双层辉光外壳
    const boltMat = new THREE.MeshBasicMaterial({
      color: 0x00f2fe,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
    });

    for (let i = 0; i < this.poolSize; i++) {
      const mesh = new THREE.Mesh(boltGeo, boltMat);
      mesh.visible = false;
      this.scene.add(mesh);

      this.boltPool.push({
        mesh: mesh,
        active: false,
        velocity: new THREE.Vector3(0, 0, this.boltSpeed),
        life: 0,
        colliderRadius: 0.8,
      });
    }
  }

  reset() {
    for (const bolt of this.boltPool) {
      bolt.active = false;
      bolt.mesh.visible = false;
    }
    this.cooldownTimer = 0;
    this.useLeftWing = true;
  }

  // 尝试发射等离子激光 (支持键盘与触控开火)
  tryFire(shipPos, shipRoll, audio) {
    if (this.cooldownTimer > 0) return false;

    // 获取空闲激光弹体
    const bolt = this.boltPool.find((b) => !b.active);
    if (!bolt) return false;

    // 机翼左右炮口交替发射 (根据侧倾角自适应旋转)
    const wingOffset = this.useLeftWing ? -1.15 : 1.15;
    this.useLeftWing = !this.useLeftWing;

    const spawnX = shipPos.x + wingOffset * Math.cos(shipRoll);
    const spawnY = shipPos.y + wingOffset * Math.sin(shipRoll) - 0.05;
    const spawnZ = shipPos.z - 1.2;

    bolt.mesh.position.set(spawnX, spawnY, spawnZ);
    bolt.mesh.rotation.z = shipRoll;
    bolt.active = true;
    bolt.mesh.visible = true;
    bolt.life = 0;

    this.cooldownTimer = this.fireCooldown;

    // 播放激光发射爆鸣音
    if (audio && audio.playLaser) {
      audio.playLaser();
    }

    return true;
  }

  update(delta, obstacleManager, particleFX, audio, onHitCallback) {
    if (this.cooldownTimer > 0) {
      this.cooldownTimer -= delta;
    }

    // 遍历所有存活激光弹体
    for (const bolt of this.boltPool) {
      if (!bolt.active) continue;

      bolt.mesh.position.z += bolt.velocity.z * delta;
      bolt.life += delta;

      // 超时或飞出视野自动回收
      if (bolt.life >= this.maxBoltLife || bolt.mesh.position.z < -260) {
        bolt.active = false;
        bolt.mesh.visible = false;
        continue;
      }

      // 与障碍物进行碰撞检测 (击毁判定)
      if (obstacleManager && obstacleManager.obstacles) {
        for (let i = obstacleManager.obstacles.length - 1; i >= 0; i--) {
          const obs = obstacleManager.obstacles[i];
          if (!obs || !obs.mesh) continue;

          // 计算距离
          const dx = bolt.mesh.position.x - obs.mesh.position.x;
          const dy = bolt.mesh.position.y - obs.mesh.position.y;
          const dz = bolt.mesh.position.z - obs.mesh.position.z;
          const distSq = dx * dx + dy * dy + dz * dz;
          const hitThreshold = obs.radius + bolt.colliderRadius;

          if (distSq < hitThreshold * hitThreshold) {
            // 命中击中！
            bolt.active = false;
            bolt.mesh.visible = false;

            const hitPos = bolt.mesh.position.clone();

            if (obs.type === 'asteroid') {
              // 击碎陨石！
              if (particleFX && particleFX.emitExplosion) {
                particleFX.emitExplosion(hitPos);
              }
              if (audio && audio.playAsteroidExplode) {
                audio.playAsteroidExplode();
              } else if (audio && audio.playExplosion) {
                audio.playExplosion();
              }

              // 回调加分与击杀反馈
              if (onHitCallback) {
                onHitCallback(obs, hitPos, 200); // 击碎陨石加 200 分
              }

              // 从场景与数组中移除该陨石
              this.scene.remove(obs.mesh);
              obstacleManager.obstacles.splice(i, 1);
            } else if (obs.type === 'laser_gate') {
              // 激光门受到冲击产生等离子火花
              if (particleFX && particleFX.emitHitSparks) {
                particleFX.emitHitSparks(hitPos);
              }
            }

            break; // 该弹体已被消耗
          }
        }
      }
    }
  }
}
