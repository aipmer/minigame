export class PauseScreen {
  constructor() {
    this.element = document.getElementById('pause-screen');
    this.resumeBtn = document.getElementById('btn-resume');
    this.quitBtn = document.getElementById('btn-quit');
  }

  show() {
    this.element.classList.remove('hidden');
  }

  hide() {
    this.element.classList.add('hidden');
  }

  onResume(callback) {
    if (this.resumeBtn) {
      this.resumeBtn.addEventListener('click', callback);
    }
  }

  onQuit(callback) {
    if (this.quitBtn) {
      this.quitBtn.addEventListener('click', callback);
    }
  }
}
