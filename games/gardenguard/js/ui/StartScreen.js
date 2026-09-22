export class StartScreen {
  constructor() {
    this.element = document.getElementById('start-screen');
    this.startBtn = document.getElementById('btn-start');
  }

  show() {
    this.element.classList.remove('hidden');
  }

  hide() {
    this.element.classList.add('hidden');
  }

  onStart(callback) {
    if (this.startBtn) {
      this.startBtn.addEventListener('click', callback);
    }
  }
}
