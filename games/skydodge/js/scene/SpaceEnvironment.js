// ═══════════════════════════════════════════
// 深空跃迁与赛博光轨环境 (SpaceEnvironment)
// ═══════════════════════════════════════════
import * as THREE from 'three';

export class SpaceEnvironment {
  constructor(scene) {
    this.scene = scene;
    this.starCount = 1800;
    this.stars = null;
    this.starGeometry = null;
    this.starPositions = null;
    this.starVelocities = null;

    this.initLights();
    this.initStarfield();
    this.initCyberGridRings();
  }

  initLights() {
    // 环境基底光
    const ambientLight = new THREE.AmbientLight(0x1b2745, 1.4);
    this.scene.add(ambientLight);

    // 主方向光 (模拟远方超新星/恒星)
    const dirLight = new THREE.DirectionalLight(0x00f2fe, 2.2);
    dirLight.position.set(20, 40, 30);
    this.scene.add(dirLight);

    // 辅助侧光 (深紫赛博氛围)
    const fillLight = new THREE.DirectionalLight(0xff007f, 1.2);
    fillLight.position.set(-25, -20, -30);
    this.scene.add(fillLight);
  }

  initStarfield() {
    this.starGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(this.starCount * 3);
    const velocities = new Float32Array(this.starCount);
    const colors = new Float32Array(this.starCount * 3);

    const c1 = new THREE.Color(0x00f2fe);
    const c2 = new THREE.Color(0xffffff);
    const c3 = new THREE.Color(0x9d4edd);

    for (let i = 0; i < this.starCount; i++) {
      const i3 = i * 3;
      // 围绕 Z 轴分布在一个长隧道圆柱空间内
      positions[i3] = (Math.random() - 0.5) * 80;
      positions[i3 + 1] = (Math.random() - 0.5) * 60;
      positions[i3 + 2] = -Math.random() * 450;

      velocities[i] = 1.0 + Math.random() * 1.5;

      const mixed = Math.random();
      const color = mixed < 0.6 ? c2 : mixed < 0.85 ? c1 : c3;
      colors[i3] = color.r;
      colors[i3 + 1] = color.g;
      colors[i3 + 2] = color.b;
    }

    this.starGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.starGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const starMaterial = new THREE.PointsMaterial({
      size: 1.2,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.stars = new THREE.Points(this.starGeometry, starMaterial);
    this.scene.add(this.stars);

    this.starPositions = positions;
    this.starVelocities = velocities;
  }

  initCyberGridRings() {
    // 创建在远处连续刷新的赛博几何指引环 (Guide Torus / Portals)
    this.ringGroup = new THREE.Group();
    this.rings = [];
    this.ringSpacing = 40;
    this.ringCount = 10;

    const ringGeo = new THREE.TorusGeometry(18, 0.08, 8, 36);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x00f2fe,
      transparent: true,
      opacity: 0.25,
      blending: THREE.AdditiveBlending,
    });

    for (let i = 0; i < this.ringCount; i++) {
      const ring = new THREE.Mesh(ringGeo, ringMat.clone());
      ring.position.z = -i * this.ringSpacing;
      this.ringGroup.add(ring);
      this.rings.push(ring);
    }

    this.scene.add(this.ringGroup);
  }

  update(delta, currentSpeed, playerZ = 0) {
    // 1. 星空流光更新
    const pos = this.starPositions;
    const speedFactor = currentSpeed * delta * 1.8;

    for (let i = 0; i < this.starCount; i++) {
      const i3 = i * 3;
      pos[i3 + 2] += speedFactor * this.starVelocities[i];

      // 超出玩家身后则循环重置到前方向远处
      if (pos[i3 + 2] > playerZ + 20) {
        pos[i3 + 2] = playerZ - 400 - Math.random() * 50;
        pos[i3] = (Math.random() - 0.5) * 80;
        pos[i3 + 1] = (Math.random() - 0.5) * 60;
      }
    }
    this.starGeometry.attributes.position.needsUpdate = true;

    // 2. 空间导航光环循环滚动
    for (let i = 0; i < this.rings.length; i++) {
      const ring = this.rings[i];
      if (ring.position.z > playerZ + 20) {
        ring.position.z -= this.ringCount * this.ringSpacing;
      }
      ring.rotation.z += delta * 0.2;
    }
  }
}
