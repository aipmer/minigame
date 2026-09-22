import * as THREE from 'three';

export class Food {
  constructor(scene, modelLoader = null) {
    this.scene = scene;
    this.modelLoader = modelLoader;

    // 规则配置
    this.foodType = 'apple'; // 'apple' | 'strawberry' | 'donut' | 'star'
    this.targetFoodCount = 1; // 1 | 3 | 5
    this.boundLimit = 9; // 5 for 12x12, 9 for 20x20, 13 for 28x28

    // 活跃食物列表（支持 1/3/5 颗同屏）
    this.foodList = [];
    this.logicalPos = new THREE.Vector3(0, 0.5, 0); // 兼容旧版引用
    this.time = 0;
    
    // 生成动画时长
    this.spawnDuration = 0.35;
    
    // 特殊黄金大星
    this.hasSpecial = false;
    this.specialMesh = null;
    this.specialLight = null;
    this.specialPosition = new THREE.Vector3();
    this.specialTime = 0;
    this.spawnSpecialTimer = 0;

    // 爆破转换产生的奖励金币/黄金食物列表
    this.bonusList = [];

    // 共享几何体缓存
    this.initGeometries();
  }

  // 共享几何体与材质构建（低多边形高表现力手办风）
  initGeometries() {
    // 苹果主球体 + 梗 + 叶
    this.appleGeo = new THREE.SphereGeometry(0.42, 20, 16);
    this.stemGeo = new THREE.CylinderGeometry(0.04, 0.05, 0.22, 8);
    this.leafGeo = new THREE.ConeGeometry(0.12, 0.22, 6);

    // 草莓主体（稍尖锥形）+ 萼片
    this.strawberryGeo = new THREE.ConeGeometry(0.42, 0.72, 16);
    this.strawberryCalyxGeo = new THREE.ConeGeometry(0.14, 0.16, 5);

    // 甜甜圈圆环体
    this.donutBaseGeo = new THREE.TorusGeometry(0.34, 0.15, 16, 24);
    this.donutIcingGeo = new THREE.TorusGeometry(0.34, 0.156, 16, 24);

    // 能量星八面晶钻
    this.starGeo = new THREE.OctahedronGeometry(0.44, 0);

    // 常用材质
    this.stemMat = new THREE.MeshStandardMaterial({ color: 0x5C3A21, roughness: 0.8 });
    this.leafMat = new THREE.MeshStandardMaterial({ color: 0x4ADE80, roughness: 0.3 });
  }

  // 应用规则配置
  configureRules({ foodType = 'apple', foodCount = 1, boundLimit = 9 } = {}) {
    this.foodType = foodType;
    this.targetFoodCount = Math.max(1, Math.min(5, foodCount));
    this.boundLimit = boundLimit;
  }
  
  // easeOutBack 缓动函数
  easeOutBack(x) {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
  }

  // 构建 3D 食物组模型
  createFoodMeshGroup(type = this.foodType) {
    const group = new THREE.Group();
    let mainColor = 0xFF2E26;
    let lightColor = 0xFF4500;

    switch (type) {
      case 'strawberry': {
        // 多汁草莓：红艳锥形手办，顶部绿萼
        mainColor = 0xFB284E;
        lightColor = 0xF43F5E;
        const berryMat = new THREE.MeshStandardMaterial({
          color: 0xFB284E,
          emissive: 0x9F1239,
          emissiveIntensity: 0.35,
          roughness: 0.22,
          metalness: 0.1
        });
        const berryMesh = new THREE.Mesh(this.strawberryGeo, berryMat);
        berryMesh.rotation.x = Math.PI; // 尖端向下
        berryMesh.position.y = 0.05;
        berryMesh.castShadow = true;
        group.add(berryMesh);

        // 顶部绿叶萼片
        for (let i = 0; i < 4; i++) {
          const leaf = new THREE.Mesh(this.leafGeo, this.leafMat);
          leaf.rotation.z = Math.PI * 0.45;
          leaf.rotation.y = (i * Math.PI) / 2;
          leaf.position.y = 0.36;
          group.add(leaf);
        }
        break;
      }

      case 'donut': {
        // 甜蜜圆环：焦糖烘焙面团 + 草莓粉红糖霜
        mainColor = 0xF472B6;
        lightColor = 0xEC4899;
        const doughMat = new THREE.MeshStandardMaterial({
          color: 0xFBBF24,
          roughness: 0.65,
          metalness: 0.05
        });
        const doughMesh = new THREE.Mesh(this.donutBaseGeo, doughMat);
        doughMesh.rotation.x = Math.PI * 0.5;
        doughMesh.castShadow = true;
        group.add(doughMesh);

        // 粉红糖霜
        const icingMat = new THREE.MeshStandardMaterial({
          color: 0xF472B6,
          emissive: 0xDB2777,
          emissiveIntensity: 0.4,
          roughness: 0.18,
          metalness: 0.08
        });
        const icingMesh = new THREE.Mesh(this.donutIcingGeo, icingMat);
        icingMesh.rotation.x = Math.PI * 0.5;
        group.add(icingMesh);
        break;
      }

      case 'star': {
        // 能量金星：八面耀金璀璨晶体
        mainColor = 0xFACC15;
        lightColor = 0xEAB308;
        const starMat = new THREE.MeshStandardMaterial({
          color: 0xFACC15,
          emissive: 0xF59E0B,
          emissiveIntensity: 0.75,
          metalness: 0.85,
          roughness: 0.15
        });
        const starMesh = new THREE.Mesh(this.starGeo, starMat);
        starMesh.castShadow = true;
        group.add(starMesh);
        break;
      }

      case 'apple':
      default: {
        // 经典苹果：饱满红苹果 + 棕梗 + 嫩绿小叶
        mainColor = 0xFF2E26;
        lightColor = 0xEF4444;
        const appleMat = new THREE.MeshStandardMaterial({
          color: 0xFF2E26,
          emissive: 0xDC2626,
          emissiveIntensity: 0.45,
          metalness: 0.15,
          roughness: 0.2
        });
        const appleMesh = new THREE.Mesh(this.appleGeo, appleMat);
        appleMesh.scale.set(1.0, 0.92, 1.0);
        appleMesh.castShadow = true;
        group.add(appleMesh);

        // 果柄
        const stemMesh = new THREE.Mesh(this.stemGeo, this.stemMat);
        stemMesh.position.y = 0.42;
        stemMesh.rotation.z = -0.25;
        group.add(stemMesh);

        // 嫩叶
        const leafMesh = new THREE.Mesh(this.leafGeo, this.leafMat);
        leafMesh.position.set(0.1, 0.44, 0);
        leafMesh.rotation.z = 0.5;
        group.add(leafMesh);
        break;
      }
    }

    // 微光点光源
    const light = new THREE.PointLight(lightColor, 2.2, 5.5);
    group.add(light);

    return { group, light, mainColor };
  }

  // 清除全部普通食物
  disposeCurrent() {
    if (this.foodList && this.foodList.length > 0) {
      for (const item of this.foodList) {
        this.scene.remove(item.group);
      }
      this.foodList = [];
    }
  }

  // 寻找空闲网格坐标
  findFreePosition(occupiedPositions, obstaclePositions) {
    const limit = Math.floor(this.boundLimit);
    let attempts = 0;
    while (attempts < 120) {
      const x = Math.floor(Math.random() * (limit * 2 + 1)) - limit;
      const z = Math.floor(Math.random() * (limit * 2 + 1)) - limit;
      const pos = new THREE.Vector3(x, 0.5, z);

      // 检查蛇体占用
      const isOccupied = occupiedPositions && occupiedPositions.some(p => p.distanceTo(pos) < 0.2);
      // 检查障碍物占用
      const isObstacle = obstaclePositions && obstaclePositions.some(p => p.distanceTo(pos) < 0.2);
      // 检查特殊食物占用
      const isSpecial = this.hasSpecial && this.specialPosition.distanceTo(pos) < 0.2;
      // 检查场上已存在的其他食物占用
      const isFood = this.foodList.some(f => f.logicalPos.distanceTo(pos) < 0.2);

      if (!isOccupied && !isObstacle && !isSpecial && !isFood) {
        return pos;
      }
      attempts++;
    }
    return new THREE.Vector3(0, 0.5, 0);
  }

  // 生成单颗食物加入列表
  spawnSingle(occupiedPositions, obstaclePositions, type = this.foodType) {
    const pos = this.findFreePosition(occupiedPositions, obstaclePositions);
    const { group, light, mainColor } = this.createFoodMeshGroup(type);

    group.position.copy(pos);
    group.scale.set(0.01, 0.01, 0.01);
    this.scene.add(group);

    const foodObj = {
      group,
      light,
      mainColor,
      type,
      logicalPos: pos.clone(),
      time: Math.random() * 10,
      spawnTimer: 0
    };

    this.foodList.push(foodObj);

    if (this.foodList.length === 1) {
      this.logicalPos.copy(pos);
    }
    return foodObj;
  }

  // 生成全部食物（对齐 targetFoodCount，支持 1/3/5 颗）
  spawn(occupiedPositions, obstaclePositions) {
    this.disposeCurrent();

    const count = this.targetFoodCount || 1;
    for (let i = 0; i < count; i++) {
      this.spawnSingle(occupiedPositions, obstaclePositions, this.foodType);
    }

    if (this.foodList.length > 0) {
      this.logicalPos.copy(this.foodList[0].logicalPos);
    }
  }

  // 检查蛇头是否吃到任意普通食物并自动补充新食物
  checkFoodCollision(headPos, occupiedPositions = [], obstaclePositions = []) {
    if (!this.foodList || this.foodList.length === 0) return false;

    for (let i = 0; i < this.foodList.length; i++) {
      const food = this.foodList[i];
      if (headPos.distanceTo(food.logicalPos) < 0.72) {
        // 移出场景
        this.scene.remove(food.group);
        this.foodList.splice(i, 1);

        // 立即补充一颗新食物维持场上密度
        this.spawnSingle(occupiedPositions, obstaclePositions, this.foodType);

        if (this.foodList.length > 0) {
          this.logicalPos.copy(this.foodList[0].logicalPos);
        }
        return true;
      }
    }
    return false;
  }

  // 生成特殊黄金大星
  spawnSpecial(occupiedPositions) {
    if (this.specialMesh) {
      this.scene.remove(this.specialMesh);
    }

    const pos = this.findFreePosition(occupiedPositions, []);
    this.specialPosition.copy(pos);

    // 创建黄金特殊食物
    if (this.modelLoader && this.modelLoader.has('food_star')) {
      this.specialMesh = this.modelLoader.clone('food_star');
    } else {
      const geo = new THREE.OctahedronGeometry(0.52, 0);
      const mat = new THREE.MeshStandardMaterial({
        color: 0xFFD700,
        emissive: 0xF59E0B,
        emissiveIntensity: 0.85,
        metalness: 0.85,
        roughness: 0.15
      });
      this.specialMesh = new THREE.Mesh(geo, mat);
      this.specialMesh.castShadow = true;
    }
    this.specialMesh.position.copy(pos);

    this.specialLight = new THREE.PointLight(0xFFD700, 3.2, 7.5);
    this.specialMesh.add(this.specialLight);

    this.scene.add(this.specialMesh);
    this.hasSpecial = true;

    // 初始化生成动画
    this.specialMesh.scale.set(0.01, 0.01, 0.01);
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

  // 获取当前普通食物位置 (兼容旧逻辑)
  getPosition() {
    if (this.foodList && this.foodList.length > 0) {
      return this.foodList[0].logicalPos;
    }
    return this.logicalPos;
  }

  // 更新动画
  update(delta) {
    this.time += delta;

    // 普通食物列表动画
    if (this.foodList && this.foodList.length > 0) {
      for (const food of this.foodList) {
        food.time += delta;

        if (food.spawnTimer < this.spawnDuration) {
          food.spawnTimer += delta;
          const progress = Math.min(1, food.spawnTimer / this.spawnDuration);
          const s = this.easeOutBack(progress);
          food.group.scale.set(s, s, s);
        }

        food.group.position.y = food.logicalPos.y + Math.sin(food.time * 3.2) * 0.14;
        food.group.rotation.y += delta * 1.2;

        if (food.light) {
          food.light.intensity = 2.2 + Math.sin(food.time * 5.0) * 0.5;
        }
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
