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

  // 震动效果
  shake(duration, magnitude) {
    this.shakeDuration = duration;
    this.shakeMagnitude = magnitude;
    this.shakeTimer = duration;
  }

  // 镜头冲击效果
  punch(targetFOV, duration) {
    this.punchTarget = targetFOV;
    this.punchDuration = duration;
    this.punchTimer = duration;
  }

  // 动态视场角
  setDynamicFOV(targetFOV, speed) {
    this.targetFOV = targetFOV;
    this.fovSpeed = speed;
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
      this.slowMoTimer -= delta; // Using real delta for the timer
      returnDelta *= this.slowMoScale;
    }

    // Reset offsets
    this.camera.position.x -= this.lastShakeX || 0;
    this.camera.position.y -= this.lastShakeY || 0;
    this.lastShakeX = 0;
    this.lastShakeY = 0;

    // Apply shake
    if (this.shakeTimer > 0) {
      this.shakeTimer -= returnDelta; // Use game time for effects
      const progress = Math.max(0, this.shakeTimer / this.shakeDuration);
      const mag = this.shakeMagnitude * progress;
      
      this.lastShakeX = (Math.random() - 0.5) * 2 * mag;
      this.lastShakeY = (Math.random() - 0.5) * 2 * mag;
      
      this.camera.position.x += this.lastShakeX;
      this.camera.position.y += this.lastShakeY;
    }

    // Apply FOV (lerp + punch)
    let currentBaseFOV = this.camera.fov;
    if (this.fovSpeed > 0 && Math.abs(currentBaseFOV - this.targetFOV) > 0.1) {
      currentBaseFOV += (this.targetFOV - currentBaseFOV) * this.fovSpeed * returnDelta;
    } else {
      currentBaseFOV = this.targetFOV;
    }

    let fovOffset = 0;
    if (this.punchTimer > 0) {
      this.punchTimer -= returnDelta;
      const progress = 1 - Math.max(0, this.punchTimer / this.punchDuration);
      // Sine wave: 0 -> 1 -> 0
      const sine = Math.sin(progress * Math.PI);
      fovOffset = (this.punchTarget - this.baseFOV) * sine;
    }

    this.camera.fov = currentBaseFOV + fovOffset;
    this.camera.updateProjectionMatrix();

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
