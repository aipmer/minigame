// ═══════════════════════════════════════════
// 深空跃迁、羽化星空与赛博光轨地峡 (SpaceEnvironment)
// ═══════════════════════════════════════════
import * as THREE from 'three';

export class SpaceEnvironment {
  constructor(scene) {
    this.scene = scene;
    this.starCount = 680;
    this.stars = null;
    this.starGeometry = null;
    this.starPositions = null;
    this.starVelocities = null;
    this.nebulaGroup = null;

    this.initCosmicNebulaSky();
    this.initLights();
    this.initSoftStarfield();
    this.initCyberCanyon();
    this.initSpacePillars();
  }

  // 1. 壮丽程序化深空星云云团 (Cosmic Nebulae with Additive Blending: 高对比不泛白)
  initCosmicNebulaSky() {
    this.nebulaGroup = new THREE.Group();

    // 生成软质流体星云气团贴图辅助函数
    const createNebulaTexture = (colorCenter, colorMid, colorEdge, width = 512, height = 512) => {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');

      const grad = ctx.createRadialGradient(
        width / 2, height / 2, 10,
        width / 2, height / 2, width / 2 - 10
      );
      grad.addColorStop(0.0, colorCenter);
      grad.addColorStop(0.35, colorMid);
      grad.addColorStop(0.70, colorEdge);
      grad.addColorStop(1.0, 'rgba(0, 0, 0, 0)');

      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      // 叠加多层星尘微粒形成真实宇宙云气
      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      for (let i = 0; i < 45; i++) {
        const x = Math.random() * width;
        const y = Math.random() * height;
        const r = 0.8 + Math.random() * 2.2;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }

      return new THREE.CanvasTexture(canvas);
    };

    // 云团 1：右上方天青宇宙星云 (位于光环行星后方，形成璀璨天光)
    const texCyan = createNebulaTexture(
      'rgba(56, 189, 248, 0.42)',
      'rgba(14, 165, 233, 0.20)',
      'rgba(2, 132, 199, 0.06)'
    );
    const matCyan = new THREE.MeshBasicMaterial({
      map: texCyan,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      fog: false,
    });
    this.nebulaCyan = new THREE.Mesh(new THREE.PlaneGeometry(420, 280), matCyan);
    this.nebulaCyan.position.set(75, 40, -420);
    this.nebulaGroup.add(this.nebulaCyan);

    // 云团 2：左上方壮丽靛紫/玫瑰星云 (丰富冷暖色阶层次)
    const texViolet = createNebulaTexture(
      'rgba(168, 85, 247, 0.38)',
      'rgba(126, 34, 206, 0.18)',
      'rgba(88, 28, 135, 0.05)'
    );
    const matViolet = new THREE.MeshBasicMaterial({
      map: texViolet,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      fog: false,
    });
    this.nebulaViolet = new THREE.Mesh(new THREE.PlaneGeometry(390, 260), matViolet);
    this.nebulaViolet.position.set(-70, 45, -400);
    this.nebulaGroup.add(this.nebulaViolet);

    // 云团 3：下方暖金恒星尘埃带 (Golden Star Dust)
    const texAmber = createNebulaTexture(
      'rgba(251, 191, 36, 0.32)',
      'rgba(217, 119, 6, 0.15)',
      'rgba(180, 83, 9, 0.04)'
    );
    const matAmber = new THREE.MeshBasicMaterial({
      map: texAmber,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      fog: false,
    });
    this.nebulaAmber = new THREE.Mesh(new THREE.PlaneGeometry(440, 240), matAmber);
    this.nebulaAmber.position.set(12, -38, -390);
    this.nebulaGroup.add(this.nebulaAmber);

    this.scene.add(this.nebulaGroup);
  }

  initLights() {
    // 1. 全局深空双色半球漫射光 (天顶亮冷天蓝 + 底部深空紫罗兰，全角度消除死黑)
    const hemiLight = new THREE.HemisphereLight(0xdbeafe, 0x1e1b4b, 1.6);
    this.scene.add(hemiLight);

    // 2. 基础白光漫反射环境光 (提供纯正自然漫反射，让机身钛金白亮清晰)
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.3);
    this.scene.add(ambientLight);

    // 3. 远方主恒星日光 (从右上方照亮战机与陨石向光面，产生雕塑般的明暗分界)
    const dirLight = new THREE.DirectionalLight(0xffffff, 3.2);
    dirLight.position.set(24, 38, 14);
    this.scene.add(dirLight);

    // 4. 迎面航向补光灯 (Head-on Fill Light: 从前方深处照射向玩家，彻底照亮迎面飞来的陨石向阳面)
    const headOnLight = new THREE.DirectionalLight(0x38bdf8, 1.4);
    headOnLight.position.set(0, 12, -220);
    this.scene.add(headOnLight);

    // 5. 正前方逆光轮廓光 (Backlight: 勾勒战机与近身物体边缘棱角)
    const rimBackLight = new THREE.DirectionalLight(0x60a5fa, 1.3);
    rimBackLight.position.set(0, -8, -160);
    this.scene.add(rimBackLight);

    // 6. 侧后方暖金副补光 (金琥珀暖光，丰富冷暖对比)
    const subLight = new THREE.DirectionalLight(0xfbbf24, 1.4);
    subLight.position.set(-20, -12, 20);
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
      positions[i3] = (Math.random() - 0.5) * 140;
      positions[i3 + 1] = (Math.random() - 0.5) * 95;
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
      size: 0.45, // 微幅增大星辰微粒，闪耀通透
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

  // 赛博深空全开放宇宙：远景光环气态巨行星、深空星云与航标浮标
  initCyberCanyon() {
    this.initDistantPlanet();
    this.initNavigationalBuoys();
  }

  // 1. 远景宏伟光环气态巨行星 (Distant Ringed Gas Giant)
  initDistantPlanet() {
    this.planetGroup = new THREE.Group();
    this.planetGroup.position.set(85, 36, -380);

    // 行星本体：程序化气态云带纹理
    const planetCanvas = document.createElement('canvas');
    planetCanvas.width = 512;
    planetCanvas.height = 256;
    const ctx = planetCanvas.getContext('2d');

    // 绘制气态巨行星层次分明的气态云带 (琥珀暖金、深邃紫罗兰与冷天蓝交织)
    const pGrad = ctx.createLinearGradient(0, 0, 0, 256);
    pGrad.addColorStop(0.0, '#3b0764');
    pGrad.addColorStop(0.20, '#1e1b4b');
    pGrad.addColorStop(0.38, '#0284c7');
    pGrad.addColorStop(0.52, '#38bdf8');
    pGrad.addColorStop(0.70, '#f59e0b');
    pGrad.addColorStop(0.85, '#b45309');
    pGrad.addColorStop(1.0, '#451a03');
    ctx.fillStyle = pGrad;
    ctx.fillRect(0, 0, 512, 256);

    // 添加气流湍流细节线条
    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    for (let y = 10; y < 250; y += 8) {
      const h = 2 + Math.sin(y * 0.15) * 2;
      ctx.fillRect(0, y, 512, h);
    }

    const planetTex = new THREE.CanvasTexture(planetCanvas);
    const planetGeo = new THREE.SphereGeometry(22, 32, 24);
    const planetMat = new THREE.MeshStandardMaterial({
      map: planetTex,
      roughness: 0.65,
      metalness: 0.1,
      emissive: new THREE.Color(0x1e1b4b),
      emissiveIntensity: 0.35,
    });
    this.planetMesh = new THREE.Mesh(planetGeo, planetMat);
    this.planetGroup.add(this.planetMesh);

    // 土星式倾斜宏伟行星光环 (Planetary Rings)
    const ringCanvas = document.createElement('canvas');
    ringCanvas.width = 256;
    ringCanvas.height = 1;
    const rCtx = ringCanvas.getContext('2d');
    const rGrad = rCtx.createLinearGradient(0, 0, 256, 0);
    rGrad.addColorStop(0.0, 'rgba(0, 0, 0, 0)');
    rGrad.addColorStop(0.12, 'rgba(56, 189, 248, 0.55)');
    rGrad.addColorStop(0.35, 'rgba(251, 191, 36, 0.85)');
    rGrad.addColorStop(0.55, 'rgba(255, 255, 255, 0.95)');
    rGrad.addColorStop(0.72, 'rgba(192, 132, 252, 0.7)');
    rGrad.addColorStop(0.92, 'rgba(56, 189, 248, 0.4)');
    rGrad.addColorStop(1.0, 'rgba(0, 0, 0, 0)');
    rCtx.fillStyle = rGrad;
    rCtx.fillRect(0, 0, 256, 1);

    const ringTex = new THREE.CanvasTexture(ringCanvas);
    const ringGeo = new THREE.RingGeometry(28, 48, 64);
    ringGeo.rotateX(Math.PI / 2);
    const ringMat = new THREE.MeshStandardMaterial({
      map: ringTex,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.88,
      roughness: 0.55,
      emissive: new THREE.Color(0x0369a1),
      emissiveIntensity: 0.3,
    });
    this.ringMesh = new THREE.Mesh(ringGeo, ringMat);
    this.ringMesh.rotation.z = -0.42;
    this.ringMesh.rotation.x = 0.35;
    this.planetGroup.add(this.ringMesh);

    this.scene.add(this.planetGroup);
  }

  // 2. 悬浮全息航标浮标 (替换原本单调粗劣的竖立光柱)
  initNavigationalBuoys() {
    this.pillarGroup = new THREE.Group();
    this.pillars = [];
    this.pillarCount = 10;
    this.pillarSpacing = 55;

    // 核心悬浮菱形浮标
    const buoyGeo = new THREE.OctahedronGeometry(0.7, 0);
    const buoyMatLeft = new THREE.MeshBasicMaterial({
      color: 0x00f2fe,
      wireframe: true,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending
    });
    const buoyMatRight = new THREE.MeshBasicMaterial({
      color: 0xff00aa,
      wireframe: true,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending
    });

    // 浮标内芯高亮能量核
    const innerGeo = new THREE.SphereGeometry(0.3, 8, 8);
    const innerMatLeft = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    const innerMatRight = new THREE.MeshBasicMaterial({ color: 0xf43f5e });

    for (let i = 0; i < this.pillarCount; i++) {
      const z = -i * this.pillarSpacing;

      // 左航标
      const gLeft = new THREE.Group();
      gLeft.add(new THREE.Mesh(buoyGeo, buoyMatLeft));
      gLeft.add(new THREE.Mesh(innerGeo, innerMatLeft));
      gLeft.position.set(-14, 0, z);
      this.pillarGroup.add(gLeft);

      // 右航标
      const gRight = new THREE.Group();
      gRight.add(new THREE.Mesh(buoyGeo, buoyMatRight));
      gRight.add(new THREE.Mesh(innerGeo, innerMatRight));
      gRight.position.set(14, 0, z);
      this.pillarGroup.add(gRight);

      this.pillars.push({ pLeft: gLeft, pRight: gRight, z, rotOffset: Math.random() * Math.PI * 2 });
    }

    this.scene.add(this.pillarGroup);
  }

  initSpacePillars() {
    // 兼容原构造调用，实际功能已整合到 initCyberCanyon -> initNavigationalBuoys
  }

  update(delta, currentSpeed, playerZ = 0) {
    // 0. 璀璨星云层跟随玩家 Z 轴移动并极微幅自转，维持无限宇宙景深
    if (this.nebulaGroup) {
      this.nebulaGroup.position.z = playerZ;
      if (this.nebulaCyan) this.nebulaCyan.rotation.z += delta * 0.005;
      if (this.nebulaViolet) this.nebulaViolet.rotation.z -= delta * 0.004;
      if (this.nebulaAmber) this.nebulaAmber.rotation.z += delta * 0.003;
    }

    // 1. 羽化星空流光推演
    const pos = this.starPositions;
    const speedFactor = currentSpeed * delta * 2.5;

    for (let i = 0; i < this.starCount; i++) {
      const i3 = i * 3;
      pos[i3 + 2] += speedFactor * this.starVelocities[i];

      // 当星辰接近战机前方时即刻回收重置
      if (pos[i3 + 2] > playerZ - 2) {
        pos[i3 + 2] = playerZ - 480 - Math.random() * 60;
        pos[i3] = (Math.random() - 0.5) * 140;
        pos[i3 + 1] = (Math.random() - 0.5) * 95;
      }
    }
    this.starGeometry.attributes.position.needsUpdate = true;

    // 2. 远景气态行星跟随玩家保持纵深距离，并缓缓自转
    if (this.planetGroup) {
      this.planetGroup.position.z = playerZ - 380;
    }
    if (this.planetMesh) {
      this.planetMesh.rotation.y += delta * 0.03;
    }

    // 3. 悬浮航标浮标沿 Z 轴向后流动并自转悬浮
    const moveZ = currentSpeed * delta;
    for (let i = 0; i < this.pillars.length; i++) {
      const p = this.pillars[i];
      p.z += moveZ;
      if (p.z > 20) {
        p.z -= this.pillarCount * this.pillarSpacing;
      }
      p.pLeft.position.z = p.z;
      p.pRight.position.z = p.z;

      // 零重力微自转
      p.pLeft.rotation.y += delta * 1.2;
      p.pLeft.rotation.x += delta * 0.8;
      p.pRight.rotation.y -= delta * 1.2;
      p.pRight.rotation.x += delta * 0.8;
    }
  }
}
