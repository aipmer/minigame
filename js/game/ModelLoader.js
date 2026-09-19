// ═══════════════════════════════════════════
// 3D 资产加载器 (支持 Tripo3D GLB 模型预载与优雅降级)
// ═══════════════════════════════════════════
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';

export class ModelLoader {
  constructor() {
    this.loader = new GLTFLoader();
    this.loader.setMeshoptDecoder(MeshoptDecoder);
    this.models = new Map();
    this.modelConfigs = {
      head: { path: 'models/snake_head.glb', targetSize: 1.0 },
      body: { path: 'models/snake_body.glb', targetSize: 0.9 },
      food_ruby: { path: 'models/food_ruby.glb', targetSize: 0.8 },
      food_star: { path: 'models/food_star.glb', targetSize: 0.9 },
      obstacle: { path: 'models/obstacle.glb', targetSize: 1.1 },
    };
  }

  // 加载全部模型，失败自动降级
  async loadAll() {
    const promises = Object.entries(this.modelConfigs).map(async ([key, config]) => {
      try {
        const gltf = await this._loadGLTF(config.path);
        const normalized = this._normalizeModel(gltf.scene, config.targetSize);
        this.models.set(key, normalized);
        console.log(`[ModelLoader] 成功加载模型: ${key} (${config.path})`);
      } catch (e) {
        // 404 或未生成模型时正常跳过，进入程序化几何体降级
        console.info(`[ModelLoader] 模型 ${key} 未找到或加载跳过，使用程序化几何体。`);
      }
    });

    await Promise.all(promises);
  }

  _loadGLTF(url) {
    return new Promise((resolve, reject) => {
      this.loader.load(
        url,
        (gltf) => resolve(gltf),
        undefined,
        (err) => reject(err)
      );
    });
  }

  // 归一化模型尺寸与中心点，并开启阴影投射
  _normalizeModel(sceneObj, targetSize) {
    const box = new THREE.Box3().setFromObject(sceneObj);
    const size = new THREE.Vector3();
    box.getSize(size);
    const maxDim = Math.max(size.x, size.y, size.z);

    if (maxDim > 0) {
      const scale = targetSize / maxDim;
      sceneObj.scale.set(scale, scale, scale);
    }

    // 重新居中
    const center = new THREE.Vector3();
    box.setFromObject(sceneObj);
    box.getCenter(center);
    sceneObj.position.sub(center);

    const wrapper = new THREE.Group();
    wrapper.add(sceneObj);

    // 阴影与材质微调
    wrapper.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    return wrapper;
  }

  has(key) {
    return this.models.has(key);
  }

  // 获取克隆实例
  clone(key) {
    const original = this.models.get(key);
    if (!original) return null;
    return original.clone(true);
  }
}
