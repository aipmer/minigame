// ═══════════════════════════════════════════
// 玩家战机物理运动与操控 (PlayerShip)
// ═══════════════════════════════════════════
import * as THREE from 'three';

export class PlayerShip {
  constructor(scene, modelLoader) {
    this.scene = scene;
    this.modelLoader = modelLoader;

    this.mesh = new THREE.Group();
    this.scene.add(this.mesh);

    // 边界与速度参数
    this.bounds = { minX: -11, maxX: 11, minY: -3.5, maxY: 7.5 };
    this.moveSpeed = 16;
    this.velocity = new THREE.Vector2(0, 0);
    this.targetVelocity = new THREE.Vector2(0, 0);

    // 姿态旋转参数 (平滑 Banking)
    this.maxRoll = 0.65; // 约 37 度
    this.maxPitch = 0.35; // 约 20 度
    this.currentRoll = 0;
    this.currentPitch = 0;

    // 碰撞包围球 (半径约 1.2)
    this.collider = new THREE.Sphere(new THREE.Vector3(), 1.15);

    // 护盾光罩
    this.shieldMesh = null;
    this.initShieldVisual();

    // 引擎动态光源 (柔和光晕，不遮挡机身细节)
    this.engineLight = new THREE.PointLight(0x00f2fe, 0.8, 8);
    this.engineLight.position.set(0, 0, -2.1);
    this.mesh.add(this.engineLight);

    // 装载战机外观
    this.loadShipModel();
  }

  loadShipModel() {
    // 移除旧机身 (如果有)
    while (this.mesh.children.length > 0) {
      const child = this.mesh.children[0];
      if (child === this.shieldMesh || child === this.engineLight) {
        break;
      }
      this.mesh.remove(child);
    }

    const shipVisual = this.modelLoader.getModel('spaceship');
    this.visual = shipVisual;
    this.mesh.add(shipVisual);

    // 确保把护盾和光源挂载回体系
    if (!this.mesh.children.includes(this.shieldMesh)) {
      this.mesh.add(this.shieldMesh);
    }
    if (!this.mesh.children.includes(this.engineLight)) {
      this.mesh.add(this.engineLight);
    }
  }

  initShieldVisual() {
    const shieldGeo = new THREE.SphereGeometry(1.8, 24, 20);
    const shieldMat = new THREE.MeshBasicMaterial({
      color: 0x00ffff,
      wireframe: true,
      transparent: true,
      opacity: 0.35,
      blending: THREE.AdditiveBlending,
    });
    this.shieldMesh = new THREE.Mesh(shieldGeo, shieldMat);
    this.shieldMesh.visible = false;
    this.mesh.add(this.shieldMesh);
  }

  reset() {
    this.mesh.position.set(0, 1.5, 0);
    this.mesh.rotation.set(0, 0, 0);
    this.velocity.set(0, 0);
    this.targetVelocity.set(0, 0);
    this.currentRoll = 0;
    this.currentPitch = 0;
    this.setShieldVisible(false);
  }

  setShieldVisible(visible) {
    if (this.shieldMesh) {
      this.shieldMesh.visible = visible;
    }
  }

  // 接收输入意图 (-1 ~ 1)
  setInput(moveX, moveY) {
    this.targetVelocity.x = moveX * this.moveSpeed;
    this.targetVelocity.y = moveY * this.moveSpeed;
  }

  update(delta, isBoosting, hasShield) {
    // 1. 速度阻尼平滑插值 (极速响应与阻尼手感)
    const lerpFactor = 1 - Math.pow(0.001, delta);
    this.velocity.x += (this.targetVelocity.x - this.velocity.x) * lerpFactor;
    this.velocity.y += (this.targetVelocity.y - this.velocity.y) * lerpFactor;

    // 2. 更新战机在 XY 平面位置
    this.mesh.position.x += this.velocity.x * delta;
    this.mesh.position.y += this.velocity.y * delta;

    // 限制在飞行走廊边界内
    this.mesh.position.x = THREE.MathUtils.clamp(this.mesh.position.x, this.bounds.minX, this.bounds.maxX);
    this.mesh.position.y = THREE.MathUtils.clamp(this.mesh.position.y, this.bounds.minY, this.bounds.maxY);

    // 3. 飞行侧倾与俯仰姿态解算 (Banking Roll & Pitch)
    const targetRoll = - (this.velocity.x / this.moveSpeed) * this.maxRoll;
    const targetPitch = (this.velocity.y / this.moveSpeed) * this.maxPitch;

    this.currentRoll += (targetRoll - this.currentRoll) * (delta * 10);
    this.currentPitch += (targetPitch - this.currentPitch) * (delta * 10);

    this.mesh.rotation.z = this.currentRoll;
    this.mesh.rotation.x = this.currentPitch;

    // 4. 更新碰撞球位置
    this.collider.center.copy(this.mesh.position);

    // 5. 护盾与冲刺引擎效果
    this.setShieldVisible(hasShield);
    if (hasShield && this.shieldMesh) {
      this.shieldMesh.rotation.y += delta * 1.5;
      this.shieldMesh.rotation.z += delta * 0.8;
    }

    if (isBoosting) {
      this.engineLight.intensity = 1.6;
      this.engineLight.color.setHex(0xffaa00);
    } else {
      this.engineLight.intensity = 0.8;
      this.engineLight.color.setHex(0x00f2fe);
    }
  }

  getPosition() {
    return this.mesh.position;
  }
}
