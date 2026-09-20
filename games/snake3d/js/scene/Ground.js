import * as THREE from 'three';

export class Ground {
  constructor(scene) {
    this.scene = scene;
    
    this.initGround();
    this.initFloatingIslandBase();
    this.initBorders();
  }
  
  initGround() {
    // 创建高精度玩具棋盘格草坪纹理
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d');
    
    const size = 1024;
    const gridSize = 20;
    const cellSize = size / gridSize;
    
    for (let i = 0; i < gridSize; i++) {
      for (let j = 0; j < gridSize; j++) {
        const isLight = (i + j) % 2 === 0;
        
        // 饱满马力欧/动森风草坪双色
        ctx.fillStyle = isLight ? '#72C73B' : '#88D64C';
        ctx.fillRect(i * cellSize, j * cellSize, cellSize, cellSize);
        
        // 玩具感内嵌倒角高光与微阴影
        ctx.strokeStyle = isLight ? 'rgba(255, 255, 255, 0.25)' : 'rgba(255, 255, 255, 0.15)';
        ctx.lineWidth = 2.5;
        ctx.strokeRect(i * cellSize + 1.5, j * cellSize + 1.5, cellSize - 3, cellSize - 3);

        // 柔和微点纹理提升粘土触感
        if ((i * 3 + j * 7) % 5 === 0) {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.18)';
          ctx.beginPath();
          ctx.arc(i * cellSize + cellSize * 0.5, j * cellSize + cellSize * 0.5, 3.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.generateMipmaps = false;
    
    const geometry = new THREE.PlaneGeometry(20, 20);
    const material = new THREE.MeshStandardMaterial({
      map: texture,
      roughness: 0.55,
      metalness: 0.05
    });
    
    const ground = new THREE.Mesh(geometry, material);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = 0.02; // 抬升至 0.02 彻底消除与岛体顶面的深度竞争(z-fighting)
    ground.receiveShadow = true;
    this.scene.add(ground);
  }

  // ── 构建立体厚度浮空岛底座（彻底消除单薄漂浮感） ──
  initFloatingIslandBase() {
    const islandGroup = new THREE.Group();

    // 1. 草坪外沿立体厚边（绿色草皮层）
    const grassCrustGeo = new THREE.BoxGeometry(20.7, 0.4, 20.7);
    const grassCrustMat = new THREE.MeshStandardMaterial({
      color: 0x5EA82E,
      roughness: 0.5,
      metalness: 0.05,
    });
    const grassCrust = new THREE.Mesh(grassCrustGeo, grassCrustMat);
    grassCrust.position.y = -0.22; // 顶面位于 -0.02，与 ground(0.02) 保持安全间距
    grassCrust.receiveShadow = true;
    islandGroup.add(grassCrust);

    // 2. 中层泥土岩石层（温暖焦糖粘土断层）
    const rockTier1Geo = new THREE.BoxGeometry(20.3, 1.1, 20.3);
    const rockMat1 = new THREE.MeshStandardMaterial({
      color: 0x8C5A3C,
      roughness: 0.7,
      metalness: 0.08,
    });
    const rockTier1 = new THREE.Mesh(rockTier1Geo, rockMat1);
    rockTier1.position.y = -0.9;
    rockTier1.castShadow = true;
    rockTier1.receiveShadow = true;
    islandGroup.add(rockTier1);

    // 3. 浮空岛下层收敛龙骨岩体（倒锥形立体渐变收束）
    const rockTier2Geo = new THREE.BoxGeometry(18.2, 1.2, 18.2);
    const rockMat2 = new THREE.MeshStandardMaterial({
      color: 0x734830,
      roughness: 0.75,
      metalness: 0.08,
    });
    const rockTier2 = new THREE.Mesh(rockTier2Geo, rockMat2);
    rockTier2.position.y = -1.9;
    rockTier2.castShadow = true;
    islandGroup.add(rockTier2);

    // 4. 浮空岛最底部悬空尖石块
    const rockBottomGeo = new THREE.BoxGeometry(14.0, 1.0, 14.0);
    const rockBottom = new THREE.Mesh(rockBottomGeo, rockMat2);
    rockBottom.position.y = -2.8;
    rockBottom.castShadow = true;
    islandGroup.add(rockBottom);

    this.scene.add(islandGroup);
  }
  
  // ── 构建立体玩具圆润围栏与四角灯塔立柱 ──
  initBorders() {
    const wallHeight = 0.75;
    const wallThickness = 0.42;
    const wallLength = 20; 
    
    // 暖黄奶油粘土积木护栏
    const wallMat = new THREE.MeshStandardMaterial({
      color: 0xF59E0B,
      metalness: 0.1,
      roughness: 0.35,
    });
    
    // 护栏顶盖高光奶酪黄
    const capMat = new THREE.MeshStandardMaterial({
      color: 0xFDE047,
      emissive: 0xF59E0B,
      emissiveIntensity: 0.15,
      metalness: 0.15,
      roughness: 0.28,
    });

    const createWall = (width, depth, x, z) => {
      const group = new THREE.Group();

      const baseGeo = new THREE.BoxGeometry(width, wallHeight, depth);
      const wallBase = new THREE.Mesh(baseGeo, wallMat);
      wallBase.position.set(0, wallHeight / 2, 0);
      wallBase.castShadow = true;
      wallBase.receiveShadow = true;
      group.add(wallBase);
      
      const capGeo = new THREE.BoxGeometry(width * 1.01, 0.15, depth * 1.1);
      const cap = new THREE.Mesh(capGeo, capMat);
      cap.position.set(0, wallHeight + 0.075, 0);
      cap.castShadow = true;
      group.add(cap);
      
      group.position.set(x, 0, z);
      this.scene.add(group);
    };
    
    // 四面主要护栏
    createWall(wallLength, wallThickness, 0, -10 - wallThickness / 2);
    createWall(wallLength, wallThickness, 0, 10 + wallThickness / 2);
    createWall(wallThickness, wallLength, -10 - wallThickness / 2, 0);
    createWall(wallThickness, wallLength, 10 + wallThickness / 2, 0);

    // ── 四角立体圆柱塔楼与微光小灯球 ──
    const pillarGeo = new THREE.CylinderGeometry(0.55, 0.62, wallHeight + 0.4, 20);
    const pillarMat = new THREE.MeshStandardMaterial({
      color: 0xF59E0B,
      roughness: 0.3,
      metalness: 0.1,
    });
    const beaconGeo = new THREE.SphereGeometry(0.35, 20, 20);
    const beaconMat = new THREE.MeshStandardMaterial({
      color: 0xFEF08A,
      emissive: 0xFDE047,
      emissiveIntensity: 0.45,
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
      const pillar = new THREE.Mesh(pillarGeo, pillarMat);
      pillar.position.y = (wallHeight + 0.4) / 2;
      pillar.castShadow = true;
      pillar.receiveShadow = true;
      pGroup.add(pillar);

      const beacon = new THREE.Mesh(beaconGeo, beaconMat);
      beacon.position.y = wallHeight + 0.55;
      beacon.castShadow = true;
      pGroup.add(beacon);

      pGroup.position.set(cx, 0, cz);
      this.scene.add(pGroup);
    });
  }
}
