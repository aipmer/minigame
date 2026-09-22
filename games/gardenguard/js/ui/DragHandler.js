import * as THREE from 'three';

export class DragHandler {
  constructor(canvas, camera, gridRenderer) {
    this.canvas = canvas;
    this.camera = camera;
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.gridRenderer = gridRenderer;
    this.isDragging = false;
    this.dragPlant = null;
    this.dragFromSlot = null;
    this.listeners = { dragStart: [], dragMove: [], dragEnd: [] };
    
    // Plane at y=0.1 to raycast onto
    this.plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.1);

    canvas.addEventListener('mousedown', e => this.onPointerDown(e));
    canvas.addEventListener('mousemove', e => this.onPointerMove(e));
    canvas.addEventListener('mouseup', e => this.onPointerUp(e));
    canvas.addEventListener('touchstart', e => this.onTouchStart(e), { passive: false });
    canvas.addEventListener('touchmove', e => this.onTouchMove(e), { passive: false });
    canvas.addEventListener('touchend', e => this.onTouchEnd(e));
  }

  getPointerPosition(clientX, clientY) {
    const rect = this.canvas.getBoundingClientRect();
    this.mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    return this.mouse;
  }
  
  screenToGrid(clientX, clientY) {
    this.getPointerPosition(clientX, clientY);
    this.raycaster.setFromCamera(this.mouse, this.camera);
    
    const target = new THREE.Vector3();
    this.raycaster.ray.intersectPlane(this.plane, target);
    
    if (target) {
      const cellSize = this.gridRenderer ? this.gridRenderer.getCellSize() : 1.5;
      const gridSize = this.gridRenderer ? this.gridRenderer.gridSize : 4;
      const offset = (gridSize - 1) / 2;

      const col = Math.round(target.x / cellSize + offset);
      const row = Math.round(target.z / cellSize + offset);

      if (row >= 0 && row < gridSize && col >= 0 && col < gridSize) {
        return { row, col };
      }
    }
    return null;
  }
  
  onPointerDown(e) {
    const gridPos = this.screenToGrid(e.clientX, e.clientY);
    if (!gridPos) return;
    this.isDragging = true;
    this.dragFromSlot = gridPos;
    this.emit('dragStart', gridPos);
  }
  
  onPointerMove(e) {
    if (!this.isDragging) return;
    const gridPos = this.screenToGrid(e.clientX, e.clientY);
    this.emit('dragMove', { from: this.dragFromSlot, to: gridPos, pointer: { x: e.clientX, y: e.clientY } });
  }
  
  onPointerUp(e) {
    if (!this.isDragging) return;
    this.isDragging = false;
    const gridPos = this.screenToGrid(e.clientX, e.clientY);
    this.emit('dragEnd', { from: this.dragFromSlot, to: gridPos });
    this.dragFromSlot = null;
  }
  
  onTouchStart(e) { 
    e.preventDefault(); 
    if (e.touches.length > 0) {
      this.onPointerDown(e.touches[0]);
    }
  }
  
  onTouchMove(e) { 
    e.preventDefault(); 
    if (e.touches.length > 0) {
      this.onPointerMove(e.touches[0]);
    }
  }
  
  onTouchEnd(e) { 
    if (e.changedTouches.length > 0) {
      this.onPointerUp(e.changedTouches[0]);
    } else {
      this.onPointerUp({ clientX: 0, clientY: 0 }); // Fallback
    }
  }
  
  on(event, callback) { 
    if (this.listeners[event]) {
      this.listeners[event].push(callback); 
    }
  }
  
  emit(event, data) { 
    if (this.listeners[event]) {
      this.listeners[event].forEach(cb => cb(data)); 
    }
  }
}
