import * as THREE from 'three';

export class WeatherSystem {
  constructor({
    scene,
    sceneSetup,
    soundManager,
    ground,
    obstacleManager,
    food,
    achievementManager,
    iconBasePath = 'assets/icons/'
  }) {
    this.scene = scene;
    this.sceneSetup = sceneSetup;
    this.soundManager = soundManager;
    this.ground = ground;
    this.obstacleManager = obstacleManager;
    this.food = food;
    this.achievementManager = achievementManager;
    this.iconBasePath = iconBasePath.endsWith('/') ? iconBasePath : iconBasePath + '/';

    this.currentWeather = 'sunny'; // 'sunny' | 'thunder' | 'snow'
    this.weatherTimer = 0;
    this.weatherDuration = 45; // 每 45 秒自然演进

    this.weatherCycle = ['sunny', 'thunder', 'snow'];
    this.cycleIndex = 0;

    this.weatherMeta = {
      sunny: {
        name: '晴空暖阳',
        icon: `${this.iconBasePath}icon_weather_sun.png`,
        desc: '微风轻拂，视野开阔'
      },
      thunder: {
        name: '暴雨惊雷',
        icon: `${this.iconBasePath}icon_weather_thunder.png`,
        desc: '惊雷暴雨来袭，天雷偶发击碎障碍！'
      },
      snow: {
        name: '梦幻雪境',
        icon: `${this.iconBasePath}icon_weather_snow.png`,
        desc: '漫天飘雪，浮空岛银装素裹'
      }
    };

    // 雷电定时器与闪烁状态
    this.lightningTimer = 0;
    this.lightningInterval = 8.0; // 7~10 秒触发一次
    this.flashTimer = 0;
    this.baseLightIntensity = (this.sceneSetup && this.sceneSetup.dirLight) ? this.sceneSetup.dirLight.intensity : 1.5;

    // 回调列表
    this.listeners = [];

    // 初始化粒子系统
    this.initRain();
    this.initSnow();

    // 默认晴天
    this.setWeather('sunny', true);
  }

  onWeatherChange(callback) {
    if (typeof callback === 'function') {
      this.listeners.push(callback);
    }
  }

  _notifyChange(weather) {
    const meta = this.weatherMeta[weather] || {};
    this.listeners.forEach(cb => {
      try {
        cb(weather, meta);
      } catch (e) {
        console.error('Weather change callback error:', e);
      }
    });
  }

  // ── 雨丝粒子系统 (暴雨惊雷) ──
  initRain() {
    this.rainCount = 140;
    const positions = new Float32Array(this.rainCount * 2 * 3); // 每个线段两个顶点
    this.rainSpeeds = new Float32Array(this.rainCount);
    this.rainBasePos = [];

    for (let i = 0; i < this.rainCount; i++) {
      const x = (Math.random() - 0.5) * 26;
      const y = Math.random() * 25 + 2;
      const z = (Math.random() - 0.5) * 26;
      const speed = 28 + Math.random() * 10;
      this.rainSpeeds[i] = speed;
      this.rainBasePos.push({ x, y, z });

      const idx = i * 6;
      // 顶端点 (轻微向 -X 倾斜呈现风势)
      positions[idx] = x - 0.15;
      positions[idx + 1] = y + 0.9;
      positions[idx + 2] = z;
      // 底端点
      positions[idx + 3] = x;
      positions[idx + 4] = y;
      positions[idx + 5] = z;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const material = new THREE.LineBasicMaterial({
      color: 0x93C5FD,
      transparent: true,
      opacity: 0.65,
      blending: THREE.AdditiveBlending
    });

    this.rainLines = new THREE.LineSegments(geometry, material);
    this.rainLines.visible = false;
    this.scene.add(this.rainLines);
  }

  // ── 雪花粒子系统 (梦幻雪境) ──
  initSnow() {
    this.snowCount = 130;
    const positions = new Float32Array(this.snowCount * 3);
    this.snowSpeeds = new Float32Array(this.snowCount);
    this.snowWobbles = [];

    for (let i = 0; i < this.snowCount; i++) {
      const x = (Math.random() - 0.5) * 26;
      const y = Math.random() * 25 + 2;
      const z = (Math.random() - 0.5) * 26;

      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;

      this.snowSpeeds[i] = 3.5 + Math.random() * 2.5;
      this.snowWobbles.push({
        baseX: x,
        baseZ: z,
        offset: Math.random() * Math.PI * 2,
        speed: 1.5 + Math.random() * 2
      });
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    // 生成纯白柔和圆形雪花贴图
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createRadialGradient(16, 16, 2, 16, 16, 15);
    grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
    grad.addColorStop(0.5, 'rgba(240, 249, 255, 0.8)');
    grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(16, 16, 15, 0, Math.PI * 2);
    ctx.fill();

    const snowTex = new THREE.CanvasTexture(canvas);
    const material = new THREE.PointsMaterial({
      size: 0.5,
      map: snowTex,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    this.snowPoints = new THREE.Points(geometry, material);
    this.snowPoints.visible = false;
    this.scene.add(this.snowPoints);
  }

  setWeather(type, silent = false) {
    if (!this.weatherMeta[type]) return;
    this.currentWeather = type;
    this.weatherTimer = 0;
    this.lightningTimer = 0;

    // 显隐雨雪
    if (this.rainLines) this.rainLines.visible = (type === 'thunder');
    if (this.snowPoints) this.snowPoints.visible = (type === 'snow');

    // 地台材质切换
    if (this.ground && typeof this.ground.setWeather === 'function') {
      this.ground.setWeather(type);
    }

    // 播放对应音效
    if (type === 'snow' && this.soundManager && typeof this.soundManager.playSnowBreeze === 'function') {
      this.soundManager.playSnowBreeze();
    } else if (type === 'thunder' && this.soundManager && typeof this.soundManager.playThunder === 'function') {
      this.soundManager.playThunder();
    }

    if (!silent) {
      this._notifyChange(type);
    }
  }

  nextWeather() {
    this.cycleIndex = (this.cycleIndex + 1) % this.weatherCycle.length;
    this.setWeather(this.weatherCycle[this.cycleIndex]);
  }

  forceWeather(type) {
    const idx = this.weatherCycle.indexOf(type);
    if (idx !== -1) {
      this.cycleIndex = idx;
    }
    this.setWeather(type);
  }

  triggerLightning() {
    if (!this.sceneSetup || !this.sceneSetup.dirLight) return;

    // 1. 白闪瞬态脉冲
    this.sceneSetup.dirLight.intensity = 3.2;
    this.flashTimer = 0.14;

    // 2. 检查是否有障碍石可以劈击
    let targetObstacle = null;
    if (this.obstacleManager && typeof this.obstacleManager.getPositions === 'function') {
      const positions = this.obstacleManager.getPositions();
      if (positions.length > 0 && Math.random() < 0.45) {
        // 45% 几率击中其中一块障碍石
        const idx = Math.floor(Math.random() * positions.length);
        targetObstacle = positions[idx].clone();
      }
    }

    if (targetObstacle) {
      // 命中障碍石！
      this._createLightningBolt(targetObstacle);

      // 音效：雷电电光爆鸣 + 碎石粉碎
      if (this.soundManager) {
        if (typeof this.soundManager.playLightningStrike === 'function') {
          this.soundManager.playLightningStrike();
        }
        if (typeof this.soundManager.playRockShatter === 'function') {
          setTimeout(() => this.soundManager.playRockShatter(), 50);
        }
      }

      // 移除障碍石并原位产生金色特殊奖励食物
      if (this.obstacleManager && typeof this.obstacleManager.removeAt === 'function') {
        this.obstacleManager.removeAt(targetObstacle, 0.9);
      }
      if (this.food && typeof this.food.spawnSpecialAt === 'function') {
        this.food.spawnSpecialAt(targetObstacle);
      }

      // 记录成就打点（击碎障碍石）
      if (this.achievementManager && typeof this.achievementManager.recordEvent === 'function') {
        this.achievementManager.recordEvent('rock_crushed', 1);
      }
    } else {
      // 未命中障碍石：远处天际闪电 + 滚雷声
      if (this.soundManager && typeof this.soundManager.playThunder === 'function') {
        this.soundManager.playThunder();
      }
    }
  }

  _createLightningBolt(targetPos) {
    const points = [];
    const startY = 22;
    const endY = 0.5;
    const segments = 5;

    let currX = targetPos.x + (Math.random() - 0.5) * 2;
    let currZ = targetPos.z + (Math.random() - 0.5) * 2;

    points.push(new THREE.Vector3(currX, startY, currZ));

    for (let s = 1; s < segments; s++) {
      const t = s / segments;
      const y = startY - t * (startY - endY);
      const jitterX = (Math.random() - 0.5) * 1.5;
      const jitterZ = (Math.random() - 0.5) * 1.5;
      const x = THREE.MathUtils.lerp(currX, targetPos.x, t) + jitterX;
      const z = THREE.MathUtils.lerp(currZ, targetPos.z, t) + jitterZ;
      points.push(new THREE.Vector3(x, y, z));
    }

    points.push(new THREE.Vector3(targetPos.x, endY, targetPos.z));

    const lineGeo = new THREE.BufferGeometry().setFromPoints(points);
    const lineMat = new THREE.LineBasicMaterial({
      color: 0xFEF08A,
      linewidth: 3,
      blending: THREE.AdditiveBlending
    });

    const bolt = new THREE.Line(lineGeo, lineMat);
    this.scene.add(bolt);

    // 0.12 秒后自动移除并释放资源
    setTimeout(() => {
      this.scene.remove(bolt);
      lineGeo.dispose();
      lineMat.dispose();
    }, 120);
  }

  update(delta) {
    // 1. 天气自然时间演进
    this.weatherTimer += delta;
    if (this.weatherTimer >= this.weatherDuration) {
      this.nextWeather();
    }

    // 2. 闪电白闪衰减
    if (this.flashTimer > 0) {
      this.flashTimer -= delta;
      if (this.sceneSetup && this.sceneSetup.dirLight) {
        if (this.flashTimer <= 0) {
          this.sceneSetup.dirLight.intensity = this.baseLightIntensity;
        } else {
          // 渐变回落
          this.sceneSetup.dirLight.intensity = THREE.MathUtils.lerp(this.baseLightIntensity, 3.2, this.flashTimer / 0.14);
        }
      }
    }

    // 3. 暴雨惊雷粒子更新与雷电触发
    if (this.currentWeather === 'thunder') {
      this.lightningTimer += delta;
      if (this.lightningTimer >= this.lightningInterval) {
        this.lightningTimer = 0;
        this.lightningInterval = 6.5 + Math.random() * 4.5;
        this.triggerLightning();
      }

      if (this.rainLines && this.rainLines.visible) {
        const posAttr = this.rainLines.geometry.attributes.position;
        const arr = posAttr.array;
        for (let i = 0; i < this.rainCount; i++) {
          const idx = i * 6;
          const speed = this.rainSpeeds[i];
          arr[idx + 1] -= speed * delta;
          arr[idx + 4] -= speed * delta;

          if (arr[idx + 4] < 0) {
            const x = (Math.random() - 0.5) * 26;
            const y = 22 + Math.random() * 5;
            const z = (Math.random() - 0.5) * 26;
            arr[idx] = x - 0.15;
            arr[idx + 1] = y + 0.9;
            arr[idx + 2] = z;
            arr[idx + 3] = x;
            arr[idx + 4] = y;
            arr[idx + 5] = z;
          }
        }
        posAttr.needsUpdate = true;
      }
    }

    // 4. 梦幻雪境粒子更新
    if (this.currentWeather === 'snow') {
      if (this.snowPoints && this.snowPoints.visible) {
        const posAttr = this.snowPoints.geometry.attributes.position;
        const arr = posAttr.array;
        const now = performance.now() * 0.001;

        for (let i = 0; i < this.snowCount; i++) {
          const idx = i * 3;
          const speed = this.snowSpeeds[i];
          const wobble = this.snowWobbles[i];

          arr[idx + 1] -= speed * delta;
          arr[idx] = wobble.baseX + Math.sin(now * wobble.speed + wobble.offset) * 0.45;
          arr[idx + 2] = wobble.baseZ + Math.cos(now * wobble.speed + wobble.offset) * 0.45;

          if (arr[idx + 1] < 0) {
            arr[idx + 1] = 24 + Math.random() * 4;
            wobble.baseX = (Math.random() - 0.5) * 26;
            wobble.baseZ = (Math.random() - 0.5) * 26;
          }
        }
        posAttr.needsUpdate = true;
      }
    }
  }

  dispose() {
    if (this.rainLines) {
      this.scene.remove(this.rainLines);
      this.rainLines.geometry.dispose();
      this.rainLines.material.dispose();
    }
    if (this.snowPoints) {
      this.scene.remove(this.snowPoints);
      this.snowPoints.geometry.dispose();
      this.snowPoints.material.dispose();
    }
  }
}
