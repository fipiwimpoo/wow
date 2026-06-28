import { CombatPhase } from '../models/combat';

export class StateMachine {
  private currentState: CombatPhase = 'START_OF_COMBAT';

  // Defines valid transitions for the strict FSM.
  private validTransitions: Record<CombatPhase, CombatPhase[]> = {
    'START_OF_COMBAT': ['START_OF_FIRST_ROUND'],
    'START_OF_FIRST_ROUND': ['START_OF_DICE_POOL_STEP'],
    'START_OF_DICE_POOL_STEP': ['DICE_POOL_STEP'],
    'DICE_POOL_STEP': ['END_OF_DICE_POOL_STEP'],
    'END_OF_DICE_POOL_STEP': ['START_OF_REROLL_STEP'],
    'START_OF_REROLL_STEP': ['END_OF_REROLL_STEP'],
    'END_OF_REROLL_STEP': ['PLACE_TOKENS_STEP'],
    'PLACE_TOKENS_STEP': ['END_OF_COMBAT'],
    'END_OF_COMBAT': []
  };

  getState(): CombatPhase {
    return this.currentState;
  }

  canTransitionTo(nextState: CombatPhase): boolean {
    return this.validTransitions[this.currentState]?.includes(nextState) || false;
  }

  transitionTo(nextState: CombatPhase): boolean {
    if (this.canTransitionTo(nextState)) {
      this.currentState = nextState;
      return true;
    }
    console.warn(`[StateMachine] Invalid transition from ${this.currentState} to ${nextState}`);
    return false;
  }

  forceSetState(state: CombatPhase) {
    this.currentState = state;
  }
}
