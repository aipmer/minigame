import * as THREE from 'three';

export class Food {
  constructor(scene, modelLoader = null) {
    this.scene = scene;
    this.modelLoader = modelLoader;
    this.mesh = null;
    this.light = null;
    this.logicalPos = new THREE.Vector3(0, 0.5, 0);
    this.time = 0;
    
    // 动画状态
    this.spawnAnimationTimer = 0;
    this.spawnDuration = 0.3;
    
    // 特殊食物
    this.hasSpecial = false;
    this.specialMesh = null;
    this.specialLight = null;
    this.specialPosition = new THREE.Vector3();
    this.specialTime = 0;
  }
  
  // easeOutBack 缓动函数
  easeOutBack(x) {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
  }

  // 销毁当前食物
  disposeCurrent() {
    if (this.mesh) {
      this.scene.remove(this.mesh);
      this.mesh = null;
      this.light = null;
    }
  }

  // 生成普通食物
  spawn(occupiedPositions, obstaclePositions) {
    this.disposeCurrent();
    
    // 寻找空闲网格
    let pos;
    let attempts = 0;
    while(attempts < 100) {
      const x = Math.floor(Math.random() * 19) - 9;
      const z = Math.floor(Math.random() * 19) - 9;
      pos = new THREE.Vector3(x, 0.5, z);
      
      // 检查是否被占用
      const isOccupied = occupiedPositions.some(p => p.distanceTo(pos) < 0.1);
      const isObstacle = obstaclePositions ? obstaclePositions.some(p => p.distanceTo(pos) < 0.1) : false;
      const isSpecial = this.hasSpecial && this.specialPosition.distanceTo(pos) < 0.1;
      
      if (!isOccupied && !isObstacle && !isSpecial) break;
      attempts++;
    }
    
    this.logicalPos.copy(pos);
    
    // 创建网格
    if (this.modelLoader && this.modelLoader.has('food_ruby')) {
      this.mesh = this.modelLoader.clone('food_ruby');
    } else {
      const geo = new THREE.SphereGeometry(0.4, 16, 16);
      const mat = new THREE.MeshStandardMaterial({
        color: 0xFF2E26,
        emissive: 0xFF2E26,
        emissiveIntensity: 0.5,
        metalness: 0.3,
        roughness: 0.2
      });
      this.mesh = new THREE.Mesh(geo, mat);
      this.mesh.castShadow = true;
    }
    this.mesh.position.copy(pos);
    
    // 创建光源
    this.light = new THREE.PointLight(0xFF4500, 2, 5);
    this.mesh.add(this.light);
    
    this.scene.add(this.mesh);
    
    // 初始化生成动画
    this.spawnAnimationTimer = 0;
    this.mesh.scale.set(0, 0, 0);
  }
  
  // 生成特殊食物
  spawnSpecial(occupiedPositions) {
    if (this.specialMesh) {
      this.scene.remove(this.specialMesh);
    }
    
    // 寻找空闲网格
    let pos;
    let attempts = 0;
    while(attempts < 100) {
      const x = Math.floor(Math.random() * 19) - 9;
      const z = Math.floor(Math.random() * 19) - 9;
      pos = new THREE.Vector3(x, 0.5, z);
      
      const isOccupied = occupiedPositions.some(p => p.distanceTo(pos) < 0.1);
      const isNormal = this.mesh && this.logicalPos.distanceTo(pos) < 0.1;
      
      if (!isOccupied && !isNormal) break;
      attempts++;
    }
    
    this.specialPosition.copy(pos);
    
    // 创建黄金特殊食物
    if (this.modelLoader && this.modelLoader.has('food_star')) {
      this.specialMesh = this.modelLoader.clone('food_star');
    } else {
      const geo = new THREE.SphereGeometry(0.45, 16, 16);
      const mat = new THREE.MeshStandardMaterial({
        color: 0xFFD700,
        emissive: 0xFFD700,
        emissiveIntensity: 0.6,
        metalness: 0.8,
        roughness: 0.2
      });
      this.specialMesh = new THREE.Mesh(geo, mat);
      this.specialMesh.castShadow = true;
    }
    this.specialMesh.position.copy(pos);
    
    this.specialLight = new THREE.PointLight(0xFFD700, 3, 7);
    this.specialMesh.add(this.specialLight);
    
    this.scene.add(this.specialMesh);
    this.hasSpecial = true;
    
    // 初始化生成动画
    this.specialMesh.scale.set(0, 0, 0);
    this.spawnSpecialTimer = 0;
  }
  
  consumeSpecial() {
    if (this.specialMesh) {
      this.scene.remove(this.specialMesh);
      this.specialMesh = null;
      this.specialLight = null;
      this.hasSpecial = false;
    }
  }

  // 获取当前普通食物位置
  getPosition() {
    return this.logicalPos;
  }
  
  // 更新动画
  update(delta) {
    this.time += delta;
    
    // 普通食物动画
    if (this.mesh) {
      // 缓动生成动画
      if (this.spawnAnimationTimer < this.spawnDuration) {
        this.spawnAnimationTimer += delta;
        const progress = Math.min(1, this.spawnAnimationTimer / this.spawnDuration);
        const scale = this.easeOutBack(progress);
        this.mesh.scale.set(scale, scale, scale);
      }
      
      // 浮动和旋转
      this.mesh.position.y = this.logicalPos.y + Math.sin(this.time * 3) * 0.15;
      this.mesh.rotation.y += delta;
      
      // 光源脉冲
      if (this.light) {
        this.light.intensity = 2 + Math.sin(this.time * 5) * 0.5;
      }
    }
    
    // 特殊食物动画
    if (this.specialMesh) {
      this.specialTime += delta;
      
      // 缓动生成动画
      if (this.spawnSpecialTimer < this.spawnDuration) {
        this.spawnSpecialTimer += delta;
        const progress = Math.min(1, this.spawnSpecialTimer / this.spawnDuration);
        const scale = this.easeOutBack(progress);
        this.specialMesh.scale.set(scale, scale, scale);
      }
      
      // 快速浮动和旋转
      this.specialMesh.position.y = this.specialPosition.y + Math.sin(this.specialTime * 5) * 0.2;
      this.specialMesh.rotation.y += delta * 2;
      
      // 光源脉冲
      if (this.specialLight) {
        this.specialLight.intensity = 3 + Math.sin(this.specialTime * 8);
      }
    }
  }
  
  // 销毁所有
  dispose() {
    this.disposeCurrent();
    this.consumeSpecial();
  }
}
