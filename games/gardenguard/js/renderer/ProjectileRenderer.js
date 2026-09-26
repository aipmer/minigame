import * as THREE from 'three';

/**
 * 《花园守卫》动态立体子弹渲染器
 * 支持子弹飞行姿态实时随方向偏转、动态追踪移动怪物轨迹、以及高品质对象池回收
 */
export class ProjectileRenderer {
  constructor(scene) {
    this.scene = scene;
    this.pool = [];
    this.active = [];
    this.group = new THREE.Group();
    this.scene.add(this.group);
  }
  
  createProjectileMesh() {
    const bulletGroup = new THREE.Group();
    
    // 主弹头材质
    const material = new THREE.MeshBasicMaterial({ color: 0xffffff });

    // 1. 弹头前圆球
    const headGeom = new THREE.SphereGeometry(0.12, 10, 8);
    const headMesh = new THREE.Mesh(headGeom, material);
    headMesh.position.z = 0.1;
    bulletGroup.add(headMesh);

    // 2. 流线型梭形弹身（沿 +Z 轴拉伸）
    const bodyGeom = new THREE.CylinderGeometry(0.12, 0.06, 0.26, 10);
    bodyGeom.rotateX(Math.PI / 2);
    const bodyMesh = new THREE.Mesh(bodyGeom, material);
    bulletGroup.add(bodyMesh);

    // 3. 尾部微发光尾迹点
    const tailMat = new THREE.MeshBasicMaterial({ color: 0xFFFFFF, transparent: true, opacity: 0.65 });
    const tailGeom = new THREE.SphereGeometry(0.07, 8, 8);
    const tailMesh = new THREE.Mesh(tailGeom, tailMat);
    tailMesh.position.z = -0.15;
    bulletGroup.add(tailMesh);

    this.group.add(bulletGroup);
    return { mesh: bulletGroup, material, tailMat };
  }

  getProjectile() {
    if (this.pool.length > 0) {
      const p = this.pool.pop();
      p.mesh.visible = true;
      return p;
    }
    return this.createProjectileMesh();
  }
  
  /**
   * 发射子弹
   * @param {THREE.Vector3} fromPos 发射起始点（守卫炮口）
   * @param {Object|THREE.Vector3} targetOrEnemy 目标怪物实例（带 worldPos 与 alive）或目标世界坐标
   * @param {string} type 子弹类型
   * @param {number} color 颜色 Hex
   * @param {number} speed 飞行速度
   * @param {Function} onHit 命中回调
   */
  fire(fromPos, targetOrEnemy, type, color, speed, onHit) {
    const p = this.getProjectile();
    p.mesh.position.copy(fromPos);
    p.material.color.setHex(color);

    let targetEnemy = null;
    let targetPos;

    if (targetOrEnemy && targetOrEnemy.worldPos) {
      targetEnemy = targetOrEnemy;
      targetPos = targetEnemy.worldPos.clone();
      targetPos.y += 0.35;
    } else if (targetOrEnemy instanceof THREE.Vector3) {
      targetPos = targetOrEnemy.clone();
      targetPos.y += 0.35;
    } else {
      targetPos = fromPos.clone().add(new THREE.Vector3(0, 0, 5));
    }

    // 初始朝向计算
    const initDir = new THREE.Vector3().subVectors(targetPos, fromPos).normalize();
    p.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), initDir);

    this.active.push({
      ...p,
      targetEnemy,
      lastTargetPos: targetPos,
      dir: initDir,
      speed: speed || 9,
      travelled: 0,
      maxDistance: 30,
      onHit
    });
  }
  
  update(dt) {
    const forward = new THREE.Vector3(0, 0, 1);

    for (let i = this.active.length - 1; i >= 0; i--) {
      const p = this.active[i];
      const move = p.speed * dt;
      p.travelled += move;

      // 实时获取怪物当前运动位置，实现弹道动态追踪
      let currentTarget;
      if (p.targetEnemy && p.targetEnemy.alive && p.targetEnemy.worldPos) {
        currentTarget = p.targetEnemy.worldPos.clone();
        currentTarget.y += 0.35;
        p.lastTargetPos.copy(currentTarget);
      } else {
        currentTarget = p.lastTargetPos;
      }

      const toTarget = new THREE.Vector3().subVectors(currentTarget, p.mesh.position);
      const dist = toTarget.length();

      // 命中判定（距离小于单帧步长或极近）
      if (dist <= move || dist < 0.28) {
        p.mesh.position.copy(currentTarget);
        if (p.onHit) p.onHit();
        p.mesh.visible = false;
        this.pool.push(p);
        this.active.splice(i, 1);
        continue;
      }

      // 超出最大射程自我回收
      if (p.travelled >= p.maxDistance) {
        p.mesh.visible = false;
        this.pool.push(p);
        this.active.splice(i, 1);
        continue;
      }

      // 动态修正飞行方向与子弹自身朝向
      p.dir.copy(toTarget.normalize());
      p.mesh.position.addScaledVector(p.dir, move);
      p.mesh.quaternion.setFromUnitVectors(forward, p.dir);
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
