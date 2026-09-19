// ═══════════════════════════════════════════
// 深空跃迁、羽化星空与赛博光轨地峡 (SpaceEnvironment)
// ═══════════════════════════════════════════
import * as THREE from 'three';

export class SpaceEnvironment {
  constructor(scene) {
    this.scene = scene;
    this.starCount = 550;
    this.stars = null;
    this.starGeometry = null;
    this.starPositions = null;
    this.starVelocities = null;

    this.initLights();
    this.initSoftStarfield();
    this.initCyberCanyon();
    this.initSpacePillars();
  }

  initLights() {
    // 1. 全局深空环境光 (提高基础亮度，消除死黑)
    const ambientLight = new THREE.AmbientLight(0x243b66, 2.0);
    this.scene.add(ambientLight);

    // 2. 主方向光 (深空恒星光源，侧前方照射)
    const dirLight = new THREE.DirectionalLight(0x00f2fe, 3.0);
    dirLight.position.set(25, 45, 15);
    this.scene.add(dirLight);

    // 3. 关键战机背光/轮廓光 (从摄像机上方后方打向战机，保证从背后看金属光泽璀璨)
    this.cameraFollowLight = new THREE.DirectionalLight(0xffffff, 2.8);
    this.cameraFollowLight.position.set(0, 18, 25);
    this.scene.add(this.cameraFollowLight);

    // 4. 下方赛博霓虹反光 (洋红/荧光紫补光)
    const bounceLight = new THREE.DirectionalLight(0xff0088, 2.2);
    bounceLight.position.set(-20, -25, -20);
    this.scene.add(bounceLight);
  }

  // 生成软边缘圆形发光星辰纹理 (彻底告别刺眼方块)
  createSoftStarTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');

    const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 26);
    grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
    grad.addColorStop(0.25, 'rgba(140, 230, 255, 0.8)');
    grad.addColorStop(0.65, 'rgba(0, 100, 255, 0.2)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 64);

    const texture = new THREE.CanvasTexture(canvas);
    return texture;
  }

  initSoftStarfield() {
    this.starGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(this.starCount * 3);
    const velocities = new Float32Array(this.starCount);
    const colors = new Float32Array(this.starCount * 3);

    const cCyan = new THREE.Color(0x00ffff);
    const cWhite = new THREE.Color(0xffffff);
    const cPurple = new THREE.Color(0xd946ef);
    const cAmber = new THREE.Color(0xfbbf24);

    for (let i = 0; i < this.starCount; i++) {
      const i3 = i * 3;
      positions[i3] = (Math.random() - 0.5) * 110;
      positions[i3 + 1] = (Math.random() - 0.5) * 80;
      positions[i3 + 2] = -Math.random() * 500;

      velocities[i] = 1.0 + Math.random() * 2.0;

      const rnd = Math.random();
      const col = rnd < 0.55 ? cWhite : rnd < 0.8 ? cCyan : rnd < 0.93 ? cPurple : cAmber;
      colors[i3] = col.r;
      colors[i3 + 1] = col.g;
      colors[i3 + 2] = col.b;
    }

    this.starGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.starGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const starTexture = this.createSoftStarTexture();
    const starMaterial = new THREE.PointsMaterial({
      size: 0.9,
      map: starTexture,
      vertexColors: true,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.stars = new THREE.Points(this.starGeometry, starMaterial);
    this.scene.add(this.stars);

    this.starPositions = positions;
    this.starVelocities = velocities;
  }

  // 赛博朋克深空流光光栅地峡 (Cyber Canyon Grid)
  initCyberCanyon() {
    // 1. 底层高频流光网格地面 (地面位于 y = -7)
    const floorGeo = new THREE.PlaneGeometry(60, 480, 24, 80);
    floorGeo.rotateX(-Math.PI / 2);

    const floorMat = new THREE.MeshBasicMaterial({
      color: 0x00f2fe,
      wireframe: true,
      transparent: true,
      opacity: 0.22,
      blending: THREE.AdditiveBlending,
    });

    this.canyonFloor = new THREE.Mesh(floorGeo, floorMat);
    this.canyonFloor.position.set(0, -6.5, -200);
    this.scene.add(this.canyonFloor);

    // 2. 顶层能量天花网格 (顶层位于 y = 11)
    const ceilingGeo = new THREE.PlaneGeometry(60, 480, 24, 80);
    ceilingGeo.rotateX(Math.PI / 2);

    const ceilingMat = new THREE.MeshBasicMaterial({
      color: 0x8b5cf6,
      wireframe: true,
      transparent: true,
      opacity: 0.15,
      blending: THREE.AdditiveBlending,
    });

    this.canyonCeiling = new THREE.Mesh(ceilingGeo, ceilingMat);
    this.canyonCeiling.position.set(0, 10.5, -200);
    this.scene.add(this.canyonCeiling);
  }

  // 航道两侧霓虹信标立柱 (Space Energy Pillars)
  initSpacePillars() {
    this.pillarGroup = new THREE.Group();
    this.pillars = [];
    this.pillarCount = 12;
    this.pillarSpacing = 45;

    const pillarGeo = new THREE.CylinderGeometry(0.15, 0.15, 18, 8);
    const pillarMatLeft = new THREE.MeshBasicMaterial({
      color: 0x00f2fe,
      transparent: true,
      opacity: 0.5,
      blending: THREE.AdditiveBlending,
    });
    const pillarMatRight = new THREE.MeshBasicMaterial({
      color: 0xff00aa,
      transparent: true,
      opacity: 0.5,
      blending: THREE.AdditiveBlending,
    });

    for (let i = 0; i < this.pillarCount; i++) {
      const z = -i * this.pillarSpacing;

      const pLeft = new THREE.Mesh(pillarGeo, pillarMatLeft);
      pLeft.position.set(-16, 2, z);
      this.pillarGroup.add(pLeft);

      const pRight = new THREE.Mesh(pillarGeo, pillarMatRight);
      pRight.position.set(16, 2, z);
      this.pillarGroup.add(pRight);

      this.pillars.push({ pLeft, pRight, z });
    }

    this.scene.add(this.pillarGroup);
  }

  update(delta, currentSpeed, playerZ = 0) {
    // 1. 羽化星空流光推演
    const pos = this.starPositions;
    const speedFactor = currentSpeed * delta * 2.2;

    for (let i = 0; i < this.starCount; i++) {
      const i3 = i * 3;
      pos[i3 + 2] += speedFactor * this.starVelocities[i];

      if (pos[i3 + 2] > playerZ + 20) {
        pos[i3 + 2] = playerZ - 450 - Math.random() * 60;
        pos[i3] = (Math.random() - 0.5) * 110;
        pos[i3 + 1] = (Math.random() - 0.5) * 80;
      }
    }
    this.starGeometry.attributes.position.needsUpdate = true;

    // 2. 赛博网格地面与穹顶高速向后流动，呈现强烈的航速感
    const moveZ = currentSpeed * delta;
    this.canyonOffsetZ = ((this.canyonOffsetZ || 0) + moveZ) % 40;
    this.canyonFloor.position.z = -180 + this.canyonOffsetZ;
    this.canyonCeiling.position.z = this.canyonFloor.position.z;

    // 3. 航道两侧霓虹信标迎面极速飞掠 (+Z)
    for (let i = 0; i < this.pillars.length; i++) {
      const p = this.pillars[i];
      p.z += moveZ;
      if (p.z > 20) {
        p.z -= this.pillarCount * this.pillarSpacing;
      }
      p.pLeft.position.z = p.z;
      p.pRight.position.z = p.z;
    }

    // 4. 保持摄像机背光灯紧贴玩家后上方，确保战机后背光辉耀眼
    if (this.cameraFollowLight) {
      this.cameraFollowLight.position.set(0, 14, 18);
    }
  }
}
