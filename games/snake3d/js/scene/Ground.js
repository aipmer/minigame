import * as THREE from 'three';

export class Ground {
  constructor(scene) {
    this.scene = scene;
    
    this.initGround();
    this.initBorders();
  }
  
  initGround() {
    // 创建纹理 (Create texture)
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1024;
    const context = canvas.getContext('2d');
    
    const size = 1024;
    const gridSize = 20;
    const cellSize = size / gridSize;
    
    // 绘制棋盘格和网格线 (Draw checkerboard and grid lines)
    for (let i = 0; i < gridSize; i++) {
      for (let j = 0; j < gridSize; j++) {
        // 棋盘格颜色 (Checkerboard colors)
        if ((i + j) % 2 === 0) {
          context.fillStyle = '#1A1D2E';
        } else {
          context.fillStyle = '#1F2236';
        }
        context.fillRect(i * cellSize, j * cellSize, cellSize, cellSize);
        
        // 网格线 (Grid lines)
        context.strokeStyle = '#2A3050';
        context.lineWidth = 1;
        context.strokeRect(i * cellSize, j * cellSize, cellSize, cellSize);
      }
    }
    
    const texture = new THREE.CanvasTexture(canvas);
    // texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    
    // 创建地面网格 (Create ground mesh)
    const geometry = new THREE.PlaneGeometry(20, 20);
    const material = new THREE.MeshStandardMaterial({
      map: texture,
      roughness: 0.8,
      metalness: 0.1
    });
    
    const ground = new THREE.Mesh(geometry, material);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = 0;
    ground.receiveShadow = true;
    
    this.scene.add(ground);
  }
  
  initBorders() {
    const wallHeight = 1.0;
    const wallThickness = 0.3;
    const wallLength = 20; 
    
    const wallMaterial = new THREE.MeshStandardMaterial({
      color: '#1A1A3A',
      metalness: 0.6,
      roughness: 0.4
    });
    
    const emissiveMaterial = new THREE.MeshStandardMaterial({
      color: '#000000',
      emissive: '#3A1A5E',
      emissiveIntensity: 0.3
    });
    
    const createWall = (width, depth, x, z) => {
      const geometry = new THREE.BoxGeometry(width, wallHeight, depth);
      const wall = new THREE.Mesh(geometry, wallMaterial);
      wall.position.set(x, wallHeight / 2, z);
      wall.castShadow = true;
      
      // 创建发光条带 (Create emissive strip)
      const stripGeometry = new THREE.BoxGeometry(width, wallHeight, depth);
      const strip = new THREE.Mesh(stripGeometry, emissiveMaterial);
      strip.scale.set(1.02, 1.02, 1.02);
      wall.add(strip);
      
      this.scene.add(wall);
    };
    
    // 北墙 (North wall)
    createWall(wallLength + wallThickness * 2, wallThickness, 0, -10 - wallThickness / 2);
    // 南墙 (South wall)
    createWall(wallLength + wallThickness * 2, wallThickness, 0, 10 + wallThickness / 2);
    // 西墙 (West wall)
    createWall(wallThickness, wallLength, -10 - wallThickness / 2, 0);
    // 东墙 (East wall)
    createWall(wallThickness, wallLength, 10 + wallThickness / 2, 0);
  }
}
