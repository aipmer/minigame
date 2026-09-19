// ═══════════════════════════════════════════
// 粒子与视觉特效系统 (ParticleFX)
// ═══════════════════════════════════════════
import * as THREE from 'three';

export class ParticleFX {
  constructor(scene) {
    this.scene = scene;

    // 活跃粒子数组
    this.activeBursts = [];

    // 尾气粒子缓冲
    this.initThrusterTrails();
  }

  initThrusterTrails() {
    this.trailCount = 80;
    this.trailGeo = new THREE.BufferGeometry();
    this.trailPositions = new Float32Array(this.trailCount * 3);
    this.trailColors = new Float32Array(this.trailCount * 3);
    this.trailLifes = new Float32Array(this.trailCount);
    this.trailVelocities = new Float32Array(this.trailCount * 3);

    for (let i = 0; i < this.trailCount; i++) {
      this.trailLifes[i] = 0; // 初始未激活
    }

    this.trailGeo.setAttribute('position', new THREE.BufferAttribute(this.trailPositions, 3));
    this.trailGeo.setAttribute('color', new THREE.BufferAttribute(this.trailColors, 3));

    const trailMat = new THREE.PointsMaterial({
      size: 0.9,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.trailPoints = new THREE.Points(this.trailGeo, trailMat);
    this.scene.add(this.trailPoints);
    this.trailIndex = 0;
  }

  // 每帧由引擎喷口发射粒子
  emitThruster(shipPos, isBoosting) {
    const pX = [shipPos.x - 0.45, shipPos.x + 0.45];
    const pY = shipPos.y - 0.05;
    const pZ = shipPos.z - 1.6;

    for (let k = 0; k < 2; k++) {
      const idx = this.trailIndex;
      const i3 = idx * 3;

      this.trailPositions[i3] = pX[k] + (Math.random() - 0.5) * 0.12;
      this.trailPositions[i3 + 1] = pY + (Math.random() - 0.5) * 0.12;
      this.trailPositions[i3 + 2] = pZ;

      // 喷射初速度 (向后喷涌)
      this.trailVelocities[i3] = (Math.random() - 0.5) * 1.5;
      this.trailVelocities[i3 + 1] = (Math.random() - 0.5) * 1.5;
      this.trailVelocities[i3 + 2] = -(isBoosting ? 35 : 18);

      if (isBoosting) {
        this.trailColors[i3] = 1.0;
        this.trailColors[i3 + 1] = 0.55;
        this.trailColors[i3 + 2] = 0.1;
      } else {
        this.trailColors[i3] = 0.0;
        this.trailColors[i3 + 1] = 0.95;
        this.trailColors[i3 + 2] = 1.0;
      }

      this.trailLifes[idx] = 0.35; // 存活 0.35 秒
      this.trailIndex = (this.trailIndex + 1) % this.trailCount;
    }
  }

  // 拾取晶石时的环形闪光
  createPickupBurst(pos, colorHex = 0x00ffcc) {
    const count = 28;
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const vels = [];

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      positions[i3] = pos.x;
      positions[i3 + 1] = pos.y;
      positions[i3 + 2] = pos.z;

      const angle = Math.random() * Math.PI * 2;
      const speed = 4 + Math.random() * 8;
      vels.push(new THREE.Vector3(
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
        (Math.random() - 0.5) * speed
      ));
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({
      size: 1.2,
      color: colorHex,
      transparent: true,
      opacity: 1,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const points = new THREE.Points(geo, mat);
    this.scene.add(points);

    this.activeBursts.push({
      mesh: points,
      geo,
      positions,
      vels,
      life: 0.5,
      maxLife: 0.5,
    });
  }

  // 战机撞击爆炸粒子飞散
  createExplosion(pos) {
    const count = 90;
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const vels = [];

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      positions[i3] = pos.x;
      positions[i3 + 1] = pos.y;
      positions[i3 + 2] = pos.z;

      const v = new THREE.Vector3(
        (Math.random() - 0.5) * 24,
        (Math.random() - 0.5) * 24,
        (Math.random() - 0.5) * 24
      );
      vels.push(v);

      colors[i3] = 1.0;
      colors[i3 + 1] = Math.random() < 0.5 ? 0.3 : 0.8;
      colors[i3 + 2] = 0.05;
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const mat = new THREE.PointsMaterial({
      size: 1.6,
      vertexColors: true,
      transparent: true,
      opacity: 1,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const points = new THREE.Points(geo, mat);
    this.scene.add(points);

    this.activeBursts.push({
      mesh: points,
      geo,
      positions,
      vels,
      life: 1.1,
      maxLife: 1.1,
    });
  }

  update(delta) {
    // 1. 更新尾焰粒子
    for (let i = 0; i < this.trailCount; i++) {
      if (this.trailLifes[i] > 0) {
        this.trailLifes[i] -= delta;
        const i3 = i * 3;
        this.trailPositions[i3] += this.trailVelocities[i3] * delta;
        this.trailPositions[i3 + 1] += this.trailVelocities[i3 + 1] * delta;
        this.trailPositions[i3 + 2] += this.trailVelocities[i3 + 2] * delta;
      }
    }
    this.trailGeo.attributes.position.needsUpdate = true;

    // 2. 更新瞬态爆破粒子
    for (let i = this.activeBursts.length - 1; i >= 0; i--) {
      const b = this.activeBursts[i];
      b.life -= delta;

      if (b.life <= 0) {
        this.scene.remove(b.mesh);
        b.geo.dispose();
        b.mesh.material.dispose();
        this.activeBursts.splice(i, 1);
        continue;
      }

      const progress = b.life / b.maxLife;
      b.mesh.material.opacity = progress;

      for (let k = 0; k < b.vels.length; k++) {
        const k3 = k * 3;
        b.positions[k3] += b.vels[k].x * delta;
        b.positions[k3 + 1] += b.vels[k].y * delta;
        b.positions[k3 + 2] += b.vels[k].z * delta;
      }
      b.geo.attributes.position.needsUpdate = true;
    }
  }

  reset() {
    for (const b of this.activeBursts) {
      this.scene.remove(b.mesh);
      b.geo.dispose();
      b.mesh.material.dispose();
    }
    this.activeBursts = [];
    for (let i = 0; i < this.trailCount; i++) {
      this.trailLifes[i] = 0;
    }
  }
}
