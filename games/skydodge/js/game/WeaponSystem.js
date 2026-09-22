// ═══════════════════════════════════════════
// 机载等离子激光武器系统 (WeaponSystem)
// ═══════════════════════════════════════════
import * as THREE from 'three';

export class WeaponSystem {
  constructor(scene) {
    this.scene = scene;

    // 弹药池与射速控制 (扩容至 90 满足过载三叉齐射高频开火)
    this.poolSize = 90;
    this.boltPool = [];
    this.fireCooldown = 0.16; // 基础射速约 6 发/秒
    this.overdriveCooldown = 0.085; // 火力过载超频至约 12 发/秒三叉齐射
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
    const boltGeo = new THREE.CylinderGeometry(0.09, 0.09, 2.6, 8);
    boltGeo.rotateX(Math.PI / 2); // 转向前方

    // 核心发光材质
    const boltMat = new THREE.MeshBasicMaterial({
      color: 0x00f2fe,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
    });

    for (let i = 0; i < this.poolSize; i++) {
      const mesh = new THREE.Mesh(boltGeo, boltMat.clone());
      mesh.visible = false;
      this.scene.add(mesh);

      this.boltPool.push({
        mesh: mesh,
        active: false,
        velocity: new THREE.Vector3(0, 0, this.boltSpeed),
        life: 0,
        colliderRadius: 0.9,
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

  // 尝试发射等离子激光 (支持普通双翼交替射击与火力过载三叉散射)
  tryFire(shipPos, shipRoll, audio, isOverdrive = false) {
    if (this.cooldownTimer > 0) return false;

    if (isOverdrive) {
      // ════ 火力过载模式：三叉散射等离子重炮齐射 ════
      const spreadConfigs = [
        { vx: 0, vz: -215, xOff: 0, rotY: 0, rotZ: shipRoll },
        { vx: -28, vz: -210, xOff: -0.9, rotY: 0.13, rotZ: shipRoll - 0.1 },
        { vx: 28, vz: -210, xOff: 0.9, rotY: -0.13, rotZ: shipRoll + 0.1 },
      ];

      for (const cfg of spreadConfigs) {
        const bolt = this.boltPool.find((b) => !b.active);
        if (!bolt) break;

        const spawnX = shipPos.x + cfg.xOff * Math.cos(shipRoll);
        const spawnY = shipPos.y + cfg.xOff * Math.sin(shipRoll) - 0.05;
        const spawnZ = shipPos.z - 1.3;

        bolt.mesh.position.set(spawnX, spawnY, spawnZ);
        bolt.mesh.rotation.set(0, cfg.rotY, cfg.rotZ);
        bolt.mesh.scale.set(1.4, 1.4, 1.4);
        bolt.mesh.material.color.setHex(0xff9900); // 炽热橙金等离子重炮
        bolt.velocity.set(cfg.vx, 0, cfg.vz);
        bolt.active = true;
        bolt.mesh.visible = true;
        bolt.life = 0;
      }

      this.cooldownTimer = this.overdriveCooldown;

      if (audio && audio.playOverdriveLaser) {
        audio.playOverdriveLaser();
      } else if (audio && audio.playLaser) {
        audio.playLaser();
      }
      return true;
    }

    // ════ 常规模式：左右翼炮口交替发射天青等离子激光 ════
    const bolt = this.boltPool.find((b) => !b.active);
    if (!bolt) return false;

    const wingOffset = this.useLeftWing ? -1.15 : 1.15;
    this.useLeftWing = !this.useLeftWing;

    const spawnX = shipPos.x + wingOffset * Math.cos(shipRoll);
    const spawnY = shipPos.y + wingOffset * Math.sin(shipRoll) - 0.05;
    const spawnZ = shipPos.z - 1.2;

    bolt.mesh.position.set(spawnX, spawnY, spawnZ);
    bolt.mesh.rotation.set(0, 0, shipRoll);
    bolt.mesh.scale.set(1.0, 1.0, 1.0);
    bolt.mesh.material.color.setHex(0x00f2fe); // 天蓝常规等离子
    bolt.velocity.set(0, 0, this.boltSpeed);
    bolt.active = true;
    bolt.mesh.visible = true;
    bolt.life = 0;

    this.cooldownTimer = this.fireCooldown;

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

      // 支持三维初速度推演 (三叉散射)
      bolt.mesh.position.x += bolt.velocity.x * delta;
      bolt.mesh.position.y += bolt.velocity.y * delta;
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

              // 回调加分与击杀反馈，获取当前连击数
              let currentCombo = 1;
              if (onHitCallback) {
                currentCombo = onHitCallback(obs, hitPos, 200) || 1; // 击碎陨石加 200 分
              }

              if (audio && audio.playAsteroidExplode) {
                audio.playAsteroidExplode(currentCombo);
              } else if (audio && audio.playExplosion) {
                audio.playExplosion();
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
