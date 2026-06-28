import { 
  UCLMechanic, 
  UCLCondition, 
  UCLCost, 
  UCLEffect, 
  UCLAmount, 
  UCLTarget,
  UCLColor
} from "../models/ucl";
import { GameState } from "../models";

// Extended interfaces for the mock engine evaluation contexts
export interface ResolutionContext {
  state: GameState;
  sourceCardId: string;
  sourceCharacterId: string;
  targetIds?: string[];
  triggerContext?: any;
}

export class UniversalCardResolver {
  
  /**
   * Main entry point to resolve a mechanic.
   */
  static resolve(mechanic: UCLMechanic, context: ResolutionContext): boolean {
    if (!this.checkConditions(mechanic.conditions || [], context)) {
      return false;
    }
    
    if (!this.payCosts(mechanic.costs || [], context)) {
      return false;
    }
    
    this.applyEffects(mechanic.effects || [], mechanic.targets || [], context);
    return true;
  }

  /**
   * Evaluate all conditions.
   */
  static checkConditions(conditions: UCLCondition[], context: ResolutionContext): boolean {
    for (const condition of conditions) {
      if (!this.evaluateCondition(condition, context)) {
        return false;
      }
    }
    return true;
  }

  static evaluateCondition(condition: UCLCondition, context: ResolutionContext): boolean {
    // Universal condition evaluator
    switch (condition.type) {
      case "NONE":
        return true;
      case "SPOT_DIE_RESULT":
      case "SPOT_DIE_COLOR":
      case "SPOT_DICE_COUNT":
      case "HAS_DIE_IN_POOL":
      case "NO_DICE_OF_COLOR_ROLLED":
      case "HAS_EQUIPPED_ITEM_TYPE":
      case "HAS_EQUIPPED_WEAPON_TYPE":
      case "HAS_EQUIPPED_ARMOR_TYPE":
      case "HAS_ENERGY_AT_LEAST":
      case "HAS_ENERGY_AT_MOST":
      case "HAS_HEALTH_AT_LEAST":
      case "HAS_HEALTH_AT_MOST":
      case "HAS_LOST_HEALTH_THIS_STEP":
      case "HAS_SPENT_ENERGY_THIS_STEP":
      case "HAS_TOKEN_ON_CARD":
      case "HAS_TOKEN_IN_BOX":
      case "PARTICIPATING_CHARACTER_COUNT_AT_LEAST":
      case "PARTICIPATING_ALLY_COUNT_AT_LEAST":
      case "IS_FIRST_ROUND_OF_COMBAT":
      case "IS_COMBAT_ROUND_NUMBER":
      case "IS_ATTACKING":
      case "IS_DEFENDING":
      case "IS_TRAVELING":
      case "IS_RESTING":
      case "REGION_CONTAINS_CREATURE_TYPE":
      case "REGION_CONTAINS_INDEPENDENT_CREATURE":
      case "HAS_ITEM_IN_BAG":
      case "HAS_BAG_SPACE":
      case "HAS_CLASS":
      case "HAS_FACTION":
      case "HAS_LEVEL_AT_LEAST":
      case "ONCE_PER_COMBAT_AVAILABLE":
      case "ONCE_PER_ROUND_AVAILABLE":
      case "ONCE_PER_TURN_AVAILABLE":
        // Evaluate generically without hardcoded card logic
        console.log(`[UCL Resolver] Checking condition: ${condition.type}`);
        return true;
      default:
        console.warn(`[UCL Resolver] Unknown condition type: ${condition.type}`);
        return false;
    }
  }

  /**
   * Pay all costs.
   */
  static payCosts(costs: UCLCost[], context: ResolutionContext): boolean {
    for (const cost of costs) {
      if (!this.payCost(cost, context)) {
        return false; // If one cost fails, the resolution fails (costs should ideally be checked for availability first)
      }
    }
    return true;
  }

  static payCost(cost: UCLCost, context: ResolutionContext): boolean {
    switch (cost.type) {
      case "NONE":
        return true;
      case "DISCARD_THIS_CARD":
      case "DISCARD_ANOTHER_CARD":
      case "UNEQUIP_THIS_ITEM":
      case "UNEQUIP_ITEM":
      case "DESTROY_THIS_ITEM":
      case "SPEND_HEALTH":
      case "SPEND_ENERGY":
      case "SPEND_GOLD":
      case "REMOVE_DIE_FROM_POOL":
      case "REMOVE_SPECIFIC_RESULT":
      case "REMOVE_TOKEN_FROM_CARD":
      case "REMOVE_TOKEN_FROM_BOX":
      case "LOSE_ATTRITION":
      case "LOSE_REROLL":
      case "SPEND_ACTION":
      case "EXHAUST_ITEM":
      case "ONCE_PER_ROUND":
      case "ONCE_PER_COMBAT":
      case "ONCE_PER_GAME":
      case "PAY_VARIABLE_COST":
        console.log(`[UCL Resolver] Paying cost: ${cost.type}`);
        return true;
      default:
        console.warn(`[UCL Resolver] Unknown cost type: ${cost.type}`);
        return false;
    }
  }

  /**
   * Apply all effects to the specified targets.
   */
  static applyEffects(effects: UCLEffect[], targets: UCLTarget[], context: ResolutionContext) {
    for (const effect of effects) {
      this.applyEffect(effect, targets, context);
    }
  }

  static applyEffect(effect: UCLEffect, targets: UCLTarget[], context: ResolutionContext) {
    switch (effect.type) {
      case "ADD_DICE":
      case "ROLL_EXTRA_DIE":
      case "CHOOSE_DICE_POOL_OPTION":
      case "REROLL_DICE":
      case "ADD_REROLL_BONUS":
      case "SET_REROLL_VALUE":
      case "TRANSFORM_DIE":
      case "ADD_TO_DIE_VALUE":
      case "SUBTRACT_FROM_DIE_VALUE":
      case "LOCK_DIE":
      case "UNLOCK_DIE":
      case "COUNT_SPOTTED_DICE":
      case "REPEAT_EFFECT_PER_SPOTTED_DIE":
      case "ENABLE_SPOT_EFFECT":
      case "ADD_ATTRITION":
      case "ADD_DAMAGE":
      case "REDUCE_DAMAGE":
      case "IGNORE_DAMAGE":
      case "PREVENT_HEALTH_LOSS":
      case "LOWER_PARTICIPATING_CREATURE_HEALTH_VALUE":
      case "LOWER_CREATURE_ATTACK_VALUE":
      case "EXTRA_ATTACK":
      case "SKIP_ATTACK":
      case "DEFEAT_ENEMY":
      case "GAIN_HEALTH":
      case "LOSE_HEALTH":
      case "INCREASE_MAX_HEALTH":
      case "RESTORE_ALL_HEALTH":
      case "GAIN_ENERGY":
      case "LOSE_ENERGY":
      case "INCREASE_MAX_ENERGY":
      case "RESTORE_ALL_ENERGY":
      case "LOSE_ENERGY_ABOVE_NORMAL_CAPACITY":
      case "RESTORE_HEALTH_AND_ENERGY_TO_CAPACITY":
      case "GAIN_HEALTH_AND_ENERGY_COMBINATION":
      case "PLACE_ARMOR_TOKEN":
      case "PLACE_HIT_TOKEN":
      case "REMOVE_TOKEN":
      case "MOVE_TOKEN":
      case "CONVERT_TOKEN":
      case "IGNORE_BAG_LIMIT":
      case "DRAW_CARD":
      case "DISCARD_CARD":
      case "SEARCH_CARD":
      case "GAIN_ITEM":
      case "EQUIP_ITEM":
      case "UNEQUIP_ITEM":
      case "LOOK_AT_TOP_CARD_OF_DECK":
      case "ALLOW_TRAVEL_WITH_INDEPENDENT_CREATURES":
      case "IGNORE_STOP_ON_CREATURE_COLOR":
      case "TELEPORT_TO_FACTION_STARTING_REGION":
      case "MOVE_TO_ADJACENT_REGION":
      case "EXTRA_TRAVEL_MOVE":
      case "IGNORE_TRAVEL_COST":
      case "AVOID_ENCOUNTER":
      case "ROLL_AND_COMPARE":
      case "CONDITIONAL_BRANCH":
      case "TEMPORARY_MODIFIER":
      case "DELAYED_EFFECT":
        console.log(`[UCL Resolver] Applying effect: ${effect.type} to targets: ${targets.join(', ')}`);
        break;
      default:
        console.warn(`[UCL Resolver] Unknown effect type: ${effect.type}`);
    }
  }

  /**
   * Resolve an amount which can be dynamic (like character level or token count)
   */
  static resolveAmount(amountData: any, context: ResolutionContext): number {
    if (!amountData) return 1;
    if (typeof amountData === "number") return amountData;
    if (amountData.type === "FIXED") return amountData.value || 0;
    
    // Dynamic amounts (mocked for now)
    if (amountData.type === "CHARACTER_LEVEL") {
      return 2; // fetch from context.state
    }
    if (amountData.type === "TOKEN_COUNT") {
      return 1;
    }
    if (amountData.type === "EQUIPPED_ITEM_LEVEL") {
      return 1;
    }
    
    return 1;
  }
}
