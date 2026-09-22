import * as THREE from 'three';

export class Ground {
  constructor(scene) {
    this.scene = scene;
    this.gridSize = 20;
    this.isWrapMode = false;
    
    this.rootGroup = new THREE.Group();
    this.scene.add(this.rootGroup);

    this.grassTexture = this.createGridTexture(false);
    this.snowTexture = this.createGridTexture(true);

    this.initGround();
    this.initFloatingIslandBase();
    this.initBorders();
  }

  createGridTexture(isSnow = false) {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d');
    
    const size = 1024;
    const gridCount = 20;
    const cellSize = size / gridCount;
    
    for (let i = 0; i < gridCount; i++) {
      for (let j = 0; j < gridCount; j++) {
        const isLight = (i + j) % 2 === 0;
        
        if (isSnow) {
          // 纯净冬日雪境双色
          ctx.fillStyle = isLight ? '#F8FAFC' : '#E2E8F0';
          ctx.fillRect(i * cellSize, j * cellSize, cellSize, cellSize);
          ctx.strokeStyle = isLight ? 'rgba(255, 255, 255, 0.85)' : 'rgba(203, 213, 225, 0.6)';
          ctx.lineWidth = 2.5;
          ctx.strokeRect(i * cellSize + 1.5, j * cellSize + 1.5, cellSize - 3, cellSize - 3);

          if ((i * 3 + j * 7) % 5 === 0) {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
            ctx.beginPath();
            ctx.arc(i * cellSize + cellSize * 0.5, j * cellSize + cellSize * 0.5, 3.5, 0, Math.PI * 2);
            ctx.fill();
          }
        } else {
          // 饱满马力欧/动森风草坪双色
          ctx.fillStyle = isLight ? '#72C73B' : '#88D64C';
          ctx.fillRect(i * cellSize, j * cellSize, cellSize, cellSize);
          ctx.strokeStyle = isLight ? 'rgba(255, 255, 255, 0.25)' : 'rgba(255, 255, 255, 0.15)';
          ctx.lineWidth = 2.5;
          ctx.strokeRect(i * cellSize + 1.5, j * cellSize + 1.5, cellSize - 3, cellSize - 3);

          if ((i * 3 + j * 7) % 5 === 0) {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.18)';
            ctx.beginPath();
            ctx.arc(i * cellSize + cellSize * 0.5, j * cellSize + cellSize * 0.5, 3.5, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }
    }
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.generateMipmaps = false;
    return texture;
  }
  
  initGround() {
    const geometry = new THREE.PlaneGeometry(20, 20);
    const material = new THREE.MeshStandardMaterial({
      map: this.grassTexture,
      roughness: 0.55,
      metalness: 0.05
    });
    
    this.groundMesh = new THREE.Mesh(geometry, material);
    this.groundMesh.rotation.x = -Math.PI / 2;
    this.groundMesh.position.y = 0.02; // 抬升至 0.02 消除 z-fighting
    this.groundMesh.receiveShadow = true;
    this.rootGroup.add(this.groundMesh);
  }

  // ── 构建立体厚度浮空岛底座 ──
  initFloatingIslandBase() {
    this.islandGroup = new THREE.Group();

    // 1. 草坪外沿立体厚边（绿色草皮层）
    const grassCrustGeo = new THREE.BoxGeometry(20.7, 0.4, 20.7);
    const grassCrustMat = new THREE.MeshStandardMaterial({
      color: 0x5EA82E,
      roughness: 0.5,
      metalness: 0.05,
    });
    this.grassCrust = new THREE.Mesh(grassCrustGeo, grassCrustMat);
    this.grassCrust.position.y = -0.22;
    this.grassCrust.receiveShadow = true;
    this.islandGroup.add(this.grassCrust);

    // 2. 中层泥土岩石层（温暖焦糖粘土断层）
    const rockTier1Geo = new THREE.BoxGeometry(20.3, 1.1, 20.3);
    const rockMat1 = new THREE.MeshStandardMaterial({
      color: 0x8C5A3C,
      roughness: 0.7,
      metalness: 0.08,
    });
    this.rockTier1 = new THREE.Mesh(rockTier1Geo, rockMat1);
    this.rockTier1.position.y = -0.9;
    this.rockTier1.castShadow = true;
    this.rockTier1.receiveShadow = true;
    this.islandGroup.add(this.rockTier1);

    // 3. 浮空岛下层收敛龙骨岩体
    const rockTier2Geo = new THREE.BoxGeometry(18.2, 1.2, 18.2);
    const rockMat2 = new THREE.MeshStandardMaterial({
      color: 0x734830,
      roughness: 0.75,
      metalness: 0.08,
    });
    this.rockTier2 = new THREE.Mesh(rockTier2Geo, rockMat2);
    this.rockTier2.position.y = -1.9;
    this.rockTier2.castShadow = true;
    this.islandGroup.add(this.rockTier2);

    // 4. 浮空岛最底部尖石
    const rockBottomGeo = new THREE.BoxGeometry(14.0, 1.0, 14.0);
    this.rockBottom = new THREE.Mesh(rockBottomGeo, rockMat2);
    this.rockBottom.position.y = -2.8;
    this.rockBottom.castShadow = true;
    this.islandGroup.add(this.rockBottom);

    this.rootGroup.add(this.islandGroup);
  }
  
  // ── 构建立体玩具圆润围栏与四角灯塔立柱 ──
  initBorders() {
    if (this.borderGroup) {
      this.rootGroup.remove(this.borderGroup);
    }
    this.borderGroup = new THREE.Group();

    const wallHeight = this.isWrapMode ? 0.35 : 0.75;
    const wallThickness = 0.42;
    const wallLength = 20; 
    
    // 护栏材质（穿墙模式下为柔光传送晶莹质感）
    const wallColor = this.isWrapMode ? 0x38BDF8 : 0xF59E0B;
    const capColor = this.isWrapMode ? 0x818CF8 : 0xFDE047;
    const emissiveIntensity = this.isWrapMode ? 0.45 : 0.15;

    this.wallMat = new THREE.MeshStandardMaterial({
      color: wallColor,
      emissive: this.isWrapMode ? 0x0284C7 : 0x000000,
      emissiveIntensity: emissiveIntensity,
      metalness: 0.15,
      roughness: 0.35,
      transparent: this.isWrapMode,
      opacity: this.isWrapMode ? 0.85 : 1.0
    });
    
    this.capMat = new THREE.MeshStandardMaterial({
      color: capColor,
      emissive: capColor,
      emissiveIntensity: emissiveIntensity * 1.2,
      metalness: 0.2,
      roughness: 0.25,
    });

    const createWall = (width, depth, x, z) => {
      const group = new THREE.Group();

      const baseGeo = new THREE.BoxGeometry(width, wallHeight, depth);
      const wallBase = new THREE.Mesh(baseGeo, this.wallMat);
      wallBase.position.set(0, wallHeight / 2, 0);
      wallBase.castShadow = true;
      wallBase.receiveShadow = true;
      group.add(wallBase);
      
      const capGeo = new THREE.BoxGeometry(width * 1.01, 0.15, depth * 1.1);
      const cap = new THREE.Mesh(capGeo, this.capMat);
      cap.position.set(0, wallHeight + 0.075, 0);
      cap.castShadow = true;
      group.add(cap);
      
      group.position.set(x, 0, z);
      this.borderGroup.add(group);
    };
    
    // 四面主要护栏
    createWall(wallLength, wallThickness, 0, -10 - wallThickness / 2);
    createWall(wallLength, wallThickness, 0, 10 + wallThickness / 2);
    createWall(wallThickness, wallLength, -10 - wallThickness / 2, 0);
    createWall(wallThickness, wallLength, 10 + wallThickness / 2, 0);

    // 四角立柱
    const pillarGeo = new THREE.CylinderGeometry(0.55, 0.62, wallHeight + 0.4, 20);
    const beaconGeo = new THREE.SphereGeometry(0.35, 20, 20);
    const beaconColor = this.isWrapMode ? 0x67E8F9 : 0xFEF08A;

    const beaconMat = new THREE.MeshStandardMaterial({
      color: beaconColor,
      emissive: beaconColor,
      emissiveIntensity: this.isWrapMode ? 0.8 : 0.45,
      roughness: 0.2,
      metalness: 0.2,
    });

    const corners = [
      [-10.2, -10.2],
      [10.2, -10.2],
      [-10.2, 10.2],
      [10.2, 10.2]
    ];

    corners.forEach(([cx, cz]) => {
      const pGroup = new THREE.Group();
      const pillar = new THREE.Mesh(pillarGeo, this.wallMat);
      pillar.position.y = (wallHeight + 0.4) / 2;
      pillar.castShadow = true;
      pillar.receiveShadow = true;
      pGroup.add(pillar);

      const beacon = new THREE.Mesh(beaconGeo, beaconMat);
      beacon.position.y = wallHeight + 0.55;
      beacon.castShadow = true;
      pGroup.add(beacon);

      pGroup.position.set(cx, 0, cz);
      this.borderGroup.add(pGroup);
    });

    this.rootGroup.add(this.borderGroup);
  }

  // 边界柔光呼吸预警机制（非穿墙模式下，蛇靠近边缘 3 格内时触发温和呼吸警示）
  updateBorderWarning(snakePos, boundLimit = 15.5) {
    if (!snakePos || this.isWrapMode || !this.wallMat || !this.capMat) return;
    const distToEdgeX = boundLimit - Math.abs(snakePos.x);
    const distToEdgeZ = boundLimit - Math.abs(snakePos.z);
    const minDist = Math.min(distToEdgeX, distToEdgeZ);

    if (minDist <= 3.0) {
      const factor = (3.0 - Math.max(0, minDist)) / 3.0;
      const pulse = 0.5 + 0.5 * Math.sin(Date.now() * 0.01);
      this.wallMat.emissive.setHex(0xEF4444); // 警示绯红
      this.wallMat.emissiveIntensity = 0.25 + factor * 0.55 * pulse;
      this.capMat.emissive.setHex(0xFCA5A5);
      this.capMat.emissiveIntensity = 0.35 + factor * 0.65 * pulse;
    } else {
      this.wallMat.emissive.setHex(0x000000);
      this.wallMat.emissiveIntensity = 0.15;
      this.capMat.emissive.setHex(0xFDE047);
      this.capMat.emissiveIntensity = 0.2;
    }
  }

  // 玩法工坊网格尺寸与穿墙模式动态联动
  setGridConfig(gridSize = 32, isWrapMode = false) {
    this.gridSize = gridSize;
    this.isWrapMode = !!isWrapMode;

    const scale = gridSize / 20;
    // 水平 X/Z 缩放对齐设定尺寸，Y 轴保持适度厚度
    this.rootGroup.scale.set(scale, 1.0, scale);

    // 重新配置边界围栏（更新穿墙柔光或阻隔形态）
    this.initBorders();
  }

  setWeather(type) {
    if (type === 'snow') {
      if (this.groundMesh) {
        this.groundMesh.material.map = this.snowTexture;
        this.groundMesh.material.needsUpdate = true;
      }
      if (this.grassCrust) {
        this.grassCrust.material.color.setHex(0xCBD5E1); // 冰雪白霜层
      }
    } else {
      if (this.groundMesh) {
        this.groundMesh.material.map = this.grassTexture;
        this.groundMesh.material.needsUpdate = true;
      }
      if (this.grassCrust) {
        this.grassCrust.material.color.setHex(0x5EA82E); // 翠绿草皮
      }
    }
  }
}
