import * as THREE from 'three';

export class Snake {
  constructor(scene, modelLoader = null) {
    this.scene = scene;
    this.modelLoader = modelLoader;
    
    // 蛇的头部组
    this.head = new THREE.Group();
    
    // 蛇的身体段与元数据
    this.segments = [];
    this.segmentPositions = [];
    this.prevSegmentPositions = [];
    
    // 逻辑网格位置
    this.logicalPos = new THREE.Vector3(0, 0.5, 0);
    this.prevLogicalPos = new THREE.Vector3(0, 0.5, 0);
    
    // 方向控制
    this.direction = new THREE.Vector3(0, 0, 1);
    this.nextDirection = new THREE.Vector3(0, 0, 1);
    
    // 速度与恒速插值定时器
    this.baseMoveInterval = 0.16;
    this.minMoveInterval = 0.07;
    this.currentInterval = this.baseMoveInterval;
    this.speedUpFactor = 0.003;
    this.moveTimer = 0;
    
    // 状态
    this.length = 0;
    this.isInvincible = false;
    this.invincibilityTimer = 0;
    this.isDead = false;
    
    // 生命感游动与吞咽波动
    this.slitherTime = 0;
    this.pulseWaves = [];
    
    // 共享几何体与高质量材质
    this.initVisualMaterials();
    this.buildCuteHead();
    this.scene.add(this.head);
    this.reset();
  }

  // 初始化高表现力粘土/卡通蛇材质
  initVisualMaterials() {
    // 头部材质（明亮苹果绿）
    this.headMat = new THREE.MeshStandardMaterial({
      color: 0x22C55E,
      roughness: 0.25,
      metalness: 0.1,
    });
    
    // 身体双色鳞纹交替材质（明绿与嫩黄绿）
    this.bodyMat1 = new THREE.MeshStandardMaterial({
      color: 0x22C55E,
      roughness: 0.28,
      metalness: 0.08,
    });
    this.bodyMat2 = new THREE.MeshStandardMaterial({
      color: 0x4ADE80,
      roughness: 0.28,
      metalness: 0.08,
    });
    
    // 蛇腹部淡黄浅色材质
    this.bellyMat = new THREE.MeshStandardMaterial({
      color: 0xFEF08A,
      roughness: 0.35,
      metalness: 0.05,
    });

    // 黄金无敌晶莹发光材质
    this.goldMat = new THREE.MeshStandardMaterial({
      color: 0xFFD700,
      metalness: 0.85,
      roughness: 0.15,
      emissive: 0xF59E0B,
      emissiveIntensity: 0.6
    });

    // 身体节段圆润蛋形几何体
    this.segmentGeometry = new THREE.SphereGeometry(0.48, 24, 20);
    // 尾部渐变尾尖圆锥几何体
    this.tailTipGeometry = new THREE.ConeGeometry(0.32, 0.65, 20);
    this.tailTipGeometry.rotateX(-Math.PI / 2); // 尖端朝后
  }

  // 构建高颜值 Q 版 3D 萌系蛇头
  buildCuteHead() {
    while (this.head.children.length > 0) {
      this.head.remove(this.head.children[0]);
    }

    // 1. 主头部（饱满圆角颅骨）
    const skullGeo = new THREE.SphereGeometry(0.55, 32, 24);
    skullGeo.scale(1.02, 0.82, 1.25);
    const skull = new THREE.Mesh(skullGeo, this.headMat);
    skull.castShadow = true;
    skull.receiveShadow = true;
    this.head.add(skull);
    this.skullMesh = skull;

    // 2. 腹部垫片（温暖奶黄底面）
    const bellyGeo = new THREE.SphereGeometry(0.52, 24, 16);
    bellyGeo.scale(0.95, 0.45, 1.2);
    const belly = new THREE.Mesh(bellyGeo, this.bellyMat);
    belly.position.set(0, -0.22, 0);
    this.head.add(belly);

    // 3. 灵动水润大眼睛
    const eyeWhiteGeo = new THREE.SphereGeometry(0.18, 20, 20);
    const eyeWhiteMat = new THREE.MeshStandardMaterial({ color: 0xFFFFFF, roughness: 0.1 });
    const pupilGeo = new THREE.SphereGeometry(0.11, 20, 20);
    const pupilMat = new THREE.MeshStandardMaterial({ color: 0x0F172A, roughness: 0.1 });
    const specularGeo = new THREE.SphereGeometry(0.045, 16, 16);
    const specularMat = new THREE.MeshBasicMaterial({ color: 0xFFFFFF });

    const createEye = (x) => {
      const eyeGroup = new THREE.Group();
      const white = new THREE.Mesh(eyeWhiteGeo, eyeWhiteMat);
      eyeGroup.add(white);

      const pupil = new THREE.Mesh(pupilGeo, pupilMat);
      pupil.position.set(0, 0.02, 0.11);
      eyeGroup.add(pupil);

      const spec = new THREE.Mesh(specularGeo, specularMat);
      spec.position.set(0.03, 0.06, 0.17);
      eyeGroup.add(spec);

      eyeGroup.position.set(x, 0.22, 0.36);
      return eyeGroup;
    };

    this.head.add(createEye(0.32));  // 左眼
    this.head.add(createEye(-0.32)); // 右眼

    // 4. 腮红小圆点（提升萌感）
    const blushGeo = new THREE.SphereGeometry(0.12, 16, 16);
    const blushMat = new THREE.MeshStandardMaterial({ color: 0xFB7185, roughness: 0.5 });
    const blushL = new THREE.Mesh(blushGeo, blushMat);
    blushL.position.set(0.48, 0.02, 0.28);
    blushL.scale.set(0.4, 0.8, 1.0);
    this.head.add(blushL);

    const blushR = blushL.clone();
    blushR.position.x = -0.48;
    this.head.add(blushR);

    // 5. 吐信子小红舌头（带自然微动）
    const tongueGeo = new THREE.BoxGeometry(0.12, 0.03, 0.32);
    const tongueMat = new THREE.MeshStandardMaterial({ color: 0xEF4444, roughness: 0.3 });
    this.tongue = new THREE.Mesh(tongueGeo, tongueMat);
    this.tongue.position.set(0, -0.05, 0.72);
    this.head.add(this.tongue);
  }

  // 外部模型适配（保留接口）
  applyModels() {
    // 优先采用高精度圆润手感
  }

  // 处理键盘/摇杆输入
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
    
    // 防止180度自我掉头，并支持预输入转向
    if (newDir && this.direction.dot(newDir) === 0) {
      this.nextDirection.copy(newDir);
    }
  }

  // 帧更新循环（彻底消除卡顿与停走停顿挫）
  update(delta) {
    if (this.isDead) return null;
    
    this.slitherTime += delta;

    // 舌头灵动微动伸缩
    if (this.tongue) {
      this.tongue.position.z = 0.68 + Math.sin(this.slitherTime * 12) * 0.07;
    }

    // 无敌状态与闪烁
    if (this.isInvincible) {
      this.invincibilityTimer -= delta;
      if (this.invincibilityTimer <= 0) {
        this.isInvincible = false;
        this.skullMesh.material = this.headMat;
        this.segments.forEach((seg, i) => {
          seg.mainMesh.material = i % 2 === 0 ? this.bodyMat1 : this.bodyMat2;
        });
      } else {
        const glow = (Math.sin(this.slitherTime * 15) + 1) * 0.5;
        this.skullMesh.material = glow > 0.4 ? this.goldMat : this.headMat;
      }
    }

    // ── 亚帧时间余量累加器（解决帧率不齐丢步与微顿挫） ──
    this.moveTimer += delta;
    let stepResult = null;
    if (this.moveTimer >= this.currentInterval) {
      stepResult = this.step();
      // 保留余量，绝不直接归零丢帧
      this.moveTimer -= this.currentInterval;
      if (this.moveTimer >= this.currentInterval) {
        this.moveTimer = 0; // 防御大卡顿瞬移
      }

      if (stepResult.died) {
        this.isDead = true;
        return stepResult;
      }
    }

    // ── 恒速平滑线性插值（告别 smoothstep 导致的格末零速停顿感） ──
    const t = Math.min(1.0, this.moveTimer / this.currentInterval);

    // 头部平稳移动
    this.head.position.lerpVectors(this.prevLogicalPos, this.logicalPos, t);

    // 头部转向阻尼（平滑弧线过渡）
    const targetQuat = new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, 0, 1),
      this.direction
    );
    this.head.quaternion.slerp(targetQuat, Math.min(1.0, delta * 22));

    // ── 拟真蛇体骨骼与各节段更新 ──
    const segCount = this.segments.length;
    for (let i = 0; i < segCount; i++) {
      const segGroup = this.segments[i];
      const prevPos = this.prevSegmentPositions[i];
      const nextPos = this.segmentPositions[i];

      if (prevPos && nextPos) {
        // 1. 位置插值
        segGroup.position.lerpVectors(prevPos, nextPos, t);

        // 2. 真实蛇游动正弦微幅横向蜿蜒 (Sinuous Slither)
        const waveAngle = this.slitherTime * 14 - i * 0.65;
        const waveOffset = Math.sin(waveAngle) * 0.05;
        // 侧向矢量（依据身体朝向垂直平移）
        if (i > 0) {
          const forwardVec = new THREE.Vector3().subVectors(this.segments[i - 1].position, segGroup.position).normalize();
          const sideVec = new THREE.Vector3(-forwardVec.z, 0, forwardVec.x);
          segGroup.position.addScaledVector(sideVec, waveOffset);
        }

        // 3. 脊椎切线旋转：关节朝向前一个关节方向平滑弯曲
        const lookTarget = (i === 0) ? this.head.position : this.segments[i - 1].position;
        const dirToTarget = new THREE.Vector3().subVectors(lookTarget, segGroup.position);
        if (dirToTarget.lengthSq() > 0.001) {
          dirToTarget.normalize();
          const targetSegQuat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), dirToTarget);
          segGroup.quaternion.slerp(targetSegQuat, Math.min(1.0, delta * 24));
        }

        // 4. 有机生长弹性展开（解决方块尾巴突兀出现问题）
        if (segGroup.growthProgress < 1.0) {
          segGroup.growthProgress = Math.min(1.0, segGroup.growthProgress + delta * 5.5);
        }
        // 弹性回弹曲线 (Spring Ease Out)
        const gp = segGroup.growthProgress;
        const springScale = gp < 1.0 ? Math.sin(gp * Math.PI * 0.5) * (1 + 0.2 * (1 - gp)) : 1.0;

        // 5. 仿生渐细锥度曲线（头部饱满 -> 身体匀称 -> 尾部渐细收束）
        let baseRadius = 1.0;
        if (i === 0) {
          baseRadius = 0.98; // 颈部收束
        } else if (i < segCount - 4) {
          baseRadius = 0.95 - (i / segCount) * 0.1; // 身体平缓过渡
        } else {
          // 尾部最后 4 节逐渐收细至小巧尾尖
          const tailFraction = (i - Math.max(0, segCount - 4)) / Math.min(4, segCount);
          baseRadius = 0.85 - tailFraction * 0.55; // 收至 0.30
        }

        const finalScale = Math.max(0.01, baseRadius * springScale);
        segGroup.scale.set(finalScale, finalScale * 0.9, finalScale);
      }
    }

    // ── 吞咽波浪沿脊椎传递 ──
    if (this.pulseWaves.length > 0) {
      for (let p = this.pulseWaves.length - 1; p >= 0; p--) {
        const pulse = this.pulseWaves[p];
        pulse.progress += delta * pulse.speed;

        if (pulse.progress > segCount + 2) {
          this.pulseWaves.splice(p, 1);
          continue;
        }

        for (let i = 0; i < segCount; i++) {
          const seg = this.segments[i];
          const dist = Math.abs(i - pulse.progress);
          if (dist < 1.6) {
            const factor = Math.cos((dist / 1.6) * (Math.PI * 0.5));
            const pulseScale = 1.0 + factor * 0.35;
            seg.scale.multiplyScalar(pulseScale);
          }
        }
      }
    }

    return null;
  }

  // 逻辑步进
  step() {
    this.direction.copy(this.nextDirection);
    
    // 记录旧逻辑位置
    this.prevLogicalPos.copy(this.logicalPos);
    for (let i = 0; i < this.segmentPositions.length; i++) {
      this.prevSegmentPositions[i] = this.segmentPositions[i].clone();
    }
    
    // 逻辑前进
    this.logicalPos.add(this.direction);
    
    let result = { ate: false, died: false, dieReason: "", newHeadPos: this.logicalPos.clone() };
    
    // 墙壁判定
    if (Math.abs(this.logicalPos.x) > 9.5 || Math.abs(this.logicalPos.z) > 9.5) {
      if (this.isInvincible) {
        if (this.logicalPos.x > 9.5) this.logicalPos.x = -9;
        else if (this.logicalPos.x < -9.5) this.logicalPos.x = 9;
        if (this.logicalPos.z > 9.5) this.logicalPos.z = -9;
        else if (this.logicalPos.z < -9.5) this.logicalPos.z = 9;
        this.prevLogicalPos.copy(this.logicalPos);
      } else {
        result.died = true;
        result.dieReason = "Hit wall";
        return result;
      }
    }
    
    // 咬到自己判定
    for (let i = 0; i < this.segmentPositions.length; i++) {
      if (this.logicalPos.distanceToSquared(this.segmentPositions[i]) < 0.1) {
        if (!this.isInvincible) {
          result.died = true;
          result.dieReason = "Hit self";
          return result;
        }
      }
    }
    
    // 关节位置逐级传递
    if (this.segmentPositions.length > 0) {
      for (let i = this.segmentPositions.length - 1; i > 0; i--) {
        this.segmentPositions[i].copy(this.segmentPositions[i - 1]);
      }
      this.segmentPositions[0].copy(this.prevLogicalPos);
    }
    
    return result;
  }

  // 触发吞咽膨胀流光
  triggerPulseWave(colorHex = 0x00f2fe) {
    this.pulseWaves.push({
      progress: 0,
      speed: 16,
      color: new THREE.Color(colorHex),
    });
  }

  // 增长身体节段（有机变径与平滑过渡）
  grow(position = null, isSpecial = false) {
    const segGroup = new THREE.Group();

    // 主球形胶囊段
    const mat = this.length % 2 === 0 ? this.bodyMat1 : this.bodyMat2;
    const mainMesh = new THREE.Mesh(this.segmentGeometry, mat);
    mainMesh.castShadow = true;
    mainMesh.receiveShadow = true;
    segGroup.add(mainMesh);
    segGroup.mainMesh = mainMesh;

    // 如果是最后一节，附带锥形灵动尾尖
    const tailTip = new THREE.Mesh(this.tailTipGeometry, mat);
    tailTip.position.set(0, 0, -0.32);
    tailTip.castShadow = true;
    tailTip.visible = false; // 初始隐藏，由 refreshTailTips 控制
    segGroup.add(tailTip);
    segGroup.tailTip = tailTip;

    // 初始处于缩微状态，通过 growthProgress 弹性展开
    segGroup.growthProgress = 0.05;
    segGroup.scale.set(0.01, 0.01, 0.01);

    const targetPos = position || (this.segmentPositions.length > 0 
      ? this.segmentPositions[this.segmentPositions.length - 1].clone() 
      : this.prevLogicalPos.clone());
      
    segGroup.position.copy(targetPos);
    this.scene.add(segGroup);

    this.segments.push(segGroup);
    this.segmentPositions.push(targetPos.clone());
    this.prevSegmentPositions.push(targetPos.clone());
    
    this.length++;
    this.refreshTailTips();

    // 激发吞咽流光波浪
    this.triggerPulseWave(isSpecial ? 0xFFD700 : 0x00f2fe);
  }

  // 刷新尾尖显示（只有真正的末节才拥有渐细尾尖）
  refreshTailTips() {
    const len = this.segments.length;
    for (let i = 0; i < len; i++) {
      if (this.segments[i].tailTip) {
        this.segments[i].tailTip.visible = (i === len - 1);
      }
    }
  }

  checkFoodCollision(foodPos) {
    return this.logicalPos.distanceTo(foodPos) < 0.7;
  }
  
  checkObstacleCollision(obstacles) {
    for (let obsPos of obstacles) {
      if (this.logicalPos.distanceTo(obsPos) < 0.7) {
        if (!this.isInvincible) return true;
      }
    }
    return false;
  }
  
  getOccupiedPositions() {
    const positions = [this.logicalPos.clone()];
    for (let pos of this.segmentPositions) {
      positions.push(pos.clone());
    }
    return positions;
  }
  
  reset() {
    this.segments.forEach(seg => this.scene.remove(seg));
    this.segments = [];
    this.segmentPositions = [];
    this.prevSegmentPositions = [];
    this.pulseWaves = [];
    this.length = 0;
    
    this.logicalPos.set(0, 0.5, 0);
    this.prevLogicalPos.set(0, 0.5, 0);
    this.head.position.copy(this.logicalPos);
    
    this.direction.set(0, 0, 1);
    this.nextDirection.set(0, 0, 1);
    this.head.quaternion.identity();
    
    this.currentInterval = this.baseMoveInterval;
    this.moveTimer = 0;
    this.isInvincible = false;
    this.isDead = false;
    
    if (this.skullMesh) {
      this.skullMesh.material = this.headMat;
    }
  }
  
  startInvincibility(duration) {
    this.isInvincible = true;
    this.invincibilityTimer = duration;
  }
  
  speedUp() {
    this.currentInterval = Math.max(this.minMoveInterval, this.currentInterval - this.speedUpFactor);
  }
  
  getNormalizedSpeed() {
    return 1 - (this.currentInterval - this.minMoveInterval) / (this.baseMoveInterval - this.minMoveInterval);
  }
  
  dispose() {
    this.scene.remove(this.head);
    this.segments.forEach(seg => this.scene.remove(seg));
  }
}
