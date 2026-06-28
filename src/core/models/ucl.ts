import { z } from "zod";

export const zUCLColor = z.enum(["RED", "BLUE", "GREEN", "BLACK", "ANY"]);
export const zUCLOperator = z.enum(["EQ", "GTE", "LTE", "GT", "LT", "BETWEEN"]);
export const zUCLActivation = z.enum(["MANDATORY", "OPTIONAL"]);

export const zUCLAmountType = z.enum([
  "FIXED",
  "CHARACTER_LEVEL",
  "TOKEN_COUNT",
  "EQUIPPED_ITEM_LEVEL",
  "PARTICIPATING_ALLIES_COUNT",
  "SPOTTED_DICE_COUNT",
  "ALL"
]);

export const zUCLAmount = z.object({
  type: zUCLAmountType,
  value: z.number().optional(),
  tokenType: z.string().optional(),
  source: z.string().optional(),
  itemTypes: z.array(z.string()).optional()
});

export const zUCLTrigger = z.enum([
  "PASSIVE_WHILE_EQUIPPED",
  "ON_ACQUIRE",
  "ON_EQUIP",
  "ON_UNEQUIP",
  "START_FACTION_TURN",
  "START_YOUR_ACTION",
  "END_YOUR_ACTION",
  "START_COMBAT",
  "START_FIRST_ROUND_OF_COMBAT",
  "START_COMBAT_ROUND",
  "END_COMBAT_ROUND",
  "AFTER_ROLLING_DICE_POOL",
  "START_DICE_POOL_STEP",
  "DURING_DICE_POOL_STEP",
  "END_DICE_POOL_STEP",
  "START_REROLL_STEP",
  "DURING_REROLL_STEP",
  "END_REROLL_STEP",
  "START_PLACE_TOKENS_STEP",
  "DURING_PLACE_TOKENS_STEP",
  "END_PLACE_TOKENS_STEP",
  "START_RANGED_STRIKE_STEP",
  "END_RANGED_STRIKE_STEP",
  "START_RESOLUTION_STEP",
  "DURING_RESOLUTION_STEP",
  "END_RESOLUTION_STEP",
  "ON_HEALTH_LOST",
  "ON_ENERGY_SPENT",
  "ON_ENEMY_DEFEATED",
  "ON_CARD_DISCARDED",
  "ON_CONSUMABLE_USED",
  "BEFORE_TRAVEL_ACTION",
  "START_TRAVEL_ACTION",
  "DURING_TRAVEL_ACTION",
  "END_TRAVEL_ACTION",
  "START_REST_ACTION",
  "DURING_REST_ACTION",
  "END_REST_ACTION",
  "BEFORE_CHALLENGE",
  "AFTER_CHALLENGE",
  "BEFORE_ATTACK",
  "AFTER_ATTACK",
  "BEFORE_DEFENSE",
  "AFTER_DEFENSE",
  "END_COMBAT"
]);

export const zUCLConditionType = z.enum([
  "NONE",
  "SPOT_DIE_RESULT",
  "SPOT_DIE_COLOR",
  "SPOT_DICE_COUNT",
  "HAS_DIE_IN_POOL",
  "NO_DICE_OF_COLOR_ROLLED",
  "HAS_EQUIPPED_ITEM_TYPE",
  "HAS_EQUIPPED_WEAPON_TYPE",
  "HAS_EQUIPPED_ARMOR_TYPE",
  "HAS_ENERGY_AT_LEAST",
  "HAS_ENERGY_AT_MOST",
  "HAS_HEALTH_AT_LEAST",
  "HAS_HEALTH_AT_MOST",
  "HAS_LOST_HEALTH_THIS_STEP",
  "HAS_SPENT_ENERGY_THIS_STEP",
  "HAS_TOKEN_ON_CARD",
  "HAS_TOKEN_IN_BOX",
  "PARTICIPATING_CHARACTER_COUNT_AT_LEAST",
  "PARTICIPATING_ALLY_COUNT_AT_LEAST",
  "IS_FIRST_ROUND_OF_COMBAT",
  "IS_COMBAT_ROUND_NUMBER",
  "IS_ATTACKING",
  "IS_DEFENDING",
  "IS_TRAVELING",
  "IS_RESTING",
  "REGION_CONTAINS_CREATURE_TYPE",
  "REGION_CONTAINS_INDEPENDENT_CREATURE",
  "HAS_ITEM_IN_BAG",
  "HAS_BAG_SPACE",
  "HAS_CLASS",
  "HAS_FACTION",
  "HAS_LEVEL_AT_LEAST",
  "ONCE_PER_COMBAT_AVAILABLE",
  "ONCE_PER_ROUND_AVAILABLE",
  "ONCE_PER_TURN_AVAILABLE"
]);

export const zUCLCostType = z.enum([
  "NONE",
  "DISCARD_THIS_CARD",
  "DISCARD_ANOTHER_CARD",
  "UNEQUIP_THIS_ITEM",
  "UNEQUIP_ITEM",
  "DESTROY_THIS_ITEM",
  "SPEND_HEALTH",
  "SPEND_ENERGY",
  "SPEND_GOLD",
  "REMOVE_DIE_FROM_POOL",
  "REMOVE_SPECIFIC_RESULT",
  "REMOVE_TOKEN_FROM_CARD",
  "REMOVE_TOKEN_FROM_BOX",
  "LOSE_ATTRITION",
  "LOSE_REROLL",
  "SPEND_ACTION",
  "EXHAUST_ITEM",
  "ONCE_PER_ROUND",
  "ONCE_PER_COMBAT",
  "ONCE_PER_GAME",
  "PAY_VARIABLE_COST"
]);

export const zUCLEffectType = z.enum([
  "ADD_DICE",
  "ROLL_EXTRA_DIE",
  "CHOOSE_DICE_POOL_OPTION",
  "REROLL_DICE",
  "ADD_REROLL_BONUS",
  "SET_REROLL_VALUE",
  "TRANSFORM_DIE",
  "ADD_TO_DIE_VALUE",
  "SUBTRACT_FROM_DIE_VALUE",
  "LOCK_DIE",
  "UNLOCK_DIE",
  "COUNT_SPOTTED_DICE",
  "REPEAT_EFFECT_PER_SPOTTED_DIE",
  "ENABLE_SPOT_EFFECT",
  "ADD_ATTRITION",
  "ADD_DAMAGE",
  "REDUCE_DAMAGE",
  "IGNORE_DAMAGE",
  "PREVENT_HEALTH_LOSS",
  "LOWER_PARTICIPATING_CREATURE_HEALTH_VALUE",
  "LOWER_CREATURE_ATTACK_VALUE",
  "EXTRA_ATTACK",
  "SKIP_ATTACK",
  "DEFEAT_ENEMY",
  "GAIN_HEALTH",
  "LOSE_HEALTH",
  "INCREASE_MAX_HEALTH",
  "RESTORE_ALL_HEALTH",
  "GAIN_ENERGY",
  "LOSE_ENERGY",
  "INCREASE_MAX_ENERGY",
  "RESTORE_ALL_ENERGY",
  "LOSE_ENERGY_ABOVE_NORMAL_CAPACITY",
  "RESTORE_HEALTH_AND_ENERGY_TO_CAPACITY",
  "GAIN_HEALTH_AND_ENERGY_COMBINATION",
  "PLACE_ARMOR_TOKEN",
  "PLACE_HIT_TOKEN",
  "REMOVE_TOKEN",
  "MOVE_TOKEN",
  "CONVERT_TOKEN",
  "IGNORE_BAG_LIMIT",
  "DRAW_CARD",
  "DISCARD_CARD",
  "SEARCH_CARD",
  "GAIN_ITEM",
  "EQUIP_ITEM",
  "UNEQUIP_ITEM",
  "LOOK_AT_TOP_CARD_OF_DECK",
  "ALLOW_TRAVEL_WITH_INDEPENDENT_CREATURES",
  "IGNORE_STOP_ON_CREATURE_COLOR",
  "TELEPORT_TO_FACTION_STARTING_REGION",
  "MOVE_TO_ADJACENT_REGION",
  "EXTRA_TRAVEL_MOVE",
  "IGNORE_TRAVEL_COST",
  "AVOID_ENCOUNTER",
  "ROLL_AND_COMPARE",
  "CONDITIONAL_BRANCH",
  "TEMPORARY_MODIFIER",
  "DELAYED_EFFECT"
]);

export const zUCLTarget = z.enum([
  "SELF",
  "ALLY",
  "PARTY",
  "PARTICIPATING_ALLIES",
  "PARTICIPATING_CREATURE",
  "ALL_PARTICIPATING_CREATURES",
  "ENEMY",
  "ALL_ENEMIES",
  "ANY_CHARACTER",
  "SELF_DICE_POOL",
  "SELF_DEFENSE_BOX",
  "SELF_DAMAGE_BOX",
  "THIS_CARD",
  "EQUIPPED_ITEM",
  "BAG_ITEM",
  "CURRENT_REGION",
  "ENTERED_REGION",
  "ANY_FACTION_QUEST_DECK",
  "FACTION_STARTING_REGION"
]);

export const zUCLDuration = z.enum([
  "INSTANT",
  "WHILE_EQUIPPED",
  "UNTIL_END_OF_STEP",
  "UNTIL_END_OF_REROLL_STEP",
  "UNTIL_END_OF_RANGED_STRIKE_STEP",
  "UNTIL_END_OF_ROUND",
  "UNTIL_END_OF_COMBAT",
  "UNTIL_END_OF_ACTION",
  "UNTIL_NEXT_REST",
  "PERMANENT"
]);

export const zUCLRestriction = z.enum([
  "ONE_POTION_PER_COMBAT_ROUND",
  "ONE_SCROLL_PER_COMBAT_ROUND",
  "ONE_USE_PER_ROUND",
  "ONE_USE_PER_COMBAT",
  "BAG_LIMIT_EXEMPT",
  "REROLL_RESTRICTION_ONLY_COLOR"
]);

export const zUCLCondition = z.object({
  type: zUCLConditionType
}).passthrough();

export const zUCLCost = z.object({
  type: zUCLCostType
}).passthrough();

export const zUCLEffect = z.object({
  type: zUCLEffectType
}).passthrough();

export const zUCLMechanic = z.object({
  id: z.string().optional(),
  trigger: zUCLTrigger,
  activation: zUCLActivation.default("MANDATORY"),
  conditions: z.array(zUCLCondition).default([]),
  costs: z.array(zUCLCost).default([]),
  effects: z.array(zUCLEffect).default([]),
  targets: z.array(zUCLTarget).default([]),
  duration: zUCLDuration.default("INSTANT"),
  restrictions: z.array(zUCLRestriction).default([]),
  notes: z.string().optional(),
  needsReview: z.boolean().optional()
}).passthrough();

export type ItemSlot = "MAIN_HAND" | "OFF_HAND" | "TWO_HAND" | "ARMOR" | "TRINKET" | "CONSUMABLE" | "NONE";
export type ItemType = "WEAPON" | "ARMOR" | "TRINKET" | "CONSUMABLE" | "QUEST_ITEM";
export type WeaponType = "SWORD" | "MACE" | "AXE" | "DAGGER" | "STAFF" | "WAND" | "BOW" | "GUN" | "NONE";
export type ArmorType = "CLOTH" | "LEATHER" | "MAIL" | "PLATE" | "SHIELD" | "NONE";

export type UCLColor = z.infer<typeof zUCLColor>;
export type UCLOperator = z.infer<typeof zUCLOperator>;
export type UCLActivation = z.infer<typeof zUCLActivation>;
export type UCLAmountType = z.infer<typeof zUCLAmountType>;
export type UCLAmount = z.infer<typeof zUCLAmount>;
export type UCLTrigger = z.infer<typeof zUCLTrigger>;
export type UCLConditionType = z.infer<typeof zUCLConditionType>;
export type UCLCostType = z.infer<typeof zUCLCostType>;
export type UCLEffectType = z.infer<typeof zUCLEffectType>;
export type UCLTarget = z.infer<typeof zUCLTarget>;
export type UCLDuration = z.infer<typeof zUCLDuration>;
export type UCLRestriction = z.infer<typeof zUCLRestriction>;
export type UCLCondition = z.infer<typeof zUCLCondition>;
export type UCLCost = z.infer<typeof zUCLCost>;
export type UCLEffect = z.infer<typeof zUCLEffect>;
export type UCLMechanic = z.infer<typeof zUCLMechanic>;
