export const GameStates = { MENU: 'MENU', PLAYING: 'PLAYING', PAUSED: 'PAUSED', GAMEOVER: 'GAMEOVER' };

export class GameState {
  constructor() {
    this.state = GameStates.MENU;
    this.listeners = [];
  }

  setState(newState) {
    if (this.state === newState) return;
    const oldState = this.state;
    this.state = newState;
    this.listeners.forEach(cb => cb(this.state, oldState));
  }

  onStateChange(callback) {
    this.listeners.push(callback);
  }

  getState() {
    return this.state;
  }
}
