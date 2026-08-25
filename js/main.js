import { GameState } from './core/GameState.js';
import { AudioManager } from './core/AudioManager.js';
import { StorageManager } from './core/StorageManager.js';
import { ScoreManager } from './core/ScoreManager.js';
import { WxShareManager } from './wx/WxShareManager.js';
import { WxAdManager } from './wx/WxAdManager.js';
import { WxRankManager } from './wx/WxRankManager.js';
import { HomeView } from './views/HomeView.js';
import { GameView } from './views/GameView.js';
import { ResultView } from './views/ResultView.js';
import { RankView } from './views/RankView.js';
import { EndlessResultView } from './views/EndlessResultView.js';

/**
 * 眼力大挑战365 - 主入口
 * 负责模块初始化、视图路由、全局事件
 */
class App {
  constructor() {
    // 核心模块
    this._gameState = new GameState();
    this._audioManager = new AudioManager();
    this._shareManager = new WxShareManager();
    this._adManager = new WxAdManager();
    this._rankManager = new WxRankManager();

    // 当前激活的视图名
    this._currentView = null;

    // 视图控制器（延迟初始化）
    this._views = {};

    // 上一个视图（用于排行榜返回）
    this._previousView = 'home';
  }

  /** 初始化应用 */
  async init() {
    // 初始化音效
    this._audioManager.init();

    // 初始化微信能力
    this._shareManager.init();
    this._adManager.init('placeholder-ad-unit-id');

    // 初始化视图
    this._initViews();

    // 首次交互激活 AudioContext
    document.addEventListener('click', () => {
      this._audioManager.init();
    }, { once: true });

    // 显示首页
    this._navigateTo('home');

    // 调试接口：暴露关键状态与操作，供 Playwright 自动化测试直接驱动流程，
    // 不需要等待动画/计时器真实流逝（事件驱动游戏，用 answer()/skipTimer() 替代
    // Canvas 版规范里的 advance(sec) 快进）
    const app = this;
    window.__game = {
      get state() { return app._gameState.state; },
      get view() { return app._currentView; },
      get score() { return app._gameState.score; },
      get combo() { return app._gameState.combo; },
      get powerupPoints() { return app._gameState.powerupPoints; },
      get pendingDoubleScore() { return app._gameState.pendingDoubleScore; },
      get question() { return app._views.game._currentQuestion; },
      get dailySeed() { return app._gameState.dailySeed; },
      get levelCurve() { return app._gameState.levelCurve; },
      start: (mode) => app._startGame(mode),
      /**
       * 模拟点击第 index 个格子（0-based），复用真实的点击处理逻辑。
       * 返回处理完成的 Promise，方便测试脚本 await 之后再断言下一步状态。
       */
      answer: (index) => {
        const cellEl = document.querySelector(`#grid-container [data-index="${index}"]`);
        return cellEl ? app._views.game._onCellClick(index, cellEl) : Promise.resolve();
      },
      /** 立即让当前倒计时归零并触发超时分支，跳过等待 */
      skipTimer: () => app._views.game._timerController.forceExpire(),
      usePowerup: (id) => app._views.game._usePowerup(id),
      quit: () => app._navigateTo('home'),
    };

    console.log('🎯 眼力大挑战365 初始化完成');
  }

  /** 初始化所有视图 */
  _initViews() {
    this._views.home = new HomeView({
      onStartGame: (mode) => this._startGame(mode),
      onShowRank: () => {
        this._previousView = 'home';
        this._navigateTo('rank');
      },
      onToggleSound: () => {
        const enabled = this._audioManager.isEnabled();
        this._audioManager.setEnabled(!enabled);
        if (!enabled) this._audioManager.playClick();
      },
      getSoundEnabled: () => this._audioManager.isEnabled()
    });

    this._views.game = new GameView({
      gameState: this._gameState,
      audioManager: this._audioManager,
      adManager: this._adManager,
      onGameEnd: (gameState) => this._onGameEnd(gameState),
      onQuit: () => this._navigateTo('home')
    });

    this._views.result = new ResultView({
      onReplay: (mode) => this._startGame(mode || 'classic'),
      onShowRank: () => {
        this._previousView = 'result';
        this._navigateTo('rank');
      },
      onShare: (result) => this._shareResult(result),
      onHome: () => this._navigateTo('home'),
      audioManager: this._audioManager
    });

    this._views.endlessResult = new EndlessResultView({
      onReplay: () => this._startGame('endless'),
      onShare: (result) => this._shareResult(result),
      onHome: () => this._navigateTo('home'),
      audioManager: this._audioManager
    });

    this._views.rank = new RankView({
      onBack: () => this._navigateTo(this._previousView)
    });
  }

  /**
   * 视图导航
   * @param {string} viewName - 目标视图名
   * @param {*} [payload] - 传给目标视图 show() 的参数（结算页需要 gameState）
   */
  _navigateTo(viewName, payload) {
    // 隐藏当前视图
    if (this._currentView && this._views[this._currentView]) {
      this._views[this._currentView].hide();
    }

    // 显示目标视图
    this._currentView = viewName;
    if (this._views[viewName]) {
      this._views[viewName].show(payload);
    }
  }

  /** 开始游戏 */
  _startGame(mode = 'classic') {
    this._navigateTo('game', mode);
  }

  /** 游戏结束 */
  _onGameEnd(gameState) {
    if (gameState.gameMode === 'classic' || gameState.gameMode === 'daily') {
      // 经典/每日模式：提交分数到排行榜
      const finalScore = gameState.score;
      this._rankManager.submitScore({
        score: Math.round(Math.min(100, Math.max(0, finalScore))),
        timeUsed: gameState.getTimeUsed(),
        accuracy: gameState.getAccuracy(),
        grade: '',
        title: ''
      });

      // 每日挑战：额外按日期记录当天最佳成绩
      if (gameState.gameMode === 'daily' && gameState.dailySeed) {
        const finalGrade = ScoreManager.getGrade(ScoreManager.calculateFinalScore(gameState));
        StorageManager.setDailyRecord(gameState.dailySeed, {
          score: Math.round(finalScore),
          grade: finalGrade.grade,
          title: finalGrade.title
        });
      }

      // 切换并显示结算页
      this._navigateTo('result', gameState);
    } else {
      // 无尽模式：提交分数到无尽排行榜（若未来支持），目前存入本地
      const finalScore = gameState.score;
      this._rankManager.submitScore({
        score: Math.round(finalScore),
        timeUsed: gameState.correctCount,
        accuracy: 100,
        grade: 'Endless',
        title: ''
      });

      // 切换并显示无尽结算页
      this._navigateTo('endlessResult', gameState);
    }
  }

  /** 分享结果 */
  _shareResult(result) {
    if (result) {
      this._shareManager.shareResult(result);
    }
  }
}

// ===== 启动应用 =====
document.addEventListener('DOMContentLoaded', () => {
  const app = new App();
  app.init();
});
