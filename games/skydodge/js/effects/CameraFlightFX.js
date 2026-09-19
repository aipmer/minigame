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

    // 相机相对于战机的偏移 (稍抬高并后拉，俯瞰战机流线型机身)
    this.offset = new THREE.Vector3(0, 3.8, 9.2);
    this.lookOffset = new THREE.Vector3(0, 0.4, -24);

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

    // 2. 目标跟随位置 (带平滑延迟)
    const targetCamX = playerPos.x * 0.45;
    const targetCamY = playerPos.y * 0.45 + this.offset.y;
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

    // 4. 朝向战机前方略偏下的航道
    this.camera.lookAt(
      playerPos.x * 0.3,
      playerPos.y * 0.3 + this.lookOffset.y,
      playerPos.z + this.lookOffset.z
    );
  }

  reset() {
    this.currentFOV = this.baseFOV;
    this.camera.fov = this.baseFOV;
    this.camera.updateProjectionMatrix();
    this.camera.position.set(0, 3.5, 9);
    this.shakeDuration = 0;
  }
}
