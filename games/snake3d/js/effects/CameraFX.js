export class CameraFX {
  constructor(camera) {
    this.camera = camera;
    this.baseFOV = 56;
    this.targetFOV = this.baseFOV;
    this.fovSpeed = 0;
    
    this.shakeDuration = 0;
    this.shakeMagnitude = 0;
    this.shakeTimer = 0;
    
    this.punchDuration = 0;
    this.punchTarget = 0;
    this.punchTimer = 0;

    this.slowMoTimer = 0;
    this.slowMoScale = 1.0;
  }

  // 震动效果 (仅在粉碎碎石与游戏结束时提供短促微震反馈)
  shake(duration, magnitude) {
    this.shakeDuration = duration;
    this.shakeMagnitude = magnitude;
    this.shakeTimer = duration;
  }

  // 镜头冲击效果 (已禁用以杜绝突兀收缩)
  punch(targetFOV, duration) {
    // No-op: 保持视野开阔与视点稳定
  }

  // 动态视场角 (已禁用以保持舒展开阔视野)
  setDynamicFOV(targetFOV, speed) {
    // No-op: 保持视野恒定开阔
  }

  // 慢动作效果
  slowMotion(duration, scale) {
    this.slowMoTimer = duration;
    this.slowMoScale = scale;
    return scale;
  }

  // 更新效果
  update(delta) {
    let returnDelta = delta;

    if (this.slowMoTimer > 0) {
      this.slowMoTimer -= delta;
      returnDelta *= this.slowMoScale;
    }

    // Reset offsets
    this.camera.position.x -= this.lastShakeX || 0;
    this.camera.position.y -= this.lastShakeY || 0;
    this.lastShakeX = 0;
    this.lastShakeY = 0;

    // Apply shake
    if (this.shakeTimer > 0) {
      this.shakeTimer -= returnDelta;
      const progress = Math.max(0, this.shakeTimer / this.shakeDuration);
      const mag = this.shakeMagnitude * progress;
      
      this.lastShakeX = (Math.random() - 0.5) * 2 * mag;
      this.lastShakeY = (Math.random() - 0.5) * 2 * mag;
      
      this.camera.position.x += this.lastShakeX;
      this.camera.position.y += this.lastShakeY;
    }

    return returnDelta;
  }

  // 重置效果
  reset() {
    this.shakeTimer = 0;
    this.punchTimer = 0;
    this.slowMoTimer = 0;
    
    // Clean up lingering offsets
    if (this.lastShakeX || this.lastShakeY) {
      this.camera.position.x -= this.lastShakeX || 0;
      this.camera.position.y -= this.lastShakeY || 0;
      this.lastShakeX = 0;
      this.lastShakeY = 0;
    }
    
    this.camera.fov = this.baseFOV;
    this.camera.updateProjectionMatrix();
  }
}
