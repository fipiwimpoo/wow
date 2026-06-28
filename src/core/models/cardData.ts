import { ItemSlot, ItemType, WeaponType, ArmorType, UCLMechanic } from "./ucl";

export type ReviewState =
  | "visual_only"
  | "mechanics_only"
  | "linked_complete"
  | "needs_review"
  | "incomplete_data"
  | "data_pending"
  | "data_complete"
  | "verified";

export interface BaseCardData {
  cardId: string;
  assetId: string;
  type: string;
  title: string;
  expansion: string;
  faction: string;
  deckColor: string;
  linkedCardReferenceId?: string;
  linkedCardReferenceName?: string;
  dataSource?: "YAML_REFERENCE" | string;
  mechanics?: any[];
  metadata?: any;
}

export interface SpawnRule {
  creatureType: string;
  creatureColor: string;
  count: number;
  regionName: string;
  regionId: string;
  isRequiredForCompletion: boolean;
  spawnPlayableZoneId?: string;
  spawnPlayableZoneName?: string;
  spawnWorldRegionId?: string;
  spawnWorldRegionName?: string;
  creatureAssetId?: string;
  monsterId?: string;
  monsterName?: string;
  variantColor?: string;
  questOwnership?: "alliance" | "horde" | "neutral";
  spawnSource?: "quest_target" | "quest_elite" | "quest_boss" | "world_spawn";
}

export interface ItemReward {
  itemDeck: string;
  drawCount: number;
  keepCount: number;
}

export interface Rewards {
  xp: number;
  gold: number;
  itemRewards: ItemReward[];
  specialItems: string[];
}

export interface QuestCardData extends BaseCardData {
  type: "quest";
  questLevel: number;
  questArea: string;
  primaryRegion: string;
  spawnRegions: string[];
  flavorText: string;
  fullRulesText: string;
  notes: string;
  objectiveText: string;
  targetCreatures: SpawnRule[];
  independentCreatures: SpawnRule[];
  rewards: Rewards;
}

export interface ItemCardData extends BaseCardData {
  type: "item";
  itemType?: ItemType;
  slot?: ItemSlot;
  weaponType?: WeaponType;
  armorType?: ArmorType;
  level?: number;
  goldValue?: number;
  modifiers?: UCLMechanic[];
  deckId?: "triangle" | "square" | "circle" | "hexagon" | "trophy";
}
export interface PowerCardData extends BaseCardData {
  type: "power";
}
export interface TalentCardData extends BaseCardData {
  type: "talent";
}
export interface EventCardData extends BaseCardData {
  type: "event";
}
export interface DestinyCardData extends BaseCardData {
  type: "destiny";
}
export interface OverlordData extends BaseCardData {
  type: "overlord";
}
export interface DungeonCardData extends BaseCardData {
  type: "dungeon";
}

export type AnyCardData =
  | QuestCardData
  | ItemCardData
  | PowerCardData
  | TalentCardData
  | EventCardData
  | DestinyCardData
  | OverlordData
  | DungeonCardData;
