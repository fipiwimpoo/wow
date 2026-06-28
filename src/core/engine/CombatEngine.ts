import { EventBus } from './EventBus';
import { StateMachine } from './StateMachine';
import { ActionQueue } from './ActionQueue';
import { CombatLogger } from './CombatLog';
import { CombatState, createEmptyCombatTokens, CombatPhase, Die, CombatEffectLog } from '../models/combat';

export class CombatEngine {
  public eventBus: EventBus;
  public stateMachine: StateMachine;
  public actionQueue: ActionQueue;
  public logger: CombatLogger;
  
  public state: CombatState;
  
  private onStateChangeCallback?: (state: CombatState) => void;

  constructor() {
    this.eventBus = new EventBus();
    this.stateMachine = new StateMachine();
    this.actionQueue = new ActionQueue();
    this.logger = new CombatLogger(this.eventBus);
    
    this.state = this.getInitialState();
  }

  private getInitialState(): CombatState {
    return {
      phase: 'START_OF_COMBAT',
      round: 1,
      dicePool: [],
      effectLog: [],
      availableActions: [],
      tokens: createEmptyCombatTokens()
    };
  }

  onStateChange(callback: (state: CombatState) => void) {
    this.onStateChangeCallback = callback;
  }

  private emitStateChange() {
    // Sync state with latest logs and phase
    this.state.effectLog = this.logger.getLogs();
    this.state.phase = this.stateMachine.getState();
    if (this.onStateChangeCallback) {
      this.onStateChangeCallback({ ...this.state });
    }
  }

  startCombat() {
    this.actionQueue.enqueue(() => {
      this.state = this.getInitialState();
      this.stateMachine.forceSetState('START_OF_COMBAT');
      this.logger.clear();
      this.eventBus.emit('ON_COMBAT_START');
      this.emitStateChange();
    });
  }

  forceSetPhase(phase: CombatPhase) {
    this.actionQueue.enqueue(() => {
      this.stateMachine.forceSetState(phase);
      this.eventBus.emit('ON_PHASE_CHANGE', phase);
      this.emitStateChange();
    });
  }

  updateState(mutator: (state: CombatState) => void) {
    this.actionQueue.enqueue(() => {
      mutator(this.state);
      this.emitStateChange();
    });
  }
}
