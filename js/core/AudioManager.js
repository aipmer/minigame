/**
 * @fileoverview 眼力大挑战365 — 音频管理器
 *
 * 使用 Web Audio API 程序化生成所有游戏音效，无需加载任何音频文件。
 *
 * 支持的音效：
 * - click      短促点击
 * - correct    答对（升调二音）
 * - wrong      答错（低频蜂鸣）
 * - countdown  倒计时提示
 * - result     结算（三音琶音）
 * - newRecord  新纪录（四音号角）
 *
 * 通过 StorageManager 持久化音效开关状态。
 *
 * 纯逻辑模块，无 DOM 依赖（仅使用 Web Audio API）。
 * @module core/AudioManager
 */

import { StorageManager } from './StorageManager.js';

/**
 * 音频管理器
 *
 * @example
 * const audio = new AudioManager();
 * await audio.init();
 * audio.playCorrect();
 */
export class AudioManager {
  constructor() {
    /**
     * Web Audio API 上下文
     * @type {AudioContext|null}
     * @private
     */
    this._ctx = null;

    /**
     * 音效是否启用
     * @type {boolean}
     * @private
     */
    this._enabled = true;
  }

  // ─── 初始化 ───────────────────────────────────────────────

  /**
   * 初始化音频上下文
   *
   * - 延迟创建 AudioContext（首次调用时才创建）
   * - 恢复可能被浏览器自动挂起的上下文
   * - 从 StorageManager 读取音效开关状态
   *
   * @returns {Promise<void>}
   */
  async init() {
    try {
      if (!this._ctx) {
        // 兼容旧版 WebKit
        const AudioContextClass =
          typeof AudioContext !== 'undefined'
            ? AudioContext
            : typeof webkitAudioContext !== 'undefined'
              // eslint-disable-next-line no-undef
              ? webkitAudioContext
              : null;

        if (!AudioContextClass) {
          console.warn('[AudioManager] AudioContext not available');
          this._enabled = false;
          return;
        }

        this._ctx = new AudioContextClass();
      }

      // 恢复挂起状态
      if (this._ctx.state === 'suspended') {
        await this._ctx.resume();
      }

      // 读取用户偏好
      this._enabled = StorageManager.getSoundEnabled();
    } catch (err) {
      console.warn('[AudioManager] init failed:', err);
      this._enabled = false;
    }
  }

  // ─── 音效方法 ─────────────────────────────────────────────

  /**
   * 播放点击音效
   * 800Hz 正弦波，50ms，快速包络
   */
  playClick() {
    if (!this._canPlay()) return;
    const now = this._ctx.currentTime;
    this._playTone(800, 0.05, 'sine', now, 0.3);
  }

  /**
   * 播放答对音效
   * C5(523Hz) 80ms → G5(784Hz) 120ms 升调
   * 根据 combo 数，音频频率阶梯递增
   * @param {number} combo - 当前连击数
   */
  playCorrect(combo = 1) {
    if (!this._canPlay()) return;
    const now = this._ctx.currentTime;
    // 连击乘数：每连击一次音调增高 10% (最高 8 连击达 1.7 倍音高)
    const scaleFactor = Math.min(1.7, 1.0 + Math.max(0, combo - 1) * 0.1);
    this._playTone(523 * scaleFactor, 0.08, 'sine', now, 0.4);
    this._playTone(784 * scaleFactor, 0.12, 'sine', now + 0.08, 0.4);
  }

  /**
   * 播放答错音效
   * 200Hz 锯齿波，200ms，快速衰减
   */
  playWrong() {
    if (!this._canPlay()) return;
    const now = this._ctx.currentTime;
    this._playTone(200, 0.2, 'sawtooth', now, 0.3);
  }

  /**
   * 播放倒计时提示音
   * 1000Hz 正弦波，100ms
   */
  playCountdown() {
    if (!this._canPlay()) return;
    const now = this._ctx.currentTime;
    this._playTone(1000, 0.1, 'sine', now, 0.35);
  }

  /**
   * 播放结算音效
   * C5(523) → E5(659) → G5(784) 琶音，每音 100ms
   */
  playResult() {
    if (!this._canPlay()) return;
    const now = this._ctx.currentTime;
    this._playTone(523, 0.1, 'sine', now, 0.35);
    this._playTone(659, 0.1, 'sine', now + 0.1, 0.35);
    this._playTone(784, 0.1, 'sine', now + 0.2, 0.35);
  }

  /**
   * 播放新纪录音效
   * C5(523) → E5(659) → G5(784) → C6(1047) 号角，每音 80ms，
   * 最后一个音额外延长（sustain）
   */
  playNewRecord() {
    if (!this._canPlay()) return;
    const now = this._ctx.currentTime;
    this._playTone(523,  0.08, 'sine', now, 0.4);
    this._playTone(659,  0.08, 'sine', now + 0.08, 0.4);
    this._playTone(784,  0.08, 'sine', now + 0.16, 0.4);
    // 最后一个音 sustain 更长
    this._playTone(1047, 0.3,  'sine', now + 0.24, 0.45);
  }

  // ─── 开关控制 ─────────────────────────────────────────────

  /**
   * 设置音效启用状态，同时持久化到存储
   * @param {boolean} enabled
   */
  setEnabled(enabled) {
    this._enabled = !!enabled;
    StorageManager.setSoundEnabled(this._enabled);
  }

  /**
   * 获取当前音效启用状态
   * @returns {boolean}
   */
  isEnabled() {
    return this._enabled;
  }

  // ─── 私有方法 ─────────────────────────────────────────────

  /**
   * 检查是否可以播放音效
   * @returns {boolean}
   * @private
   */
  _canPlay() {
    return this._enabled && this._ctx !== null;
  }

  /**
   * 播放指定参数的音调
   *
   * 使用 OscillatorNode + GainNode 创建带包络的纯音。
   * 包络：快速 attack (5ms) → 正常 sustain → 衰减到 0。
   *
   * @param {number} freq      - 频率 (Hz)
   * @param {number} duration  - 持续时间 (秒)
   * @param {OscillatorType} type - 波形类型 ('sine' | 'sawtooth' | 'square' | 'triangle')
   * @param {number} startTime - AudioContext 时间轴上的起始时间
   * @param {number} gain      - 音量 (0–1)
   * @private
   */
  _playTone(freq, duration, type, startTime, gain) {
    try {
      const ctx = this._ctx;
      if (!ctx) return;

      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, startTime);

      // 包络
      const attackTime = 0.005;
      const decayStart = startTime + attackTime;
      const endTime = startTime + duration;

      gainNode.gain.setValueAtTime(0, startTime);
      gainNode.gain.linearRampToValueAtTime(gain, decayStart);
      gainNode.gain.setValueAtTime(gain, decayStart);
      gainNode.gain.exponentialRampToValueAtTime(0.001, endTime);

      // 连接
      osc.connect(gainNode);
      gainNode.connect(ctx.destination);

      // 调度
      osc.start(startTime);
      osc.stop(endTime);

      // 清理引用（非强制，但有助于 GC）
      osc.onended = () => {
        osc.disconnect();
        gainNode.disconnect();
      };
    } catch (err) {
      // 静默失败 — 音频问题不应影响游戏
      console.warn('[AudioManager] _playTone error:', err);
    }
  }
}
