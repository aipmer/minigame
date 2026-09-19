// ═══════════════════════════════════════════
// 3D 资产加载器与程序化几何体回退 (ModelLoader)
// ═══════════════════════════════════════════
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export class ModelLoader {
  constructor() {
    this.loader = new GLTFLoader();
    this.models = {
      spaceship: null,
      asteroid: null,
      laser_gate: null,
      energy_core: null,
      shield_orb: null,
    };
    this.isLoaded = false;
  }

  // 尝试加载所有 GLB 资产，若找不到或出错则平滑使用高保真程序化几何体
  async loadAll() {
    const assets = [
      { key: 'spaceship', path: 'models/spaceship.glb' },
      { key: 'asteroid', path: 'models/asteroid.glb' },
      { key: 'laser_gate', path: 'models/laser_gate.glb' },
      { key: 'energy_core', path: 'models/energy_core.glb' },
      { key: 'shield_orb', path: 'models/shield_orb.glb' },
    ];

    const promises = assets.map(async ({ key, path }) => {
      try {
        const gltf = await this.loadGLTF(path);
        // 调整模型缩放和阴影
        gltf.scene.traverse((child) => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
          }
        });
        this.models[key] = gltf.scene;
        console.log(`[ModelLoader] 成功载入 GLB 模型: ${key}`);
      } catch {
        console.log(`[ModelLoader] 模型 ${key} 未就绪，启动高保真程序化几何体兜底`);
        this.models[key] = this.createFallbackModel(key);
      }
    });

    await Promise.all(promises);
    this.isLoaded = true;
    return this.models;
  }

  loadGLTF(url) {
    return new Promise((resolve, reject) => {
      this.loader.load(
        url,
        (gltf) => resolve(gltf),
        undefined,
        (err) => reject(err)
      );
    });
  }

  // 获取特定模型的克隆副本
  getModel(key) {
    if (this.models[key]) {
      return this.models[key].clone();
    }
    return this.createFallbackModel(key);
  }

  // ════ 程序化高保真几何体兜底 ════
  createFallbackModel(key) {
    switch (key) {
      case 'spaceship':
        return this.createProceduralShip();
      case 'asteroid':
        return this.createProceduralAsteroid();
      case 'laser_gate':
        return this.createProceduralLaserGate();
      case 'energy_core':
        return this.createProceduralEnergyCore();
      case 'shield_orb':
        return this.createProceduralShieldOrb();
      default:
        return new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial());
    }
  }

  // 1. 程序化超音速战机
  createProceduralShip() {
    const ship = new THREE.Group();

    // 核心机身
    const fuselageGeo = new THREE.ConeGeometry(0.7, 3.2, 5);
    fuselageGeo.rotateX(Math.PI / 2);
    const fuselageMat = new THREE.MeshStandardMaterial({
      color: 0x1a2639,
      metalness: 0.85,
      roughness: 0.25,
      flatShading: true,
    });
    const fuselage = new THREE.Mesh(fuselageGeo, fuselageMat);
    ship.add(fuselage);

    // 驾驶舱顶棚 (全息反光玻璃)
    const cockpitGeo = new THREE.SphereGeometry(0.35, 16, 12);
    cockpitGeo.scale(0.8, 0.6, 1.8);
    const cockpitMat = new THREE.MeshStandardMaterial({
      color: 0x00f2fe,
      emissive: 0x00a8ff,
      emissiveIntensity: 0.5,
      roughness: 0.1,
      metalness: 0.9,
    });
    const cockpit = new THREE.Mesh(cockpitGeo, cockpitMat);
    cockpit.position.set(0, 0.25, 0.2);
    ship.add(cockpit);

    // 左右前掠机翼
    const wingShape = new THREE.Shape();
    wingShape.moveTo(0, 0);
    wingShape.lineTo(2.4, -0.6);
    wingShape.lineTo(2.0, -1.6);
    wingShape.lineTo(0, -1.2);
    wingShape.closePath();

    const extrudeSettings = { depth: 0.08, bevelEnabled: true, bevelSegments: 2, steps: 1, bevelSize: 0.02, bevelThickness: 0.02 };
    const wingGeo = new THREE.ExtrudeGeometry(wingShape, extrudeSettings);
    wingGeo.rotateX(-Math.PI / 2);
    const wingMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      metalness: 0.9,
      roughness: 0.3,
    });

    const leftWing = new THREE.Mesh(wingGeo, wingMat);
    leftWing.position.set(0, 0, 0.4);
    ship.add(leftWing);

    const rightWing = leftWing.clone();
    rightWing.scale.set(-1, 1, 1);
    ship.add(rightWing);

    // 机翼荧光边缘条带
    const stripeGeo = new THREE.BoxGeometry(0.12, 0.05, 1.2);
    const stripeMat = new THREE.MeshBasicMaterial({ color: 0x00ffcc });
    const leftStripe = new THREE.Mesh(stripeGeo, stripeMat);
    leftStripe.position.set(1.9, 0.02, -0.8);
    leftStripe.rotation.y = -0.3;
    ship.add(leftStripe);

    const rightStripe = leftStripe.clone();
    rightStripe.position.x = -1.9;
    rightStripe.rotation.y = 0.3;
    ship.add(rightStripe);

    // 双离子喷射口 (Engine Thrusters)
    const engineGeo = new THREE.CylinderGeometry(0.22, 0.28, 0.8, 12);
    engineGeo.rotateX(Math.PI / 2);
    const engineMat = new THREE.MeshStandardMaterial({ color: 0x222233, metalness: 0.9, roughness: 0.4 });

    const leftEngine = new THREE.Mesh(engineGeo, engineMat);
    leftEngine.position.set(0.45, -0.05, -1.4);
    ship.add(leftEngine);

    const rightEngine = leftEngine.clone();
    rightEngine.position.x = -0.45;
    ship.add(rightEngine);

    // 引擎喷口辉光圆环
    const glowGeo = new THREE.RingGeometry(0.05, 0.22, 16);
    const glowMat = new THREE.MeshBasicMaterial({
      color: 0x00ffff,
      side: THREE.DoubleSide,
    });
    const leftGlow = new THREE.Mesh(glowGeo, glowMat);
    leftGlow.position.set(0.45, -0.05, -1.81);
    ship.add(leftGlow);

    const rightGlow = leftGlow.clone();
    rightGlow.position.x = -0.45;
    ship.add(rightGlow);

    return ship;
  }

  // 2. 程序化深空陨石
  createProceduralAsteroid() {
    const geo = new THREE.DodecahedronGeometry(1.4, 1);
    // 顶点微扰动增加崎岖感
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const v = new THREE.Vector3().fromBufferAttribute(pos, i);
      v.multiplyScalar(0.85 + Math.random() * 0.35);
      pos.setXYZ(i, v.x, v.y, v.z);
    }
    geo.computeVertexNormals();

    const mat = new THREE.MeshStandardMaterial({
      color: 0x5a5568,
      roughness: 0.9,
      metalness: 0.15,
      flatShading: true,
    });

    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  }

  // 3. 程序化多维激光门
  createProceduralLaserGate() {
    const gate = new THREE.Group();

    // 左右立柱
    const pillarGeo = new THREE.BoxGeometry(0.6, 5.0, 0.6);
    const pillarMat = new THREE.MeshStandardMaterial({
      color: 0x111625,
      metalness: 0.9,
      roughness: 0.3,
    });

    const leftPillar = new THREE.Mesh(pillarGeo, pillarMat);
    leftPillar.position.set(-3.2, 0, 0);
    gate.add(leftPillar);

    const rightPillar = leftPillar.clone();
    rightPillar.position.x = 3.2;
    gate.add(rightPillar);

    // 激光屏障核心 (半透明发光薄板)
    const beamGeo = new THREE.PlaneGeometry(6.4, 4.4);
    const beamMat = new THREE.MeshBasicMaterial({
      color: 0xff0055,
      transparent: true,
      opacity: 0.6,
      side: THREE.DoubleSide,
    });
    const beam = new THREE.Mesh(beamGeo, beamMat);
    beam.userData.isLaser = true;
    gate.add(beam);

    // 激光上下光束边缘
    const lineGeo = new THREE.CylinderGeometry(0.08, 0.08, 6.4, 8);
    lineGeo.rotateZ(Math.PI / 2);
    const lineMat = new THREE.MeshBasicMaterial({ color: 0xff3377 });
    const topLine = new THREE.Mesh(lineGeo, lineMat);
    topLine.position.y = 2.2;
    gate.add(topLine);

    const btmLine = topLine.clone();
    btmLine.position.y = -2.2;
    gate.add(btmLine);

    return gate;
  }

  // 4. 程序化量子能量晶石
  createProceduralEnergyCore() {
    const group = new THREE.Group();

    // 旋转的八面体
    const crystalGeo = new THREE.OctahedronGeometry(0.6, 0);
    const crystalMat = new THREE.MeshStandardMaterial({
      color: 0x00f2fe,
      emissive: 0x00c3ff,
      emissiveIntensity: 0.8,
      metalness: 0.5,
      roughness: 0.2,
      flatShading: true,
    });
    const crystal = new THREE.Mesh(crystalGeo, crystalMat);
    group.add(crystal);

    // 环绕光环
    const ringGeo = new THREE.TorusGeometry(0.9, 0.04, 8, 24);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x00ffcc });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 3;
    group.add(ring);

    group.userData.crystal = crystal;
    group.userData.ring = ring;
    return group;
  }

  // 5. 程序化等离子护盾球
  createProceduralShieldOrb() {
    const group = new THREE.Group();

    const orbGeo = new THREE.IcosahedronGeometry(0.7, 1);
    const orbMat = new THREE.MeshStandardMaterial({
      color: 0xffde59,
      emissive: 0xffa500,
      emissiveIntensity: 0.9,
      metalness: 0.8,
      roughness: 0.2,
    });
    const orb = new THREE.Mesh(orbGeo, orbMat);
    group.add(orb);

    const haloGeo = new THREE.TorusGeometry(1.05, 0.05, 8, 24);
    const haloMat = new THREE.MeshBasicMaterial({ color: 0xffde59 });
    const halo = new THREE.Mesh(haloGeo, haloMat);
    halo.rotation.x = Math.PI / 4;
    group.add(halo);

    group.userData.orb = orb;
    group.userData.halo = halo;
    return group;
  }
}
