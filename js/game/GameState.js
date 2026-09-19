export class GameState {
  constructor() {
    this.state = 'start'; // 'start', 'playing', 'gameover'
    this.score = 0;
    this.highScore = parseInt(localStorage.getItem('snakeHighScore')) || 0;
    this.level = 1;
    this.comboCount = 0;
    this.comboMultiplier = 1;
    this.comboTimer = 0;
    this.foodEatenSinceObstacle = 0;
  }

  // 游戏开始
  startGame() {
    this.reset();
    this.state = 'playing';
  }

  // 增加分数，处理连击和升级
  addScore(baseAmount, isSpecial = false) {
    this.comboCount++;
    this.comboTimer = 5; // 5 seconds combo window
    
    if (this.comboCount >= 5) {
      this.comboMultiplier = 5;
    } else if (this.comboCount >= 3) {
      this.comboMultiplier = 3;
    } else if (this.comboCount >= 2) {
      this.comboMultiplier = 2;
    } else {
      this.comboMultiplier = 1;
    }

    const finalAmount = baseAmount * this.comboMultiplier * (isSpecial ? 2 : 1);
    this.score += finalAmount;
    
    if (this.score > this.highScore) {
      this.highScore = this.score;
      localStorage.setItem('snakeHighScore', this.highScore.toString());
    }

    let leveledUp = false;
    if (this.score >= this.level * 100) {
      this.level++;
      leveledUp = true;
    }
    
    this.foodEatenSinceObstacle++;
    
    return { finalAmount, comboMultiplier: this.comboMultiplier, leveledUp };
  }

  // 触发游戏结束
  triggerGameOver(reason) {
    this.state = 'gameover';
  }

  // 状态更新
  update(delta) {
    if (this.comboTimer > 0) {
      this.comboTimer -= delta;
      if (this.comboTimer <= 0) {
        this.comboTimer = 0;
        this.comboCount = 0;
        this.comboMultiplier = 1;
      }
    }
  }

  // 是否应该生成障碍物
  shouldSpawnObstacle() {
    if (this.foodEatenSinceObstacle >= 5) {
      this.foodEatenSinceObstacle = 0;
      return true;
    }
    return false;
  }

  // 重置状态
  reset() {
    this.state = 'start';
    this.score = 0;
    this.level = 1;
    this.comboCount = 0;
    this.comboMultiplier = 1;
    this.comboTimer = 0;
    this.foodEatenSinceObstacle = 0;
  }
}
