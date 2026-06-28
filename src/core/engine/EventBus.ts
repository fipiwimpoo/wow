export type CombatEvent =
  | 'ON_COMBAT_START'
  | 'ON_ROUND_START'
  | 'ON_BUILD_DICE_POOL'
  | 'ON_ROLL'
  | 'ON_AFTER_ROLL'
  | 'ON_REROLL'
  | 'ON_PLACE_TOKEN'
  | 'ON_DAMAGE_RECEIVED'
  | 'ON_ENEMY_TURN'
  | 'ON_ROUND_END'
  | 'ON_ENTITY_DEFEATED'
  | 'ON_COMBAT_END'
  | 'ON_PHASE_CHANGE';

export type EventHandler = (payload?: any) => void;

export class EventBus {
  private listeners: Map<CombatEvent, EventHandler[]> = new Map();

  subscribe(event: CombatEvent, handler: EventHandler) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(handler);
  }

  unsubscribe(event: CombatEvent, handler: EventHandler) {
    if (!this.listeners.has(event)) return;
    const handlers = this.listeners.get(event)!;
    this.listeners.set(event, handlers.filter(h => h !== handler));
  }

  emit(event: CombatEvent, payload?: any) {
    if (this.listeners.has(event)) {
      this.listeners.get(event)!.forEach(handler => handler(payload));
    }
  }

  clear() {
    this.listeners.clear();
  }
}
