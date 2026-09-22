import * as THREE from 'three';

export class VFXManager {
  constructor(scene) {
    this.scene = scene;
    this.effects = [];
    this.group = new THREE.Group();
    this.scene.add(this.group);
  }
  
  playMergeEffect(position, star) {
    const geom = new THREE.RingGeometry(0.1, 0.2, 16);
    const mat = new THREE.MeshBasicMaterial({ 
      color: 0x00FF00, 
      side: THREE.DoubleSide,
      transparent: true 
    });
    const mesh = new THREE.Mesh(geom, mat);
    mesh.position.copy(position);
    mesh.position.y += 0.6;
    mesh.rotation.x = -Math.PI / 2;
    
    this.group.add(mesh);
    this.effects.push({
      mesh, type: 'merge', life: 0.5, maxLife: 0.5
    });
  }
  
  playUltimateEffect(position, skillId) {
    // 全屏冲击波效果简化版
    const geom = new THREE.SphereGeometry(0.5, 16, 16);
    const mat = new THREE.MeshBasicMaterial({
      color: 0xFFD700,
      transparent: true,
      opacity: 0.8,
      wireframe: true
    });
    const mesh = new THREE.Mesh(geom, mat);
    mesh.position.copy(position);
    this.group.add(mesh);
    
    this.effects.push({
      mesh, type: 'ultimate', life: 1.0, maxLife: 1.0
    });
  }
  
  playKillEffect(position, color) {
    const geom = new THREE.BoxGeometry(0.2, 0.2, 0.2);
    const mat = new THREE.MeshBasicMaterial({ color });
    const mesh = new THREE.Mesh(geom, mat);
    mesh.position.copy(position);
    mesh.position.y += 0.5;
    
    this.group.add(mesh);
    this.effects.push({
      mesh, type: 'kill', life: 0.3, maxLife: 0.3
    });
  }
  
  playDamageFlash() {
    // 屏幕泛红等全局特效，可在这里挂接全屏plane
  }
  
  update(dt) {
    for (let i = this.effects.length - 1; i >= 0; i--) {
      const fx = this.effects[i];
      fx.life -= dt;
      
      if (fx.type === 'merge') {
        fx.mesh.scale.addScalar(dt * 5);
        fx.mesh.material.opacity = fx.life / fx.maxLife;
      } else if (fx.type === 'ultimate') {
        fx.mesh.scale.addScalar(dt * 15);
        fx.mesh.material.opacity = fx.life / fx.maxLife;
      } else if (fx.type === 'kill') {
        fx.mesh.scale.multiplyScalar(0.9);
        fx.mesh.rotation.y += dt * 10;
        fx.mesh.rotation.x += dt * 10;
      }
      
      if (fx.life <= 0) {
        this.group.remove(fx.mesh);
        fx.mesh.geometry.dispose();
        fx.mesh.material.dispose();
        this.effects.splice(i, 1);
      }
    }
  }
  
  clear() {
    this.effects.forEach(fx => {
      this.group.remove(fx.mesh);
      fx.mesh.geometry.dispose();
      fx.mesh.material.dispose();
    });
    this.effects = [];
  }
}
