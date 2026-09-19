import * as THREE from 'three';

export class SceneSetup {
  constructor(container) {
    this.container = container;
    
    // 初始化场景 (Initialize scene)
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#0A0D17');
    this.scene.fog = new THREE.FogExp2('#0A0D17', 0.012);
    
    // 初始化相机 (Initialize camera)
    const aspect = window.innerWidth / window.innerHeight;
    this.camera = new THREE.PerspectiveCamera(56, aspect, 0.1, 200);
    this.camera.position.set(0, 22, 14);
    this.camera.lookAt(0, 0, 0);
    
    // 初始化渲染器 (Initialize renderer)
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    this.container.appendChild(this.renderer.domElement);
    
    // 初始化时钟 (Initialize clock)
    this.clock = new THREE.Clock();
    
    // 设置光照 (Setup lighting)
    this.setupLights();
    
    // 监听窗口大小调整 (Listen for window resize)
    window.addEventListener('resize', this.onWindowResize.bind(this), false);
  }
  
  setupLights() {
    // 平行光 (Directional Light)
    const dirLight = new THREE.DirectionalLight('#FFF5E0', 1.5);
    dirLight.position.set(8, 15, 10);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.left = -15;
    dirLight.shadow.camera.right = 15;
    dirLight.shadow.camera.top = 15;
    dirLight.shadow.camera.bottom = -15;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 50;
    this.scene.add(dirLight);
    
    // 环境光 (Ambient Light)
    const ambientLight = new THREE.AmbientLight('#4466AA', 0.4);
    this.scene.add(ambientLight);
    
    // 半球光 (Hemisphere Light)
    const hemiLight = new THREE.HemisphereLight('#8899FF', '#334455', 0.3);
    this.scene.add(hemiLight);
  }
  
  onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }
  
  update(delta) {
    // 处理每一帧的更新 (Handle per-frame updates)
  }
  
  render() {
    this.renderer.render(this.scene, this.camera);
  }
}
