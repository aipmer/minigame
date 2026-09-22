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

    // 爆破转换产生的奖励金币/黄金食物列表
    this.bonusList = [];
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

  // 在指定坐标原位生成黄金食物/金币
  spawnSpecialAt(pos) {
    this.spawnBonusAt(pos);
  }

  // 奖励金币/黄金食物生成
  spawnBonusAt(pos) {
    const group = new THREE.Group();
    const geo = new THREE.SphereGeometry(0.38, 16, 16);
    const mat = new THREE.MeshStandardMaterial({
      color: 0xFFD700,
      emissive: 0xF59E0B,
      emissiveIntensity: 0.8,
      metalness: 0.85,
      roughness: 0.15
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = true;
    group.add(mesh);

    const light = new THREE.PointLight(0xFFD700, 2.0, 5);
    group.add(light);

    group.position.copy(pos);
    group.position.y = 0.5;
    group.scale.set(0.01, 0.01, 0.01);
    this.scene.add(group);

    this.bonusList.push({
      group,
      mesh,
      logicalPos: pos.clone(),
      scaleProgress: 0,
      time: Math.random() * 10
    });
  }

  // 检测蛇头是否吃到了爆破产生的黄金食物/金币
  checkBonusCollisions(headPos) {
    if (!this.bonusList || this.bonusList.length === 0) return 0;
    let eatenCount = 0;
    for (let i = this.bonusList.length - 1; i >= 0; i--) {
      const item = this.bonusList[i];
      if (headPos.distanceTo(item.logicalPos) < 0.75) {
        this.scene.remove(item.group);
        this.bonusList.splice(i, 1);
        eatenCount++;
      }
    }
    return eatenCount;
  }

  // 清理全部奖励金币
  clearAllBonus() {
    if (this.bonusList && this.bonusList.length > 0) {
      this.bonusList.forEach(item => this.scene.remove(item.group));
      this.bonusList = [];
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
      if (this.spawnAnimationTimer < this.spawnDuration) {
        this.spawnAnimationTimer += delta;
        const progress = Math.min(1, this.spawnAnimationTimer / this.spawnDuration);
        const scale = this.easeOutBack(progress);
        this.mesh.scale.set(scale, scale, scale);
      }
      
      this.mesh.position.y = this.logicalPos.y + Math.sin(this.time * 3) * 0.15;
      this.mesh.rotation.y += delta;
      
      if (this.light) {
        this.light.intensity = 2 + Math.sin(this.time * 5) * 0.5;
      }
    }
    
    // 特殊食物动画
    if (this.specialMesh) {
      this.specialTime += delta;
      
      if (this.spawnSpecialTimer < this.spawnDuration) {
        this.spawnSpecialTimer += delta;
        const progress = Math.min(1, this.spawnSpecialTimer / this.spawnDuration);
        const scale = this.easeOutBack(progress);
        this.specialMesh.scale.set(scale, scale, scale);
      }
      
      this.specialMesh.position.y = this.specialPosition.y + Math.sin(this.specialTime * 5) * 0.2;
      this.specialMesh.rotation.y += delta * 2;
      
      if (this.specialLight) {
        this.specialLight.intensity = 3 + Math.sin(this.specialTime * 8);
      }
    }

    // 奖励金币动画更新
    if (this.bonusList && this.bonusList.length > 0) {
      for (const item of this.bonusList) {
        item.time += delta;
        if (item.scaleProgress < 1.0) {
          item.scaleProgress = Math.min(1.0, item.scaleProgress + delta * 4.0);
          const s = this.easeOutBack(item.scaleProgress);
          item.group.scale.set(s, s, s);
        }
        item.group.position.y = item.logicalPos.y + Math.sin(item.time * 4) * 0.15;
        item.group.rotation.y += delta * 2.5;
      }
    }
  }

  // 销毁所有
  dispose() {
    this.disposeCurrent();
    this.consumeSpecial();
    this.clearAllBonus();
  }
}
