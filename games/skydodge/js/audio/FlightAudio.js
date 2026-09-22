// ═══════════════════════════════════════════
// Web Audio API 程序化纯代码音频引擎 (FlightAudio)
// ═══════════════════════════════════════════

export class FlightAudio {
  constructor() {
    this.ctx = null;
    this.isMuted = false;
    this.isInitialized = false;

    // 引擎持续蜂鸣节点
    this.engineOsc = null;
    this.engineGain = null;
    this.engineFilter = null;

    // 护盾持续微弱脉冲蜂鸣节点
    this.shieldHumOsc = null;
    this.shieldHumGain = null;
    this.shieldHumLfo = null;
  }

  init() {
    if (this.isInitialized) return;

    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioContext();

      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }

      this.isInitialized = true;
      this.setupEngineSound();
      this.setupShieldHumSound();
    } catch (e) {
      console.warn('[FlightAudio] Web Audio API 初始化受阻:', e);
    }
  }

  setupEngineSound() {
    if (!this.ctx) return;

    // 双引擎低音振荡器
    this.engineOsc = this.ctx.createOscillator();
    this.engineOsc.type = 'sawtooth';
    this.engineOsc.frequency.setValueAtTime(65, this.ctx.currentTime);

    this.engineFilter = this.ctx.createBiquadFilter();
    this.engineFilter.type = 'lowpass';
    this.engineFilter.frequency.setValueAtTime(260, this.ctx.currentTime);

    this.engineGain = this.ctx.createGain();
    this.engineGain.gain.setValueAtTime(0.001, this.ctx.currentTime);

    this.engineOsc.connect(this.engineFilter);
    this.engineFilter.connect(this.engineGain);
    this.engineGain.connect(this.ctx.destination);

    this.engineOsc.start();
  }

  // 根据航速与冲刺状态动态调节引擎音调与响度
  updateEngine(currentSpeed, isBoosting, isPlaying) {
    if (!this.ctx || !this.engineGain || !this.engineOsc || this.isMuted) return;

    if (!isPlaying) {
      this.engineGain.gain.setTargetAtTime(0.0001, this.ctx.currentTime, 0.2);
      return;
    }

    const baseFreq = 60 + (currentSpeed - 36) * 1.5;
    const targetFreq = isBoosting ? baseFreq * 1.6 : baseFreq;
    const targetFilter = isBoosting ? 650 : 280;
    const targetVol = isBoosting ? 0.08 : 0.04;

    this.engineOsc.frequency.setTargetAtTime(targetFreq, this.ctx.currentTime, 0.1);
    this.engineFilter.frequency.setTargetAtTime(targetFilter, this.ctx.currentTime, 0.1);
    this.engineGain.gain.setTargetAtTime(targetVol, this.ctx.currentTime, 0.1);
  }

  setupShieldHumSound() {
    if (!this.ctx) return;

    // 低频柔和正弦振荡器 85Hz，用于护盾存在时的微弱能量场蜂鸣
    this.shieldHumOsc = this.ctx.createOscillator();
    this.shieldHumOsc.type = 'sine';
    this.shieldHumOsc.frequency.setValueAtTime(85, this.ctx.currentTime);

    // LFO 呼吸振荡器 2.4Hz
    this.shieldHumLfo = this.ctx.createOscillator();
    this.shieldHumLfo.frequency.setValueAtTime(2.4, this.ctx.currentTime);
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.setValueAtTime(10, this.ctx.currentTime);
    this.shieldHumLfo.connect(lfoGain);
    lfoGain.connect(this.shieldHumOsc.frequency);

    this.shieldHumGain = this.ctx.createGain();
    this.shieldHumGain.gain.setValueAtTime(0.0001, this.ctx.currentTime);

    this.shieldHumOsc.connect(this.shieldHumGain);
    this.shieldHumGain.connect(this.ctx.destination);

    this.shieldHumOsc.start();
    this.shieldHumLfo.start();
  }

  // 动态调节护盾持续待机脉冲音量
  updateShieldHum(hasShield, isPlaying) {
    if (!this.ctx || !this.shieldHumGain || this.isMuted) return;

    const targetVol = (isPlaying && hasShield) ? 0.032 : 0.0001;
    this.shieldHumGain.gain.setTargetAtTime(targetVol, this.ctx.currentTime, 0.15);
  }

  // 拾取能量晶体音效 (清脆三音琶音)
  playEnergyPickup() {
    if (!this.ctx || this.isMuted) return;

    const notes = [523.25, 659.25, 783.99]; // C5, E5, G5
    const now = this.ctx.currentTime;

    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.05);

      gain.gain.setValueAtTime(0.12, now + idx * 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.05 + 0.16);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now + idx * 0.05);
      osc.stop(now + idx * 0.05 + 0.18);
    });
  }

  // 护盾获得音效 (高科技上升琶音和弦)
  playShieldPickup() {
    if (!this.ctx || this.isMuted) return;

    const now = this.ctx.currentTime;
    const notes = [587.33, 880.0, 1174.66, 1760.0]; // D5, A5, D6, A6

    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = idx % 2 === 0 ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.045);

      gain.gain.setValueAtTime(0.14, now + idx * 0.045);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.045 + 0.28);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now + idx * 0.045);
      osc.stop(now + idx * 0.045 + 0.3);
    });
  }

  // 护盾抵挡致命撞击并碎裂音效 (力场偏转吸收 + 清脆晶能炸裂)
  playShieldBreak() {
    if (!this.ctx || this.isMuted) return;

    const now = this.ctx.currentTime;

    // 1. 力场吸收低频偏转冲量
    const deflOsc = this.ctx.createOscillator();
    const deflGain = this.ctx.createGain();
    deflOsc.type = 'triangle';
    deflOsc.frequency.setValueAtTime(480, now);
    deflOsc.frequency.exponentialRampToValueAtTime(90, now + 0.25);

    deflGain.gain.setValueAtTime(0.32, now);
    deflGain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

    deflOsc.connect(deflGain);
    deflGain.connect(this.ctx.destination);
    deflOsc.start(now);
    deflOsc.stop(now + 0.3);

    // 2. 四重高频等离子碎晶残响 (清脆碎裂感)
    const shards = [1900, 2450, 3100, 3900];
    shards.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.02);

      gain.gain.setValueAtTime(0.14, now + idx * 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.02 + 0.22);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now + idx * 0.02);
      osc.stop(now + idx * 0.02 + 0.25);
    });
  }

  // 战机撞击爆炸音效 (重低音冲击 + 滤波白噪)
  playExplosion() {
    if (!this.ctx || this.isMuted) return;

    const now = this.ctx.currentTime;

    // 1. 低频撞击重击
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(160, now);
    osc.frequency.exponentialRampToValueAtTime(30, now + 0.4);

    oscGain.gain.setValueAtTime(0.4, now);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

    osc.connect(oscGain);
    oscGain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.5);

    // 2. 爆炸杂音脉冲
    const bufferSize = this.ctx.sampleRate * 0.4;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.2));
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = 'lowpass';
    noiseFilter.frequency.setValueAtTime(600, now);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.25, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.ctx.destination);

    noise.start(now);
  }

  // 机载等离子激光发射爆鸣音 (清脆科幻脉冲)
  playLaser() {
    if (!this.ctx || this.isMuted) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(980, now);
    osc.frequency.exponentialRampToValueAtTime(220, now + 0.12);

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.15);
  }

  // 击碎陨石：水晶琉璃碎裂音 (Crystal Plasma Shatter - 清脆解压，连击音调递增)
  playAsteroidExplode(combo = 1) {
    if (!this.ctx || this.isMuted) return;

    const now = this.ctx.currentTime;

    // 连击半音递增系数 (每 1 连击提升半音，最多提升 1 个八度)
    const pitchMul = Math.pow(2, Math.min(Math.max(combo - 1, 0), 12) / 12);
    const baseFreq = 1950 * pitchMul;

    // 1. FM 调频合成器：双重水晶质感振鸣 (Modulator -> Carrier)
    const carrier = this.ctx.createOscillator();
    const modulator = this.ctx.createOscillator();
    const modGain = this.ctx.createGain();
    const carrierGain = this.ctx.createGain();

    carrier.type = 'sine';
    carrier.frequency.setValueAtTime(baseFreq, now);

    // 非整数倍调制比 1.414 制造玻璃/水晶谐波质感
    modulator.type = 'sine';
    modulator.frequency.setValueAtTime(baseFreq * 1.414, now);

    modGain.gain.setValueAtTime(650, now);
    modGain.gain.exponentialRampToValueAtTime(1, now + 0.12);

    modulator.connect(modGain);
    modGain.connect(carrier.frequency);

    carrierGain.gain.setValueAtTime(0.24, now);
    carrierGain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

    carrier.connect(carrierGain);
    carrierGain.connect(this.ctx.destination);

    modulator.start(now);
    carrier.start(now);
    modulator.stop(now + 0.24);
    carrier.stop(now + 0.24);

    // 2. 超清脆高频敲击晶体声 (Chime Click)
    const chime = this.ctx.createOscillator();
    const chimeGain = this.ctx.createGain();
    chime.type = 'triangle';
    chime.frequency.setValueAtTime(baseFreq * 1.5, now);
    chime.frequency.exponentialRampToValueAtTime(baseFreq * 0.9, now + 0.08);

    chimeGain.gain.setValueAtTime(0.18, now);
    chimeGain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

    chime.connect(chimeGain);
    chimeGain.connect(this.ctx.destination);
    chime.start(now);
    chime.stop(now + 0.1);

    // 3. 极短的高通碎裂粉末噪波 (消除沉闷重低音，仅保留清脆擦音)
    const noiseBufSize = Math.floor(this.ctx.sampleRate * 0.08);
    const noiseBuf = this.ctx.createBuffer(1, noiseBufSize, this.ctx.sampleRate);
    const noiseData = noiseBuf.getChannelData(0);
    for (let i = 0; i < noiseBufSize; i++) {
      noiseData[i] = (Math.random() * 2 - 1) * Math.exp(-i / (noiseBufSize * 0.25));
    }

    const noiseSrc = this.ctx.createBufferSource();
    noiseSrc.buffer = noiseBuf;

    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = 'highpass';
    noiseFilter.frequency.setValueAtTime(3200, now);

    const noiseAmp = this.ctx.createGain();
    noiseAmp.gain.setValueAtTime(0.12, now);
    noiseAmp.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    noiseSrc.start(now);
  }

  // 量子晶币拾取清响 (清亮双音符金属泛音，类似硬币与水晶共振)
  playCrystalPickup() {
    if (!this.ctx || this.isMuted) return;

    const now = this.ctx.currentTime;
    const notes = [880, 1318.5]; // A5 -> E6
    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.04);

      gain.gain.setValueAtTime(0.12, now + idx * 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.04 + 0.16);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now + idx * 0.04);
      osc.stop(now + idx * 0.04 + 0.18);
    });
  }

  // 超空间 EMP 震荡波全屏引爆音效 (超重低音能量倾泻 + 极速扩散高频余振)
  playEMPBlast() {
    if (!this.ctx || this.isMuted) return;

    const now = this.ctx.currentTime;

    // 1. 次重低音能量下探震荡 (Sub-bass Drop)
    const subOsc = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(130, now);
    subOsc.frequency.exponentialRampToValueAtTime(28, now + 0.55);

    subGain.gain.setValueAtTime(0.42, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.65);

    subOsc.connect(subGain);
    subGain.connect(this.ctx.destination);
    subOsc.start(now);
    subOsc.stop(now + 0.7);

    // 2. 超空间能量撕裂啸叫 (Energy Sweep)
    const sweepOsc = this.ctx.createOscillator();
    const sweepGain = this.ctx.createGain();
    sweepOsc.type = 'sawtooth';
    sweepOsc.frequency.setValueAtTime(2800, now);
    sweepOsc.frequency.exponentialRampToValueAtTime(320, now + 0.45);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(3000, now);
    filter.frequency.exponentialRampToValueAtTime(500, now + 0.45);

    sweepGain.gain.setValueAtTime(0.18, now);
    sweepGain.gain.exponentialRampToValueAtTime(0.001, now + 0.48);

    sweepOsc.connect(filter);
    filter.connect(sweepGain);
    sweepGain.connect(this.ctx.destination);
    sweepOsc.start(now);
    sweepOsc.stop(now + 0.5);
  }

  // 主炮火力过载专属射击音效 (更紧凑凌厉的等离子重炮射击)
  playOverdriveLaser() {
    if (!this.ctx || this.isMuted) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(1280, now);
    osc.frequency.exponentialRampToValueAtTime(240, now + 0.07);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(950, now);
    filter.Q.value = 3.2;

    gain.gain.setValueAtTime(0.22, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.09);
  }
}
