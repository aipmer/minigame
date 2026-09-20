import * as THREE from 'three';

export class ObstacleManager {
  constructor(scene, modelLoader = null) {
    this.scene = scene;
    this.modelLoader = modelLoader;
    this.obstacles = [];
    this.positions = [];
    this.spawnAnimations = [];
    this.maxObstacles = 8;
    this.spawnDuration = 0.5;
  }
  
  // easeOutBounce 缓动函数
  easeOutBounce(x) {
    const n1 = 7.5625;
    const d1 = 2.75;
    
    if (x < 1 / d1) {
      return n1 * x * x;
    } else if (x < 2 / d1) {
      return n1 * (x -= 1.5 / d1) * x + 0.75;
    } else if (x < 2.5 / d1) {
      return n1 * (x -= 2.25 / d1) * x + 0.9375;
    } else {
      return n1 * (x -= 2.625 / d1) * x + 0.984375;
    }
  }

  // 生成新的障碍物
  spawn(occupiedPositions) {
    if (this.obstacles.length >= this.maxObstacles) return false;
    
    // 寻找空闲网格
    let pos;
    let attempts = 0;
    while(attempts < 100) {
      const x = Math.floor(Math.random() * 19) - 9;
      const z = Math.floor(Math.random() * 19) - 9;
      pos = new THREE.Vector3(x, 0, z); // 底部Y设为0，动画上升到指定高度
      
      const isOccupied = occupiedPositions.some(p => Math.abs(p.x - x) < 0.1 && Math.abs(p.z - z) < 0.1);
      const isObstacle = this.positions.some(p => p.distanceTo(pos) < 0.1);
      
      // 不在中心区域生成 (避免一出来就死)
      const isCenter = Math.abs(x) < 3 && Math.abs(z) < 3;
      
      if (!isOccupied && !isObstacle && !isCenter) break;
      attempts++;
    }
    
    if (attempts >= 100) return false;
    
    // 目标逻辑位置是 Y=0.5
    const logicalPos = new THREE.Vector3(pos.x, 0.5, pos.z);
    this.positions.push(logicalPos);
    
    // 障碍物主网格
    let mesh;
    if (this.modelLoader && this.modelLoader.has('obstacle')) {
      mesh = this.modelLoader.clone('obstacle');
    } else {
      const geo = new THREE.BoxGeometry(0.9, 1.2, 0.9);
      const mat = new THREE.MeshStandardMaterial({
        color: 0x2A2A3A,
        metalness: 0.7,
        roughness: 0.5
      });
      mesh = new THREE.Mesh(geo, mat);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      
      // 发光装饰层
      const trimGeo = new THREE.BoxGeometry(0.9, 1.2, 0.9);
      const trimMat = new THREE.MeshStandardMaterial({
        color: 0x3A1A5E,
        emissive: 0x3A1A5E,
        emissiveIntensity: 0.8,
        wireframe: true
      });
      const trimMesh = new THREE.Mesh(trimGeo, trimMat);
      trimMesh.scale.set(1.02, 1.02, 1.02);
      mesh.add(trimMesh);
    }
    
    // 初始位置设在地下
    mesh.position.set(pos.x, -1, pos.z);
    this.scene.add(mesh);
    this.obstacles.push(mesh);
    
    // 添加动画追踪
    this.spawnAnimations.push({
      mesh: mesh,
      targetY: 0.6,
      startY: -1,
      timer: 0
    });
    
    return true;
  }
  
  // 检查某个位置是否有障碍物
  isObstacle(pos) {
    for (let obsPos of this.positions) {
      if (obsPos.distanceTo(pos) < 0.4) return true;
    }
    return false;
  }
  
  // 获取所有障碍物位置
  getPositions() {
    return this.positions;
  }
  
  // 获取障碍物数量
  get count() {
    return this.obstacles.length;
  }
  
  // 更新生成动画
  update(delta) {
    for (let i = this.spawnAnimations.length - 1; i >= 0; i--) {
      const anim = this.spawnAnimations[i];
      anim.timer += delta;
      
      if (anim.timer >= this.spawnDuration) {
        anim.mesh.position.y = anim.targetY;
        this.spawnAnimations.splice(i, 1);
      } else {
        const progress = anim.timer / this.spawnDuration;
        const yOffset = this.easeOutBounce(progress);
        anim.mesh.position.y = anim.startY + (anim.targetY - anim.startY) * yOffset;
      }
    }
  }
  
  // 清除指定位置附近的障碍物 (被无敌蛇撞碎)
  removeAt(pos, threshold = 0.9) {
    for (let i = 0; i < this.positions.length; i++) {
      if (this.positions[i].distanceTo(pos) < threshold) {
        const mesh = this.obstacles[i];
        if (mesh) {
          this.scene.remove(mesh);
        }
        const removedPos = this.positions[i].clone();
        this.positions.splice(i, 1);
        this.obstacles.splice(i, 1);
        return { mesh, pos: removedPos };
      }
    }
    return null;
  }

  // 清除所有障碍物
  clearAll() {
    for (let mesh of this.obstacles) {
      this.scene.remove(mesh);
    }
    this.obstacles = [];
    this.positions = [];
    this.spawnAnimations = [];
  }
}
