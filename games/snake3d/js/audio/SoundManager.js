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

  // 播放清脆咬嚼音效 (Juicy Bite Crunch)
  playEat() {
    if (!this.ctx) return;
    // 脆口第一响
    this._createOscillator(720, 'triangle', 0.06, 0.35, { endFreq: 380, decayType: 'exponential' });
    // 汁水爆裂双音
    setTimeout(() => {
      this._createOscillator(980, 'sine', 0.07, 0.28, { endFreq: 520, decayType: 'exponential' });
    }, 45);
  }

  // 播放连击进食音效 (High Glockenspiel Chime)
  playEatCombo(level) {
    if (!this.ctx) return;
    const baseFreq = 659.25; // E5
    const multiplier = 1 + Math.min(level * 0.15, 0.8);
    
    this._createOscillator(baseFreq * multiplier, 'triangle', 0.07, 0.32, { endFreq: baseFreq * multiplier * 1.3, decayType: 'exponential' });
    setTimeout(() => {
      this._createOscillator(baseFreq * 1.5 * multiplier, 'sine', 0.09, 0.28, { decayType: 'exponential' });
    }, 55);
  }

  // 播放可爱卡通水泡啵啵转向音 (Cute Bubble Pop)
  playTurn() {
    if (!this.ctx) return;
    // 快速由低到高音调滑音，水泡破裂萌系手感
    this._createOscillator(240, 'sine', 0.038, 0.14, { endFreq: 580, decayType: 'exponential' });
  }

  // 播放游戏结束音效
  playGameOver() {
    if (!this.ctx) return;
    this._createOscillator(440, 'sawtooth', 0.45, 0.2, { endFreq: 70, decayType: 'exponential' });
  }

  // 播放升级音效 (欢快轻快小号旋律)
  playLevelUp() {
    if (!this.ctx) return;
    const notes = [523.25, 659.25, 783.99, 1046.50, 1318.51]; // C5 E5 G5 C6 E6
    notes.forEach((freq, i) => {
      setTimeout(() => {
        this._createOscillator(freq, 'triangle', 0.09, 0.22, { decayType: 'linear' });
      }, i * 65);
    });
  }

  // 播放碎石粉碎音效 (Cartoon Rock Smash)
  playRockShatter() {
    if (!this.ctx) return;
    this._createOscillator(160, 'sawtooth', 0.22, 0.38, { endFreq: 35, decayType: 'exponential' });
    this._createOscillator(280, 'square', 0.14, 0.24, { endFreq: 50, decayType: 'exponential' });
  }

  // 播放无敌黄金星魔法风铃音效 (Magic Wind Chime)
  playInvincible() {
    if (!this.ctx) return;
    const chimeNotes = [783.99, 987.77, 1174.66, 1567.98, 1975.53];
    chimeNotes.forEach((freq, i) => {
      setTimeout(() => {
        this._createOscillator(freq, 'sine', 0.18, 0.18, { decayType: 'exponential' });
      }, i * 50);
    });
  }

  // 播放磁力吸附音效 (Electric Magnetic Chime)
  playMagnet() {
    if (!this.ctx) return;
    this._createOscillator(320, 'sine', 0.18, 0.28, { endFreq: 760, decayType: 'exponential' });
    setTimeout(() => {
      this._createOscillator(640, 'triangle', 0.22, 0.22, { endFreq: 1280, decayType: 'exponential' });
    }, 60);
  }

  // 播放冰霜减速冰晶音效 (Crystalline Frost Freeze)
  playFrost() {
    if (!this.ctx) return;
    const frostNotes = [1046.5, 1318.5, 1567.98, 2093.0];
    frostNotes.forEach((freq, i) => {
      setTimeout(() => {
        this._createOscillator(freq, 'sine', 0.12, 0.2, { endFreq: freq * 1.08, decayType: 'exponential' });
      }, i * 35);
    });
  }

  // 播放幽灵虚化飘逸滑音 (Ethereal Ghost Float)
  playGhost() {
    if (!this.ctx) return;
    this._createOscillator(580, 'sine', 0.45, 0.22, {
      endFreq: 340,
      decayType: 'exponential',
      amFreq: 12
    });
  }

  // 播放爆裂清屏与金币暴击音效 (Mega Bomb Blast & Coin Cascade)
  playBomb() {
    if (!this.ctx) return;
    // 重低音轰鸣
    this._createOscillator(130, 'sawtooth', 0.45, 0.42, { endFreq: 25, decayType: 'exponential' });
    this._createOscillator(85, 'square', 0.35, 0.35, { endFreq: 20, decayType: 'exponential' });
    // 连续金币叮当声
    const coinNotes = [987.77, 1318.51, 1567.98, 1975.53];
    coinNotes.forEach((f, idx) => {
      setTimeout(() => {
        this._createOscillator(f, 'triangle', 0.12, 0.26, { decayType: 'exponential' });
      }, 120 + idx * 45);
    });
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

  // 播放暴雨低频滚雷声 (Rumbling Thunder)
  playThunder() {
    if (!this.ctx) return;
    this._createOscillator(90, 'sawtooth', 0.85, 0.28, {
      endFreq: 24,
      decayType: 'exponential',
      amFreq: 7
    });
    setTimeout(() => {
      this._createOscillator(60, 'triangle', 0.65, 0.22, {
        endFreq: 20,
        decayType: 'exponential'
      });
    }, 120);
  }

  // 播放惊雷劈击脆响与爆鸣 (Lightning Strike Crack & Blast)
  playLightningStrike() {
    if (!this.ctx) return;
    // 高频闪电破空撕裂声
    this._createOscillator(520, 'sawtooth', 0.12, 0.45, {
      endFreq: 45,
      decayType: 'exponential'
    });
    // 紧跟爆裂冲击波
    setTimeout(() => {
      this._createOscillator(160, 'square', 0.35, 0.38, {
        endFreq: 28,
        decayType: 'exponential'
      });
    }, 35);
  }

  // 播放雪境清风微吟空灵声 (Gentle Winter Breeze)
  playSnowBreeze() {
    if (!this.ctx) return;
    this._createOscillator(880, 'sine', 1.1, 0.08, {
      endFreq: 660,
      decayType: 'exponential',
      amFreq: 4
    });
  }
}

