// ═══════════════════════════════════════════
// 3D 资产加载器与次世代程序化几何体系统 (ModelLoader)
// ═══════════════════════════════════════════
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';

export class ModelLoader {
  constructor() {
    this.loader = new GLTFLoader();
    this.loader.setMeshoptDecoder(MeshoptDecoder);
    this.models = {
      spaceship: null,
      asteroid: null,
      laser_gate: null,
      energy_core: null,
      shield_orb: null,
    };
    this.modelConfigs = {
      spaceship: { path: 'models/spaceship.glb', targetSize: 3.0, rotateY: -Math.PI / 2 },
      asteroid: { path: 'models/asteroid.glb', targetSize: 2.8, rotateY: 0 },
      laser_gate: { path: 'models/laser_gate.glb', targetSize: 6.0, rotateY: 0 },
      energy_core: { path: 'models/energy_core.glb', targetSize: 1.6, rotateY: 0 },
      shield_orb: { path: 'models/shield_orb.glb', targetSize: 1.6, rotateY: 0 },
    };
    this.isLoaded = false;
  }

  async loadAll() {
    const promises = Object.entries(this.modelConfigs).map(async ([key, config]) => {
      try {
        const gltf = await this.loadGLTF(config.path);
        const normalized = this.normalizeModel(gltf.scene, config.targetSize, config.rotateY, key);
        this.models[key] = normalized;
        console.log(`[ModelLoader] 成功装载并优化 GLB 资产: ${key} (${config.path})`);
      } catch (err) {
        console.log(`[ModelLoader] 模型 ${key} 加载降级，使用次世代程序化几何体: ${err.message || err}`);
        this.models[key] = this.createFallbackModel(key);
      }
    });

    await Promise.all(promises);
    this.isLoaded = true;
    return this.models;
  }

  normalizeModel(sceneObj, targetSize, rotateY = 0, key = '') {
    if (rotateY) {
      sceneObj.rotation.y = rotateY;
      sceneObj.updateMatrixWorld(true);
    }

    const box = new THREE.Box3().setFromObject(sceneObj);
    const size = new THREE.Vector3();
    box.getSize(size);
    const maxDim = Math.max(size.x, size.y, size.z);

    if (maxDim > 0) {
      const scale = targetSize / maxDim;
      sceneObj.scale.set(scale, scale, scale);
    }

    // 重新居中
    const center = new THREE.Vector3();
    box.setFromObject(sceneObj);
    box.getCenter(center);
    sceneObj.position.sub(center);

    const wrapper = new THREE.Group();
    wrapper.add(sceneObj);

    wrapper.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;

        // 战机专属材质提亮与漫反射调优 (解决纯黑死黑吸光，让机身细节清晰立体)
        if (key === 'spaceship' && child.material) {
          const mat = child.material;
          if (mat.isMeshStandardMaterial) {
            mat.metalness = Math.min(mat.metalness, 0.38);
            mat.roughness = Math.max(0.32, Math.min(mat.roughness, 0.52));
            mat.envMapIntensity = 2.4;
            if (mat.color) {
              mat.color.offsetHSL(0, 0.06, 0.18); // 柔和提亮机体底色
            }
          }
        }
      }
    });

    return wrapper;
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

  getModel(key) {
    if (this.models[key]) {
      return this.models[key].clone();
    }
    return this.createFallbackModel(key);
  }

  // ════ 次世代程序化几何体 ════
  createFallbackModel(key) {
    switch (key) {
      case 'spaceship':
        return this.createHighEndStarfighter();
      case 'asteroid':
        return this.createGlowingGeodeAsteroid();
      case 'laser_gate':
        return this.createNeonLaserGate();
      case 'energy_core':
        return this.createQuantumCore();
      case 'shield_orb':
        return this.createPlasmaShieldOrb();
      default:
        return new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial());
    }
  }

  // 1. 次世代高精度科幻拦截机 (正向朝向 -Z 极速穿梭)
  createHighEndStarfighter() {
    const ship = new THREE.Group();

    // 材质配置：航空钛合金外壳、哑光暗部装甲与超炫发光霓虹
    const hullMat = new THREE.MeshStandardMaterial({
      color: 0x476a96,
      metalness: 0.38,
      roughness: 0.38,
      flatShading: true,
    });

    const hullDarkMat = new THREE.MeshStandardMaterial({
      color: 0x243348,
      metalness: 0.42,
      roughness: 0.40,
      flatShading: true,
    });

    const neonCyanMat = new THREE.MeshBasicMaterial({ color: 0x00f2fe });
    const neonAmberMat = new THREE.MeshBasicMaterial({ color: 0xff9900 });
    const neonMagentaMat = new THREE.MeshBasicMaterial({ color: 0xff007f });

    // A. 尖锐流线型机身机头 (尖端朝向 -Z，尾部在 +Z)
    const noseGeo = new THREE.ConeGeometry(0.75, 3.4, 6);
    noseGeo.rotateX(-Math.PI / 2); // 尖端旋转至 -Z
    const nose = new THREE.Mesh(noseGeo, hullMat);
    nose.scale.set(1.1, 0.55, 1.0);
    nose.position.set(0, 0, -0.4);
    ship.add(nose);

    // 机背龙脊装甲板
    const spineGeo = new THREE.BoxGeometry(0.25, 0.2, 2.4);
    const spine = new THREE.Mesh(spineGeo, hullDarkMat);
    spine.position.set(0, 0.28, 0.1);
    ship.add(spine);

    // B. 全息发光座舱 (位于机头斜前方，背部微倾)
    const cockpitGeo = new THREE.SphereGeometry(0.32, 16, 12);
    cockpitGeo.scale(0.75, 0.55, 1.6);
    const cockpitMat = new THREE.MeshStandardMaterial({
      color: 0x00d4ff,
      emissive: 0x0099ff,
      emissiveIntensity: 0.8,
      metalness: 0.9,
      roughness: 0.1,
    });
    const cockpit = new THREE.Mesh(cockpitGeo, cockpitMat);
    cockpit.position.set(0, 0.28, -0.6);
    ship.add(cockpit);

    // 座舱两侧全息发光导光条
    const glowStripGeo = new THREE.BoxGeometry(0.05, 0.05, 1.2);
    const leftStrip = new THREE.Mesh(glowStripGeo, neonCyanMat);
    leftStrip.position.set(0.24, 0.24, -0.6);
    ship.add(leftStrip);

    const rightStrip = leftStrip.clone();
    rightStrip.position.x = -0.24;
    ship.add(rightStrip);

    // C. 后掠式超音速战斗主翼 (根部在 -Z，翼尖后掠至 +Z)
    const wingShape = new THREE.Shape();
    wingShape.moveTo(0, -0.8);      // 翼根前沿
    wingShape.lineTo(2.3, 0.8);     // 翼尖后掠
    wingShape.lineTo(2.1, 1.3);     // 翼梢外沿
    wingShape.lineTo(0.3, 1.2);     // 翼根后沿
    wingShape.lineTo(0, 0.6);
    wingShape.closePath();

    const extrudeSettings = { depth: 0.08, bevelEnabled: true, bevelSegments: 2, steps: 1, bevelSize: 0.02, bevelThickness: 0.02 };
    const wingGeo = new THREE.ExtrudeGeometry(wingShape, extrudeSettings);
    wingGeo.rotateX(-Math.PI / 2);

    const leftWing = new THREE.Mesh(wingGeo, hullMat);
    leftWing.position.set(0, -0.02, 0);
    ship.add(leftWing);

    const rightWing = leftWing.clone();
    rightWing.scale.set(-1, 1, 1);
    ship.add(rightWing);

    // 机翼上表面发光等离子能量管
    const wingPipeGeo = new THREE.BoxGeometry(0.08, 0.05, 1.5);
    const leftPipe = new THREE.Mesh(wingPipeGeo, neonCyanMat);
    leftPipe.position.set(1.1, 0.06, 0.35);
    leftPipe.rotation.y = 0.38;
    ship.add(leftPipe);

    const rightPipe = leftPipe.clone();
    rightPipe.position.x = -1.1;
    rightPipe.rotation.y = -0.38;
    ship.add(rightPipe);

    // 翼尖航行红/紫信标
    const leftTipBeacon = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 8), neonMagentaMat);
    leftTipBeacon.position.set(2.2, 0.05, 0.95);
    ship.add(leftTipBeacon);

    const rightTipBeacon = leftTipBeacon.clone();
    rightTipBeacon.position.x = -2.2;
    ship.add(rightTipBeacon);

    // D. 隐身外倾双垂尾 (V-Tail Stabilizers) - 朝向玩家镜头一目了然
    const vTailShape = new THREE.Shape();
    vTailShape.moveTo(0, 0);
    vTailShape.lineTo(0.35, 1.1);
    vTailShape.lineTo(0.15, 1.1);
    vTailShape.lineTo(-0.25, 0);
    vTailShape.closePath();

    const vTailGeo = new THREE.ExtrudeGeometry(vTailShape, { depth: 0.05, bevelEnabled: false });
    const leftVTail = new THREE.Mesh(vTailGeo, hullDarkMat);
    leftVTail.position.set(0.55, 0.12, 0.8);
    leftVTail.rotation.z = -0.32; // 外倾角
    ship.add(leftVTail);

    const rightVTail = leftVTail.clone();
    rightVTail.position.x = -0.55;
    rightVTail.rotation.z = 0.32;
    ship.add(rightVTail);

    // 垂尾边缘荧光线
    const vTailLineGeo = new THREE.BoxGeometry(0.04, 1.05, 0.06);
    const leftVLine = new THREE.Mesh(vTailLineGeo, neonCyanMat);
    leftVLine.position.set(0.72, 0.65, 0.8);
    leftVLine.rotation.z = -0.32;
    ship.add(leftVLine);

    const rightVLine = leftVLine.clone();
    rightVLine.position.x = -0.72;
    rightVLine.rotation.z = 0.32;
    ship.add(rightVLine);

    // E. 机尾双重重型等离子推进器 (位于 +Z，正对玩家镜头)
    const nozzleGeo = new THREE.CylinderGeometry(0.24, 0.32, 0.8, 14);
    nozzleGeo.rotateX(-Math.PI / 2); // 喷口正对镜头 (+Z)
    const nozzleMat = new THREE.MeshStandardMaterial({
      color: 0x181820,
      metalness: 0.9,
      roughness: 0.2,
    });

    const leftNozzle = new THREE.Mesh(nozzleGeo, nozzleMat);
    leftNozzle.position.set(0.48, 0.02, 1.25);
    ship.add(leftNozzle);

    const rightNozzle = leftNozzle.clone();
    rightNozzle.position.x = -0.48;
    ship.add(rightNozzle);

    // 喷口发光内环 (Bloom 核心发光圈)
    const flameRingGeo = new THREE.RingGeometry(0.05, 0.22, 16);
    const leftFlame = new THREE.Mesh(flameRingGeo, neonCyanMat);
    leftFlame.position.set(0.48, 0.02, 1.66);
    ship.add(leftFlame);

    const rightFlame = leftFlame.clone();
    rightFlame.position.x = -0.48;
    ship.add(rightFlame);

    // 内部微型等离子焰心
    const flameCoreGeo = new THREE.ConeGeometry(0.12, 0.5, 12);
    flameCoreGeo.rotateX(Math.PI / 2);
    const leftCore = new THREE.Mesh(flameCoreGeo, neonAmberMat);
    leftCore.position.set(0.48, 0.02, 1.8);
    ship.add(leftCore);

    const rightCore = leftCore.clone();
    rightCore.position.x = -0.48;
    ship.add(rightCore);

    return ship;
  }

  // 2. 发光晶脉深空巨石 (Glowing Geode Asteroid)
  createGlowingGeodeAsteroid() {
    const group = new THREE.Group();

    const geo = new THREE.DodecahedronGeometry(1.4, 2);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const v = new THREE.Vector3().fromBufferAttribute(pos, i);
      v.multiplyScalar(0.8 + Math.random() * 0.4);
      pos.setXYZ(i, v.x, v.y, v.z);
    }
    geo.computeVertexNormals();

    const mat = new THREE.MeshStandardMaterial({
      color: 0x272b38,
      roughness: 0.85,
      metalness: 0.25,
      flatShading: true,
    });
    const rock = new THREE.Mesh(geo, mat);
    rock.castShadow = true;
    rock.receiveShadow = true;
    group.add(rock);

    // 晶簇外嵌
    const crystalGeo = new THREE.OctahedronGeometry(0.35, 0);
    const crystalMat = new THREE.MeshBasicMaterial({ color: 0x00f2fe });

    for (let i = 0; i < 4; i++) {
      const c = new THREE.Mesh(crystalGeo, crystalMat);
      const angle = (i / 4) * Math.PI * 2;
      c.position.set(Math.cos(angle) * 1.15, Math.sin(angle) * 1.15, (Math.random() - 0.5) * 1.0);
      c.scale.set(0.8, 1.4, 0.8);
      group.add(c);
    }

    return group;
  }

  // 3. 次世代霓虹激光屏障门 (Neon Laser Gate)
  createNeonLaserGate() {
    const gate = new THREE.Group();

    const pillarGeo = new THREE.BoxGeometry(0.7, 5.2, 0.7);
    const pillarMat = new THREE.MeshStandardMaterial({
      color: 0x151928,
      metalness: 0.85,
      roughness: 0.3,
    });

    const leftPillar = new THREE.Mesh(pillarGeo, pillarMat);
    leftPillar.position.set(-3.4, 0, 0);
    gate.add(leftPillar);

    const rightPillar = leftPillar.clone();
    rightPillar.position.x = 3.4;
    gate.add(rightPillar);

    const beaconMat = new THREE.MeshBasicMaterial({ color: 0xff0055 });
    const leftBeacon = new THREE.Mesh(new THREE.BoxGeometry(0.15, 4.8, 0.72), beaconMat);
    leftBeacon.position.set(-3.4, 0, 0);
    gate.add(leftBeacon);

    const rightBeacon = leftBeacon.clone();
    rightBeacon.position.x = 3.4;
    gate.add(rightBeacon);

    const beamGeo = new THREE.PlaneGeometry(6.6, 4.2);
    const beamMat = new THREE.MeshBasicMaterial({
      color: 0xff0055,
      transparent: true,
      opacity: 0.75,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
    });
    const beam = new THREE.Mesh(beamGeo, beamMat);
    gate.add(beam);

    const railGeo = new THREE.CylinderGeometry(0.12, 0.12, 6.8, 8);
    railGeo.rotateZ(Math.PI / 2);
    const railMat = new THREE.MeshBasicMaterial({ color: 0xff3388 });
    const topRail = new THREE.Mesh(railGeo, railMat);
    topRail.position.y = 2.15;
    gate.add(topRail);

    const btmRail = topRail.clone();
    btmRail.position.y = -2.15;
    gate.add(btmRail);

    return gate;
  }

  // 4. 双陀螺量子能量晶石 (Quantum Core)
  createQuantumCore() {
    const group = new THREE.Group();

    const crystalGeo = new THREE.OctahedronGeometry(0.65, 0);
    const crystalMat = new THREE.MeshBasicMaterial({ color: 0x00f2fe });
    const crystal = new THREE.Mesh(crystalGeo, crystalMat);
    group.add(crystal);

    const ring1Geo = new THREE.TorusGeometry(1.0, 0.05, 8, 28);
    const ring1Mat = new THREE.MeshBasicMaterial({ color: 0x00ffcc });
    const ring1 = new THREE.Mesh(ring1Geo, ring1Mat);
    ring1.rotation.x = Math.PI / 3;
    group.add(ring1);

    const ring2Geo = new THREE.TorusGeometry(1.2, 0.04, 8, 28);
    const ring2Mat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    const ring2 = new THREE.Mesh(ring2Geo, ring2Mat);
    ring2.rotation.y = Math.PI / 4;
    group.add(ring2);

    return group;
  }

  // 5. 等离子超能护盾球 (Plasma Shield Orb)
  createPlasmaShieldOrb() {
    const group = new THREE.Group();

    const orbGeo = new THREE.IcosahedronGeometry(0.75, 2);
    const orbMat = new THREE.MeshBasicMaterial({ color: 0xffde59 });
    const orb = new THREE.Mesh(orbGeo, orbMat);
    group.add(orb);

    const haloGeo = new THREE.TorusGeometry(1.15, 0.06, 8, 28);
    const haloMat = new THREE.MeshBasicMaterial({ color: 0xffa500 });
    const halo = new THREE.Mesh(haloGeo, haloMat);
    halo.rotation.x = Math.PI / 4;
    group.add(halo);

    return group;
  }
}
