import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';

/**
 * 《花园守卫》害虫怪物实体粘土手办渲染器
 * 严禁使用裸露单体球体/方块，每只害虫均具备多节身体、五官眼睛、触角、外壳或扇动小翅膀
 */
export class EnemyRenderer {
  constructor(scene) {
    this.scene = scene;
    this.enemies = new Map();
    this.group = new THREE.Group();
    this.scene.add(this.group);
    this.loader = new GLTFLoader();
    this.loader.setMeshoptDecoder(MeshoptDecoder);
    this.modelCache = new Map();
  }
  
  addEnemy(enemyData, worldPos) {
    const { uid } = enemyData;
    const enemyId = enemyData.id || enemyData.type;
    const enemyColor = enemyData.color ? parseInt(enemyData.color.replace('#', '0x')) : 0x76B947;

    const container = new THREE.Group();
    container.position.copy(worldPos);
    container.position.y = 0.16; // 稳贴鹅卵石地面

    // 1. 构建高辨识度实体粘土怪物手办
    const clayModel = this.buildChibiEnemyModel(enemyId, enemyColor);
    container.add(clayModel);

    const enemyObj = {
      id: enemyId,
      mesh: container,
      visualMesh: clayModel,
      wings: clayModel.userData?.wings || [],
      baseY: container.position.y,
      time: Math.random() * 10,
      speed: enemyData.speed || 1.0,
      hitTimer: 0,
      dead: false
    };

    this.enemies.set(uid, enemyObj);
    this.group.add(container);

    // 2. 尝试异步加载可能已生成的真实 3D GLB 害虫模型
    const enemyModelMap = {
      'caterpillar': 'models/enemies/caterpillar.glb',
      'slug': 'models/enemies/caterpillar.glb',
      'beetle': 'models/enemies/beetle.glb',
      'aphid': 'models/enemies/beetle.glb',
      'ladybug': 'models/enemies/beetle.glb',
      'scorpion': 'models/enemies/beetle.glb',
      'mushroom_king': 'models/enemies/beetle.glb'
    };
    const modelUrl = enemyModelMap[enemyId] || `models/enemies/${enemyId}.glb`;
    this.loadGLBModel(modelUrl, container, enemyObj);
  }

  /**
   * 构建高品质参数化粘土小虫模型
   */
  buildChibiEnemyModel(enemyId, colorHex) {
    const root = new THREE.Group();
    const bodyMat = new THREE.MeshLambertMaterial({ color: colorHex });
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x111111 });
    const eyeHighlightMat = new THREE.MeshBasicMaterial({ color: 0xFFFFFF });
    const hornMat = new THREE.MeshLambertMaterial({ color: 0x3E2723 });
    const wingMat = new THREE.MeshLambertMaterial({ color: 0xFFFFFF, transparent: true, opacity: 0.75 });

    if (enemyId === 'caterpillar') {
      // 毛毛虫：4 节饱满圆润翠绿小球（带触角、黑眼睛、小短足）
      const segSizes = [0.24, 0.22, 0.18, 0.14];
      const segOffsets = [0.26, 0.02, -0.2, -0.38];

      segSizes.forEach((rad, idx) => {
        const seg = new THREE.Mesh(new THREE.SphereGeometry(rad, 12, 12), bodyMat);
        seg.position.set(0, rad * 0.9, segOffsets[idx]);
        root.add(seg);
      });

      // 头部（最前方一节）五官
      const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 8), eyeMat);
      eyeL.position.set(-0.1, 0.28, 0.44);
      const pupL = new THREE.Mesh(new THREE.SphereGeometry(0.018, 6, 6), eyeHighlightMat);
      pupL.position.set(-0.09, 0.3, 0.47);
      root.add(eyeL);
      root.add(pupL);

      const eyeR = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 8), eyeMat);
      eyeR.position.set(0.1, 0.28, 0.44);
      const pupR = new THREE.Mesh(new THREE.SphereGeometry(0.018, 6, 6), eyeHighlightMat);
      pupR.position.set(0.11, 0.3, 0.47);
      root.add(eyeR);
      root.add(pupR);

      // 触角一对
      const antL = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.16, 6), hornMat);
      antL.position.set(-0.08, 0.46, 0.34);
      antL.rotation.z = 0.3;
      antL.rotation.x = -0.2;
      root.add(antL);

      const antR = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.16, 6), hornMat);
      antR.position.set(0.08, 0.46, 0.34);
      antR.rotation.z = -0.3;
      antR.rotation.x = -0.2;
      root.add(antR);

    } else if (enemyId === 'beetle' || enemyId === 'poison_beetle') {
      // 重装甲虫/毒甲虫：凸起的光滑焦糖色双层甲壳 + 头部独角
      const thorax = new THREE.Mesh(new THREE.SphereGeometry(0.26, 14, 14), bodyMat);
      thorax.scale.set(1.15, 0.8, 1.25);
      thorax.position.y = 0.22;
      root.add(thorax);

      // 头部
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 10), hornMat);
      head.position.set(0, 0.18, 0.3);
      root.add(head);

      // 独角
      const horn = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.28, 8), hornMat);
      horn.position.set(0, 0.32, 0.42);
      horn.rotation.x = 0.6;
      root.add(horn);

      // 眼睛
      const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.035, 6, 6), eyeHighlightMat);
      eyeL.position.set(-0.1, 0.22, 0.38);
      root.add(eyeL);
      const eyeR = new THREE.Mesh(new THREE.SphereGeometry(0.035, 6, 6), eyeHighlightMat);
      eyeR.position.set(0.1, 0.22, 0.38);
      root.add(eyeR);

    } else if (enemyId === 'flea' || enemyId === 'boss_wasp') {
      // 快速跳蚤或大蜂后：紧凑球体 + 扇动小翅膀
      const scaleMult = enemyId === 'boss_wasp' ? 1.5 : 0.85;
      const body = new THREE.Mesh(new THREE.SphereGeometry(0.28 * scaleMult, 12, 12), bodyMat);
      body.scale.set(1.0, 1.1, 1.3);
      body.position.y = 0.28 * scaleMult;
      root.add(body);

      // 双侧小翅膀
      const wingGeom = new THREE.SphereGeometry(0.18 * scaleMult, 8, 8);
      const wingL = new THREE.Mesh(wingGeom, wingMat);
      wingL.scale.set(1.4, 0.15, 0.8);
      wingL.position.set(-0.28 * scaleMult, 0.38 * scaleMult, 0);
      root.add(wingL);

      const wingR = new THREE.Mesh(wingGeom, wingMat);
      wingR.scale.set(1.4, 0.15, 0.8);
      wingR.position.set(0.28 * scaleMult, 0.38 * scaleMult, 0);
      root.add(wingR);

      root.userData = { wings: [wingL, wingR] };

    } else {
      // 默认（蛞蝓等）：饱满软萌水滴粘土体
      const slugBody = new THREE.Mesh(new THREE.SphereGeometry(0.26, 12, 12), bodyMat);
      slugBody.scale.set(1.0, 0.7, 1.4);
      slugBody.position.y = 0.16;
      root.add(slugBody);

      // 眼睛触须
      const eyeStalkL = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.16, 6), bodyMat);
      eyeStalkL.position.set(-0.08, 0.28, 0.28);
      eyeStalkL.rotation.x = 0.3;
      root.add(eyeStalkL);

      const eyeStalkR = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.16, 6), bodyMat);
      eyeStalkR.position.set(0.08, 0.28, 0.28);
      eyeStalkR.rotation.x = 0.3;
      root.add(eyeStalkR);
    }

    return root;
  }

  loadGLBModel(url, container, enemyObj) {
    if (this.modelCache.has(url)) {
      const cached = this.modelCache.get(url);
      if (cached) {
        this.applyGLBToEnemy(cached.clone(), container, enemyObj);
      }
      return;
    }

    this.loader.load(
      url,
      (gltf) => {
        console.log(`[EnemyRenderer] 真实 3D 害虫模型载入成功: ${url}`);
        this.modelCache.set(url, gltf.scene);
        this.applyGLBToEnemy(gltf.scene.clone(), container, enemyObj);
      },
      undefined,
      () => {
        // 模型尚未就绪，静默使用高质量参数化粘土手办模型
        this.modelCache.set(url, null);
      }
    );
  }

  normalizeModel(modelScene, targetSize = 0.8) {
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

  applyGLBToEnemy(modelScene, container, enemyObj) {
    if (!enemyObj || !container.parent) return;
    if (enemyObj.visualMesh) {
      container.remove(enemyObj.visualMesh);
    }
    this.normalizeModel(modelScene, 0.8);
    modelScene.traverse(node => {
      if (node.isMesh) {
        node.castShadow = true;
        node.receiveShadow = true;
        if (node.material) {
          node.material.roughness = 0.65;
          node.material.metalness = 0.05;
        }
      }
    });
    container.add(modelScene);
    enemyObj.visualMesh = modelScene;
  }

  updateEnemy(uid, worldPos) {
    const enemyObj = this.enemies.get(uid);
    if (enemyObj && !enemyObj.dead) {
      const dx = worldPos.x - enemyObj.mesh.position.x;
      const dz = worldPos.z - enemyObj.mesh.position.z;
      if (Math.abs(dx) > 0.001 || Math.abs(dz) > 0.001) {
        enemyObj.mesh.rotation.y = Math.atan2(dx, dz);
      }
      enemyObj.mesh.position.x = worldPos.x;
      enemyObj.mesh.position.z = worldPos.z;
    }
  }

  setEmissive(mesh, hex) {
    if (!mesh) return;
    mesh.traverse(child => {
      if (child.isMesh && child.material && child.material.emissive) {
        child.material.emissive.setHex(hex);
      }
    });
  }

  playHitEffect(uid) {
    const enemyObj = this.enemies.get(uid);
    if (enemyObj && !enemyObj.dead) {
      enemyObj.hitTimer = 0.1;
      this.setEmissive(enemyObj.mesh, 0xffffff);
    }
  }
  
  playDeathEffect(uid) {
    const enemyObj = this.enemies.get(uid);
    if (enemyObj) {
      enemyObj.dead = true;
    }
  }
  
  removeEnemy(uid) {
    const enemyObj = this.enemies.get(uid);
    if (enemyObj) {
      this.group.remove(enemyObj.mesh);
      enemyObj.mesh.traverse(child => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
          if (Array.isArray(child.material)) child.material.forEach(m => m.dispose());
          else child.material.dispose();
        }
      });
      this.enemies.delete(uid);
    }
  }

  clear() {
    const uids = Array.from(this.enemies.keys());
    uids.forEach(uid => this.removeEnemy(uid));
    this.enemies.clear();
  }
  
  update(dt) {
    const toRemove = [];
    this.enemies.forEach((e, uid) => {
      e.time += dt;
      
      // 害虫爬行起伏动画
      if (!e.dead) {
        e.mesh.position.y = e.baseY + Math.abs(Math.sin(e.time * e.speed * 5)) * 0.06;
        
        // 翅膀高频振翅动画
        if (e.wings && e.wings.length > 0) {
          const wingFlap = Math.sin(e.time * 24) * 0.4;
          e.wings[0].rotation.z = wingFlap;
          e.wings[1].rotation.z = -wingFlap;
        }
      }
      
      // 受击闪白
      if (e.hitTimer > 0) {
        e.hitTimer -= dt;
        if (e.hitTimer <= 0) {
          this.setEmissive(e.mesh, 0x000000);
        }
      }
      
      // 死亡缩小旋转消散
      if (e.dead) {
        e.mesh.scale.multiplyScalar(0.88);
        e.mesh.rotation.y += dt * 10;
        if (e.mesh.scale.x < 0.05) {
          toRemove.push(uid);
        }
      }
    });
    
    toRemove.forEach(uid => this.removeEnemy(uid));
  }
}
