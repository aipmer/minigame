import * as THREE from 'three';

export class SceneSetup {
  constructor(container) {
    this.container = container;
    
    // 初始化场景
    this.scene = new THREE.Scene();
    
    // 背景由 DOM 容器 CSS cover (保持等比防拉伸自适应) 驱动，Three.js 开启透明通道叠加
    this.scene.background = null;

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

  // 视锥与机位自适应调整（彻底消除竖屏两端过窄与上下遮挡）
  updateCameraProjection(aspect = window.innerWidth / window.innerHeight) {
    this.camera.aspect = aspect;

    if (aspect < 1.0) {
      // 竖屏长窄屏模式：自适应调整垂直 FOV 保证水平视野恒定充足 (>= 46°)
      // 使得 20x20 地台在各种细长竖屏下两端始终留有 14%~16% 呼吸安全间隙
      const targetHFOV = 46 * Math.PI / 180;
      this.camera.fov = (2 * Math.atan(Math.tan(targetHFOV / 2) / aspect)) * 180 / Math.PI;
    } else {
      this.camera.fov = 46;
    }

    const camBase = this.getAdaptiveCameraBase(aspect);
    this.camera.position.set(0, camBase.y, camBase.z);
    this.camera.lookAt(0, 0, camBase.lookZ);
    this.camera.updateProjectionMatrix();
  }

  // 计算视锥自适应基准机位
  getAdaptiveCameraBase(aspect = window.innerWidth / window.innerHeight) {
    if (aspect < 1.0) {
      return {
        y: 29.5,
        z: 22.0,
        lookZ: -0.2
      };
    } else {
      return {
        y: 27.5,
        z: 18.5,
        lookZ: 0.5
      };
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
