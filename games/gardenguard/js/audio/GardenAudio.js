/**
 * 《花园守卫》治愈系 Web Audio 程序化音效引擎
 * 采用纯 Web Audio API 动态合成，零外部音频文件依赖，听感圆润清新、解压治愈
 */
export class GardenAudio {
  constructor() {
    this.ctx = null;
    this.isMuted = localStorage.getItem('garden_guard_audio_muted') === 'true';
    this.masterGain = null;
    this.initialized = false;
  }

  init() {
    if (this.initialized && this.ctx) {
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
      return;
    }

    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.35, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);
      this.initialized = true;
    } catch (e) {
      console.warn('[GardenAudio] AudioContext init failed:', e);
    }
  }

  ensureContext() {
    if (!this.initialized) this.init();
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    localStorage.setItem('garden_guard_audio_muted', String(this.isMuted));
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.35, this.ctx.currentTime);
    }
    return this.isMuted;
  }

  /**
   * 1. 点击按钮：清脆微弹木琴敲击音
   */
  playClick() {
    if (this.isMuted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(740, t);
    osc.frequency.exponentialRampToValueAtTime(440, t + 0.08);

    gain.gain.setValueAtTime(0.4, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.08);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.09);
  }

  /**
   * 2. 植物破土发芽 / 召唤音
   */
  playSummon() {
    if (this.isMuted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(260, t);
    osc.frequency.exponentialRampToValueAtTime(540, t + 0.16);

    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.16);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.17);
  }

  /**
   * 3. 拖拽合成升级音：随着星级递增的马林巴/木琴上行琶音
   */
  playMerge(star = 2) {
    if (this.isMuted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const baseFreqs = {
      2: [523.25, 659.25],                  // C5, E5
      3: [523.25, 659.25, 783.99],          // C5, E5, G5
      4: [659.25, 783.99, 1046.50],         // E5, G5, C6
      5: [523.25, 659.25, 783.99, 1046.50, 1318.51] // C5, E5, G5, C6, E6
    };

    const notes = baseFreqs[Math.min(star, 5)] || [523.25, 659.25];
    const stepDuration = 0.055;

    notes.forEach((freq, idx) => {
      const noteTime = this.ctx.currentTime + idx * stepDuration;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, noteTime);

      gain.gain.setValueAtTime(0.35, noteTime);
      gain.gain.exponentialRampToValueAtTime(0.005, noteTime + 0.14);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(noteTime);
      osc.stop(noteTime + 0.15);
    });
  }

  /**
   * 4. 5 星终极全屏大招能量爆发
   */
  playUltimate() {
    if (this.isMuted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;

    // 低音轰鸣
    const subOsc = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(140, t);
    subOsc.frequency.exponentialRampToValueAtTime(45, t + 0.6);
    subGain.gain.setValueAtTime(0.6, t);
    subGain.gain.exponentialRampToValueAtTime(0.01, t + 0.6);
    subOsc.connect(subGain);
    subGain.connect(this.masterGain);
    subOsc.start(t);
    subOsc.stop(t + 0.62);

    // 华丽上行闪耀和弦
    const chords = [523.25, 659.25, 783.99, 1046.50, 1318.51, 1567.98];
    chords.forEach((freq, i) => {
      const ct = t + 0.06 + i * 0.04;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, ct);
      gain.gain.setValueAtTime(0.3, ct);
      gain.gain.exponentialRampToValueAtTime(0.005, ct + 0.25);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(ct);
      osc.stop(ct + 0.26);
    });
  }

  /**
   * 5. 植物子弹发射：Q 弹 pop-pop
   */
  playShoot() {
    if (this.isMuted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(480, t);
    osc.frequency.exponentialRampToValueAtTime(160, t + 0.06);

    gain.gain.setValueAtTime(0.22, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.06);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.07);
  }

  /**
   * 6. 子弹命中害虫
   */
  playHit(isKill = false) {
    if (this.isMuted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(320, t);
    osc.frequency.exponentialRampToValueAtTime(120, t + 0.05);

    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.05);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.06);

    // 击杀时附加微型金币叮当声
    if (isKill) {
      const coinOsc = this.ctx.createOscillator();
      const coinGain = this.ctx.createGain();
      coinOsc.type = 'sine';
      coinOsc.frequency.setValueAtTime(1318.51, t + 0.02); // E6
      coinGain.gain.setValueAtTime(0.2, t + 0.02);
      coinGain.gain.exponentialRampToValueAtTime(0.01, t + 0.14);
      coinOsc.connect(coinGain);
      coinGain.connect(this.masterGain);
      coinOsc.start(t + 0.02);
      coinOsc.stop(t + 0.15);
    }
  }

  /**
   * 7. 花园核心受击警告：治愈系空灵低沉木鱼警示音
   */
  playCoreDamage() {
    if (this.isMuted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(200, t);
    osc.frequency.exponentialRampToValueAtTime(80, t + 0.22);

    gain.gain.setValueAtTime(0.5, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.22);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.23);
  }

  /**
   * 8. 设施升级成功音
   */
  playUpgrade() {
    if (this.isMuted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const freqs = [440, 554.37, 659.25, 880];
    freqs.forEach((freq, i) => {
      const noteT = t + i * 0.05;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, noteT);
      gain.gain.setValueAtTime(0.3, noteT);
      gain.gain.exponentialRampToValueAtTime(0.01, noteT + 0.12);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(noteT);
      osc.stop(noteT + 0.13);
    });
  }

  /**
   * 9. 花园陷落轻柔和弦
   */
  playDefeat() {
    if (this.isMuted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const notes = [440, 415.30, 392, 349.23]; // 下行哀伤柔音
    notes.forEach((freq, idx) => {
      const nt = t + idx * 0.12;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, nt);
      gain.gain.setValueAtTime(0.3, nt);
      gain.gain.exponentialRampToValueAtTime(0.01, nt + 0.25);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(nt);
      osc.stop(nt + 0.26);
    });
  }
}
