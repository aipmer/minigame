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
    // 1. 全局深空双色半球漫射光 (天顶亮冷天蓝 + 底部深空紫罗兰，全角度消除死黑)
    const hemiLight = new THREE.HemisphereLight(0xdbeafe, 0x581c87, 2.8);
    this.scene.add(hemiLight);

    // 2. 基础白光漫反射环境光 (提供 100% 真实纯正反射率，让机身钛金白亮清晰)
    const ambientLight = new THREE.AmbientLight(0xffffff, 2.0);
    this.scene.add(ambientLight);

    // 3. 远方主恒星定向光 (纯净日光白，照亮战机与陨石向光面)
    const dirLight = new THREE.DirectionalLight(0xffffff, 3.8);
    dirLight.position.set(25, 45, 10);
    this.scene.add(dirLight);

    // 4. 强力正前方逆光轮廓光 (Backlight / Rim Light: 从远方深处 -Z 照射，为所有战机边缘与陨石勾勒锐利冰蓝边缘)
    const rimBackLight = new THREE.DirectionalLight(0x38bdf8, 3.2);
    rimBackLight.position.set(0, 12, -180);
    this.scene.add(rimBackLight);

    // 5. 侧后方暖金副补光 (金琥珀暖光，丰富冷暖对比)
    const subLight = new THREE.DirectionalLight(0xfbbf24, 2.2);
    subLight.position.set(-30, -15, 30);
    this.scene.add(subLight);
  }

  // 生成软边缘圆形发光星辰纹理
  createSoftStarTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');

    const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 26);
    grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
    grad.addColorStop(0.25, 'rgba(140, 230, 255, 0.85)');
    grad.addColorStop(0.65, 'rgba(0, 100, 255, 0.25)');
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

    const cCyan = new THREE.Color(0x38bdf8);
    const cWhite = new THREE.Color(0xffffff);
    const cPurple = new THREE.Color(0xc084fc);
    const cAmber = new THREE.Color(0xfde047);

    for (let i = 0; i < this.starCount; i++) {
      const i3 = i * 3;
      positions[i3] = (Math.random() - 0.5) * 120;
      positions[i3 + 1] = (Math.random() - 0.5) * 85;
      positions[i3 + 2] = -Math.random() * 500;

      velocities[i] = 1.0 + Math.random() * 2.0;

      const rnd = Math.random();
      const col = rnd < 0.5 ? cWhite : rnd < 0.75 ? cCyan : rnd < 0.9 ? cPurple : cAmber;
      colors[i3] = col.r;
      colors[i3 + 1] = col.g;
      colors[i3 + 2] = col.b;
    }

    this.starGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.starGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const starTexture = this.createSoftStarTexture();
    const starMaterial = new THREE.PointsMaterial({
      size: 0.35, // 精致微粒光点，杜绝贴近相机时变成巨大光球
      map: starTexture,
      vertexColors: true,
      transparent: true,
      opacity: 0.88,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.stars = new THREE.Points(this.starGeometry, starMaterial);
    this.scene.add(this.stars);

    this.starPositions = positions;
    this.starVelocities = velocities;
  }

  // 赛博朋克深空流光光轨地峡 (降低地网杂色，凸显战机主体)
  initCyberCanyon() {
    // 1. 底层高频微光网格地面 (地面位于 y = -6.5，采用沉稳冷钢蓝，彻底不干扰战机轮廓)
    const floorGeo = new THREE.PlaneGeometry(64, 480, 24, 80);
    floorGeo.rotateX(-Math.PI / 2);

    const floorMat = new THREE.MeshBasicMaterial({
      color: 0x0369a1,
      wireframe: true,
      transparent: true,
      opacity: 0.14,
      blending: THREE.NormalBlending,
    });

    this.canyonFloor = new THREE.Mesh(floorGeo, floorMat);
    this.canyonFloor.position.set(0, -6.5, -200);
    this.scene.add(this.canyonFloor);

    // 航道双侧高光引导光轨 (左右两条高亮青色激光标线)
    const railGeo = new THREE.BoxGeometry(0.12, 0.08, 480);
    const railMat = new THREE.MeshBasicMaterial({ color: 0x00f2fe });
    const leftRail = new THREE.Mesh(railGeo, railMat);
    leftRail.position.set(-13, -6.45, -200);
    this.scene.add(leftRail);

    const rightRail = leftRail.clone();
    rightRail.position.x = 13;
    this.scene.add(rightRail);

    // 2. 顶层能量天花网格 (顶层位于 y = 10.5，深紫星际微光)
    const ceilingGeo = new THREE.PlaneGeometry(64, 480, 24, 80);
    ceilingGeo.rotateX(Math.PI / 2);

    const ceilingMat = new THREE.MeshBasicMaterial({
      color: 0x6d28d9,
      wireframe: true,
      transparent: true,
      opacity: 0.10,
      blending: THREE.NormalBlending,
    });

    this.canyonCeiling = new THREE.Mesh(ceilingGeo, ceilingMat);
    this.canyonCeiling.position.set(0, 10.5, -200);
    this.scene.add(this.canyonCeiling);
  }

  // 航道两侧霓虹信标立柱
  initSpacePillars() {
    this.pillarGroup = new THREE.Group();
    this.pillars = [];
    this.pillarCount = 12;
    this.pillarSpacing = 45;

    const pillarGeo = new THREE.CylinderGeometry(0.18, 0.18, 18, 8);
    const pillarMatLeft = new THREE.MeshBasicMaterial({
      color: 0x00f2fe,
      transparent: true,
      opacity: 0.55,
      blending: THREE.AdditiveBlending,
    });
    const pillarMatRight = new THREE.MeshBasicMaterial({
      color: 0xff00aa,
      transparent: true,
      opacity: 0.55,
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

      // 当星辰接近战机前方时即刻回收重置，绝不穿越战机与相机之间的视锥空间
      if (pos[i3 + 2] > playerZ - 2) {
        pos[i3 + 2] = playerZ - 450 - Math.random() * 60;
        pos[i3] = (Math.random() - 0.5) * 120;
        pos[i3 + 1] = (Math.random() - 0.5) * 85;
      }
    }
    this.starGeometry.attributes.position.needsUpdate = true;

    // 2. 赛博网格地面与穹顶高速向后流动
    const moveZ = currentSpeed * delta;
    this.canyonOffsetZ = ((this.canyonOffsetZ || 0) + moveZ) % 40;
    this.canyonFloor.position.z = -180 + this.canyonOffsetZ;
    this.canyonCeiling.position.z = this.canyonFloor.position.z;

    // 3. 航道两侧霓虹信标迎面飞掠
    for (let i = 0; i < this.pillars.length; i++) {
      const p = this.pillars[i];
      p.z += moveZ;
      if (p.z > 20) {
        p.z -= this.pillarCount * this.pillarSpacing;
      }
      p.pLeft.position.z = p.z;
      p.pRight.position.z = p.z;
    }
  }
}
