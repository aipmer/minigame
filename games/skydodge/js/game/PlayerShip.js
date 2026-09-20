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

    // 战机专属三点式电影级布光系统 (跟随战机姿态，精准照亮机身与机翼，不污染远景)
    // 1. 机背主视线高光 (Dorsal Key Light): 从后上方直射机背与主翼
    this.dorsalLight = new THREE.PointLight(0xffffff, 3.2, 10, 1.2);
    this.dorsalLight.position.set(0, 3.2, 2.2);
    this.mesh.add(this.dorsalLight);

    // 2. 侧前翼缘轮廓光 (Wing Rim Light): 冰蓝色侧前锐利边缘光，勾勒钛金双翼
    this.rimLight = new THREE.PointLight(0x38bdf8, 2.8, 8, 1.2);
    this.rimLight.position.set(-3.5, 1.2, -1.5);
    this.mesh.add(this.rimLight);

    // 3. 侧下方暖光补光 (Fill Kicker): 展现机械接缝与立体凹凸感
    this.fillLight = new THREE.PointLight(0xfde047, 1.8, 8, 1.2);
    this.fillLight.position.set(3.0, -1.8, 0.8);
    this.mesh.add(this.fillLight);

    // 4. 引擎动态光源 (柔和尾焰光晕)
    this.engineLight = new THREE.PointLight(0x00f2fe, 1.2, 6);
    this.engineLight.position.set(0, 0.1, 1.8);
    this.mesh.add(this.engineLight);

    // 装载战机外观
    this.loadShipModel();
  }

  loadShipModel() {
    // 保护光源与护盾，只替换几何外观
    const protectedNodes = [this.shieldMesh, this.engineLight, this.dorsalLight, this.rimLight, this.fillLight];
    for (let i = this.mesh.children.length - 1; i >= 0; i--) {
      const child = this.mesh.children[i];
      if (!protectedNodes.includes(child)) {
        this.mesh.remove(child);
      }
    }

    const shipVisual = this.modelLoader.getModel('spaceship');
    this.visual = shipVisual;
    this.mesh.add(shipVisual);

    // 确保把护盾和光源完整挂载
    protectedNodes.forEach(node => {
      if (node && !this.mesh.children.includes(node)) {
        this.mesh.add(node);
      }
    });
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
