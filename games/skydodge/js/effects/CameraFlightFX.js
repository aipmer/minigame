// ═══════════════════════════════════════════
// 相机跟随与视场冲击特效 (CameraFlightFX)
// ═══════════════════════════════════════════
import * as THREE from 'three';

export class CameraFlightFX {
  constructor(camera) {
    this.camera = camera;
    this.baseFOV = 60;
    this.boostFOV = 74;
    this.currentFOV = this.baseFOV;

    // 相机相对于战机的偏移 (微俯视后上方，饱览战机立体装甲与双翼)
    this.offset = new THREE.Vector3(0, 3.2, 7.2);
    this.lookOffset = new THREE.Vector3(0, 0.2, -18);

    // 屏幕震动
    this.shakeDuration = 0;
    this.shakeIntensity = 0;
  }

  triggerShake(intensity = 0.5, duration = 0.4) {
    this.shakeIntensity = intensity;
    this.shakeDuration = duration;
  }

  update(delta, playerPos, isBoosting) {
    // 1. 动态 FOV 缩放 (脉冲加速时视野拉伸)
    const targetFOV = isBoosting ? this.boostFOV : this.baseFOV;
    const fovSmooth = 1 - Math.pow(0.001, delta);
    this.currentFOV += (targetFOV - this.currentFOV) * fovSmooth;
    this.camera.fov = this.currentFOV;
    this.camera.updateProjectionMatrix();

    // 2. 目标跟随位置 (带平滑延迟与侧倾微联动)
    const targetCamX = playerPos.x * 0.45;
    const targetCamY = playerPos.y * 0.35 + this.offset.y;
    const targetCamZ = playerPos.z + this.offset.z;

    const posSmooth = 1 - Math.pow(0.0008, delta);
    this.camera.position.x += (targetCamX - this.camera.position.x) * posSmooth;
    this.camera.position.y += (targetCamY - this.camera.position.y) * posSmooth;
    this.camera.position.z += (targetCamZ - this.camera.position.z) * posSmooth;

    // 3. 屏幕震动偏移
    if (this.shakeDuration > 0) {
      this.shakeDuration -= delta;
      const factor = Math.max(0, this.shakeDuration);
      this.camera.position.x += (Math.random() - 0.5) * this.shakeIntensity * factor;
      this.camera.position.y += (Math.random() - 0.5) * this.shakeIntensity * factor;
    }

    // 4. 朝向战机前方瞄准中心
    this.camera.lookAt(
      playerPos.x * 0.25,
      playerPos.y * 0.25 + this.lookOffset.y,
      playerPos.z + this.lookOffset.z
    );

    // 5. 战机大角度横滚时的动态镜头微倾斜
    this.camera.rotation.z = -playerPos.x * 0.015;
  }

  reset() {
    this.currentFOV = this.baseFOV;
    this.camera.fov = this.baseFOV;
    this.camera.updateProjectionMatrix();
    this.camera.position.set(0, 3.2, 7.2);
    this.shakeDuration = 0;
  }
}
