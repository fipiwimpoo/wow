import { z } from "zod";
import { zUCLMechanic } from "./ucl";

// --- Base Reference ---

export const zBaseCardReference = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(["ITEM", "POWER", "ENEMY_ABILITY", "STATUS"]),
  expansion: z.string().default("CORE"),
  tags: z.array(z.string()).default([]),
  text: z.string().optional(),
  draft: z.boolean().default(false),
  // Additional universal fields
  stackable: z.boolean().optional(),
  maxStacks: z.number().int().min(1).optional(),
  duration: z.number().int().min(1).optional(),
  expiresAt: z.enum(["END_OF_COMBAT", "END_OF_ROUND", "END_OF_ACTION", "NEVER"]).optional(),
  oncePerCombat: z.boolean().optional(),
  oncePerRound: z.boolean().optional(),
  requiresChoice: z.boolean().optional(),
});

// --- Specific Metadata ---

export const zItemMetadata = z.object({
  deckId: z.enum(["triangle", "square", "circle", "hexagon", "trophy"]).optional(),
  cardShape: z.enum(["triangle", "square", "circle", "hexagon", "trophy"]).optional(),
  itemType: z.enum(["WEAPON", "ARMOR", "TRINKET", "CONSUMABLE", "QUEST_ITEM"]),
  slot: z.enum(["MAIN_HAND", "OFF_HAND", "TWO_HAND", "ARMOR", "HELMET", "SHIELD", "TRINKET", "CONSUMABLE", "NONE"]).optional(),
  equipmentSlot: z.string().optional(),
  weaponType: z.enum(["SWORD", "MACE", "AXE", "DAGGER", "STAFF", "WAND", "BOW", "GUN", "SHIELD", "NONE"]).optional(),
  armorType: z.enum(["CLOTH", "LEATHER", "MAIL", "PLATE", "SHIELD", "NONE"]).optional(),
  requiredLevel: z.number().int().min(0).default(0),
  goldValue: z.number().int().min(0).default(0),
  handRequirement: z.number().optional(),
  equipLimit: z.number().optional(),
  usableByClasses: z.array(z.string()).optional(),
  usableByFactions: z.array(z.string()).optional(),
  bagLimitBehavior: z.enum(["NORMAL", "IGNORE", "TAKES_EXTRA_SPACE"]).optional(),
  
  // Advanced validation fields
  itemCategory: z.string().optional(), // weapon, armor, trinket, etc.
  weaponSubtype: z.string().optional(), // sword, axe, etc.
  armorSubtype: z.string().optional(), // cloth, leather, etc.
  handRule: z.string().optional(), // one_handed, two_handed, etc.
  allowedClasses: z.array(z.string()).optional(),
  allowedRaces: z.array(z.string()).optional(),
  tags: z.array(z.string()).default([]),
});

export const zPowerMetadata = z.object({
  class: z.string(),
  powerType: z.enum(["SPELL", "TALENT", "SKILL", "PASSIVE", "CLASS_FEATURE"]),
  requiredLevel: z.number().int().min(0).default(1),
  resourceType: z.enum(["ENERGY", "HEALTH", "MANA", "RAGE", "NONE"]).default("NONE"),
  resourceCost: z.number().int().min(0).default(0),
  range: z.enum(["MELEE", "RANGED", "SELF", "ANY"]).default("ANY"),
  targetType: z.enum(["SELF", "ENEMY", "ALLY", "ALL_ENEMIES", "ALL_ALLIES", "ANY"]).default("ENEMY"),
  school: z.string().optional(),
  cooldown: z.number().int().min(0).default(0),
  duration: z.number().int().min(0).optional(),
  timingWindow: z.string().optional(),
});

export const zEnemyAbilityMetadata = z.object({
  enemyType: z.string(),
  threat: z.number().int().min(1).default(1),
  targetPriority: z.enum(["HIGHEST_HEALTH", "LOWEST_HEALTH", "RANDOM", "HIGHEST_THREAT", "FRONT_ROW"]).default("RANDOM"),
  abilityType: z.enum(["ATTACK", "DEFENSE", "SPELL", "PASSIVE"]).default("ATTACK"),
  cooldown: z.number().int().min(0).default(0),
  triggerWeight: z.number().int().min(1).default(1),
});

export const zStatusMetadata = z.object({
  isDebuff: z.boolean().default(true),
  stackable: z.boolean().default(false),
  maxStacks: z.number().int().min(1).optional(),
  duration: z.number().int().min(1).optional(),
});

// --- Specific References ---

export const zItemCardReference = zBaseCardReference.extend({
  type: z.literal("ITEM"),
  deckId: z.enum(["triangle", "square", "circle", "hexagon", "trophy"]).optional(),
  metadata: zItemMetadata,
  mechanics: z.array(zUCLMechanic).default([])
});

export const zPowerCardReference = zBaseCardReference.extend({
  type: z.literal("POWER"),
  metadata: zPowerMetadata,
  mechanics: z.array(zUCLMechanic).default([])
});

export const zEnemyAbilityReference = zBaseCardReference.extend({
  type: z.literal("ENEMY_ABILITY"),
  metadata: zEnemyAbilityMetadata,
  mechanics: z.array(zUCLMechanic).default([])
});

export const zStatusReference = zBaseCardReference.extend({
  type: z.literal("STATUS"),
  metadata: zStatusMetadata,
  mechanics: z.array(zUCLMechanic).default([])
});

export const zCardReference = z.discriminatedUnion("type", [
  zItemCardReference,
  zPowerCardReference,
  zEnemyAbilityReference,
  zStatusReference
]);

// --- Types ---

export type BaseCardReference = z.infer<typeof zBaseCardReference>;
export type ItemCardReference = z.infer<typeof zItemCardReference>;
export type PowerCardReference = z.infer<typeof zPowerCardReference>;
export type EnemyAbilityReference = z.infer<typeof zEnemyAbilityReference>;
export type StatusReference = z.infer<typeof zStatusReference>;
export type CardReference = z.infer<typeof zCardReference>;

export type ItemMetadata = z.infer<typeof zItemMetadata>;
export type PowerMetadata = z.infer<typeof zPowerMetadata>;
export type EnemyAbilityMetadata = z.infer<typeof zEnemyAbilityMetadata>;
export type StatusMetadata = z.infer<typeof zStatusMetadata>;
