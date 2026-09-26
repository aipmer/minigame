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
      spaceship: { path: 'models/spaceship.glb', targetSize: 3.2, rotateY: -Math.PI / 2 },
      asteroid: { path: 'models/asteroid.glb', targetSize: 3.2, rotateY: 0 },
      laser_gate: { path: 'models/laser_gate.glb', targetSize: 6.0, rotateY: 0 },
      energy_core: { path: 'models/energy_core.glb', targetSize: 1.6, rotateY: 0 },
      shield_orb: { path: 'models/shield_orb.glb', targetSize: 1.6, rotateY: 0 },
    };
    this.isLoaded = false;
  }

  async loadAll() {
    // 1. 战机、发光晶脉熔岩陨石与激光门加载次世代 PBR GLB 资产
    const gltfKeys = ['spaceship', 'asteroid', 'laser_gate'];
    const promises = gltfKeys.map(async (key) => {
      const config = this.modelConfigs[key];
      if (!config) return;
      try {
        const gltf = await this.loadGLTF(config.path);
        const normalized = this.normalizeModel(gltf.scene, config.targetSize, config.rotateY, key);
        this.models[key] = normalized;
        console.log(`[ModelLoader] 成功装载并优化次世代 PBR 资产: ${key} (${config.path})`);
      } catch (err) {
        console.log(`[ModelLoader] 模型 ${key} 加载降级，使用次世代程序化几何体: ${err.message || err}`);
        this.models[key] = this.createFallbackModel(key);
      }
    });

    // 2. 能量核心与护盾球：升级实心多层菲涅尔实体道具
    this.models.energy_core = this.createQuantumCore();
    this.models.shield_orb = this.createPlasmaShieldOrb();

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

        if (child.material) {
          const mat = child.material;

          // 战机次世代 PBR 材质强化：钛金亮银装甲底色 + 高清金属切面反光 + 天青流线自发光
          if (key === 'spaceship' && mat.isMeshStandardMaterial) {
            mat.color = new THREE.Color(0xe0eaff);
            mat.metalness = 0.65;
            mat.roughness = 0.22;
            mat.envMapIntensity = 2.6;
            if (mat.normalMap) {
              mat.normalScale = new THREE.Vector2(1.5, 1.5);
            }
            // 绚丽天青自发光流线，轮廓在深空中极度鲜明
            mat.emissive = new THREE.Color(0x0284c7);
            mat.emissiveIntensity = 0.38;
          }

          // 熔岩晶脉陨石次世代 PBR 材质强化：深灰板岩底色 + 高对比天青自发光晶脉裂隙
          if (key === 'asteroid' && mat.isMeshStandardMaterial) {
            mat.color = new THREE.Color(0x475569); // 从暗褐提升为高级深灰板岩
            mat.roughness = 0.45; // 降低粗糙度，产生晶石锐利高光切面
            mat.metalness = 0.25;
            if (mat.normalMap) {
              mat.normalScale = new THREE.Vector2(2.0, 2.0);
            }
            // 注入璀璨发光晶脉（天青晶石光泽，即使远距也能一眼辨析危险）
            mat.emissive = new THREE.Color(0x38bdf8);
            mat.emissiveIntensity = 0.65;
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

  // 2. 发光晶脉深空巨石 (Glowing Geode Asteroid - 高对比度晶脉与高亮晶簇)
  createGlowingGeodeAsteroid() {
    const group = new THREE.Group();

    const geo = new THREE.DodecahedronGeometry(1.4, 2);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const v = new THREE.Vector3().fromBufferAttribute(pos, i);
      v.multiplyScalar(0.78 + Math.random() * 0.44);
      pos.setXYZ(i, v.x, v.y, v.z);
    }
    geo.computeVertexNormals();

    const mat = new THREE.MeshStandardMaterial({
      color: 0x475569, // 明亮玄武岩灰，拉开背景纯黑反差
      roughness: 0.65,
      metalness: 0.25,
      flatShading: true,
      emissive: new THREE.Color(0x0f172a),
      emissiveIntensity: 0.2,
    });
    const rock = new THREE.Mesh(geo, mat);
    rock.castShadow = true;
    rock.receiveShadow = true;
    group.add(rock);

    // 内部微光晶体核心 (透过缝隙产生自发光晶脉感)
    const innerCoreGeo = new THREE.DodecahedronGeometry(1.2, 1);
    const innerCoreMat = new THREE.MeshBasicMaterial({
      color: 0x00f2fe,
      wireframe: true,
      transparent: true,
      opacity: 0.35,
      blending: THREE.AdditiveBlending,
    });
    const innerCore = new THREE.Mesh(innerCoreGeo, innerCoreMat);
    group.add(innerCore);

    // 晶簇外嵌 (8 处高亮蓝晶与暖琥珀晶簇，超远距离一眼可辨)
    const crystalGeo = new THREE.OctahedronGeometry(0.38, 0);
    const crystalCyanMat = new THREE.MeshBasicMaterial({ color: 0x00f2fe });
    const crystalAmberMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b });

    for (let i = 0; i < 8; i++) {
      const isCyan = i % 2 === 0;
      const c = new THREE.Mesh(crystalGeo, isCyan ? crystalCyanMat : crystalAmberMat);
      const theta = (i / 8) * Math.PI * 2;
      const phi = (Math.random() - 0.5) * Math.PI * 0.8;
      c.position.set(
        Math.cos(theta) * Math.cos(phi) * 1.25,
        Math.sin(phi) * 1.25,
        Math.sin(theta) * Math.cos(phi) * 1.25
      );
      c.scale.set(0.7, 1.3, 0.7);
      c.lookAt(0, 0, 0);
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

  // 4. 双陀螺量子能量晶石 (Quantum Core - 高透自发光多面晶石 + 双环流光)
  createQuantumCore() {
    const group = new THREE.Group();

    // 内核：青翠高能等离子核
    const innerGeo = new THREE.OctahedronGeometry(0.45, 0);
    const innerMat = new THREE.MeshBasicMaterial({ color: 0x00ff88 });
    const inner = new THREE.Mesh(innerGeo, innerMat);
    group.add(inner);

    // 外晶：透明天蓝钻石晶格
    const crystalGeo = new THREE.OctahedronGeometry(0.78, 0);
    const crystalMat = new THREE.MeshStandardMaterial({
      color: 0x00f2fe,
      roughness: 0.1,
      metalness: 0.9,
      transparent: true,
      opacity: 0.78,
      blending: THREE.AdditiveBlending,
    });
    const crystal = new THREE.Mesh(crystalGeo, crystalMat);
    group.add(crystal);

    // 双轴高亮自发光环
    const ring1Geo = new THREE.TorusGeometry(1.05, 0.05, 8, 32);
    const ring1Mat = new THREE.MeshBasicMaterial({ color: 0x00ffcc });
    const ring1 = new THREE.Mesh(ring1Geo, ring1Mat);
    ring1.rotation.x = Math.PI / 3;
    group.add(ring1);

    const ring2Geo = new THREE.TorusGeometry(1.28, 0.04, 8, 32);
    const ring2Mat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    const ring2 = new THREE.Mesh(ring2Geo, ring2Mat);
    ring2.rotation.y = Math.PI / 4;
    group.add(ring2);

    return group;
  }

  // 5. 等离子超能护盾球 (Plasma Shield Orb - 金辉流光核 + 双层粒子光环)
  createPlasmaShieldOrb() {
    const group = new THREE.Group();

    // 核心耀金等离子发光体
    const orbCoreGeo = new THREE.IcosahedronGeometry(0.55, 2);
    const orbCoreMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const orbCore = new THREE.Mesh(orbCoreGeo, orbCoreMat);
    group.add(orbCore);

    // 外层金黄呼吸能量光罩
    const orbShellGeo = new THREE.IcosahedronGeometry(0.82, 2);
    const orbShellMat = new THREE.MeshBasicMaterial({
      color: 0xffaa00,
      wireframe: true,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
    });
    const orbShell = new THREE.Mesh(orbShellGeo, orbShellMat);
    group.add(orbShell);

    // 专属双层陀螺仪轨道金环
    const halo1Geo = new THREE.TorusGeometry(1.18, 0.06, 8, 32);
    const halo1Mat = new THREE.MeshBasicMaterial({ color: 0xffcc00 });
    const halo1 = new THREE.Mesh(halo1Geo, halo1Mat);
    halo1.rotation.x = Math.PI / 4;
    group.add(halo1);

    const halo2Geo = new THREE.TorusGeometry(1.42, 0.04, 8, 32);
    const halo2Mat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    const halo2 = new THREE.Mesh(halo2Geo, halo2Mat);
    halo2.rotation.y = Math.PI / 3;
    group.add(halo2);

    return group;
  }
}
