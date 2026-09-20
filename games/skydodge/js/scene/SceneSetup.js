// ═══════════════════════════════════════════
// 场景与渲染器基础配置 (移动端自适应分级管线 + 0.5x 降采样辉光)
// ═══════════════════════════════════════════
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

export class SceneSetup {
  constructor(container) {
    this.container = container;

    // 检测移动设备
    this.isMobile = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0) || (window.innerWidth <= 900);

    // 1. 场景与星空迷雾 (深邃蓝紫星云基底，降低雾浓度大幅提升能见度与深空层次)
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x090e24);
    this.scene.fog = new THREE.FogExp2(0x090e24, 0.0020);

    // 2. 摄像机 (针对高速飞行优化的 FOV 与透视)
    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      950
    );
    this.camera.position.set(0, 3.5, 9);

    // 3. WebGL 渲染器 (关闭 preserveDrawingBuffer 消除每帧拷贝，移动端限 DPR 1.5)
    const targetDPR = this.isMobile 
      ? Math.min(window.devicePixelRatio, 1.5) 
      : Math.min(window.devicePixelRatio, 2.0);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
      alpha: false,
      preserveDrawingBuffer: false,
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(targetDPR);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.38; // 均衡曝光度，明亮清晰，杜绝暗部死黑
    
    // 空间场景无地面投射，移动端关闭实时阴影以释放 30%+ 算力
    this.renderer.shadowMap.enabled = !this.isMobile;
    if (this.renderer.shadowMap.enabled) {
      this.renderer.shadowMap.type = THREE.PCFShadowMap;
    }

    this.container.appendChild(this.renderer.domElement);

    // 4. UnrealBloomPass 自适应辉光后处理链
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

    // 移动端采用 0.5x 降采样辉光分辨率（模糊运算提速 4 倍，且辉光更柔和细腻）
    const bloomScale = this.isMobile ? 0.5 : 1.0;
    const bloomStrength = this.isMobile ? 0.78 : 0.92;
    const bloomRadius = this.isMobile ? 0.28 : 0.36;
    const bloomThreshold = 0.58; // 动态阈值：让自发光晶核、激光和引擎产生绚丽泛光

    this.bloomPass = new UnrealBloomPass(
      new THREE.Vector2(Math.floor(w * bloomScale), Math.floor(h * bloomScale)),
      bloomStrength,
      bloomRadius,
      bloomThreshold
    );
    this.composer.addPass(this.bloomPass);

    // 最终色调映射输出通道
    const outputPass = new OutputPass();
    this.composer.addPass(outputPass);
  }

  onWindowResize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.isMobile = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0) || (w <= 900);

    const targetDPR = this.isMobile 
      ? Math.min(window.devicePixelRatio, 1.5) 
      : Math.min(window.devicePixelRatio, 2.0);

    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    this.renderer.setPixelRatio(targetDPR);
    this.composer.setSize(w, h);

    const bloomScale = this.isMobile ? 0.5 : 1.0;
    this.bloomPass.resolution.set(Math.floor(w * bloomScale), Math.floor(h * bloomScale));
    this.bloomPass.strength = this.isMobile ? 0.72 : 0.88;
    this.bloomPass.radius = this.isMobile ? 0.28 : 0.36;
    this.bloomPass.threshold = 0.65;
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
