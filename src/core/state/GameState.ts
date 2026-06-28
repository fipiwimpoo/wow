import { GameState } from '../models';

export class StateManager {
  private state: GameState | null = null;
  
  constructor() {}
  
  getState(): GameState | null {
    return this.state;
  }
}
