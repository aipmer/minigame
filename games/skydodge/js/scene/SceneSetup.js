// ═══════════════════════════════════════════
// 场景与渲染器基础配置 (带 UnrealBloomPass 辉光后处理)
// ═══════════════════════════════════════════
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

export class SceneSetup {
  constructor(container) {
    this.container = container;

    // 1. 场景与星空迷雾 (深邃赛博蓝黑色调)
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x030611);
    this.scene.fog = new THREE.FogExp2(0x030611, 0.0055);

    // 2. 摄像机 (针对高速飞行优化的 FOV 与透视)
    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      900
    );
    this.camera.position.set(0, 3.5, 9);

    // 3. WebGL 渲染器
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
      alpha: false,
      preserveDrawingBuffer: true,
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.25;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.container.appendChild(this.renderer.domElement);

    // 4. UnrealBloomPass 赛博泛光后处理链
    this.initPostProcessing();

    // 5. 监听视口缩放
    this.onWindowResize = this.onWindowResize.bind(this);
    window.addEventListener('resize', this.onWindowResize);
  }

  initPostProcessing() {
    const w = window.innerWidth;
    const h = window.innerHeight;

    this.composer = new EffectComposer(this.renderer);
    
    // 渲染主通道
    const renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(renderPass);

    // Unreal 泛光通道：为激光、等离子尾焰与霓虹线条赋予次世代辉光
    this.bloomPass = new UnrealBloomPass(
      new THREE.Vector2(w, h),
      1.35, // 泛光强度 (Bloom Strength)
      0.45, // 泛光半径 (Bloom Radius)
      0.22  // 发光阈值 (Threshold: 发光材质自发光生效)
    );
    this.composer.addPass(this.bloomPass);

    // 最终色调映射输出通道
    const outputPass = new OutputPass();
    this.composer.addPass(outputPass);
  }

  onWindowResize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.composer.setSize(w, h);
    this.bloomPass.resolution.set(w, h);
  }

  render() {
    this.composer.render();
  }

  destroy() {
    window.removeEventListener('resize', this.onWindowResize);
    if (this.renderer.domElement && this.renderer.domElement.parentNode) {
      this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
    }
    this.renderer.dispose();
  }
}
