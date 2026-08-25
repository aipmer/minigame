/**
 * @fileoverview GridRenderer — 渲染答题网格到 DOM 容器中。
 * 支持 color / direction / text 三种题型，提供正确/错误反馈动画。
 * @module gameplay/GridRenderer
 */

/**
 * 根据网格尺寸返回对应的字体大小映射值。
 * @param {number} gridSize - 网格边长 (3‑6)
 * @param {Object} sizeMap - { 3: px, 4: px, 5: px, 6: px }
 * @returns {string} 带 px 单位的字体大小
 */
function getFontSize(gridSize, sizeMap) {
  return `${sizeMap[gridSize] ?? sizeMap[6]}px`;
}

/** 方向题字体大小映射 */
const ARROW_FONT_SIZES = { 3: 32, 4: 26, 5: 22, 6: 18 };

/** 文本题字体大小映射 */
const TEXT_FONT_SIZES = { 3: 28, 4: 24, 5: 20, 6: 16 };

/**
 * 负责将 questionData 渲染为可交互的网格 UI。
 */
export class GridRenderer {
  /**
   * @param {HTMLElement} containerElement - 网格将被渲染到的 DOM 容器
   */
  constructor(containerElement) {
    /** @private */
    this._container = containerElement;
    /** @private */
    this._disabled = false;
  }

  /* ------------------------------------------------------------------ */
  /*  Public Methods                                                     */
  /* ------------------------------------------------------------------ */

  /**
   * 清空容器并根据 questionData 创建新的网格。
   *
   * @param {Object} questionData
   * @param {string} questionData.type        - 题型: 'color' | 'direction' | 'text'
   * @param {number} questionData.gridSize    - 网格边长 (3‑6)
   * @param {number} questionData.totalCells  - 格子总数
   * @param {number} questionData.correctIndex - 正确格子索引
   * @param {Array}  questionData.cells       - 格子数据数组
   * @param {number} questionData.difficulty  - 难度系数
   * @param {Function} onCellClick - 点击回调 (cellIndex, cellElement)
   */
  render(questionData, onCellClick) {
    const { type, gridSize, cells } = questionData;

    // 清空旧内容
    this.clear();
    this.enable();

    // 创建 grid 容器
    const wrapper = document.createElement('div');
    wrapper.classList.add('grid', `grid-${gridSize}x${gridSize}`);

    cells.forEach((cell, index) => {
      const cellEl = document.createElement('div');
      cellEl.classList.add('grid-cell');
      cellEl.setAttribute('data-index', index);
      cellEl.style.setProperty('--cell-index', index);

      // 按题型渲染单元格内容
      switch (type) {
        case 'color':
          cellEl.style.backgroundColor = cell.color;
          cellEl.style.display = 'flex';
          cellEl.style.alignItems = 'center';
          cellEl.style.justifyContent = 'center';
          break;

        case 'direction': {
          const arrow = document.createElement('span');
          arrow.classList.add('arrow');
          arrow.textContent = cell.symbol;
          arrow.style.fontSize = getFontSize(gridSize, ARROW_FONT_SIZES);
          cellEl.appendChild(arrow);
          break;
        }

        case 'text': {
          const textSpan = document.createElement('span');
          textSpan.classList.add('text-content');
          textSpan.textContent = cell.text;
          textSpan.style.fontSize = getFontSize(gridSize, TEXT_FONT_SIZES);
          cellEl.appendChild(textSpan);
          break;
        }

        case 'size': {
          const shape = document.createElement('span');
          shape.classList.add('shape-content');
          shape.style.backgroundColor = cell.color;
          shape.style.transform = `scale(${cell.scale})`;
          cellEl.appendChild(shape);
          break;
        }

        case 'count': {
          const dotGrid = document.createElement('div');
          dotGrid.classList.add('dot-grid');
          const cols = Math.max(2, Math.ceil(Math.sqrt(cell.count)));
          dotGrid.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
          for (let d = 0; d < cell.count; d++) {
            const dot = document.createElement('span');
            dot.classList.add('dot');
            dot.style.backgroundColor = cell.color;
            dotGrid.appendChild(dot);
          }
          cellEl.appendChild(dotGrid);
          break;
        }

        default:
          break;
      }

      // 点击事件
      cellEl.addEventListener('click', () => {
        if (!this._disabled && !cellEl.classList.contains('eliminated')) {
          onCellClick(index, cellEl);
        }
      });

      wrapper.appendChild(cellEl);
    });

    this._container.appendChild(wrapper);
  }

  /**
   * 显示正确反馈动画。
   * @param {number} cellIndex - 格子索引
   * @returns {Promise<void>} 300ms 后 resolve
   */
  showCorrectFeedback(cellIndex) {
    return new Promise((resolve) => {
      const cell = this._getCellByIndex(cellIndex);
      if (cell) {
        cell.classList.add('correct');
      }
      setTimeout(resolve, 300);
    });
  }

  /**
   * 显示错误反馈动画。
   * @param {number} cellIndex - 格子索引
   * @returns {Promise<void>} 500ms 后移除 wrong class 并 resolve
   */
  showWrongFeedback(cellIndex) {
    return new Promise((resolve) => {
      const cell = this._getCellByIndex(cellIndex);
      if (cell) {
        cell.classList.add('wrong');
        setTimeout(() => {
          cell.classList.remove('wrong');
          resolve();
        }, 500);
      } else {
        resolve();
      }
    });
  }

  /**
   * 高亮正确格子。
   * @param {number} correctIndex - 正确格子索引
   */
  highlightCorrect(correctIndex) {
    const cell = this._getCellByIndex(correctIndex);
    if (cell) {
      cell.classList.add('highlight');
    }
  }

  /**
   * "提示"道具效果：随机排除若干个错误格子（禁用点击 + 半透明淡出）。
   * @param {number} correctIndex - 正确格子索引（不会被排除）
   * @param {number} count - 要排除的错误格子数量
   * @returns {number[]} 实际被排除的格子索引
   */
  eliminateWrongCells(correctIndex, count) {
    const cells = Array.from(this._container.querySelectorAll('.grid-cell'));
    const candidates = cells
      .map((el, i) => i)
      .filter((i) => i !== correctIndex && !cells[i].classList.contains('eliminated'));

    // 洗牌后取前 count 个
    for (let i = candidates.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
    }

    const picked = candidates.slice(0, count);
    picked.forEach((i) => {
      cells[i].classList.add('eliminated');
    });
    return picked;
  }

  /**
   * 清空容器中的所有子元素。
   */
  clear() {
    while (this._container.firstChild) {
      this._container.removeChild(this._container.firstChild);
    }
  }

  /**
   * 禁用网格交互。
   */
  disable() {
    this._disabled = true;
    this._container.style.pointerEvents = 'none';
  }

  /**
   * 启用网格交互。
   */
  enable() {
    this._disabled = false;
    this._container.style.pointerEvents = 'auto';
  }

  /* ------------------------------------------------------------------ */
  /*  Private Helpers                                                    */
  /* ------------------------------------------------------------------ */

  /**
   * 根据 data-index 获取格子元素。
   * @private
   * @param {number} index
   * @returns {HTMLElement|null}
   */
  _getCellByIndex(index) {
    return this._container.querySelector(`[data-index="${index}"]`);
  }
}
