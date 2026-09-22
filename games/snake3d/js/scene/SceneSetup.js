import * as THREE from 'three';

export class SceneSetup {
  constructor(container) {
    this.container = container;
    
    // 初始化场景
    this.scene = new THREE.Scene();
    
    // 背景由 DOM 容器 CSS cover (保持等比防拉伸自适应) 驱动，Three.js 开启透明通道叠加
    this.scene.background = null;

    // 相机模式：'follow' (沉浸跟随，默认) | 'overview' (全局鸟瞰)
    this.cameraMode = 'follow';

    // 初始化全景开阔自适应机位
    const aspect = window.innerWidth / window.innerHeight;
    this.camera = new THREE.PerspectiveCamera(46, aspect, 0.1, 250);
    this.updateCameraProjection(aspect);
    
    // 初始化渲染器
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.18;
    this.container.appendChild(this.renderer.domElement);
    
    this.clock = new THREE.Clock();
    
    // 设置自然暖亮光照
    this.setupLights();
    
    window.addEventListener('resize', this.onWindowResize.bind(this), false);
    window.addEventListener('orientationchange', this.onWindowResize.bind(this), false);
  }

  // 视锥与机位自适应调整（支持沉浸跟随与全景鸟瞰双模）
  updateCameraProjection(aspect = window.innerWidth / window.innerHeight, isFollowing = false) {
    this.camera.aspect = aspect;

    if (isFollowing && this.cameraMode === 'follow') {
      // 沉浸跟随模式：透视视场角
      this.camera.fov = aspect < 1.0 ? 48 : 46;
    } else {
      // 全景鸟瞰模式：长窄屏锁定水平 FOV 36.5°，确保呼吸边距严格达标
      if (aspect < 1.0) {
        const targetHFOV = 36.5 * Math.PI / 180;
        this.camera.fov = (2 * Math.atan(Math.tan(targetHFOV / 2) / aspect)) * 180 / Math.PI;
      } else {
        this.camera.fov = 48;
      }
    }

    if (!isFollowing || this.cameraMode === 'overview') {
      const camBase = this.getAdaptiveCameraBase(aspect);
      this.camera.position.set(0, camBase.y, camBase.z);
      this.camera.lookAt(0, 0, camBase.lookZ);
    }
    this.camera.updateProjectionMatrix();
  }

  // 设置地台尺寸联动相机缩放（鸟瞰模式下有效）
  setGridScale(gridSize = 20) {
    this.gridScale = Math.max(0.5, Number(gridSize) / 20);
    const aspect = window.innerWidth / window.innerHeight;
    this.updateCameraProjection(aspect, false);
  }

  // 计算视锥自适应基准机位（全局鸟瞰模式，长窄屏上下功能分区）
  getAdaptiveCameraBase(aspect = window.innerWidth / window.innerHeight) {
    const scaleFactor = Math.pow(this.gridScale || 1.0, 0.65);
    if (aspect < 1.0) {
      // 竖屏上下功能分区：地台稳定居中投影在上半区 (35%~56%高度)
      return {
        y: 41.0 * scaleFactor,
        z: 33.0 * scaleFactor,
        lookZ: 4.8 * scaleFactor
      };
    } else {
      // 横屏双拇指掌机模式：机位适度拉近放大
      return {
        y: 21.0 * scaleFactor,
        z: 14.5 * scaleFactor,
        lookZ: 0.2 * scaleFactor
      };
    }
  }

  // 计算第三人称平移平滑跟随基准机位（沉浸跟随模式，随长度与冲刺动态成长变焦）
  getFollowCameraBase(aspect = window.innerWidth / window.innerHeight, snakeLength = 5, isBoosting = false) {
    // 动态变焦系数：初始 1.0，随蛇身变长与冲刺平滑拉远
    const lengthExcess = Math.max(0, Number(snakeLength || 5) - 5);
    const growthZoom = 1.0 + Math.min(0.40, lengthExcess * 0.007) + (isBoosting ? 0.08 : 0);

    if (aspect < 1.0) {
      // 竖屏移动端：特写高度，略向前微倾俯视
      return {
        y: 17.5 * growthZoom,
        z: 12.8 * growthZoom,
        lookAheadZ: 2.2 * growthZoom,
        fov: 48
      };
    } else {
      // 横屏掌机/桌面端：更开阔平缓视野
      return {
        y: 13.8 * growthZoom,
        z: 9.8 * growthZoom,
        lookAheadZ: 1.6 * growthZoom,
        fov: 46
      };
    }
  }

  // 切换相机模式：'follow' <-> 'overview'
  toggleCameraMode() {
    this.cameraMode = (this.cameraMode === 'follow') ? 'overview' : 'follow';
    const aspect = window.innerWidth / window.innerHeight;
    this.updateCameraProjection(aspect);
    return this.cameraMode;
  }

  setCameraMode(mode) {
    if (mode === 'follow' || mode === 'overview') {
      this.cameraMode = mode;
      const aspect = window.innerWidth / window.innerHeight;
      this.updateCameraProjection(aspect);
    }
  }
  
  setupLights() {
    // 太阳主平行光 (Sun Light)
    this.dirLight = new THREE.DirectionalLight('#FFF7E6', 1.75);
    this.dirLight.position.set(12, 26, 14);
    this.dirLight.castShadow = true;
    this.dirLight.shadow.mapSize.width = 2048;
    this.dirLight.shadow.mapSize.height = 2048;
    this.dirLight.shadow.camera.left = -16;
    this.dirLight.shadow.camera.right = 16;
    this.dirLight.shadow.camera.top = 16;
    this.dirLight.shadow.camera.bottom = -16;
    this.dirLight.shadow.camera.near = 0.5;
    this.dirLight.shadow.camera.far = 65;
    this.dirLight.shadow.bias = -0.0005;
    this.scene.add(this.dirLight);
    
    // 天空温和漫反射环境光
    const ambientLight = new THREE.AmbientLight('#E0F2FE', 0.82);
    this.scene.add(ambientLight);
    
    // 天空与草坪双向反射光
    const hemiLight = new THREE.HemisphereLight('#BAE6FD', '#86EFAC', 0.55);
    this.scene.add(hemiLight);
  }
  
  onWindowResize() {
    const aspect = window.innerWidth / window.innerHeight;
    this.updateCameraProjection(aspect);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }
  
  render() {
    this.renderer.render(this.scene, this.camera);
  }
}
