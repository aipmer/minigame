import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';

/**
 * 《花园守卫》手办化多构件植物渲染器
 * 严禁使用裸露单体几何体，每个植物均由花茎、舒展底叶、果冻头颅、喷射嘴、立体大眼与腮红组成
 */
export class PlantRenderer {
  constructor(scene) {
    this.scene = scene;
    this.plants = new Map();
    this.group = new THREE.Group();
    this.scene.add(this.group);
    this.loader = new GLTFLoader();
    this.loader.setMeshoptDecoder(MeshoptDecoder);
    this.modelCache = new Map();
  }
  
  addPlant(uid, row, col, plantData, worldPos) {
    const { star } = plantData;
    const series = plantData.series || plantData.type;
    const plantColor = plantData.color ? parseInt(plantData.color.replace('#', '0x')) : 0x76B947;

    const container = new THREE.Group();
    container.position.copy(worldPos);
    container.position.y = 0.16; // 稳固立于花盆泥土表面

    // 1. 构建高品质手办化多构件粘土植物
    const clayModel = this.buildChibiPlantModel(series, plantData.id, plantColor, star);
    container.add(clayModel);
    
    const targetScale = 0.65 + star * 0.08;
    container.scale.set(0.05, 0.05, 0.05); // 初始微小，用于升级弹动生长动画
    
    const plantObj = {
      mesh: container,
      visualMesh: clayModel,
      targetScale,
      baseY: container.position.y,
      time: Math.random() * 10,
      animState: 'upgrade',
      attackTimer: 0,
      starRing: null
    };

    // 5 星解锁脚底光晕星环
    if (star >= 5) {
      const ringGeom = new THREE.TorusGeometry(0.55, 0.04, 8, 24);
      const ringMat = new THREE.MeshBasicMaterial({ color: 0xFFD700 });
      const ringMesh = new THREE.Mesh(ringGeom, ringMat);
      ringMesh.rotation.x = Math.PI / 2;
      ringMesh.position.y = 0.02;
      container.add(ringMesh);
      plantObj.starRing = ringMesh;
    }
    
    this.plants.set(uid, plantObj);
    this.group.add(container);

    // 2. 尝试异步加载可能已生成的真实 3D GLB 手办模型
    const plantModelMap = {
      'sunflower_shooter': 'models/plants/plant_sunflower.glb',
      'cactus_sniper': 'models/plants/plant_sunflower.glb',
      'mushroom_cannon': 'models/plants/plant_mushroom.glb',
      'rose_firework': 'models/plants/plant_mushroom.glb',
      'mint_ice': 'models/plants/plant_frost.glb',
      'vine_net': 'models/plants/plant_frost.glb',
      'chili_bomb': 'models/plants/plant_burst.glb',
      'bamboo_mine': 'models/plants/plant_burst.glb',
      'peashooter': 'models/plants/peashooter.glb'
    };
    const modelUrl = plantModelMap[plantData.id] || `models/plants/plant_${series}.glb` || `models/plants/${plantData.id}.glb`;
    this.loadGLBModel(modelUrl, container, plantObj);
  }

  /**
   * 构建高品质参数化粘土手办植物
   */
  buildChibiPlantModel(series, plantId, colorHex, star) {
    const root = new THREE.Group();

    // 1. 底座：一对舒展的深绿小卷叶
    const leafMat = new THREE.MeshLambertMaterial({ color: 0x4CAF50 });
    const leafGeom = new THREE.SphereGeometry(0.22, 10, 8);

    const leafL = new THREE.Mesh(leafGeom, leafMat);
    leafL.scale.set(1.4, 0.25, 0.8);
    leafL.position.set(-0.25, 0.06, 0);
    leafL.rotation.z = -0.2;
    root.add(leafL);

    const leafR = new THREE.Mesh(leafGeom, leafMat);
    leafR.scale.set(1.4, 0.25, 0.8);
    leafR.position.set(0.25, 0.06, 0);
    leafR.rotation.z = 0.2;
    root.add(leafR);

    // 2. 嫩绿主茎
    const stemGeom = new THREE.CylinderGeometry(0.08, 0.1, 0.45, 12);
    const stemMat = new THREE.MeshLambertMaterial({ color: 0x66BB6A });
    const stem = new THREE.Mesh(stemGeom, stemMat);
    stem.position.y = 0.26;
    root.add(stem);

    // 3. 头部核心结构
    const headGroup = new THREE.Group();
    headGroup.position.y = 0.62;

    const headMat = new THREE.MeshLambertMaterial({ color: colorHex });
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x1A1A1A }); // 纯黑亮眼
    const eyeHighlightMat = new THREE.MeshBasicMaterial({ color: 0xFFFFFF }); // 眼睛白高光
    const blushMat = new THREE.MeshBasicMaterial({ color: 0xFF80AB }); // 呆萌粉红腮红

    if (series === 'shooter' || plantId === 'peashooter') {
      // 射击系：大圆球头 + 喇叭形喷射管嘴巴 + 双眼腮红 + 头顶小嫩芽
      const headSphere = new THREE.Mesh(new THREE.SphereGeometry(0.38, 16, 16), headMat);
      headGroup.add(headSphere);

      // 喇叭喷嘴（朝向前方 +Z）
      const muzzleGeom = new THREE.CylinderGeometry(0.18, 0.12, 0.28, 16);
      const muzzle = new THREE.Mesh(muzzleGeom, headMat);
      muzzle.rotation.x = Math.PI / 2;
      muzzle.position.set(0, 0, 0.36);
      headGroup.add(muzzle);

      // 喷嘴内部深色开口
      const mouthHole = new THREE.Mesh(new THREE.CircleGeometry(0.14, 12), new THREE.MeshBasicMaterial({ color: 0x2E7D32 }));
      mouthHole.position.set(0, 0, 0.51);
      headGroup.add(mouthHole);

      // 头顶萌萌呆毛小叶
      const sprout = new THREE.Mesh(leafGeom, leafMat);
      sprout.scale.set(0.6, 0.15, 0.4);
      sprout.position.set(0, 0.42, -0.15);
      sprout.rotation.x = -0.6;
      headGroup.add(sprout);

    } else if (series === 'aoe' || plantId === 'watermelon' || plantId === 'pepper') {
      // 群伤系：饱满水滴大西瓜果实 + 瓜蒂 + 表情
      const aoeGeom = new THREE.SphereGeometry(0.42, 16, 16);
      const aoeBody = new THREE.Mesh(aoeGeom, headMat);
      aoeBody.scale.set(1.0, 1.15, 1.0);
      headGroup.add(aoeBody);

      // 顶部深绿瓜蒂
      const stalkGeom = new THREE.CylinderGeometry(0.06, 0.08, 0.22, 8);
      const stalk = new THREE.Mesh(stalkGeom, leafMat);
      stalk.position.y = 0.52;
      headGroup.add(stalk);

    } else if (series === 'slow' || plantId === 'sunflower') {
      // 减速系 / 向日葵：中央大圆花盘 + 环绕8片金黄/冰蓝小花瓣
      const centerDisc = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.14, 16), headMat);
      centerDisc.rotation.x = Math.PI / 2;
      headGroup.add(centerDisc);

      const petalMat = new THREE.MeshLambertMaterial({ color: colorHex === 0xFFD700 ? 0xFFA000 : 0x80D8FF });
      for (let p = 0; p < 8; p++) {
        const petal = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 8), petalMat);
        petal.scale.set(1.0, 1.4, 0.4);
        const pAngle = (p / 8) * Math.PI * 2;
        petal.position.set(0.36 * Math.cos(pAngle), 0.36 * Math.sin(pAngle), 0);
        petal.rotation.z = pAngle;
        headGroup.add(petal);
      }

    } else {
      // 爆发系（大蒜地刺/炸弹）：多瓣饱满圆润蒜瓣体
      const burstBody = new THREE.Mesh(new THREE.DodecahedronGeometry(0.38, 1), headMat);
      burstBody.scale.set(1.05, 0.9, 1.05);
      headGroup.add(burstBody);

      const knot = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.25, 8), leafMat);
      knot.position.y = 0.42;
      headGroup.add(knot);
    }

    // 4. 为所有植物手办装配通用萌系大黑眼与腮红（朝向 +Z 偏侧）
    const eyeGeom = new THREE.SphereGeometry(0.06, 10, 10);
    const pupilGeom = new THREE.SphereGeometry(0.025, 8, 8);
    const blushGeom = new THREE.SphereGeometry(0.05, 8, 8);

    // 左眼
    const eyeL = new THREE.Mesh(eyeGeom, eyeMat);
    eyeL.position.set(-0.16, 0.1, 0.34);
    const pupilL = new THREE.Mesh(pupilGeom, eyeHighlightMat);
    pupilL.position.set(-0.15, 0.12, 0.39);
    headGroup.add(eyeL);
    headGroup.add(pupilL);

    // 右眼
    const eyeR = new THREE.Mesh(eyeGeom, eyeMat);
    eyeR.position.set(0.16, 0.1, 0.34);
    const pupilR = new THREE.Mesh(pupilGeom, eyeHighlightMat);
    pupilR.position.set(0.17, 0.12, 0.39);
    headGroup.add(eyeR);
    headGroup.add(pupilR);

    // 腮红
    const blushL = new THREE.Mesh(blushGeom, blushMat);
    blushL.position.set(-0.25, 0.02, 0.3);
    headGroup.add(blushL);

    const blushR = new THREE.Mesh(blushGeom, blushMat);
    blushR.position.set(0.25, 0.02, 0.3);
    headGroup.add(blushR);

    root.add(headGroup);
    return root;
  }

  loadGLBModel(url, container, plantObj) {
    if (this.modelCache.has(url)) {
      const cached = this.modelCache.get(url);
      if (cached) {
        this.applyGLBToPlant(cached.clone(), container, plantObj);
      }
      return;
    }

    this.loader.load(
      url,
      (gltf) => {
        console.log(`[PlantRenderer] [成功] 真实 3D GLB 资产载入成功: ${url}`);
        this.modelCache.set(url, gltf.scene);
        this.applyGLBToPlant(gltf.scene.clone(), container, plantObj);
      },
      undefined,
      () => {
        // 模型尚未就绪，静默使用高质量参数化粘土手办模型
        this.modelCache.set(url, null);
      }
    );
  }

  normalizeModel(modelScene, targetSize = 1.0) {
    const box = new THREE.Box3().setFromObject(modelScene);
    const size = new THREE.Vector3();
    box.getSize(size);
    const maxDim = Math.max(size.x, size.y, size.z);
    if (maxDim > 0) {
      const scale = targetSize / maxDim;
      modelScene.scale.setScalar(scale);
    }
    box.setFromObject(modelScene);
    const center = new THREE.Vector3();
    box.getCenter(center);
    modelScene.position.x -= center.x;
    modelScene.position.z -= center.z;
    modelScene.position.y -= box.min.y;
  }

  applyGLBToPlant(modelScene, container, plantObj) {
    if (!plantObj || !container.parent) return;
    if (plantObj.visualMesh) {
      container.remove(plantObj.visualMesh);
    }
    this.normalizeModel(modelScene, 1.0);
    container.add(modelScene);
    plantObj.visualMesh = modelScene;
  }

  removePlant(uid) {
    const plantObj = this.plants.get(uid);
    if (plantObj) {
      this.group.remove(plantObj.mesh);
      plantObj.mesh.traverse(child => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
          if (Array.isArray(child.material)) child.material.forEach(m => m.dispose());
          else child.material.dispose();
        }
      });
      this.plants.delete(uid);
    }
  }

  clear() {
    const uids = Array.from(this.plants.keys());
    uids.forEach(uid => this.removePlant(uid));
    this.plants.clear();
  }

  upgradePlant(uid, newStar) {
    const plantObj = this.plants.get(uid);
    if (plantObj) {
      plantObj.targetScale = 0.65 + newStar * 0.08;
      plantObj.mesh.scale.set(0.05, 0.05, 0.05);
      plantObj.animState = 'upgrade';
    }
  }

  playAttackAnimation(uid) {
    const plantObj = this.plants.get(uid);
    if (plantObj) {
      plantObj.animState = 'attack';
      plantObj.attackTimer = 1.0;
    }
  }

  update(dt) {
    this.plants.forEach((p) => {
      p.time += dt;

      // 升级弹性生长动画 (Spring ease-out)
      if (p.animState === 'upgrade') {
        const cs = p.mesh.scale.x;
        const ds = p.targetScale - cs;
        p.mesh.scale.setScalar(cs + ds * 10 * dt);
        if (Math.abs(ds) < 0.01) {
          p.mesh.scale.setScalar(p.targetScale);
          p.animState = 'idle';
        }
      }

      // 空闲萌系呼吸上下轻弹
      if (p.animState === 'idle') {
        p.mesh.position.y = p.baseY + Math.sin(p.time * 2.5) * 0.03;
        p.mesh.rotation.x = 0;
      }

      // 攻击射击前倾回弹动画
      if (p.animState === 'attack') {
        p.attackTimer -= dt * 6;
        if (p.attackTimer <= 0) {
          p.animState = 'idle';
          p.mesh.rotation.x = 0;
        } else {
          p.mesh.rotation.x = Math.sin(p.attackTimer * Math.PI) * 0.25;
        }
      }

      // 5 星星环微旋
      if (p.starRing) {
        p.starRing.rotation.z += dt * 2.0;
      }
    });
  }
}
