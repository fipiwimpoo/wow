import { CombatEffectLog } from '../models/combat';
import { EventBus } from './EventBus';

export class CombatLogger {
  private logs: CombatEffectLog[] = [];

  constructor(private eventBus: EventBus) {}

  addLog(log: CombatEffectLog) {
    this.logs.push(log);
  }

  getLogs(): CombatEffectLog[] {
    return [...this.logs];
  }

  clear() {
    this.logs = [];
  }
}
