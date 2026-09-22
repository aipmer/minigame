import * as THREE from 'three';

export class ParticleSystem {
  constructor(scene) {
    this.scene = scene;
    this.bursts = [];
    this.trails = [];
    this.trailTimer = 0;
  }

  // 生成流光拖尾粒子 (萌动星尘、浪漫樱花、梦幻泡泡)
  spawnTrail(position, trailType = 'stardust') {
    if (!trailType || trailType === 'none') return;
    if (this.trails.length > 80) return; // 性能上限保护

    let color = 0xFBBF24;
    let count = 2;
    let size = 0.16;
    let lifetime = 0.6;
    let vyBase = 0.8;
    let spread = 0.3;

    if (trailType === 'stardust') {
      color = 0xFBBF24;
      count = 2;
      size = 0.16;
      lifetime = 0.55;
      vyBase = 0.8;
      spread = 0.25;
    } else if (trailType === 'cherry') {
      color = 0xF472B6;
      count = 2;
      size = 0.20;
      lifetime = 0.85;
      vyBase = 0.3;
      spread = 0.4;
    } else if (trailType === 'bubbles') {
      color = 0x38BDF8;
      count = 2;
      size = 0.24;
      lifetime = 0.75;
      vyBase = 1.1;
      spread = 0.2;
    }

    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      positions[i * 3] = position.x + (Math.random() - 0.5) * spread;
      positions[i * 3 + 1] = position.y + (Math.random() - 0.5) * 0.15;
      positions[i * 3 + 2] = position.z + (Math.random() - 0.5) * spread;

      velocities[i * 3] = (Math.random() - 0.5) * 0.5;
      velocities[i * 3 + 1] = vyBase + Math.random() * 0.4;
      velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.5;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
      color: color,
      size: size,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    const points = new THREE.Points(geometry, material);
    this.scene.add(points);

    this.trails.push({
      points,
      velocities,
      lifetime,
      age: 0
    });
  }

  // 生成进食粒子爆炸
  spawnEatBurst(position, color) {
    this._createBurst(position, color, 30, 0.5, 2.0);
  }

  // 生成碎石爆炸
  spawnRockShatter(position) {
    this._createBurst(position, 0x998877, 50, 0.7, 5.0);
    this._createBurst(position, 0xFFD700, 25, 0.5, 3.5);
  }

  // 生成死亡粒子爆炸
  spawnDeathBurst(position) {
    this._createBurst(position, 0xff3300, 40, 1.0, 4.0);
  }

  // 内部方法：创建粒子爆炸
  _createBurst(position, color, count, lifetime, speedRange) {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      positions[i * 3] = position.x;
      positions[i * 3 + 1] = position.y;
      positions[i * 3 + 2] = position.z;

      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      const speed = Math.random() * speedRange;

      velocities[i * 3] = Math.sin(phi) * Math.cos(theta) * speed;
      velocities[i * 3 + 1] = Math.sin(phi) * Math.sin(theta) * speed + speed * 0.5; // slight upward bias
      velocities[i * 3 + 2] = Math.cos(phi) * speed;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    
    const material = new THREE.PointsMaterial({
      color: color,
      size: 0.2,
      transparent: true,
      opacity: 1.0,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    const points = new THREE.Points(geometry, material);
    this.scene.add(points);

    this.bursts.push({
      points,
      velocities,
      lifetime,
      age: 0,
      initialLifetime: lifetime
    });
  }

  // 更新所有粒子系统
  update(delta) {
    for (let i = this.bursts.length - 1; i >= 0; i--) {
      const burst = this.bursts[i];
      burst.age += delta;

      if (burst.age >= burst.lifetime) {
        this.scene.remove(burst.points);
        burst.points.geometry.dispose();
        burst.points.material.dispose();
        this.bursts.splice(i, 1);
        continue;
      }

      const positions = burst.points.geometry.attributes.position.array;
      for (let j = 0; j < positions.length / 3; j++) {
        // Apply velocity
        positions[j * 3] += burst.velocities[j * 3] * delta;
        positions[j * 3 + 1] += burst.velocities[j * 3 + 1] * delta;
        positions[j * 3 + 2] += burst.velocities[j * 3 + 2] * delta;

        // Apply gravity
        burst.velocities[j * 3 + 1] -= 9.8 * delta;
      }
      burst.points.geometry.attributes.position.needsUpdate = true;

      // Fade out
      burst.points.material.opacity = 1 - (burst.age / burst.lifetime);
    }

    // 2. 更新拖尾粒子动画
    for (let i = this.trails.length - 1; i >= 0; i--) {
      const trail = this.trails[i];
      trail.age += delta;

      if (trail.age >= trail.lifetime) {
        this.scene.remove(trail.points);
        trail.points.geometry.dispose();
        trail.points.material.dispose();
        this.trails.splice(i, 1);
        continue;
      }

      const positions = trail.points.geometry.attributes.position.array;
      for (let j = 0; j < positions.length / 3; j++) {
        positions[j * 3] += trail.velocities[j * 3] * delta;
        positions[j * 3 + 1] += trail.velocities[j * 3 + 1] * delta;
        positions[j * 3 + 2] += trail.velocities[j * 3 + 2] * delta;
      }
      trail.points.geometry.attributes.position.needsUpdate = true;

      // 渐隐淡出
      trail.points.material.opacity = 0.85 * (1 - (trail.age / trail.lifetime));
    }
  }
}
