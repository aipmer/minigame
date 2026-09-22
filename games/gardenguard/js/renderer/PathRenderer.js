import * as THREE from 'three';

/**
 * 《花园守卫》暖沙鹅卵石碎石步道渲染器
 * 告别生硬水泥方块，采用动森式鹅卵石拼砌花径，带泥沙垫层与立体石块层次
 */
export class PathRenderer {
  constructor(scene, gridSize = 4, cellSize = 1.5) {
    this.scene = scene;
    this.gridSize = gridSize;
    this.cellSize = cellSize;
    this.pathGroup = new THREE.Group();
    this.scene.add(this.pathGroup);
    
    this.waypoints = [];
    this.pathLength = 0;
    this.segments = [];
  }
  
  createPath() {
    // U形路径设计：格子外围，距离格子边缘约 1.5 单位
    const offset = 1.5;
    const halfGrid = (this.gridSize * this.cellSize) / 2;
    const pRight = halfGrid + offset;
    const pLeft = -(halfGrid + offset);
    const pBottom = halfGrid + offset;
    
    // 定义关键路径点
    this.waypoints = [
      new THREE.Vector3(pRight, 0.05, -pBottom),    // 0: 右上入口
      new THREE.Vector3(pRight, 0.05, pBottom),     // 1: 右下拐角
      new THREE.Vector3(pLeft, 0.05, pBottom),      // 2: 左下拐角
      new THREE.Vector3(pLeft, 0.05, 0)             // 3: 左中（花园核心处）
    ];
    
    const pathWidth = 1.15;
    this.pathLength = 0;
    this.segments = [];

    // 1. 暖沙泥土垫层材质
    const baseBedMaterial = new THREE.MeshLambertMaterial({ color: 0xD7CCC8 }); // 暖赭石米砂土
    
    // 2. 鹅卵石石板材质库（米白、浅焦糖、暖灰三种自然粘土色）
    const stoneMats = [
      new THREE.MeshLambertMaterial({ color: 0xFFF8E7 }), // 米白石
      new THREE.MeshLambertMaterial({ color: 0xE0D7C6 }), // 暖砂灰
      new THREE.MeshLambertMaterial({ color: 0xC7B299 })  // 浅焦糖卵石
    ];

    for (let i = 0; i < this.waypoints.length - 1; i++) {
      const p1 = this.waypoints[i];
      const p2 = this.waypoints[i + 1];
      const dir = new THREE.Vector3().subVectors(p2, p1);
      const dist = dir.length();
      
      this.segments.push({
        p1, p2, dir: dir.clone().normalize(), dist, startDist: this.pathLength
      });
      this.pathLength += dist;
      
      // 2.1 泥沙垫层基底 (柔和薄层，防 z-fighting)
      const bedGeom = new THREE.BoxGeometry(pathWidth, 0.06, dist + pathWidth * 0.2);
      const bedMesh = new THREE.Mesh(bedGeom, baseBedMaterial);
      bedMesh.position.copy(p1).add(p2).multiplyScalar(0.5);
      bedMesh.position.y = 0.04;
      bedMesh.lookAt(new THREE.Vector3(p2.x, 0.04, p2.z));
      this.pathGroup.add(bedMesh);

      // 2.2 沿线密铺圆润粘土鹅卵石拼砌板
      const numStones = Math.floor(dist / 0.55);
      const stepVec = dir.clone().divideScalar(numStones);
      const normalVec = new THREE.Vector3(-dir.z, 0, dir.x).normalize();

      for (let s = 0; s <= numStones; s++) {
        const center = p1.clone().add(stepVec.clone().multiplyScalar(s));
        
        // 并在步道宽度上散布 2~3 块微型圆润鹅卵石
        const offsets = [-0.32, 0.05, 0.32];
        offsets.forEach((lateralOffset, stoneIdx) => {
          const stoneX = center.x + normalVec.x * lateralOffset + (Math.sin(s + stoneIdx) * 0.08);
          const stoneZ = center.z + normalVec.z * lateralOffset + (Math.cos(s * 2 + stoneIdx) * 0.08);
          
          const stoneGeom = new THREE.CylinderGeometry(
            0.18 + Math.abs(Math.sin(s + stoneIdx)) * 0.06,
            0.22 + Math.abs(Math.cos(s)) * 0.05,
            0.05,
            12
          );
          const stoneMesh = new THREE.Mesh(stoneGeom, stoneMats[(s + stoneIdx) % stoneMats.length]);
          stoneMesh.position.set(stoneX, 0.075, stoneZ);
          stoneMesh.rotation.y = Math.sin(s) * Math.PI;
          stoneMesh.scale.set(1.1, 1.0, 0.85); // 微椭圆
          this.pathGroup.add(stoneMesh);
        });
      }
    }
  }
  
  getWaypoints() {
    return this.waypoints;
  }
  
  getPathLength() {
    return this.pathLength;
  }
  
  getPositionOnPath(progress) {
    const targetDist = progress * this.pathLength;
    if (targetDist <= 0) return this.waypoints[0].clone();
    if (targetDist >= this.pathLength) return this.waypoints[this.waypoints.length - 1].clone();
    
    for (const seg of this.segments) {
      if (targetDist >= seg.startDist && targetDist <= seg.startDist + seg.dist) {
        const localDist = targetDist - seg.startDist;
        return seg.p1.clone().add(seg.dir.clone().multiplyScalar(localDist));
      }
    }
    return this.waypoints[0].clone();
  }
}
