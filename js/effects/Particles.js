import * as THREE from 'three';

export class ParticleSystem {
  constructor(scene) {
    this.scene = scene;
    this.bursts = [];
  }

  // 生成进食粒子爆炸
  spawnEatBurst(position, color) {
    this._createBurst(position, color, 30, 0.5, 2.0);
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
  }
}
