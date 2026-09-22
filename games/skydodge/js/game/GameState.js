// ═══════════════════════════════════════════
// 游戏状态管理机 (GameState)
// ═══════════════════════════════════════════

export class GameState {
  constructor() {
    this.state = 'start'; // 'start' | 'playing' | 'paused' | 'gameover'
    
    // 基础飞行数值
    this.baseSpeed = 36;
    this.currentSpeed = this.baseSpeed;
    this.boostSpeedBonus = 28;
    this.maxBaseSpeed = 85;
    this.distance = 0;
    this.level = 1;

    // 得分与纪录
    this.score = 0;
    this.highScore = parseInt(localStorage.getItem('skydodge_highscore') || '0', 10);

    // 连击机制
    this.combo = 1;
    this.maxCombo = 1;
    this.comboTimer = 0;
    this.comboDuration = 3.2; // 维持连击的有效窗口 (秒)

    // 脉冲能量
    this.boostEnergy = 100; // 0 ~ 100
    this.isBoosting = false;
    this.boostCostPerSec = 40;
    this.boostRechargePerSec = 15;

    // 护盾
    this.hasShield = false;

    // 独立量子晶币经济 (击毁陨石爆出、空间拾取，用于释放局内即时战术大招)
    this.crystals = 0;
    this.totalCrystalsCollected = 0;

    // 战术火力过载状态 (三叉散射等离子重炮)
    this.overdriveTimer = 0;
    this.overdriveDuration = 10.0;

    // 统计数据
    this.itemsCollected = 0;
    this.obstaclesDodged = 0;
  }

  reset() {
    this.state = 'playing';
    this.currentSpeed = this.baseSpeed;
    this.distance = 0;
    this.level = 1;
    this.score = 0;
    this.combo = 1;
    this.maxCombo = 1;
    this.comboTimer = 0;
    this.boostEnergy = 100;
    this.isBoosting = false;
    this.hasShield = false;
    this.crystals = 0;
    this.totalCrystalsCollected = 0;
    this.overdriveTimer = 0;
    this.itemsCollected = 0;
    this.obstaclesDodged = 0;
  }

  addCrystals(amount) {
    this.crystals += amount;
    this.totalCrystalsCollected += amount;
    return this.crystals;
  }

  spendCrystals(amount) {
    if (this.crystals >= amount) {
      this.crystals -= amount;
      return true;
    }
    return false;
  }

  isOverdriveActive() {
    return this.overdriveTimer > 0;
  }

  update(delta) {
    if (this.state !== 'playing') return;

    // 火力过载倒计时
    if (this.overdriveTimer > 0) {
      this.overdriveTimer = Math.max(0, this.overdriveTimer - delta);
    }

    // 1. 距离积累
    const moveDist = this.currentSpeed * delta;
    this.distance += moveDist;

    // 2. 难度与关卡平滑上升 (每 180 米升 1 级)
    this.level = 1 + Math.floor(this.distance / 180);
    const speedTarget = Math.min(this.baseSpeed + (this.level - 1) * 3.5, this.maxBaseSpeed);

    // 3. 脉冲冲刺能耗与恢复
    if (this.isBoosting && this.boostEnergy > 0) {
      this.boostEnergy = Math.max(0, this.boostEnergy - this.boostCostPerSec * delta);
      this.currentSpeed = speedTarget + this.boostSpeedBonus;
      if (this.boostEnergy <= 0) {
        this.isBoosting = false;
      }
    } else {
      this.isBoosting = false;
      this.boostEnergy = Math.min(100, this.boostEnergy + this.boostRechargePerSec * delta);
      this.currentSpeed = speedTarget;
    }

    // 4. 自然飞行得分 (速度越高，加分越快；浮点累加避免小步进丢分)
    const basePtsRate = this.isBoosting ? 30 : 15;
    this.scoreAccumulator = (this.scoreAccumulator || 0) + basePtsRate * this.combo * delta;
    if (this.scoreAccumulator >= 1) {
      const whole = Math.floor(this.scoreAccumulator);
      this.score += whole;
      this.scoreAccumulator -= whole;
    }

    // 5. 连击计时器衰减
    if (this.combo > 1) {
      this.comboTimer -= delta;
      if (this.comboTimer <= 0) {
        this.combo = 1;
      }
    }
  }

  setBoosting(boosting) {
    if (this.state !== 'playing') return;
    if (boosting && this.boostEnergy > 15) {
      this.isBoosting = true;
    } else if (!boosting) {
      this.isBoosting = false;
    }
  }

  addScore(points, reason = '') {
    const earned = points * this.combo;
    this.score += earned;
    if (this.score > this.highScore) {
      this.highScore = this.score;
      localStorage.setItem('skydodge_highscore', this.highScore.toString());
    }
    return { earned, combo: this.combo, reason };
  }

  increaseCombo() {
    this.combo = Math.min(this.combo + 1, 9);
    if (this.combo > this.maxCombo) {
      this.maxCombo = this.combo;
    }
    this.comboTimer = this.comboDuration;
    return this.combo;
  }

  activateShield() {
    this.hasShield = true;
  }

  breakShield() {
    this.hasShield = false;
  }

  setGameOver() {
    this.state = 'gameover';
    this.isBoosting = false;
    if (this.score > this.highScore) {
      this.highScore = this.score;
      localStorage.setItem('skydodge_highscore', this.highScore.toString());
    }
  }
}
