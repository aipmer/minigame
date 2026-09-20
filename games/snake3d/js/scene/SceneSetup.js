import * as THREE from 'three';

export class SceneSetup {
  constructor(container) {
    this.container = container;
    
    // 初始化场景
    this.scene = new THREE.Scene();
    
    // 背景由 DOM 容器 CSS cover (保持等比防拉伸自适应) 驱动，Three.js 开启透明通道叠加
    this.scene.background = null;

    // 初始化全景开阔机位
    const aspect = window.innerWidth / window.innerHeight;
    this.camera = new THREE.PerspectiveCamera(46, aspect, 0.1, 250);
    this.camera.position.set(0, 28.5, 19.5);
    this.camera.lookAt(0, 0, 0.5);
    
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
  }
  
  setupLights() {
    // 太阳主平行光 (Sun Light)
    const dirLight = new THREE.DirectionalLight('#FFF7E6', 1.75);
    dirLight.position.set(12, 26, 14);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.left = -16;
    dirLight.shadow.camera.right = 16;
    dirLight.shadow.camera.top = 16;
    dirLight.shadow.camera.bottom = -16;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 65;
    dirLight.shadow.bias = -0.0005;
    this.scene.add(dirLight);
    
    // 天空温和漫反射环境光
    const ambientLight = new THREE.AmbientLight('#E0F2FE', 0.82);
    this.scene.add(ambientLight);
    
    // 天空与草坪双向反射光
    const hemiLight = new THREE.HemisphereLight('#BAE6FD', '#86EFAC', 0.55);
    this.scene.add(hemiLight);
  }
  
  onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }
  
  render() {
    this.renderer.render(this.scene, this.camera);
  }
}
