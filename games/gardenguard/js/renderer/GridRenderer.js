import * as THREE from 'three';

/**
 * 《花园守卫》4×4 立体陶土花坛格子阵列渲染器
 * 告别死板绿色透明玻璃块，每个槽位均为独立的立体陶土花盆托座与泥土花坛
 */
export class GridRenderer {
  constructor(scene, gridSize = 4, cellSize = 1.5) {
    this.scene = scene;
    this.gridSize = gridSize;
    this.cellSize = cellSize;
    this.cells = [];
    this.cellRims = [];
    this.sprouts = [];
    this.group = new THREE.Group();
    this.scene.add(this.group);
    this.time = 0;
    
    // 材质体系升级为手办标准微粗糙材质（明朗温暖手办调色）
    this.materials = {
      potClay: new THREE.MeshStandardMaterial({ color: 0xF47B42, roughness: 0.6, metalness: 0.02 }),       // 明快暖阳陶土橙
      soilBase: new THREE.MeshStandardMaterial({ color: 0x543A2F, roughness: 0.85, metalness: 0.02 }),     // 丰饶暖润有机花土
      rimNormal: new THREE.MeshStandardMaterial({ color: 0xFFA076, roughness: 0.55, metalness: 0.02 }),    // 正常花坛边缘暖蜜桃橙
      rimHover: new THREE.MeshStandardMaterial({ color: 0xFFE082, emissive: 0x443300, roughness: 0.35 }),  // 悬浮高亮明亮金
      rimMerge: new THREE.MeshStandardMaterial({ color: 0x00E676, emissive: 0x004411, roughness: 0.35 }),  // 可合成绿色光晕
      rimInvalid: new THREE.MeshStandardMaterial({ color: 0xFF5252, emissive: 0x440000, roughness: 0.35 }),// 不可放置红色
      sproutMat: new THREE.MeshStandardMaterial({ color: 0x8CE63C, roughness: 0.4, metalness: 0.02 })     // 待种植嫩芽青绿（鲜嫩萌绿）
    };
  }
  
  createGrid() {
    const potOuterSize = this.cellSize * 0.88;
    const rimRadius = 0.08;

    // 幼苗几何体
    const sproutLeafGeom = new THREE.SphereGeometry(0.1, 8, 8);
    const sproutStemGeom = new THREE.CylinderGeometry(0.02, 0.03, 0.12, 6);

    for (let row = 0; row < this.gridSize; row++) {
      this.cells[row] = [];
      this.cellRims[row] = [];
      this.sprouts[row] = [];

      for (let col = 0; col < this.gridSize; col++) {
        const cellGroup = new THREE.Group();
        const pos = this.getSlotWorldPosition(row, col);
        cellGroup.position.set(pos.x, 0.04, pos.z);

        // 1. 陶土花盆底托（厚度 0.12，圆润倒角）
        const baseGeom = new THREE.CylinderGeometry(potOuterSize * 0.48, potOuterSize * 0.52, 0.12, 24);
        const baseMesh = new THREE.Mesh(baseGeom, this.materials.potClay);
        baseMesh.position.y = 0.06;
        baseMesh.castShadow = true;
        baseMesh.receiveShadow = true;
        cellGroup.add(baseMesh);

        // 2. 凹陷的湿润种植泥土层
        const soilGeom = new THREE.CylinderGeometry(potOuterSize * 0.44, potOuterSize * 0.44, 0.04, 24);
        const soilMesh = new THREE.Mesh(soilGeom, this.materials.soilBase);
        soilMesh.position.y = 0.13;
        soilMesh.receiveShadow = true;
        cellGroup.add(soilMesh);

        // 3. 花坛外沿装饰圆环（用于交互高亮：悬浮、合成提示）
        const rimGeom = new THREE.TorusGeometry(potOuterSize * 0.46, rimRadius, 8, 24);
        const rimMesh = new THREE.Mesh(rimGeom, this.materials.rimNormal);
        rimMesh.rotation.x = Math.PI / 2;
        rimMesh.position.y = 0.13;
        rimMesh.castShadow = true;
        rimMesh.receiveShadow = true;
        cellGroup.add(rimMesh);

        // 4. 空槽位萌系双叶幼苗指示器（待种植）
        const sproutGroup = new THREE.Group();
        sproutGroup.position.set(0, 0.15, 0);

        const stem = new THREE.Mesh(sproutStemGeom, this.materials.sproutMat);
        stem.position.y = 0.06;
        stem.castShadow = true;
        sproutGroup.add(stem);

        const leafL = new THREE.Mesh(sproutLeafGeom, this.materials.sproutMat);
        leafL.scale.set(1.4, 0.3, 0.8);
        leafL.position.set(-0.08, 0.12, 0);
        leafL.rotation.z = -0.4;
        leafL.castShadow = true;
        sproutGroup.add(leafL);

        const leafR = new THREE.Mesh(sproutLeafGeom, this.materials.sproutMat);
        leafR.scale.set(1.4, 0.3, 0.8);
        leafR.position.set(0.08, 0.12, 0);
        leafR.rotation.z = 0.4;
        leafR.castShadow = true;
        sproutGroup.add(leafR);

        cellGroup.add(sproutGroup);

        // 绑定数据
        cellGroup.userData = { row, col };
        this.cells[row][col] = cellGroup;
        this.cellRims[row][col] = rimMesh;
        this.sprouts[row][col] = sproutGroup;
        this.group.add(cellGroup);
      }
    }
  }
  
  highlightSlot(row, col, type) {
    this.clearHighlights();
    if (row >= 0 && row < this.gridSize && col >= 0 && col < this.gridSize) {
      const rimMesh = this.cellRims[row][col];
      const matKey = type === 'hover' ? 'rimHover' : (type === 'merge' ? 'rimMerge' : (type === 'invalid' ? 'rimInvalid' : 'rimNormal'));
      if (rimMesh) {
        rimMesh.material = this.materials[matKey];
        rimMesh.scale.set(1.08, 1.08, 1.08);
      }
    }
  }
  
  clearHighlights() {
    for (let row = 0; row < this.gridSize; row++) {
      for (let col = 0; col < this.gridSize; col++) {
        const rimMesh = this.cellRims[row][col];
        if (rimMesh) {
          rimMesh.material = this.materials.rimNormal;
          rimMesh.scale.set(1.0, 1.0, 1.0);
        }
      }
    }
  }
  
  getSlotWorldPosition(row, col) {
    const offset = (this.gridSize - 1) / 2;
    const x = (col - offset) * this.cellSize;
    const z = (row - offset) * this.cellSize;
    return new THREE.Vector3(x, 0.1, z);
  }
  
  getCellSize() { 
    return this.cellSize; 
  }

  setSlotOccupied(row, col, isOccupied) {
    if (this.sprouts[row] && this.sprouts[row][col]) {
      this.sprouts[row][col].visible = !isOccupied;
    }
  }

  update(dt) {
    this.time += dt;
    // 空槽位的幼苗微风呼吸
    for (let r = 0; r < this.gridSize; r++) {
      for (let c = 0; c < this.gridSize; c++) {
        const sprout = this.sprouts[r]?.[c];
        if (sprout && sprout.visible) {
          sprout.position.y = 0.15 + Math.sin(this.time * 2.5 + r + c) * 0.02;
          sprout.rotation.z = Math.sin(this.time * 2.0 + r * 0.5) * 0.08;
        }
      }
    }
  }
}
