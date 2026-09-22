export class GameOverScreen {
  constructor() {
    this.element = document.getElementById('gameover-screen');
    this.retryBtn = document.getElementById('btn-retry');
    this.homeBtn = document.getElementById('btn-home');
  }

  show(results) {
    // results: { waves, score, maxStar, kills, reason }
    const waveEl = document.getElementById('result-waves');
    const coinsEl = document.getElementById('result-coins');
    const scoreEl = document.getElementById('result-score');
    const starEl = document.getElementById('result-max-star');
    const killsEl = document.getElementById('result-kills');
    const reasonEl = document.getElementById('gameover-reason-text');

    if (waveEl && results.waves !== undefined) waveEl.textContent = results.waves;
    if (coinsEl && results.coins !== undefined) coinsEl.textContent = `+${results.coins}`;
    if (scoreEl && results.score !== undefined) scoreEl.textContent = results.score;
    if (starEl && results.maxStar !== undefined) starEl.textContent = results.maxStar;
    if (killsEl && results.kills !== undefined) killsEl.textContent = results.kills;
    if (reasonEl && results.reason) reasonEl.textContent = results.reason;

    this.element.classList.remove('hidden');
  }

  hide() {
    this.element.classList.add('hidden');
  }

  onRetry(callback) {
    if (this.retryBtn) {
      this.retryBtn.addEventListener('click', callback);
    }
  }

  onHome(callback) {
    if (this.homeBtn) {
      this.homeBtn.addEventListener('click', callback);
    }
  }
}
