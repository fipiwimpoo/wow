
export type DiceColor = 'red' | 'blue' | 'green' | 'black';

export interface Die {
  id: string;
  color: DiceColor;
  value: number;
  sourceCardId?: string;
  generatedByEffectId?: string;
  isNew: boolean;
  rerolled: boolean;
  isConsumed: boolean;
  placedToken?: boolean;
}

export type CombatPhase = 
  | 'START_OF_COMBAT'
  | 'START_OF_FIRST_ROUND'
  | 'START_OF_DICE_POOL_STEP'
  | 'DICE_POOL_STEP'
  | 'END_OF_DICE_POOL_STEP'
  | 'START_OF_REROLL_STEP'
  | 'END_OF_REROLL_STEP'
  | 'PLACE_TOKENS_STEP'
  | 'END_OF_COMBAT';

export interface CombatEffectLog {
  cardName: string;
  trigger: string;
  activationMode: 'automatic' | 'optional' | 'cost';
  conditionMet: boolean;
  autoExecuted: boolean;
  result: string;
  isLegacyFallback?: boolean;
}

export interface TokenInstance {
  id: string;
  type: "hit" | "armor" | "attrition";
  box: "damage" | "defense" | "attrition";
  sourceDieId?: string;
  sourceCardId?: string;
  createdAtStep: CombatPhase;
  isNew?: boolean;
}

export interface CombatStateTokens {
  damageBox: { hits: TokenInstance[] };
  defenseBox: { hits: TokenInstance[]; armor: TokenInstance[] };
  attritionBox: { hits: TokenInstance[] };
}

export function createEmptyCombatTokens(): CombatStateTokens {
  return {
    damageBox: { hits: [] },
    defenseBox: { hits: [], armor: [] },
    attritionBox: { hits: [] },
  };
}

export function normalizeCombatTokens(tokens?: any): CombatStateTokens {
  return {
    damageBox: {
      hits: Array.isArray(tokens?.damageBox?.hits) ? tokens.damageBox.hits : [],
    },
    defenseBox: {
      hits: Array.isArray(tokens?.defenseBox?.hits) ? tokens.defenseBox.hits : [],
      armor: Array.isArray(tokens?.defenseBox?.armor) ? tokens.defenseBox.armor : [],
    },
    attritionBox: {
      hits: Array.isArray(tokens?.attritionBox?.hits) ? tokens.attritionBox.hits : (Array.isArray(tokens?.attritionBox?.attrition) ? tokens.attritionBox.attrition : []),
    },
  };
}

export interface CombatState {
  phase: CombatPhase;
  round: number;
  dicePool: Die[];
  effectLog: CombatEffectLog[];
  availableActions: any[]; // To be defined
  tokens: CombatStateTokens;
}
