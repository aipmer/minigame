import * as THREE from 'three';

/**
 * RadarMinimap.js
 * 3D 贪吃蛇「微型生态岛雷达罗盘」与「离屏稀有道具边缘引导光标」
 * 具备 3D 粘土手办质感、Retina 视网膜清晰度，全中文零原生 Emoji
 */
export class RadarMinimap {
  constructor(container, options = {}) {
    this.container = container || document.getElementById('game-container') || document.body;
    this.gridSize = options.gridSize || 32;
    this.boundLimit = this.gridSize / 2 - 0.5;

    this.offscreenTargets = [];
    this.initDOM();
  }

  initDOM() {
    // 移除已有的旧罗盘容器（防止重复初始化）
    const existing = document.getElementById('radar-minimap');
    if (existing) existing.remove();
    const existingInd = document.getElementById('offscreen-indicators');
    if (existingInd) existingInd.remove();

    // 罗盘外壳容器
    this.wrapper = document.createElement('div');
    this.wrapper.id = 'radar-minimap';
    this.wrapper.className = 'radar-minimap hidden';
    this.wrapper.innerHTML = `
      <div class="radar-card">
        <div class="radar-header">
          <span class="radar-title">生态岛罗盘</span>
        </div>
        <div class="radar-canvas-box">
          <canvas id="radar-canvas" width="160" height="160"></canvas>
        </div>
      </div>
    `;
    this.container.appendChild(this.wrapper);

    this.canvas = this.wrapper.querySelector('#radar-canvas');
    this.ctx = this.canvas.getContext('2d');

    // 离屏引导光标容器
    this.indicatorContainer = document.createElement('div');
    this.indicatorContainer.id = 'offscreen-indicators';
    this.indicatorContainer.className = 'offscreen-indicators hidden';
    this.container.appendChild(this.indicatorContainer);
  }

  setGridSize(size) {
    this.gridSize = Number(size) || 32;
    this.boundLimit = Math.max(5.5, this.gridSize / 2 - 0.5);
  }

  show() {
    if (this.wrapper) this.wrapper.classList.remove('hidden');
    if (this.indicatorContainer) this.indicatorContainer.classList.remove('hidden');
  }

  hide() {
    if (this.wrapper) this.wrapper.classList.add('hidden');
    if (this.indicatorContainer) {
      this.indicatorContainer.classList.add('hidden');
      this.indicatorContainer.innerHTML = '';
    }
  }

  // 坐标映射：世界坐标 (x, z) 映射到 Canvas (cx, cy)
  worldToCanvas(x, z, canvasSize = 160) {
    const margin = 16;
    const activeRadius = (canvasSize / 2) - margin;
    const normX = Math.max(-1.0, Math.min(1.0, x / this.boundLimit));
    const normZ = Math.max(-1.0, Math.min(1.0, z / this.boundLimit));

    return {
      cx: canvasSize / 2 + normX * activeRadius,
      cy: canvasSize / 2 + normZ * activeRadius
    };
  }

  // 帧更新渲染
  update(snake, food, powerUpManager, camera) {
    if (!this.ctx || !this.wrapper || this.wrapper.classList.contains('hidden')) return;

    const ctx = this.ctx;
    const size = 160;
    ctx.clearRect(0, 0, size, size);

    // 1. 绘制浮空岛地台轮廓（圆角绿草坪 + 焦糖泥土厚边）
    const pad = 14;
    const islandSize = size - pad * 2;
    const r = 16;

    // 焦糖泥土底座阴影
    ctx.fillStyle = '#C2843A';
    this.drawRoundRect(ctx, pad + 1, pad + 4, islandSize - 2, islandSize - 2, r);
    ctx.fill();

    // 翠绿草皮地台
    ctx.fillStyle = '#65B82A';
    this.drawRoundRect(ctx, pad, pad, islandSize, islandSize, r);
    ctx.fill();

    // 柔和十字基准线
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(size / 2, pad + 4);
    ctx.lineTo(size / 2, size - pad - 4);
    ctx.moveTo(pad + 4, size / 2);
    ctx.lineTo(size - pad - 4, size / 2);
    ctx.stroke();

    // 2. 绘制食物点位
    if (food) {
      // 普通食物
      if (food.foodList && food.foodList.length > 0) {
        for (const f of food.foodList) {
          if (!f || !f.pos) continue;
          const { cx, cy } = this.worldToCanvas(f.pos.x, f.pos.z, size);
          let dotColor = '#EF4444'; // 默认苹果红
          if (f.type === 'strawberry') dotColor = '#F43F5E';
          else if (f.type === 'donut') dotColor = '#EC4899';
          else if (f.type === 'star') dotColor = '#F59E0B';

          ctx.fillStyle = dotColor;
          ctx.beginPath();
          ctx.arc(cx, cy, 3.8, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (food.logicalPos) {
        const { cx, cy } = this.worldToCanvas(food.logicalPos.x, food.logicalPos.z, size);
        ctx.fillStyle = '#EF4444';
        ctx.beginPath();
        ctx.arc(cx, cy, 3.8, 0, Math.PI * 2);
        ctx.fill();
      }

      // 特殊高分金星（金色脉冲波）
      if (food.hasSpecial && food.specialPosition) {
        const { cx, cy } = this.worldToCanvas(food.specialPosition.x, food.specialPosition.z, size);
        const pulse = 1.0 + 0.3 * Math.sin(Date.now() * 0.01);
        ctx.fillStyle = 'rgba(245, 158, 11, 0.4)';
        ctx.beginPath();
        ctx.arc(cx, cy, 7 * pulse, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#F59E0B';
        ctx.beginPath();
        ctx.arc(cx, cy, 4.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // 3. 绘制道具生成点
    if (powerUpManager && powerUpManager.activePowerUps) {
      for (const p of powerUpManager.activePowerUps) {
        if (!p || !p.position) continue;
        const { cx, cy } = this.worldToCanvas(p.position.x, p.position.z, size);
        ctx.fillStyle = '#38BDF8';
        ctx.beginPath();
        ctx.arc(cx, cy, 4.0, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // 4. 绘制蛇身体与头部
    if (snake && snake.head) {
      // 身体节点轨迹
      if (snake.segments && snake.segments.length > 0) {
        ctx.fillStyle = 'rgba(74, 222, 128, 0.85)';
        for (let i = 0; i < snake.segments.length; i += 2) {
          const seg = snake.segments[i];
          if (!seg || !seg.position) continue;
          const { cx, cy } = this.worldToCanvas(seg.position.x, seg.position.z, size);
          ctx.beginPath();
          ctx.arc(cx, cy, 2.4, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // 蛇头醒目亮点
      const headPos = snake.head.position;
      const { cx, cy } = this.worldToCanvas(headPos.x, headPos.z, size);

      // 外光晕
      ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.beginPath();
      ctx.arc(cx, cy, 6.2, 0, Math.PI * 2);
      ctx.fill();

      // 核心头颅
      ctx.fillStyle = '#10B981';
      ctx.beginPath();
      ctx.arc(cx, cy, 4.6, 0, Math.PI * 2);
      ctx.fill();

      // 朝向方向小尖端
      if (snake.direction) {
        ctx.fillStyle = '#FFFFFF';
        const tipX = cx + snake.direction.x * 4.5;
        const tipY = cy + snake.direction.z * 4.5;
        ctx.beginPath();
        ctx.arc(tipX, tipY, 1.8, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // 5. 离屏指引光标检测与渲染
    this.updateOffscreenIndicators(food, powerUpManager, camera);
  }

  // 离屏引导光标（当特殊高分金星或超级道具在视线外时，屏幕边缘展示柔和指引）
  updateOffscreenIndicators(food, powerUpManager, camera) {
    if (!camera || !this.indicatorContainer) return;

    const targets = [];
    if (food && food.hasSpecial && food.specialPosition) {
      targets.push({
        pos: food.specialPosition,
        name: '黄金星',
        color: '#F59E0B',
        icon: 'assets/icons/icon_crown.png'
      });
    }

    if (powerUpManager && powerUpManager.activePowerUps) {
      for (const p of powerUpManager.activePowerUps) {
        if (p && p.position) {
          targets.push({
            pos: p.position,
            name: p.name || '超能道具',
            color: '#38BDF8',
            icon: p.icon || 'assets/icons/icon_crystal.png'
          });
        }
      }
    }

    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const margin = 28;

    let html = '';
    for (const t of targets) {
      // 投影到归一化设备坐标 (NDC)
      const p = t.pos.clone().project(camera);
      const isBehind = p.z > 1.0;

      let sx = (p.x * 0.5 + 0.5) * vw;
      let sy = (-p.y * 0.5 + 0.5) * vh;

      if (isBehind) {
        sx = vw - sx;
        sy = vh - sy;
      }

      // 判断是否在屏幕可视范围内（考虑上下边缘 HUD 与控制区避让）
      const isInView = !isBehind && sx >= margin && sx <= (vw - margin) && sy >= 80 && sy <= (vh - 90);

      if (!isInView) {
        // 计算屏幕中心到目标的方向向量并夹紧到屏幕边缘
        const centerX = vw / 2;
        const centerY = vh / 2;
        let dx = sx - centerX;
        let dy = sy - centerY;
        const len = Math.hypot(dx, dy) || 1;
        dx /= len;
        dy /= len;

        // 计算边缘交点
        const halfW = (vw / 2) - margin;
        const halfH = (vh / 2) - 85;
        const scaleX = halfW / (Math.abs(dx) || 0.0001);
        const scaleY = halfH / (Math.abs(dy) || 0.0001);
        const scale = Math.min(scaleX, scaleY);

        const edgeX = Math.round(centerX + dx * scale);
        const edgeY = Math.round(centerY + dy * scale);
        const angleDeg = Math.round(Math.atan2(dy, dx) * 180 / Math.PI);

        html += `
          <div class="offscreen-arrow-badge" style="left:${edgeX}px; top:${edgeY}px; transform:translate(-50%, -50%);">
            <div class="arrow-pointer" style="transform: rotate(${angleDeg}deg);">▲</div>
            <img src="${t.icon}" class="arrow-icon" alt="${t.name}" />
            <span class="arrow-name">${t.name}</span>
          </div>
        `;
      }
    }

    this.indicatorContainer.innerHTML = html;
  }

  // 工具函数：绘制圆角矩形路径
  drawRoundRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }
}
