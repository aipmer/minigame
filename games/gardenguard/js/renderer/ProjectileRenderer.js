import * as THREE from 'three';

export class ProjectileRenderer {
  constructor(scene) {
    this.scene = scene;
    this.pool = [];
    this.active = [];
    this.group = new THREE.Group();
    this.scene.add(this.group);
    
    this.baseGeometry = new THREE.SphereGeometry(0.15, 8, 8);
  }
  
  getProjectile() {
    if (this.pool.length > 0) {
      const p = this.pool.pop();
      p.mesh.visible = true;
      return p;
    }
    const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const mesh = new THREE.Mesh(this.baseGeometry, material);
    this.group.add(mesh);
    return { mesh, material };
  }
  
  fire(fromPos, toPos, type, color, speed, onHit) {
    const p = this.getProjectile();
    p.mesh.position.copy(fromPos);
    p.mesh.position.y += 0.5; // 从植物稍高处发射
    p.material.color.setHex(color);
    
    const target = toPos.clone();
    target.y += 0.4;
    
    const dir = new THREE.Vector3().subVectors(target, p.mesh.position);
    const dist = dir.length();
    
    this.active.push({
      ...p,
      pos: p.mesh.position.clone(),
      dir: dir.normalize(),
      speed,
      targetDist: dist,
      travelled: 0,
      onHit
    });
  }
  
  update(dt) {
    for (let i = this.active.length - 1; i >= 0; i--) {
      const p = this.active[i];
      const move = p.speed * dt;
      p.travelled += move;
      
      if (p.travelled >= p.targetDist) {
        // Hit
        if (p.onHit) p.onHit();
        p.mesh.visible = false;
        this.pool.push(p);
        this.active.splice(i, 1);
      } else {
        p.pos.add(p.dir.clone().multiplyScalar(move));
        p.mesh.position.copy(p.pos);
      }
    }
  }
  
  clear() {
    this.active.forEach(p => {
      p.mesh.visible = false;
      this.pool.push(p);
    });
    this.active = [];
  }
}
