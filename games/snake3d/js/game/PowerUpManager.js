import * as THREE from 'three';

export class PowerUpManager {
  constructor(scene, soundManager, particleSystem, cameraFX) {
    this.scene = scene;
    this.sound = soundManager;
    this.particles = particleSystem;
    this.cameraFX = cameraFX;

    // 当前场上的道具实体
    this.currentPowerUp = null; // { type, mesh, logicalPos, light, timer, lifetime }
    this.spawnTimer = 0;
    this.spawnInterval = 13.0; // 每 13 秒尝试生成一个道具

    // 当前激活的道具效果
    this.activeEffect = null; // { type, remainingTime, duration: 5.0 }
    
    // 道具配置元数据（严格纯中文与3D图标）
    this.POWER_UP_DEFS = {
      magnet: {
        id: 'magnet',
        name: '磁力吸附',
        duration: 5.0,
        icon: 'assets/icons/icon_magnet.png',
        color: 0xEF4444,
        emissive: 0xF59E0B
      },
      frost: {
        id: 'frost',
        name: '冰霜减速',
        duration: 5.0,
        icon: 'assets/icons/icon_frost.png',
        color: 0x38BDF8,
        emissive: 0x0284C7
      },
      ghost: {
        id: 'ghost',
        name: '幽灵穿墙',
        duration: 5.0,
        icon: 'assets/icons/icon_ghost.png',
        color: 0xF8FAFC,
        emissive: 0x38BDF8
      },
      bomb: {
        id: 'bomb',
        name: '爆裂清屏',
        duration: 0.0, // 瞬发
        icon: 'assets/icons/icon_bomb.png',
        color: 0xF97316,
        emissive: 0xDC2626
      }
    };

    this.currentWeather = 'sunny';
    this.typesList = ['magnet', 'ghost', 'bomb']; // 默认非雪天不生成冰霜减速道具
    this.time = 0;
  }

  // 根据天气动态绑定道具刷新池（严禁在非雪天生成冰霜减速道具）
  updateWeatherBinding(currentWeather, snake) {
    this.currentWeather = currentWeather;
    if (currentWeather === 'snow') {
      this.typesList = ['magnet', 'frost', 'ghost', 'bomb'];
    } else {
      this.typesList = ['magnet', 'ghost', 'bomb'];
      // 清理场上已生成的冰霜道具
      if (this.currentPowerUp && this.currentPowerUp.type === 'frost') {
        this.clearSpawned();
      }
      // 立即终止生效中的冰霜效果
      if (this.activeEffect && this.activeEffect.type === 'frost') {
        this.activeEffect = null;
      }
      if (snake && snake.setFrostMode) {
        snake.setFrostMode(false);
      }
    }
  }

  // 重置道具状态
  reset() {
    this.clearSpawned();
    this.activeEffect = null;
    this.spawnTimer = 5.0; // 开局 5 秒后首次尝试刷新
  }

  // 清除场上未吃道具
  clearSpawned() {
    if (this.currentPowerUp && this.currentPowerUp.mesh) {
      this.scene.remove(this.currentPowerUp.mesh);
      this.currentPowerUp = null;
    }
  }

  // ── 构建高品质参数化粘土手办 3D 道具模型 ──
  createPowerUpMesh(type) {
    const group = new THREE.Group();

    switch (type) {
      case 'magnet': {
        // 1. 经典红色马蹄形磁体（圆环切半）
        const torusGeo = new THREE.TorusGeometry(0.36, 0.12, 16, 24, Math.PI);
        const redMat = new THREE.MeshStandardMaterial({
          color: 0xEF4444,
          roughness: 0.25,
          metalness: 0.1
        });
        const horseshoe = new THREE.Mesh(torusGeo, redMat);
        horseshoe.rotation.z = Math.PI; // 开口朝上
        horseshoe.position.y = 0.15;
        horseshoe.castShadow = true;
        group.add(horseshoe);

        // 2. 两个银白镀铬磁极顶帽
        const tipGeo = new THREE.CylinderGeometry(0.125, 0.125, 0.14, 16);
        const silverMat = new THREE.MeshStandardMaterial({
          color: 0xE2E8F0,
          roughness: 0.15,
          metalness: 0.85
        });
        const tipL = new THREE.Mesh(tipGeo, silverMat);
        tipL.position.set(-0.36, 0.22, 0);
        tipL.castShadow = true;
        group.add(tipL);

        const tipR = tipL.clone();
        tipR.position.x = 0.36;
        group.add(tipR);

        // 3. 极间旋转金黄能量火花
        const sparkGeo = new THREE.OctahedronGeometry(0.12);
        const sparkMat = new THREE.MeshStandardMaterial({
          color: 0xFBBF24,
          emissive: 0xF59E0B,
          emissiveIntensity: 0.9,
          roughness: 0.2
        });
        const spark = new THREE.Mesh(sparkGeo, sparkMat);
        spark.position.set(0, 0.38, 0);
        group.add(spark);
        group.sparkMesh = spark;

        // 4. 点光源
        const light = new THREE.PointLight(0xF59E0B, 1.8, 5);
        light.position.set(0, 0.3, 0);
        group.add(light);
        break;
      }

      case 'frost': {
        // 1. 中央高挺冰晶柱
        const centerGeo = new THREE.CylinderGeometry(0.08, 0.22, 0.72, 6);
        const iceMat = new THREE.MeshStandardMaterial({
          color: 0x38BDF8,
          roughness: 0.12,
          metalness: 0.15,
          transparent: true,
          opacity: 0.88,
          emissive: 0x0284C7,
          emissiveIntensity: 0.45
        });
        const centerSpike = new THREE.Mesh(centerGeo, iceMat);
        centerSpike.position.y = 0.36;
        centerSpike.castShadow = true;
        group.add(centerSpike);

        // 2. 四周 4 根倾斜环绕的小冰锥
        const smallGeo = new THREE.ConeGeometry(0.12, 0.42, 6);
        for (let i = 0; i < 4; i++) {
          const angle = (i * Math.PI) / 2;
          const spike = new THREE.Mesh(smallGeo, iceMat);
          spike.position.set(Math.cos(angle) * 0.22, 0.22, Math.sin(angle) * 0.22);
          spike.rotation.z = Math.cos(angle) * -0.35;
          spike.rotation.x = Math.sin(angle) * 0.35;
          spike.castShadow = true;
          group.add(spike);
        }

        // 3. 底部六角雪花底盘
        const discGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.05, 6);
        const disc = new THREE.Mesh(discGeo, iceMat);
        disc.position.y = 0.04;
        group.add(disc);

        // 4. 点光源
        const light = new THREE.PointLight(0x38BDF8, 2.0, 5);
        light.position.set(0, 0.3, 0);
        group.add(light);
        break;
      }

      case 'ghost': {
        // 1. Q 版白玉半透小幽灵穹顶颅骨
        const bodyGeo = new THREE.SphereGeometry(0.34, 24, 20);
        bodyGeo.scale(1.0, 1.25, 0.95);
        const ghostMat = new THREE.MeshStandardMaterial({
          color: 0xF8FAFC,
          roughness: 0.25,
          metalness: 0.05,
          transparent: true,
          opacity: 0.92,
          emissive: 0xA5F3FC,
          emissiveIntensity: 0.35
        });
        const ghostBody = new THREE.Mesh(bodyGeo, ghostMat);
        ghostBody.position.y = 0.42;
        ghostBody.castShadow = true;
        group.add(ghostBody);

        // 2. 底部裙摆褶皱（由 6 个小球圆润包裹）
        for (let i = 0; i < 6; i++) {
          const angle = (i * Math.PI) / 3;
          const ruffleGeo = new THREE.SphereGeometry(0.1, 16, 16);
          const ruffle = new THREE.Mesh(ruffleGeo, ghostMat);
          ruffle.position.set(Math.cos(angle) * 0.26, 0.16, Math.sin(angle) * 0.26);
          group.add(ruffle);
        }

        // 3. 圆溜溜黑色萌眼
        const eyeGeo = new THREE.SphereGeometry(0.075, 16, 16);
        const eyeMat = new THREE.MeshStandardMaterial({ color: 0x0F172A, roughness: 0.1 });
        const specGeo = new THREE.SphereGeometry(0.024, 12, 12);
        const specMat = new THREE.MeshBasicMaterial({ color: 0xFFFFFF });

        const createGhostEye = (x) => {
          const eyeGroup = new THREE.Group();
          const black = new THREE.Mesh(eyeGeo, eyeMat);
          eyeGroup.add(black);
          const spec = new THREE.Mesh(specGeo, specMat);
          spec.position.set(0.02, 0.03, 0.065);
          eyeGroup.add(spec);
          eyeGroup.position.set(x, 0.44, 0.3);
          return eyeGroup;
        };
        group.add(createGhostEye(0.14));
        group.add(createGhostEye(-0.14));

        // 4. 萌系小腮红
        const blushGeo = new THREE.SphereGeometry(0.055, 12, 12);
        const blushMat = new THREE.MeshStandardMaterial({ color: 0xFB7185, roughness: 0.4 });
        const blushL = new THREE.Mesh(blushGeo, blushMat);
        blushL.position.set(0.24, 0.35, 0.26);
        blushL.scale.set(0.4, 0.8, 1.0);
        group.add(blushL);
        const blushR = blushL.clone();
        blushR.position.x = -0.24;
        group.add(blushR);

        // 5. 点光源
        const light = new THREE.PointLight(0xA5F3FC, 1.6, 5);
        light.position.set(0, 0.4, 0);
        group.add(light);
        break;
      }

      case 'bomb': {
        // 1. 磨砂黑铁球形主弹体
        const sphereGeo = new THREE.SphereGeometry(0.36, 24, 20);
        const ironMat = new THREE.MeshStandardMaterial({
          color: 0x1E293B,
          roughness: 0.35,
          metalness: 0.65
        });
        const bombSphere = new THREE.Mesh(sphereGeo, ironMat);
        bombSphere.position.y = 0.36;
        bombSphere.castShadow = true;
        group.add(bombSphere);

        // 2. 赤金加固腰箍圈
        const ringGeo = new THREE.TorusGeometry(0.365, 0.028, 12, 24);
        const brassMat = new THREE.MeshStandardMaterial({
          color: 0xF59E0B,
          roughness: 0.25,
          metalness: 0.8
        });
        const ring = new THREE.Mesh(ringGeo, brassMat);
        ring.rotation.x = Math.PI / 2;
        ring.position.y = 0.36;
        group.add(ring);

        // 3. 顶部金属管口与引信
        const pipeGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.12, 16);
        const pipe = new THREE.Mesh(pipeGeo, brassMat);
        pipe.position.y = 0.72;
        group.add(pipe);

        // 4. 噼啪闪烁火花
        const sparkGeo = new THREE.DodecahedronGeometry(0.09);
        const sparkMat = new THREE.MeshStandardMaterial({
          color: 0xEF4444,
          emissive: 0xF59E0B,
          emissiveIntensity: 1.6
        });
        const spark = new THREE.Mesh(sparkGeo, sparkMat);
        spark.position.y = 0.82;
        group.add(spark);
        group.sparkMesh = spark;

        // 5. 点光源
        const light = new THREE.PointLight(0xF97316, 2.2, 5);
        light.position.set(0, 0.6, 0);
        group.add(light);
        break;
      }
    }

    return group;
  }

  // 尝试在空闲网格生成道具（适配 32x32 开阔群岛与不同尺寸地图）
  spawnRandomPowerUp(occupiedPositions, boundLimit = 15) {
    if (this.currentPowerUp) return;

    // 随机选择道具类型 (若非雪天，typesList 严禁包含 frost)
    const type = this.typesList[Math.floor(Math.random() * this.typesList.length)];
    
    // 寻找空闲网格
    const span = Math.max(7, Math.floor(boundLimit || 15) - 1);
    let pos = null;
    let attempts = 0;
    while (attempts < 100) {
      const x = Math.floor(Math.random() * (span * 2 + 1)) - span;
      const z = Math.floor(Math.random() * (span * 2 + 1)) - span;
      const candidate = new THREE.Vector3(x, 0.5, z);
      const isOccupied = occupiedPositions.some(p => p.distanceTo(candidate) < 0.2);
      if (!isOccupied) {
        pos = candidate;
        break;
      }
      attempts++;
    }

    if (!pos) return;

    const mesh = this.createPowerUpMesh(type);
    mesh.position.copy(pos);
    mesh.scale.set(0.01, 0.01, 0.01); // 弹出动画
    this.scene.add(mesh);

    this.currentPowerUp = {
      type,
      mesh,
      logicalPos: pos.clone(),
      timer: 0,
      lifetime: 9.0, // 场上留存 9 秒
      scaleProgress: 0.0
    };
  }

  // 拾取道具触发效果
  collectPowerUp(type, snake, food, obstacles, gameState, uiCallbacks) {
    const def = this.POWER_UP_DEFS[type];
    if (!def) return;

    if (uiCallbacks && uiCallbacks.onPowerUpCollect) {
      uiCallbacks.onPowerUpCollect(type);
    }

    // 播放专属音效与通知
    switch (type) {
      case 'magnet':
        this.sound.playMagnet();
        break;
      case 'frost':
        this.sound.playFrost();
        break;
      case 'ghost':
        this.sound.playGhost();
        break;
      case 'bomb':
        this.sound.playBomb();
        break;
    }

    // 爆裂清屏属于瞬发
    if (type === 'bomb') {
      this.triggerBombEffect(obstacles, food, gameState, uiCallbacks);
      return;
    }

    // 减速类道具仅在雪天生效；非雪天直接拒绝
    if (type === 'frost' && this.currentWeather !== 'snow') {
      return;
    }

    // 持续类道具（磁铁、冰霜、幽灵）设置 5 秒
    this.activeEffect = {
      type,
      remainingTime: def.duration,
      duration: def.duration,
      def
    };

    // 幽灵形态下蛇体虚化
    if (type === 'ghost') {
      snake.setGhostMode(true);
    }
    // 冰霜减速下蛇体冰晶化与步频放缓
    if (type === 'frost') {
      snake.setFrostMode(true);
    }
  }

  // 触发炸弹全屏震波与碎石转金币
  triggerBombEffect(obstacles, food, gameState, uiCallbacks) {
    // 1. 镜头强烈震颤
    this.cameraFX.shake(0.38, 0.6);

    // 2. 获取所有障碍物位置
    const positions = obstacles.getPositions();
    if (positions.length > 0) {
      let totalBonus = 0;
      positions.forEach((pos) => {
        // 粒子爆发
        this.particles.spawnRockShatter(pos);
        // 原位转化为高分金币/黄金食物
        food.spawnSpecialAt(pos);
        totalBonus += 50;
      });

      // 清除全部障碍物
      obstacles.clearAll();
      gameState.addScore(totalBonus, true);

      if (uiCallbacks && uiCallbacks.onRocksCrushed) {
        uiCallbacks.onRocksCrushed(positions.length);
      }

      if (uiCallbacks && uiCallbacks.showFloatingScore) {
        uiCallbacks.showFloatingScore(new THREE.Vector3(0, 1.5, 0), `全场爆破! +${totalBonus}分`, '#F59E0B');
      }
    } else {
      // 场上无障碍物时也给予基础清屏奖励
      gameState.addScore(100, true);
      if (uiCallbacks && uiCallbacks.showFloatingScore) {
        uiCallbacks.showFloatingScore(new THREE.Vector3(0, 1.5, 0), `震撼清屏! +100分`, '#F59E0B');
      }
    }
  }

  // 帧更新
  update(delta, mode, snake, food, obstacles, gameState, uiCallbacks) {
    this.time += delta;

    // ── 1. 疯狂道具模式下的道具生成机制 ──
    if (mode === 'crazy' && gameState.state === 'playing') {
      if (!this.currentPowerUp) {
        this.spawnTimer += delta;
        if (this.spawnTimer >= this.spawnInterval) {
          this.spawnTimer = 0;
          const occ = snake.getOccupiedPositions();
          occ.push(food.getPosition());
          if (food.hasSpecial) occ.push(food.specialPosition);
          occ.push(...obstacles.getPositions());
          this.spawnRandomPowerUp(occ);
        }
      }
    }

    // ── 2. 场上道具实体动画与留存计时 ──
    if (this.currentPowerUp) {
      const pu = this.currentPowerUp;
      pu.timer += delta;

      // 弹性出场动画
      if (pu.scaleProgress < 1.0) {
        pu.scaleProgress = Math.min(1.0, pu.scaleProgress + delta * 4.0);
        const s = Math.sin(pu.scaleProgress * Math.PI * 0.5);
        pu.mesh.scale.set(s, s, s);
      }

      // 浮空呼吸上下浮动 + Y轴匀速自转
      pu.mesh.position.y = 0.5 + Math.sin(this.time * 3.2) * 0.12;
      pu.mesh.rotation.y += delta * 1.8;

      if (pu.mesh.sparkMesh) {
        pu.mesh.sparkMesh.rotation.y += delta * 4.0;
      }

      // 留存最后 2 秒闪烁预警
      const remainingLife = pu.lifetime - pu.timer;
      if (remainingLife <= 2.0 && remainingLife > 0) {
        const blink = Math.sin(remainingLife * 18) > 0;
        pu.mesh.visible = blink;
      }

      // 超时消失
      if (pu.timer >= pu.lifetime) {
        this.clearSpawned();
      } else {
        // 检测蛇头碰撞拾取
        if (snake.logicalPos.distanceTo(pu.logicalPos) < 0.85) {
          const type = pu.type;
          const pickupPos = pu.logicalPos.clone();
          this.clearSpawned();
          this.collectPowerUp(type, snake, food, obstacles, gameState, uiCallbacks);

          // 粒子爆裂反馈
          const def = this.POWER_UP_DEFS[type];
          this.particles.spawnEatBurst(pickupPos, def.color);
          if (uiCallbacks && uiCallbacks.showFloatingScore) {
            uiCallbacks.showFloatingScore(pickupPos, `激活 ${def.name}!`, '#FBBF24');
          }
        }
      }
    }

    // ── 3. 激活道具效果生命周期更新 ──
    if (this.activeEffect) {
      const eff = this.activeEffect;
      eff.remainingTime -= delta;

      // 磁铁效果：周围 5 格内的食物被加速吸向蛇头
      if (eff.type === 'magnet' && gameState.state === 'playing') {
        this.applyMagnetAttraction(delta, snake, food);
      }

      // 冰霜减速效果：在 Snake.js 中根据 isFrostActive 动态缩放 currentInterval
      // 幽灵虚化效果：在 Snake.js 中判断 isGhostActive 穿墙穿身穿障

      // 效果结束处理
      if (eff.remainingTime <= 0) {
        if (eff.type === 'ghost') {
          snake.setGhostMode(false);
        }
        if (eff.type === 'frost') {
          snake.setFrostMode(false);
        }
        this.activeEffect = null;
      }
    }
  }

  // 磁力向心加速吸附食物（支持开阔群岛 8.0 格强力范围磁吸与多果实对象池）
  applyMagnetAttraction(delta, snake, food) {
    if (!snake.head) return;
    const headPos = snake.head.position;
    const MAGNET_RADIUS = 8.0;

    // 1. 普通食物列表吸引 (支持 1/3/5 颗多果实对象池)
    if (food.foodList && food.foodList.length > 0) {
      for (let i = 0; i < food.foodList.length; i++) {
        const f = food.foodList[i];
        if (!f || !f.group) continue;
        const dist = f.group.position.distanceTo(headPos);
        if (dist < MAGNET_RADIUS) {
          // 向心加速拉向蛇嘴
          const pullSpeed = Math.max(9.0, 26.0 - dist * 2.2);
          f.group.position.lerp(headPos, Math.min(1.0, delta * pullSpeed));
          f.logicalPos.copy(f.group.position);
          // 靠近蛇嘴 0.82 格内立即吸附到判定点
          if (dist < 0.82) {
            f.logicalPos.copy(snake.logicalPos || headPos);
          }
        }
      }
    }

    // 2. 特殊黄金大星吸引
    if (food.hasSpecial && food.specialMesh) {
      const dist = food.specialMesh.position.distanceTo(headPos);
      if (dist < MAGNET_RADIUS) {
        const pullSpeed = Math.max(9.0, 26.0 - dist * 2.2);
        food.specialMesh.position.lerp(headPos, Math.min(1.0, delta * pullSpeed));
        food.specialPosition.copy(food.specialMesh.position);
        if (dist < 0.82) {
          food.specialPosition.copy(snake.logicalPos || headPos);
        }
      }
    }

    // 3. 爆裂清屏产生的黄金食物/金币吸引
    if (food.bonusList && food.bonusList.length > 0) {
      for (let i = 0; i < food.bonusList.length; i++) {
        const item = food.bonusList[i];
        if (!item || !item.group) continue;
        const dist = item.group.position.distanceTo(headPos);
        if (dist < MAGNET_RADIUS) {
          const pullSpeed = Math.max(10.0, 28.0 - dist * 2.2);
          item.group.position.lerp(headPos, Math.min(1.0, delta * pullSpeed));
          item.logicalPos.copy(item.group.position);
          if (dist < 0.82) {
            item.logicalPos.copy(snake.logicalPos || headPos);
          }
        }
      }
    }
  }

  // 获取当前状态供 UI 渲染
  getActiveStatus() {
    if (!this.activeEffect) return null;
    return {
      type: this.activeEffect.type,
      name: this.activeEffect.def.name,
      icon: this.activeEffect.def.icon,
      remainingTime: Math.max(0, this.activeEffect.remainingTime),
      isWarning: this.activeEffect.remainingTime <= 1.5
    };
  }

  // 状态查询接口（冰霜减速效果严格限定只在雪天下生效）
  isFrostActive() {
    return this.currentWeather === 'snow' && this.activeEffect && this.activeEffect.type === 'frost';
  }

  isGhostActive() {
    return this.activeEffect && this.activeEffect.type === 'ghost';
  }

  isMagnetActive() {
    return this.activeEffect && this.activeEffect.type === 'magnet';
  }
}
