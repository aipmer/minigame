import {
  TOTAL_TIME,
  WRONG_TIME_PENALTY,
  MAX_WRONG_PER_QUESTION,
  getEndlessLevelConfig,
  POWERUP_CONFIG,
  FREEZE_DURATION,
  HINT_ELIMINATE_COUNT,
} from '../core/LevelConfig.js';
import { QuestionGenerator } from '../core/QuestionGenerator.js';
import { ScoreManager } from '../core/ScoreManager.js';
import { StorageManager } from '../core/StorageManager.js';
import { createSeededRandom } from '../core/SeededRandom.js';
import { GridRenderer } from '../gameplay/GridRenderer.js';
import { TimerController } from '../gameplay/TimerController.js';
import { FeedbackManager } from '../gameplay/FeedbackManager.js';

/**
 * GameView - 游戏页视图控制器
 * 负责游戏主循环：出题、计时、点击判定、反馈、流转
 */
export class GameView {
  /**
   * @param {Object} deps - 依赖对象
   * @param {import('../core/GameState.js').GameState} deps.gameState
   * @param {import('../core/AudioManager.js').AudioManager} deps.audioManager
   * @param {Object} deps.adManager
   * @param {Function} deps.onGameEnd - 游戏结束回调，传入 gameState
   * @param {Function} deps.onQuit - 退出回调
   */
  constructor(deps) {
    this._gameState = deps.gameState;
    this._audioManager = deps.audioManager;
    this._adManager = deps.adManager;
    this._onGameEnd = deps.onGameEnd;
    this._onQuit = deps.onQuit;

    this._view = document.getElementById('game-view');
    this._questionGenerator = new QuestionGenerator();
    this._feedbackManager = new FeedbackManager(deps.audioManager);

    // DOM 元素
    this._questionCounter = document.getElementById('question-counter');
    this._timerDisplay = document.getElementById('timer-display');
    this._scoreDisplay = document.getElementById('score-display');
    this._gridContainer = document.getElementById('grid-container');

    // 渲染器
    this._gridRenderer = new GridRenderer(this._gridContainer);

    // 计时器
    this._timerController = new TimerController(
      this._timerDisplay,
      (remaining) => this._onTimerTick(remaining),
      () => this._onTimeUp()
    );

    // 当前题目数据
    this._currentQuestion = null;
    this._processing = false; // 防止重复点击
    this._isFeverMode = false; // 是否处于狂暴/Fever模式

    this._bindEvents();
  }

  /** 显示游戏页并开始游戏 */
  show(mode = 'classic') {
    this._view.classList.add('active');
    this._startGame(mode);
  }

  /** 隐藏游戏页 */
  hide() {
    this._view.classList.remove('active');
    this._timerController.stop();
  }

  /** 开始游戏 */
  _startGame(mode = 'classic') {
    this._gameState.startGame(mode);

    // 每日挑战模式：用当天种子生成的确定性 rng 驱动题目生成，
    // 保证同一天所有玩家不仅题型序列一致，每题的具体内容也完全一致
    this._questionGenerator = mode === 'daily' && this._gameState.dailySeed
      ? new QuestionGenerator(createSeededRandom(this._gameState.dailySeed))
      : new QuestionGenerator();

    this._processing = false;
    this._isFeverMode = false;
    this._view.classList.remove('fever-mode');
    this._view.classList.remove('shield-active');
    this._updateUI();

    if (mode === 'classic' || mode === 'daily') {
      this._timerController.start(TOTAL_TIME);
    } else {
      this._timerController.start(5); // 无尽模式每题限时 5.0 秒
    }

    this._loadQuestion();
  }

  /** 加载当前题目 */
  _loadQuestion() {
    const questionIndex = this._gameState.currentQuestion;

    let config;
    if (this._gameState.gameMode === 'classic' || this._gameState.gameMode === 'daily') {
      // 经典/每日模式限制 10 道题，题目序列来自预生成的 levelCurve
      if (questionIndex >= this._gameState.levelCurve.length) {
        this._endGame();
        return;
      }
      config = this._gameState.levelCurve[questionIndex];
    } else {
      // 无尽模式动态获取配置
      config = getEndlessLevelConfig(questionIndex);
    }

    this._currentQuestion = this._questionGenerator.generate(config);
    this._processing = false;

    // 无尽模式每题重新从 5 秒倒计时开始
    if (this._gameState.gameMode === 'endless') {
      this._timerController.start(5);
    }

    // 更新 UI
    this._updateUI();

    // 渲染网格
    this._gridRenderer.render(this._currentQuestion, (cellIndex, cellElement) => {
      this._onCellClick(cellIndex, cellElement);
    });

    // 记录题目开始时间
    this._gameState.questionStartTime = Date.now();
  }

  /** 格子点击处理 */
  async _onCellClick(cellIndex, cellElement) {
    if (this._processing || !this._gameState.isPlaying()) return;
    this._processing = true;

    this._audioManager.playClick();

    const isCorrect = cellIndex === this._currentQuestion.correctIndex;
    const isEndless = this._gameState.gameMode === 'endless';

    if (isCorrect) {
      // 计算答题时间
      const timeSpent = (Date.now() - this._gameState.questionStartTime) / 1000;
      const wrongTaps = this._gameState.wrongCountThisQuestion;

      // 计分
      const isFeverThisQuestion = this._isFeverMode || (this._gameState.combo >= 4);
      let questionScore = ScoreManager.calculateQuestionScore(timeSpent, wrongTaps, isFeverThisQuestion);

      if (isEndless) {
        // 无尽模式连击加成：每 5 连击乘数 +1
        const nextCombo = this._gameState.combo + 1;
        const multiplier = 1 + Math.floor(nextCombo / 5);
        questionScore = questionScore * multiplier;
      }

      // 双倍分道具：消费挂起标记，本题得分翻倍
      let usedDouble = false;
      if (this._gameState.pendingDoubleScore) {
        questionScore *= 2;
        this._gameState.pendingDoubleScore = false;
        usedDouble = true;
      }

      this._gameState.score += questionScore;

      // 记录作答 (写入得分)
      this._gameState.recordAnswer(true, timeSpent, wrongTaps, questionScore);

      // Fever Mode (狂暴/热血模式) 检查：连续答对 5 题及以上触发
      let scoreText = usedDouble ? `+${questionScore}✨` : `+${questionScore}`;
      if (this._gameState.combo >= 5) {
        if (!this._isFeverMode) {
          this._isFeverMode = true;
          this._view.classList.add('fever-mode');
        }
        // Fever 奖励：答对加 1 秒时间 (上限在 TimerController 内限制为 5秒)
        this._timerController.addTime(1);
        scoreText = `+${questionScore}⚡️`;
      }

      // 正确反馈
      this._gridRenderer.disable();
      await this._feedbackManager.onCorrectAnswer(this._gridRenderer, cellIndex, questionScore, this._gameState.combo);

      // 展示连击气泡
      const comboBanner = document.getElementById('combo-banner');
      this._feedbackManager.showComboStreak(comboBanner, this._gameState.combo);

      // 浮动分数
      const rect = cellElement.getBoundingClientRect();
      this._feedbackManager.createFloatingScore(this._gridContainer, scoreText, rect);

      // 更新分数显示
      this._updateUI();

      // 下一题
      this._gameState.nextQuestion();
      this._processing = false;
      this._loadQuestion();

    } else {
      // 错误处理
      const timeSpent = (Date.now() - this._gameState.questionStartTime) / 1000;

      if (isEndless) {
        // 无尽模式错误处理：扣血或碎盾，并加载下一题
        const hadShield = this._gameState.shieldActive;
        this._gameState.recordAnswer(false, timeSpent, 1);

        // 连击中断，退出 Fever Mode
        if (this._isFeverMode) {
          this._isFeverMode = false;
          this._view.classList.remove('fever-mode');
        }

        // 错误反馈音效与动效
        this._audioManager.playWrong();
        this._view.classList.add('shield-break-flash');
        setTimeout(() => {
          this._view.classList.remove('shield-break-flash');
        }, 500);

        // 触觉震动
        if (typeof wx !== 'undefined' && typeof wx.vibrateShort === 'function') {
          wx.vibrateShort({ type: hadShield ? 'medium' : 'heavy' });
        }

        this._gridRenderer.disable();
        await this._gridRenderer.showWrongFeedback(cellIndex);
        this._updateUI();

        if (this._gameState.lives <= 0) {
          this._endGame();
        } else {
          this._gameState.nextQuestion();
          this._processing = false;
          this._loadQuestion();
        }
      } else {
        // 经典模式错误处理：连击中断，退出 Fever Mode，扣 3 秒
        if (this._isFeverMode) {
          this._isFeverMode = false;
          this._view.classList.remove('fever-mode');
        }
        if (this._gameState.wrongCountThisQuestion < MAX_WRONG_PER_QUESTION) {
          this._gameState.wrongCountThisQuestion++;
          this._gameState.wrongCount++;
          this._gameState.combo = 0;
          this._gameState.score = Math.max(0, this._gameState.score - 3);
        }

        // 播放错误反馈并扣除 3 秒
        await this._feedbackManager.onWrongAnswer(this._gridRenderer, cellIndex, this._timerController);
        this._updateUI();
        this._processing = false;
      }
    }
  }

  /** 倒计时回调 */
  _onTimerTick(remaining) {
    this._gameState.timeRemaining = remaining;

    // 最后 5 秒警告音
    if (remaining <= 5 && remaining > 0) {
      this._feedbackManager.onCountdownWarning();
    }
  }

  /** 时间耗尽 */
  _onTimeUp() {
    this._gameState.timeRemaining = 0;

    // 高亮当前题正确答案
    if (this._currentQuestion) {
      this._gridRenderer.highlightCorrect(this._currentQuestion.correctIndex);
    }

    if (this._gameState.gameMode === 'endless') {
      // 无尽模式时间耗尽扣血或碎盾
      const hadShield = this._gameState.shieldActive;
      this._gameState.recordAnswer(false, 5.0, 0); // 超时计为 5.0 秒，错误点击 0

      // 连击中断，退出 Fever
      if (this._isFeverMode) {
        this._isFeverMode = false;
        this._view.classList.remove('fever-mode');
      }

      // 播放警报及红闪特效
      this._audioManager.playWrong();
      this._view.classList.add('shield-break-flash');
      setTimeout(() => {
        this._view.classList.remove('shield-break-flash');
      }, 500);

      this._updateUI();

      // 延迟 800ms 展示正确答案，然后切入下一题或结算
      setTimeout(() => {
        if (this._gameState.lives <= 0) {
          this._endGame();
        } else {
          this._gameState.nextQuestion();
          this._processing = false;
          this._loadQuestion();
        }
      }, 800);
      return;
    }

    // 经典模式原倒计时归零逻辑（支持看广告复活）
    setTimeout(() => {
      const bestScore = StorageManager.getBestScore();
      const finalScore = ScoreManager.calculateFinalScore(this._gameState);

      // 没复活过，且满足复活条件（首局或接近纪录 15 分内）
      if (this._gameState.revivedCount === 0 && (bestScore === 0 || finalScore > bestScore - 15)) {
        this._showReviveModal();
      } else {
        this._endGame();
      }
    }, 800);
  }

  /** 展示复活挽留弹窗 */
  _showReviveModal() {
    const overlay = document.getElementById('revive-overlay');
    if (!overlay) {
      this._endGame();
      return;
    }

    overlay.classList.remove('hidden');

    const btnRevive = document.getElementById('btn-revive-confirm');
    const btnSkip = document.getElementById('btn-revive-skip');
    if (!btnRevive || !btnSkip) {
      this._endGame();
      return;
    }

    // 重构按钮，清除可能存在的重复事件绑定
    const newBtnRevive = btnRevive.cloneNode(true);
    const newBtnSkip = btnSkip.cloneNode(true);
    btnRevive.parentNode.replaceChild(newBtnRevive, btnRevive);
    btnSkip.parentNode.replaceChild(newBtnSkip, btnSkip);

    newBtnRevive.addEventListener('click', async () => {
      newBtnRevive.disabled = true;
      newBtnSkip.disabled = true;

      // 播放微信激励广告 (Web 环境中会自动模拟播放)
      const success = await this._adManager.showRewardedAd();
      if (success) {
        overlay.classList.add('hidden');
        this._gameState.revive();
        this._timerController.start(10); // 增加 10 秒时间继续
        this._loadQuestion(); // 继续当前题的解答
      } else {
        overlay.classList.add('hidden');
        this._endGame();
      }
    });

    newBtnSkip.addEventListener('click', () => {
      overlay.classList.add('hidden');
      this._endGame();
    });
  }

  /** 结束游戏 */
  _endGame() {
    this._timerController.stop();
    this._gameState.finish();
    this._gridRenderer.disable();
    this._onGameEnd(this._gameState);
  }

  /** 更新界面数据 */
  _updateUI() {
    const isEndless = this._gameState.gameMode === 'endless';

    // 切换左右顶部状态栏
    const classicLeft = document.getElementById('classic-header-left');
    const endlessLeft = document.getElementById('endless-header-left');

    if (classicLeft && endlessLeft) {
      if (isEndless) {
        classicLeft.classList.add('hidden');
        endlessLeft.classList.remove('hidden');
      } else {
        classicLeft.classList.remove('hidden');
        endlessLeft.classList.add('hidden');
      }
    }

    // 更新无尽模式的生命值心形展示
    if (isEndless) {
      const livesDisplay = document.getElementById('lives-display');
      if (livesDisplay) {
        const hearts = [];
        const oldHeartsCount = livesDisplay.querySelectorAll('.heart-icon:not([style*="opacity"])').length;
        const currentLives = this._gameState.lives;

        for (let i = 0; i < 3; i++) {
          if (i < currentLives) {
            // 如果恢复了生命值，对恢复的心形添加 heal 特效
            const isNewHeart = oldHeartsCount > 0 && i >= oldHeartsCount;
            hearts.push(`<span class="heart-icon${isNewHeart ? ' heal' : ''}">💖</span>`);
          } else {
            hearts.push('<span class="heart-icon" style="opacity: 0.18; filter: grayscale(100%);">💖</span>');
          }
        }
        livesDisplay.innerHTML = hearts.join('');
      }

      // 更新 Fever 能量护盾视觉特效
      if (this._gameState.shieldActive) {
        this._view.classList.add('shield-active');
      } else {
        this._view.classList.remove('shield-active');
      }
    } else {
      if (this._questionCounter) {
        this._questionCounter.textContent = `第 ${this._gameState.currentQuestion + 1} / 10 题`;
      }
      this._view.classList.remove('shield-active');
    }

    if (this._scoreDisplay) {
      this._scoreDisplay.textContent = Math.round(this._gameState.score);
    }

    this._updatePowerupUI();
  }

  /** 更新道具栏的点数显示与按钮可用状态 */
  _updatePowerupUI() {
    const points = this._gameState.powerupPoints;
    const pointsEl = document.getElementById('powerup-points');
    if (pointsEl) pointsEl.textContent = `💡 ${points}`;

    POWERUP_CONFIG.forEach(({ id, cost }) => {
      const btn = document.getElementById(`btn-powerup-${id}`);
      if (!btn) return;
      const affordable = points >= cost;
      const usable = id !== 'double' || !this._gameState.pendingDoubleScore;
      btn.disabled = !affordable || !usable || !this._gameState.isPlaying();
    });
  }

  /**
   * 使用一个道具
   * @param {string} id - POWERUP_CONFIG 中的道具 id
   */
  _usePowerup(id) {
    if (!this._gameState.isPlaying() || this._processing) return;

    const config = POWERUP_CONFIG.find((p) => p.id === id);
    if (!config || this._gameState.powerupPoints < config.cost) return;

    this._gameState.powerupPoints -= config.cost;

    switch (id) {
      case 'hint':
        if (this._currentQuestion) {
          const count = Math.min(
            HINT_ELIMINATE_COUNT,
            this._currentQuestion.totalCells - 1
          );
          this._gridRenderer.eliminateWrongCells(this._currentQuestion.correctIndex, count);
        }
        break;
      case 'freeze':
        this._timerController.freeze(FREEZE_DURATION);
        break;
      case 'double':
        this._gameState.pendingDoubleScore = true;
        break;
      default:
        break;
    }

    this._audioManager.playClick();
    this._updatePowerupUI();
  }

  /** 绑定控制按钮事件 */
  _bindEvents() {
    // 暂停按钮
    const pauseBtn = document.getElementById('btn-pause');
    if (pauseBtn) {
      pauseBtn.addEventListener('click', () => this._togglePause());
    }

    // 重来按钮
    const restartBtn = document.getElementById('btn-restart');
    if (restartBtn) {
      restartBtn.addEventListener('click', () => {
        this._timerController.stop();
        this._gridRenderer.clear();
        this._startGame();
      });
    }

    // 退出按钮
    const quitBtn = document.getElementById('btn-quit');
    if (quitBtn) {
      quitBtn.addEventListener('click', () => {
        this._timerController.stop();
        this._onQuit();
      });
    }

    // 暂停恢复按钮
    const resumeBtn = document.getElementById('btn-resume');
    if (resumeBtn) {
      resumeBtn.addEventListener('click', () => this._togglePause());
    }

    // 道具按钮
    POWERUP_CONFIG.forEach(({ id }) => {
      const btn = document.getElementById(`btn-powerup-${id}`);
      if (btn) {
        btn.addEventListener('click', () => this._usePowerup(id));
      }
    });
  }

  /** 切换暂停 */
  _togglePause() {
    const overlay = document.getElementById('pause-overlay');

    if (this._gameState.isPlaying()) {
      this._gameState.pause();
      this._timerController.pause();
      this._gridRenderer.disable();
      if (overlay) overlay.classList.remove('hidden');
    } else if (this._gameState.isPaused()) {
      this._gameState.resume();
      this._timerController.resume();
      this._gridRenderer.enable();
      if (overlay) overlay.classList.add('hidden');
    }
  }
}
