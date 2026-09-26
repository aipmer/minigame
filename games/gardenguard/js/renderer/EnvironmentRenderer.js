import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';

/**
 * 《花园守卫》立体浮空岛场景渲染器
 * 日系动森 / 糖果粘土风：立体焦糖泥土断层、双层起伏暖草坪、转动小风车、圆润矮木桩护栏、彩色蘑菇与花草
 */
export class EnvironmentRenderer {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.scene.add(this.group);
    
    this.loader = new GLTFLoader();
    this.loader.setMeshoptDecoder(MeshoptDecoder);
    this.windmills = [];
    this.animatedFlora = [];
    this.time = 0;
  }
  
  createStylizedGrassTexture(isPlaza = false) {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    // 底色：阳光明丽嫩草绿（与治愈系童话背景自然融为一体）
    ctx.fillStyle = isPlaza ? '#92E23E' : '#85D632';
    ctx.fillRect(0, 0, 512, 512);

    // 动森经典微棋盘格手绘交替草纹
    const tileSize = 64;
    for (let x = 0; x < 512; x += tileSize) {
      for (let y = 0; y < 512; y += tileSize) {
        if ((x / tileSize + y / tileSize) % 2 === 0) {
          ctx.fillStyle = isPlaza ? '#A4EC4E' : '#99E242'; // 浅一层手绘明快高光绿
          ctx.fillRect(x, y, tileSize, tileSize);
        }
      }
    }

    // 细腻手绘花粉点、草尖与微小草斑
    for (let i = 0; i < 480; i++) {
      const px = Math.random() * 512;
      const py = Math.random() * 512;
      const r = Math.random() * 2.2 + 0.8;
      const rand = Math.random();
      if (rand > 0.7) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)'; // 阳光雏菊小亮点
      } else if (rand > 0.35) {
        ctx.fillStyle = 'rgba(202, 250, 92, 0.55)'; // 阳光鹅黄高光斑
      } else {
        ctx.fillStyle = 'rgba(92, 172, 28, 0.4)';  // 翡翠深草微阴影
      }
      ctx.beginPath();
      ctx.arc(px, py, r, 0, Math.PI * 2);
      ctx.fill();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(4, 4);
    return texture;
  }

  create() {
    // 1. 浮空岛台地基（厚重焦糖泥土层 + 倒锥岩底）
    const grassTexture = this.createStylizedGrassTexture(false);

    // 1.1 顶层草皮（微缩动森手绘草坪，圆角边缘）
    const grassTopGeom = new THREE.CylinderGeometry(8.6, 8.8, 0.45, 64);
    const grassTopMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: grassTexture,
      roughness: 0.65,
      metalness: 0.02
    });
    const grassTop = new THREE.Mesh(grassTopGeom, grassTopMat);
    grassTop.position.y = -0.22;
    grassTop.receiveShadow = true;
    this.group.add(grassTop);

    // 1.2 中心台地（微高起 0.08，给 4x4 棋盘创造专属花园庭院基座感）
    const plazaTexture = this.createStylizedGrassTexture(true);
    plazaTexture.repeat.set(3, 3);
    const gardenPlazaGeom = new THREE.BoxGeometry(7.2, 0.16, 7.2);
    const gardenPlazaMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: plazaTexture,
      roughness: 0.6,
      metalness: 0.02
    });
    const gardenPlaza = new THREE.Mesh(gardenPlazaGeom, gardenPlazaMat);
    gardenPlaza.position.set(0, -0.04, 0);
    gardenPlaza.receiveShadow = true;
    this.group.add(gardenPlaza);

    // 1.2.1 庭院精致陶土石砖包边与四角矮柱
    this.createCourtyardAccents();

    // 1.3 焦糖泥土断层（多层厚实断层切面）
    const soilGeom = new THREE.CylinderGeometry(8.8, 8.4, 0.9, 64);
    const soilMat = new THREE.MeshStandardMaterial({
      color: 0x9E7051,
      roughness: 0.85,
      metalness: 0.05
    });
    const soil = new THREE.Mesh(soilGeom, soilMat);
    soil.position.y = -0.85;
    soil.receiveShadow = true;
    this.group.add(soil);

    // 1.4 下层泥土暗纹与倒锥浮空岩底
    const rockGeom = new THREE.CylinderGeometry(8.4, 3.2, 2.4, 32);
    const rockMat = new THREE.MeshStandardMaterial({
      color: 0x6E4C38,
      roughness: 0.9,
      metalness: 0.05
    });
    const rock = new THREE.Mesh(rockGeom, rockMat);
    rock.position.y = -2.4;
    rock.receiveShadow = true;
    this.group.add(rock);

    // 2. 岛屿外围圆润木质桩围栏（暖阳光泽原木色）
    const postGeom = new THREE.CylinderGeometry(0.12, 0.15, 0.55, 12);
    const postMat = new THREE.MeshStandardMaterial({ 
      color: 0xF3C98B, // 暖阳蜜糖金木
      roughness: 0.7,
      metalness: 0.05
    });
    const railMat = new THREE.MeshStandardMaterial({ 
      color: 0xE0B272, // 暖色原木横木
      roughness: 0.7,
      metalness: 0.05
    });

    const numPosts = 24;
    for (let i = 0; i < numPosts; i++) {
      const angle = (i / numPosts) * Math.PI * 2;
      const r = 8.35;
      const x = r * Math.cos(angle);
      const z = r * Math.sin(angle);

      const post = new THREE.Mesh(postGeom, postMat);
      post.position.set(x, 0.12, z);
      post.castShadow = true;
      post.receiveShadow = true;
      this.group.add(post);

      // 横木连接下一根柱子
      const nextAngle = ((i + 1) / numPosts) * Math.PI * 2;
      const nx = r * Math.cos(nextAngle);
      const nz = r * Math.sin(nextAngle);
      const mid = new THREE.Vector3((x + nx) * 0.5, 0.16, (z + nz) * 0.5);
      const len = Math.hypot(nx - x, nz - z);

      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.08, len), railMat);
      rail.position.copy(mid);
      rail.lookAt(new THREE.Vector3(nx, 0.16, nz));
      rail.castShadow = true;
      rail.receiveShadow = true;
      this.group.add(rail);
    }

    // 3. 景观元素：一座童趣的白色旋转风车 (位于西北侧外围)
    this.createWindmill(new THREE.Vector3(-6.2, 0.0, -5.8));

    // 4. 园林生机：红白点点小蘑菇
    this.createMushrooms();

    // 5. 园林生机：聚簇的圆润矮灌木与花丛
    this.createShrubsAndFlowers();

    // 背景穿透天幕
    this.scene.background = null;
  }

  createWindmill(pos) {
    const windmillGroup = new THREE.Group();
    windmillGroup.position.copy(pos);
    this.group.add(windmillGroup);

    // 尝试载入真实手办粘土风车 GLB
    this.loader.load(
      'models/environment/windmill.glb',
      (gltf) => {
        console.log('[EnvironmentRenderer] [成功] 真实手办粘土风车 GLB 载入成功！');
        const model = gltf.scene;

        const box = new THREE.Box3().setFromObject(model);
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z) || 1.0;
        const targetHeight = 2.4;
        const scale = targetHeight / (size.y || maxDim);
        model.scale.setScalar(scale);

        box.setFromObject(model);
        model.position.y = -box.min.y;

        model.traverse(node => {
          if (node.isMesh) {
            node.castShadow = true;
            node.receiveShadow = true;
            if (node.material) {
              node.material.roughness = 0.75;
              node.material.metalness = 0.05;
            }
          }
        });

        // 寻找风车旋转节点
        let rotorFound = false;
        model.traverse(node => {
          if (!rotorFound && /blade|fan|rotor|wing|wheel/i.test(node.name)) {
            this.windmills.push(node);
            rotorFound = true;
          }
        });

        if (!rotorFound) {
          this.animatedFlora.push({ mesh: model, freq: 0.8, phase: 0 });
        }

        windmillGroup.clear();
        windmillGroup.add(model);
      },
      undefined,
      () => {
        this.createFallbackWindmill(windmillGroup);
      }
    );
  }

  createFallbackWindmill(windmillGroup) {
    // 降级兜底风车
    const bodyGeom = new THREE.CylinderGeometry(0.55, 0.85, 2.0, 16);
    const bodyMat = new THREE.MeshLambertMaterial({ color: 0xFFFDF7 });
    const body = new THREE.Mesh(bodyGeom, bodyMat);
    body.position.y = 1.0;
    windmillGroup.add(body);

    const roofGeom = new THREE.ConeGeometry(0.75, 0.8, 16);
    const roofMat = new THREE.MeshLambertMaterial({ color: 0xE53935 });
    const roof = new THREE.Mesh(roofGeom, roofMat);
    roof.position.y = 2.35;
    windmillGroup.add(roof);

    const rotorHub = new THREE.Group();
    rotorHub.position.set(0, 1.85, 0.62);
    const hubCap = new THREE.Mesh(
      new THREE.SphereGeometry(0.12, 12, 12),
      new THREE.MeshLambertMaterial({ color: 0xFFA000 })
    );
    rotorHub.add(hubCap);

    const bladeGeom = new THREE.BoxGeometry(0.2, 1.1, 0.04);
    const bladeMat = new THREE.MeshLambertMaterial({ color: 0xFFE082 });
    for (let b = 0; b < 4; b++) {
      const blade = new THREE.Mesh(bladeGeom, bladeMat);
      blade.position.y = 0.55;
      const bladePivot = new THREE.Group();
      bladePivot.rotation.z = (b * Math.PI) / 2;
      bladePivot.add(blade);
      rotorHub.add(bladePivot);
    }
    windmillGroup.add(rotorHub);
    this.windmills.push(rotorHub);
  }

  createMushrooms() {
    const mushroomSpots = [
      { x: -4.5, z: 4.8 },
      { x: -5.2, z: 4.2 },
      { x: 5.6, z: -3.8 },
      { x: 6.2, z: -3.2 }
    ];

    const stemGeom = new THREE.CylinderGeometry(0.08, 0.12, 0.35, 10);
    const stemMat = new THREE.MeshLambertMaterial({ color: 0xFFF8E7 });
    const capGeom = new THREE.SphereGeometry(0.25, 12, 12, 0, Math.PI * 2, 0, Math.PI * 0.55);
    const capMat = new THREE.MeshLambertMaterial({ color: 0xE53935 }); // 红顶

    mushroomSpots.forEach((spot, i) => {
      const mGroup = new THREE.Group();
      const stem = new THREE.Mesh(stemGeom, stemMat);
      stem.position.y = 0.15;
      mGroup.add(stem);

      const cap = new THREE.Mesh(capGeom, capMat);
      cap.position.y = 0.32;
      cap.scale.set(1.1, 0.8, 1.1);
      mGroup.add(cap);

      // 小白点斑纹
      const dot = new THREE.Mesh(
        new THREE.SphereGeometry(0.05, 8, 8),
        new THREE.MeshLambertMaterial({ color: 0xFFFFFF })
      );
      dot.position.set(0, 0.45, 0.12);
      mGroup.add(dot);

      mGroup.position.set(spot.x, 0.0, spot.z);
      mGroup.scale.setScalar(0.8 + (i % 3) * 0.2);
      this.group.add(mGroup);
    });
  }

  createShrubsAndFlowers() {
    const shrubPositions = [
      { x: -6.5, z: 2.0 },
      { x: -6.0, z: -2.5 },
      { x: 6.2, z: 2.5 },
      { x: 5.8, z: 5.2 },
      { x: 2.5, z: -6.5 }
    ];

    // 尝试载入真实 3D 灌木花丛 GLB
    this.loader.load(
      'models/environment/bush_cluster.glb',
      (gltf) => {
        console.log('[EnvironmentRenderer] [成功] 真实手办矮灌木 GLB 载入成功！');
        const template = gltf.scene;
        const box = new THREE.Box3().setFromObject(template);
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z) || 1.0;
        const targetScale = 0.9 / maxDim;
        template.scale.setScalar(targetScale);

        template.traverse(n => {
          if (n.isMesh) {
            n.castShadow = true;
            n.receiveShadow = true;
            if (n.material) n.material.roughness = 0.8;
          }
        });

        shrubPositions.forEach((pos, idx) => {
          const clone = template.clone();
          clone.position.set(pos.x, 0.0, pos.z);
          clone.rotation.y = idx * 1.3;
          clone.scale.multiplyScalar(0.85 + (idx % 3) * 0.2);
          this.group.add(clone);
          this.animatedFlora.push({ mesh: clone, freq: 1.2 + idx * 0.2, phase: idx });
        });
      },
      undefined,
      () => {
        // 降级兜底矮灌木
        const shrubMat = new THREE.MeshLambertMaterial({ color: 0x558B2F });
        shrubPositions.forEach((pos, idx) => {
          const shrub = new THREE.Group();
          const ball1 = new THREE.Mesh(new THREE.SphereGeometry(0.45, 12, 12), shrubMat);
          ball1.position.set(0, 0.35, 0);
          shrub.add(ball1);
          const ball2 = new THREE.Mesh(new THREE.SphereGeometry(0.32, 10, 10), shrubMat);
          ball2.position.set(0.25, 0.28, 0.15);
          shrub.add(ball2);
          shrub.position.set(pos.x, 0.0, pos.z);
          this.group.add(shrub);
          this.animatedFlora.push({ mesh: shrub, freq: 1.2 + idx * 0.2, phase: idx });
        });
      }
    );

    // 小花
    const flowerColors = [0xFF4081, 0xFFD54F, 0x40C4FF, 0xFFAB40];
    const flowerStemGeom = new THREE.CylinderGeometry(0.04, 0.04, 0.25, 6);
    const stemMat = new THREE.MeshLambertMaterial({ color: 0x689F38 });
    const flowerPetalGeom = new THREE.SphereGeometry(0.12, 8, 8);

    for (let i = 0; i < 18; i++) {
      const flower = new THREE.Group();
      const stem = new THREE.Mesh(flowerStemGeom, stemMat);
      stem.position.y = 0.12;
      flower.add(stem);

      const petalMat = new THREE.MeshLambertMaterial({ color: flowerColors[i % flowerColors.length] });
      const petal = new THREE.Mesh(flowerPetalGeom, petalMat);
      petal.position.y = 0.26;
      flower.add(petal);

      // 中心黄色花蕊
      const centerPollen = new THREE.Mesh(
        new THREE.SphereGeometry(0.06, 8, 8),
        new THREE.MeshLambertMaterial({ color: 0xFFEB3B })
      );
      centerPollen.position.set(0, 0.32, 0.04);
      flower.add(centerPollen);

      const angle = (i / 18) * Math.PI * 2 + Math.sin(i) * 0.4;
      const r = 4.8 + Math.sin(i * 2.5) * 2.2;
      flower.position.set(r * Math.cos(angle), 0.0, r * Math.sin(angle));
      this.group.add(flower);
      this.animatedFlora.push({ mesh: flower, freq: 2.0 + (i % 3) * 0.5, phase: i });
    }
  }
  
  createCourtyardAccents() {
    // 庭院石砖包边材质（暖象牙白与蜜糖陶石）
    const curbMat = new THREE.MeshStandardMaterial({ 
      color: 0xFFF9EE, 
      roughness: 0.65, 
      metalness: 0.02 
    });
    const cornerPillarMat = new THREE.MeshStandardMaterial({ 
      color: 0xF7E4C8, 
      roughness: 0.65, 
      metalness: 0.02 
    });
    const capGlowMat = new THREE.MeshStandardMaterial({ 
      color: 0xFFD54F, 
      emissive: 0xFFA000, 
      emissiveIntensity: 0.55, 
      roughness: 0.35 
    });

    const half = 3.6;
    const curbHeight = 0.12;
    const curbThickness = 0.16;

    // 四边石质包边（稍露出草皮 0.05）
    const northSouthGeom = new THREE.BoxGeometry(7.2, curbHeight, curbThickness);
    const eastWestGeom = new THREE.BoxGeometry(curbThickness, curbHeight, 7.2);

    const curbN = new THREE.Mesh(northSouthGeom, curbMat);
    curbN.position.set(0, 0.04, -half);
    curbN.castShadow = true;
    curbN.receiveShadow = true;
    this.group.add(curbN);

    const curbS = new THREE.Mesh(northSouthGeom, curbMat);
    curbS.position.set(0, 0.04, half);
    curbS.castShadow = true;
    curbS.receiveShadow = true;
    this.group.add(curbS);

    const curbE = new THREE.Mesh(eastWestGeom, curbMat);
    curbE.position.set(half, 0.04, 0);
    curbE.castShadow = true;
    curbE.receiveShadow = true;
    this.group.add(curbE);

    const curbW = new THREE.Mesh(eastWestGeom, curbMat);
    curbW.position.set(-half, 0.04, 0);
    curbW.castShadow = true;
    curbW.receiveShadow = true;
    this.group.add(curbW);

    // 四个转角：萌系微型陶土灯柱
    const cornerPositions = [
      { x: -half, z: -half },
      { x: half, z: -half },
      { x: -half, z: half },
      { x: half, z: half }
    ];

    const pillarGeom = new THREE.CylinderGeometry(0.18, 0.22, 0.38, 12);
    const capGeom = new THREE.SphereGeometry(0.16, 12, 12);

    cornerPositions.forEach(pos => {
      const pillarGroup = new THREE.Group();
      pillarGroup.position.set(pos.x, 0.0, pos.z);

      const pillar = new THREE.Mesh(pillarGeom, cornerPillarMat);
      pillar.position.y = 0.19;
      pillar.castShadow = true;
      pillar.receiveShadow = true;
      pillarGroup.add(pillar);

      const cap = new THREE.Mesh(capGeom, capGlowMat);
      cap.position.y = 0.42;
      cap.castShadow = true;
      cap.receiveShadow = true;
      pillarGroup.add(cap);

      this.group.add(pillarGroup);
    });
  }

  update(dt) {
    this.time += dt;

    // 风车旋转
    this.windmills.forEach(w => {
      w.rotation.z += dt * 1.5;
    });

    // 花草微幅呼吸微风吹拂
    this.animatedFlora.forEach(item => {
      item.mesh.rotation.z = Math.sin(this.time * item.freq + item.phase) * 0.06;
    });
  }
}
