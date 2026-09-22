import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';

export class GardenCoreRenderer {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.scene.add(this.group);
    
    this.loader = new GLTFLoader();
    this.loader.setMeshoptDecoder(MeshoptDecoder);
    this.treeModel = null;
    this.animTime = 0;
    this.isDamaged = false;
  }
  
  create(position) {
    this.position = position;
    this.treeGroup = new THREE.Group();
    this.treeGroup.position.copy(position);
    this.group.add(this.treeGroup);

    // 1. 尝试载入真实手办粘土生命大树 GLB
    this.loader.load(
      'models/environment/guardian_tree.glb',
      (gltf) => {
        console.log('[GardenCoreRenderer] [成功] 真实手办粘土大树 GLB 载入成功！');
        const model = gltf.scene;

        // 归一化缩放与贴地对齐
        const box = new THREE.Box3().setFromObject(model);
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z) || 1.0;
        const targetHeight = 2.6;
        const scale = targetHeight / (size.y || maxDim);
        model.scale.setScalar(scale);

        box.setFromObject(model);
        model.position.y = -box.min.y;

        model.traverse(node => {
          if (node.isMesh) {
            node.castShadow = true;
            node.receiveShadow = true;
            if (node.material) {
              node.material.roughness = 0.75;
              node.material.metalness = 0.05;
            }
          }
        });

        this.treeGroup.clear();
        this.treeGroup.add(model);
        this.treeModel = model;
      },
      undefined,
      () => {
        // 降级兜底几何体
        this.createFallbackTree();
      }
    );
  }

  createFallbackTree() {
    this.treeGroup.clear();
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.35, 0.5, 1.4, 12),
      new THREE.MeshLambertMaterial({ color: 0x795548 })
    );
    trunk.position.y = 0.7;
    this.treeGroup.add(trunk);

    const leavesMat = new THREE.MeshLambertMaterial({ color: 0x4CAF50 });
    const crown1 = new THREE.Mesh(new THREE.SphereGeometry(1.0, 16, 16), leavesMat);
    crown1.position.set(0, 1.9, 0);
    this.treeGroup.add(crown1);

    const crown2 = new THREE.Mesh(new THREE.SphereGeometry(0.75, 16, 16), leavesMat);
    crown2.position.set(-0.5, 1.7, 0.3);
    this.treeGroup.add(crown2);

    const flowerBud = new THREE.Mesh(
      new THREE.SphereGeometry(0.3, 12, 12),
      new THREE.MeshLambertMaterial({ color: 0xFF4081 })
    );
    flowerBud.position.set(0, 2.8, 0);
    this.treeGroup.add(flowerBud);
  }
  
  updateHP(ratio) {
    // 受击树干与树冠根据剩余血量做细微色彩变化
    if (this.treeModel) {
      this.treeModel.traverse(node => {
        if (node.isMesh && node.material) {
          if (ratio < 0.35) {
            node.material.color?.setHex?.(0xFFA726); // 告警黄橙
          }
        }
      });
    }
  }
  
  playDamageAnimation() {
    this.isDamaged = true;
    this.animTime = 0.5; // 震颤0.5秒
  }
  
  update(dt) {
    if (this.isDamaged && this.treeGroup) {
      this.animTime -= dt;
      if (this.animTime <= 0) {
        this.isDamaged = false;
        this.treeGroup.rotation.z = 0;
      } else {
        this.treeGroup.rotation.z = Math.sin(this.animTime * 22) * 0.12;
      }
    }
  }
  
  reset() {
    if (this.treeGroup) {
      this.treeGroup.rotation.z = 0;
    }
    this.isDamaged = false;
  }
}
