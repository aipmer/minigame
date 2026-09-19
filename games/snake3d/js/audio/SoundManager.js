export class SoundManager {
  constructor() {
    this.ctx = null;
    this.bgmSource = null;
    this.bgmGain = null;
  }

  // 初始化音效系统
  init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  // 辅助函数：创建振荡器
  _createOscillator(freq, type, duration, volume, opts = {}) {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = type;
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
    
    if (opts.endFreq) {
      osc.frequency.exponentialRampToValueAtTime(opts.endFreq, this.ctx.currentTime + duration);
    }
    
    gain.gain.setValueAtTime(volume, this.ctx.currentTime);
    if (opts.decayType === 'linear') {
      gain.gain.linearRampToValueAtTime(0.01, this.ctx.currentTime + duration);
    } else if (opts.decayType === 'exponential') {
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);
    }

    if (opts.amFreq) {
      const amOsc = this.ctx.createOscillator();
      const amGain = this.ctx.createGain();
      amOsc.frequency.value = opts.amFreq;
      amOsc.connect(amGain.gain);
      amGain.gain.value = 0.5;
      gain.connect(amGain);
      amGain.connect(this.ctx.destination);
      amOsc.start(this.ctx.currentTime);
      amOsc.stop(this.ctx.currentTime + duration);
    } else {
      gain.connect(this.ctx.destination);
    }

    osc.connect(gain);
    osc.start(this.ctx.currentTime);
    osc.stop(this.ctx.currentTime + duration);
  }

  // 播放吃食物音效
  playEat() {
    if (!this.ctx) return;
    this._createOscillator(523, 'sine', 0.11, 0.3); // C5
    setTimeout(() => {
      this._createOscillator(784, 'sine', 0.11, 0.3, { decayType: 'exponential' }); // G5
    }, 110);
  }

  // 播放连击吃食物音效
  playEatCombo(level) {
    if (!this.ctx) return;
    let multiplier = 1;
    if (level === 2) multiplier = 1.1225;
    else if (level >= 3) multiplier = 1.2599;
    
    this._createOscillator(523 * multiplier, 'sine', 0.11, 0.3);
    setTimeout(() => {
      this._createOscillator(784 * multiplier, 'sine', 0.11, 0.3, { decayType: 'exponential' });
    }, 110);
  }

  // 播放转向音效
  playTurn() {
    this._createOscillator(140, 'triangle', 0.035, 0.1, { decayType: 'linear' });
  }

  // 播放游戏结束音效
  playGameOver() {
    this._createOscillator(440, 'sawtooth', 0.45, 0.2, { endFreq: 70, decayType: 'exponential' });
  }

  // 播放升级音效
  playLevelUp() {
    if (!this.ctx) return;
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5 E5 G5 C6
    notes.forEach((freq, i) => {
      setTimeout(() => {
        this._createOscillator(freq, 'triangle', 0.08, 0.2, { decayType: 'linear' });
      }, i * 80);
    });
  }

  // 播放无敌状态音效
  playInvincible() {
    this._createOscillator(880, 'sine', 0.5, 0.2, { amFreq: 15, decayType: 'linear' });
  }

  // 播放警告音效
  playWarningBeep() {
    this._createOscillator(440, 'square', 0.1, 0.1, { decayType: 'exponential' });
  }

  // 播放背景音乐
  startBGM() {
    if (!this.ctx) return;
    if (this.bgmSource) this.stopBGM();

    const sampleRate = this.ctx.sampleRate;
    const length = sampleRate * 2; // 2 seconds loop
    const buffer = this.ctx.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      const tremolo = 0.5 + 0.5 * Math.sin(2 * Math.PI * 4 * t);
      data[i] = (Math.sin(2 * Math.PI * 110 * t) + 
                 Math.sin(2 * Math.PI * 165 * t) + 
                 Math.sin(2 * Math.PI * 220 * t)) / 3 * tremolo;
    }

    this.bgmSource = this.ctx.createBufferSource();
    this.bgmSource.buffer = buffer;
    this.bgmSource.loop = true;

    this.bgmGain = this.ctx.createGain();
    this.bgmGain.gain.value = 0.12;

    this.bgmSource.connect(this.bgmGain);
    this.bgmGain.connect(this.ctx.destination);
    this.bgmSource.start();
  }

  // 停止背景音乐
  stopBGM() {
    if (this.bgmSource) {
      this.bgmSource.stop();
      this.bgmSource.disconnect();
      this.bgmSource = null;
    }
  }
}
