import * as THREE from 'three';

export class SceneManager {
  constructor(canvas) {
    this.canvas = canvas;
    this.scene = new THREE.Scene();
    
    // 正交相机（45° 等距俯视）
    const aspect = window.innerWidth / window.innerHeight;
    const baseFrustum = 14;
    const frustumSize = aspect < 1.0 ? baseFrustum / Math.max(aspect, 0.55) : baseFrustum;
    this.camera = new THREE.OrthographicCamera(
      -frustumSize * aspect / 2, frustumSize * aspect / 2,
      frustumSize / 2, -frustumSize / 2, 0.1, 100
    );
    // 45° 等距视角设置
    this.camera.position.set(10, 14, 10);
    this.camera.lookAt(0, 0, 0);
    
    // 渲染器
    const isMobile = 'ontouchstart' in window;
    this.renderer = new THREE.WebGLRenderer({
      canvas, antialias: true, alpha: true,
      preserveDrawingBuffer: false
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.5 : 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.22;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    
    // 灯光
    this.setupLighting();
    
    // 窗口缩放
    this.resizeHandler = this.onResize.bind(this);
    window.addEventListener('resize', this.resizeHandler);
  }
  
  setupLighting() {
    // 1. 主光源：明媚阳光暖金日照（投射柔和接触阴影）
    const dirLight = new THREE.DirectionalLight(0xfff6e5, 1.65);
    dirLight.position.set(8, 16, 7);
    dirLight.castShadow = true;
    
    // 配置高精度阴影相机包围盒，刚好覆盖浮空岛和跑道
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.near = 1.0;
    dirLight.shadow.camera.far = 35;
    const d = 10.5;
    dirLight.shadow.camera.left = -d;
    dirLight.shadow.camera.right = d;
    dirLight.shadow.camera.top = d;
    dirLight.shadow.camera.bottom = -d;
    dirLight.shadow.bias = -0.0004;
    dirLight.shadow.normalBias = 0.02;
    this.scene.add(dirLight);
    
    // 2. 环境半球光：清澈天青蓝 + 阳光明亮草地漫反射（动森纯正治愈系采光）
    const hemiLight = new THREE.HemisphereLight(0x9aebff, 0xbff765, 0.95);
    hemiLight.position.set(0, 20, 0);
    this.scene.add(hemiLight);
    
    // 3. 柔和背光补光：温暖蜜桃象牙白，消除暗面死角沉闷感
    const fillLight = new THREE.DirectionalLight(0xffebd9, 0.45);
    fillLight.position.set(-8, 7, -7);
    this.scene.add(fillLight);
  }
  
  onResize() {
    const aspect = window.innerWidth / window.innerHeight;
    // 竖屏时自适应调大视锥范围，确保完整显示整个浮空岛与外围怪物跑道
    const baseFrustum = 14;
    const frustumSize = aspect < 1.0 ? baseFrustum / Math.max(aspect, 0.55) : baseFrustum;

    this.camera.left = -frustumSize * aspect / 2;
    this.camera.right = frustumSize * aspect / 2;
    this.camera.top = frustumSize / 2;
    this.camera.bottom = -frustumSize / 2;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }
  
  render() { 
    this.renderer.render(this.scene, this.camera); 
  }
  
  getScene() { return this.scene; }
  getCamera() { return this.camera; }
  getRenderer() { return this.renderer; }

  dispose() {
    window.removeEventListener('resize', this.resizeHandler);
    this.renderer.dispose();
  }
}
