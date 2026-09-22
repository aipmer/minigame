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
    
    // 灯光
    this.setupLighting();
    
    // 窗口缩放
    this.resizeHandler = this.onResize.bind(this);
    window.addEventListener('resize', this.resizeHandler);
  }
  
  setupLighting() {
    // 主光源：暖白阳光
    const dirLight = new THREE.DirectionalLight(0xfff5e6, 1.2);
    dirLight.position.set(5, 12, 5);
    this.scene.add(dirLight);
    
    // 环境光：天蓝 + 草绿双色半球光
    const hemiLight = new THREE.HemisphereLight(0x87CEEB, 0x98FB98, 0.8);
    this.scene.add(hemiLight);
    
    // 柔和环境光补充
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
    this.scene.add(ambientLight);
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
