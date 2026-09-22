// ═══════════════════════════════════════════
// 战术技能管理系统 (TacticalSkillManager)
// 包含：等离子护盾、超空间 EMP 全屏震荡波、主炮火力过载
// ═══════════════════════════════════════════
import * as THREE from 'three';

export class TacticalSkillManager {
  constructor(scene, gameState, obstacleManager, collectibleManager, playerShip, cameraFX, particleFX, audio) {
    this.scene = scene;
    this.gameState = gameState;
    this.obstacleManager = obstacleManager;
    this.collectibleManager = collectibleManager;
    this.playerShip = playerShip;
    this.cameraFX = cameraFX;
    this.particleFX = particleFX;
    this.audio = audio;

    // 技能配置
    this.skills = {
      shield: {
        id: 'shield',
        name: '等离子护盾',
        cost: 50,
        hotkey: '1',
      },
      emp: {
        id: 'emp',
        name: '超空间 EMP',
        cost: 100,
        hotkey: '2',
      },
      overdrive: {
        id: 'overdrive',
        name: '火力过载',
        cost: 80,
        hotkey: '3',
      },
    };

    // EMP 激波光幕池
    this.activeEMPWaves = [];
    this.initEMPAssets();

    // 浮动提示定时器
    this.toastTimer = 0;
  }

  initEMPAssets() {
    // 环形冲击能量波几何体
    this.empGeo = new THREE.RingGeometry(1.5, 3.2, 32);
    this.empMat = new THREE.MeshBasicMaterial({
      color: 0x00f2fe,
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
  }

  // 释放战术技能
  triggerSkill(skillId) {
    if (this.gameState.state !== 'playing') return false;

    const skill = this.skills[skillId];
    if (!skill) return false;

    // 1. 技能特定前置检查
    if (skillId === 'shield' && this.gameState.hasShield) {
      this.showToast('护盾系统已处于满载状态', 'warn');
      return false;
    }

    if (skillId === 'overdrive' && this.gameState.isOverdriveActive()) {
      this.showToast('火力过载超频运转中', 'warn');
      return false;
    }

    // 2. 检查晶币是否充足
    if (this.gameState.crystals < skill.cost) {
      const need = skill.cost - this.gameState.crystals;
      this.showToast(`晶币不足，还需 ${need} 枚`, 'error');
      return false;
    }

    // 3. 扣减晶币并执行对应技能大招
    this.gameState.spendCrystals(skill.cost);

    switch (skillId) {
      case 'shield':
        this.executeShield();
        break;
      case 'emp':
        this.executeEMP();
        break;
      case 'overdrive':
        this.executeOverdrive();
        break;
    }

    return true;
  }

  executeShield() {
    this.gameState.hasShield = true;
    if (this.audio && this.audio.playShieldPickup) {
      this.audio.playShieldPickup();
    }
    this.showToast('等离子力场吸收罩已激活！', 'success');
  }

  executeEMP() {
    const shipPos = this.playerShip.mesh.position;

    // 1. 生成 3D 环形等离子能量激波光幕
    const waveMesh = new THREE.Mesh(this.empGeo, this.empMat.clone());
    waveMesh.position.set(shipPos.x, shipPos.y, shipPos.z - 1.0);
    this.scene.add(waveMesh);

    this.activeEMPWaves.push({
      mesh: waveMesh,
      scale: 1.0,
      maxScale: 18.0,
      speedZ: -240, // 激波向前飞驰
      life: 0.55,
      maxLife: 0.55,
    });

    // 2. 清空前方 120 米内所有障碍物
    const clearedPositions = this.obstacleManager.clearAhead(120, (pos, type) => {
      // 产生陨石爆破粒子
      if (this.particleFX && this.particleFX.emitExplosion) {
        this.particleFX.emitExplosion(pos);
      }
      // 爆出满屏量子晶币
      if (this.collectibleManager && this.collectibleManager.spawnCrystalsAt) {
        this.collectibleManager.spawnCrystalsAt(pos, 3);
      }
      // 加分
      this.gameState.score += 250;
    });

    // 3. 全屏微震颤与重型能量爆鸣音效
    if (this.cameraFX && this.cameraFX.triggerShake) {
      this.cameraFX.triggerShake(0.85, 0.45);
    }
    if (this.audio && this.audio.playEMPBlast) {
      this.audio.playEMPBlast();
    }

    const count = clearedPositions.length;
    this.showToast(`超空间脉冲爆发！粉碎前方 ${count} 处星障！`, 'emp');
  }

  executeOverdrive() {
    this.gameState.overdriveTimer = this.gameState.overdriveDuration;
    if (this.audio && this.audio.playOverdriveLaser) {
      this.audio.playOverdriveLaser();
    }
    this.showToast('主炮火力过载！三叉重炮齐射 10 秒！', 'overdrive');
  }

  showToast(message, type = 'info') {
    const toastEl = document.getElementById('skill-toast');
    if (!toastEl) return;

    toastEl.textContent = message;
    toastEl.className = `skill-toast active type-${type}`;

    clearTimeout(this.toastTimeout);
    this.toastTimeout = setTimeout(() => {
      toastEl.classList.remove('active');
    }, 2200);
  }

  update(delta) {
    // 更新 EMP 激波扩散动画
    for (let i = this.activeEMPWaves.length - 1; i >= 0; i--) {
      const w = this.activeEMPWaves[i];
      w.life -= delta;
      const progress = 1 - w.life / w.maxLife;

      w.scale = 1.0 + progress * w.maxScale;
      w.mesh.scale.set(w.scale, w.scale, w.scale);
      w.mesh.position.z += w.speedZ * delta;

      // 渐隐淡出
      w.mesh.material.opacity = Math.max(0, 0.95 * (1 - progress));

      if (w.life <= 0) {
        this.scene.remove(w.mesh);
        w.mesh.geometry.dispose();
        w.mesh.material.dispose();
        this.activeEMPWaves.splice(i, 1);
      }
    }

    // 更新 UI 按钮就绪/可用状态
    this.updateUI();
  }

  updateUI() {
    const crystals = this.gameState.crystals;
    const isOverdrive = this.gameState.isOverdriveActive();
    const hasShield = this.gameState.hasShield;

    // 1. 顶部晶币数量
    const hudCrystals = document.getElementById('hud-crystals');
    if (hudCrystals) {
      hudCrystals.textContent = crystals.toLocaleString();
    }

    // 2. 技能按键就绪与消耗高亮更新
    const skillList = [
      { id: 'shield', cost: 50, active: hasShield, activeText: hasShield ? '满载' : '' },
      { id: 'emp', cost: 100, active: false, activeText: '' },
      { id: 'overdrive', cost: 80, active: isOverdrive, activeText: isOverdrive ? `${Math.ceil(this.gameState.overdriveTimer)}s` : '' },
    ];

    skillList.forEach((s) => {
      // 桌面端卡片
      const deskBtn = document.getElementById(`skill-btn-${s.id}`);
      // 移动端圆形按钮
      const mobBtn = document.getElementById(`touch-skill-${s.id}`);

      const canAfford = crystals >= s.cost;

      [deskBtn, mobBtn].forEach((btn) => {
        if (!btn) return;

        if (s.active) {
          btn.classList.add('skill-active');
          btn.classList.remove('skill-ready', 'skill-disabled');
        } else if (canAfford) {
          btn.classList.add('skill-ready');
          btn.classList.remove('skill-active', 'skill-disabled');
        } else {
          btn.classList.add('skill-disabled');
          btn.classList.remove('skill-ready', 'skill-active');
        }

        // 倒计时指示文本
        const statusSpan = btn.querySelector('.skill-status-text');
        if (statusSpan) {
          statusSpan.textContent = s.activeText;
        }
      });
    });
  }
}
