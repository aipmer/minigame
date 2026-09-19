import * as THREE from 'three';

export class Snake {
  constructor(scene, modelLoader = null) {
    this.scene = scene;
    this.modelLoader = modelLoader;
    
    // 蛇的头部组
    this.head = new THREE.Group();
    
    // 蛇的身体段
    this.segments = [];
    
    // 逻辑位置
    this.logicalPos = new THREE.Vector3(0, 0.5, 0);
    this.prevLogicalPos = new THREE.Vector3(0, 0.5, 0);
    
    this.segmentPositions = [];
    this.prevSegmentPositions = [];
    
    // 方向控制
    this.direction = new THREE.Vector3(0, 0, 1);
    this.nextDirection = new THREE.Vector3(0, 0, 1);
    
    // 速度与定时器
    this.baseMoveInterval = 0.17;
    this.minMoveInterval = 0.06;
    this.currentInterval = this.baseMoveInterval;
    this.speedUpFactor = 0.003;
    this.moveTimer = 0;
    this.interpolationTimer = 0;
    
    // 状态
    this.length = 0;
    this.isInvincible = false;
    this.invincibilityTimer = 0;
    this.isDead = false;
    
    // 初始化网格与材质
    this.initVisuals();
    this.scene.add(this.head);
    this.reset();
  }
  
  // 初始化头部网格
  initVisuals() {
    if (this.modelLoader && this.modelLoader.has('head')) {
      const headModel = this.modelLoader.clone('head');
      this.headMesh = headModel;
      this.head.add(headModel);
      this.hasCustomHead = true;
    } else {
      // 头部盒子
      const headGeo = new THREE.BoxGeometry(1, 1, 1);
      this.headMat = new THREE.MeshStandardMaterial({
        color: 0x14EB73,
        metalness: 0.15,
        roughness: 0.3
      });
      const headMesh = new THREE.Mesh(headGeo, this.headMat);
      headMesh.castShadow = true;
      headMesh.receiveShadow = true;
      this.head.add(headMesh);
    
    // 眼睛
    const eyeGeo = new THREE.SphereGeometry(0.15, 16, 16);
    const eyeMat = new THREE.MeshStandardMaterial({ color: 0x000000 });
    const pupilGeo = new THREE.SphereGeometry(0.05, 16, 16);
    const pupilMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
    
    // 左眼
    const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
    leftEye.position.set(0.3, 0.2, 0.5);
    const leftPupil = new THREE.Mesh(pupilGeo, pupilMat);
    leftPupil.position.set(0, 0, 0.12);
    leftEye.add(leftPupil);
    this.head.add(leftEye);
    
    // 右眼
    const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
    rightEye.position.set(-0.3, 0.2, 0.5);
    const rightPupil = new THREE.Mesh(pupilGeo, pupilMat);
    rightPupil.position.set(0, 0, 0.12);
    rightEye.add(rightPupil);
    this.head.add(rightEye);
    }
    
    // 黄金无敌材质
    this.goldMat = new THREE.MeshStandardMaterial({
      color: 0xFFD700,
      metalness: 0.8,
      roughness: 0.2,
      emissive: 0xFFD700,
      emissiveIntensity: 0.5
    });
  }
  
  // 处理键盘输入
  handleInput(key) {
    let newDir = null;
    switch (key.toLowerCase()) {
      case 'arrowup':
      case 'w':
        newDir = new THREE.Vector3(0, 0, -1);
        break;
      case 'arrowdown':
      case 's':
        newDir = new THREE.Vector3(0, 0, 1);
        break;
      case 'arrowleft':
      case 'a':
        newDir = new THREE.Vector3(-1, 0, 0);
        break;
      case 'arrowright':
      case 'd':
        newDir = new THREE.Vector3(1, 0, 0);
        break;
    }
    
    // 防止180度掉头
    if (newDir && this.direction.dot(newDir) === 0) {
      this.nextDirection.copy(newDir);
    }
  }
  
  // 更新逻辑与插值动画
  update(delta) {
    if (this.isDead) return;
    
    // 更新无敌时间
    if (this.isInvincible) {
      this.invincibilityTimer -= delta;
      if (this.invincibilityTimer <= 0) {
        this.isInvincible = false;
        // 恢复材质
        this.head.children[0].material = this.headMat;
        this.segments.forEach((seg, i) => {
          seg.material = i % 2 === 0 ? this.bodyMat1 : this.bodyMat2;
        });
      } else {
        // 闪烁效果
        const t = (Math.sin(Date.now() * 0.02) + 1) / 2;
        this.head.children[0].material = t > 0.5 ? this.goldMat : this.headMat;
      }
    }
    
    // 逻辑移动定时器
    this.moveTimer += delta;
    this.interpolationTimer += delta;
    
    if (this.moveTimer >= this.currentInterval) {
      const result = this.step();
      this.moveTimer = 0;
      this.interpolationTimer = 0;
      
      if (result.died) {
        this.isDead = true;
        return result; // 上层场景可能需要处理死亡
      }
    }
    
    // 平滑插值计算
    const t = Math.min(1.0, this.interpolationTimer / this.currentInterval);
    
    // 头部插值
    this.head.position.lerpVectors(this.prevLogicalPos, this.logicalPos, t);
    
    // 头部旋转
    const targetQuaternion = new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, 0, 1),
      this.direction
    );
    this.head.quaternion.slerp(targetQuaternion, t * 5); // 快速平滑转向
    
    // 身体段插值
    for (let i = 0; i < this.segments.length; i++) {
      if (this.prevSegmentPositions[i] && this.segmentPositions[i]) {
        this.segments[i].position.lerpVectors(this.prevSegmentPositions[i], this.segmentPositions[i], t);
      }
    }
    
    return null;
  }
  
  // 执行一步逻辑移动
  step() {
    this.direction.copy(this.nextDirection);
    
    // 保存上一个逻辑位置
    this.prevLogicalPos.copy(this.logicalPos);
    for (let i = 0; i < this.segmentPositions.length; i++) {
      this.prevSegmentPositions[i] = this.segmentPositions[i].clone();
    }
    
    // 移动头部逻辑位置
    this.logicalPos.add(this.direction);
    
    // 碰撞检测与处理
    let result = { ate: false, died: false, dieReason: "", newHeadPos: this.logicalPos.clone() };
    
    // 墙壁碰撞检测
    if (Math.abs(this.logicalPos.x) > 9.5 || Math.abs(this.logicalPos.z) > 9.5) {
      if (this.isInvincible) {
        // 穿墙
        if (this.logicalPos.x > 9.5) this.logicalPos.x = -9;
        else if (this.logicalPos.x < -9.5) this.logicalPos.x = 9;
        if (this.logicalPos.z > 9.5) this.logicalPos.z = -9;
        else if (this.logicalPos.z < -9.5) this.logicalPos.z = 9;
        this.prevLogicalPos.copy(this.logicalPos); // 避免长距离插值跳跃
      } else {
        result.died = true;
        result.dieReason = "Hit wall";
        return result;
      }
    }
    
    // 自身碰撞检测
    for (let i = 0; i < this.segmentPositions.length; i++) {
      // 忽略刚吃食物增加的段（未更新位置时可能重叠）
      if (this.logicalPos.distanceToSquared(this.segmentPositions[i]) < 0.1) {
        if (!this.isInvincible) {
          result.died = true;
          result.dieReason = "Hit self";
          return result;
        }
      }
    }
    
    // 更新身体段逻辑位置
    if (this.segmentPositions.length > 0) {
      // 从后往前移
      for (let i = this.segmentPositions.length - 1; i > 0; i--) {
        this.segmentPositions[i].copy(this.segmentPositions[i - 1]);
      }
      // 第一个身体段移动到头部的旧位置
      this.segmentPositions[0].copy(this.prevLogicalPos);
    }
    
    return result;
  }
  
  // 增加身体长度
  grow(position = null) {
    let mesh;
    if (this.modelLoader && this.modelLoader.has('body')) {
      mesh = this.modelLoader.clone('body');
    } else {
      if (!this.bodyMat1) {
        this.bodyMat1 = new THREE.MeshStandardMaterial({ color: 0x1EC768, metalness: 0.1, roughness: 0.4 });
        this.bodyMat2 = new THREE.MeshStandardMaterial({ color: 0x2EDB78, metalness: 0.1, roughness: 0.4 });
      }
      const geo = new THREE.BoxGeometry(0.92, 0.92, 0.92);
      const mat = this.length % 2 === 0 ? this.bodyMat1 : this.bodyMat2;
      mesh = new THREE.Mesh(geo, mat);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
    }
    
    const targetPos = position || (this.segmentPositions.length > 0 
      ? this.segmentPositions[this.segmentPositions.length - 1].clone() 
      : this.prevLogicalPos.clone());
      
    mesh.position.copy(targetPos);
    this.scene.add(mesh);
    this.segments.push(mesh);
    this.segmentPositions.push(targetPos.clone());
    this.prevSegmentPositions.push(targetPos.clone());
    
    this.length++;
  }
  
  // 检查与食物的碰撞
  checkFoodCollision(foodPos) {
    return this.logicalPos.distanceTo(foodPos) < 0.7;
  }
  
  // 检查与障碍物的碰撞
  checkObstacleCollision(obstacles) {
    for (let obsPos of obstacles) {
      if (this.logicalPos.distanceTo(obsPos) < 0.7) {
        if (!this.isInvincible) return true;
      }
    }
    return false;
  }
  
  // 获取蛇占用的所有网格位置
  getOccupiedPositions() {
    const positions = [this.logicalPos.clone()];
    for (let pos of this.segmentPositions) {
      positions.push(pos.clone());
    }
    return positions;
  }
  
  // 重置蛇状态
  reset() {
    this.segments.forEach(seg => this.scene.remove(seg));
    this.segments = [];
    this.segmentPositions = [];
    this.prevSegmentPositions = [];
    this.length = 0;
    
    this.logicalPos.set(0, 0.5, 0);
    this.prevLogicalPos.set(0, 0.5, 0);
    this.head.position.copy(this.logicalPos);
    
    this.direction.set(0, 0, 1);
    this.nextDirection.set(0, 0, 1);
    this.head.quaternion.identity();
    
    this.currentInterval = this.baseMoveInterval;
    this.moveTimer = 0;
    this.interpolationTimer = 0;
    this.isInvincible = false;
    this.isDead = false;
    
    this.head.children[0].material = this.headMat;
  }
  
  // 开启无敌状态
  startInvincibility(duration) {
    this.isInvincible = true;
    this.invincibilityTimer = duration;
  }
  
  // 加速
  speedUp() {
    this.currentInterval = Math.max(this.minMoveInterval, this.currentInterval - this.speedUpFactor);
  }
  
  // 获取归一化的速度 (0..1)
  getNormalizedSpeed() {
    return 1 - (this.currentInterval - this.minMoveInterval) / (this.baseMoveInterval - this.minMoveInterval);
  }
  
  // 销毁清理
  dispose() {
    this.scene.remove(this.head);
    this.segments.forEach(seg => this.scene.remove(seg));
  }
}
