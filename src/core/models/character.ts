import { CardReferenceIndex } from "../utils/cardReferenceIndex";
import { CardReferenceImporter } from "../utils/cardReferenceImporter";
import triangleYaml from "../../data/cards/items/items_core_triangle.yaml?raw";
import { OFFICIAL_CHARACTER_SHEETS } from "../../data/officialCharacters";

// Class progression stats for the board game (Levels 1 - 6)
export interface ClassProgression {
  maxHealth: number;
  maxEnergy: number;
}

export const CLASS_PROGRESSION_TABLE: Record<string, Record<number, ClassProgression>> = {
  WARRIOR: {
    1: { maxHealth: 4, maxEnergy: 1 },
    2: { maxHealth: 6, maxEnergy: 2 },
    3: { maxHealth: 8, maxEnergy: 3 },
    4: { maxHealth: 10, maxEnergy: 4 },
    5: { maxHealth: 12, maxEnergy: 5 },
    6: { maxHealth: 14, maxEnergy: 6 },
  },
  MAGE: {
    1: { maxHealth: 3, maxEnergy: 3 },
    2: { maxHealth: 4, maxEnergy: 4 },
    3: { maxHealth: 5, maxEnergy: 5 },
    4: { maxHealth: 6, maxEnergy: 6 },
    5: { maxHealth: 7, maxEnergy: 7 },
    6: { maxHealth: 8, maxEnergy: 8 },
  },
  ROGUE: {
    1: { maxHealth: 4, maxEnergy: 2 },
    2: { maxHealth: 5, maxEnergy: 3 },
    3: { maxHealth: 6, maxEnergy: 4 },
    4: { maxHealth: 7, maxEnergy: 5 },
    5: { maxHealth: 8, maxEnergy: 6 },
    6: { maxHealth: 9, maxEnergy: 7 },
  },
  PRIEST: {
    1: { maxHealth: 3, maxEnergy: 3 },
    2: { maxHealth: 4, maxEnergy: 4 },
    3: { maxHealth: 5, maxEnergy: 5 },
    4: { maxHealth: 6, maxEnergy: 6 },
    5: { maxHealth: 7, maxEnergy: 7 },
    6: { maxHealth: 8, maxEnergy: 8 },
  },
  WARLOCK: {
    1: { maxHealth: 4, maxEnergy: 2 },
    2: { maxHealth: 5, maxEnergy: 3 },
    3: { maxHealth: 6, maxEnergy: 4 },
    4: { maxHealth: 7, maxEnergy: 5 },
    5: { maxHealth: 8, maxEnergy: 6 },
    6: { maxHealth: 9, maxEnergy: 7 },
  },
  HUNTER: {
    1: { maxHealth: 4, maxEnergy: 2 },
    2: { maxHealth: 5, maxEnergy: 3 },
    3: { maxHealth: 6, maxEnergy: 4 },
    4: { maxHealth: 7, maxEnergy: 5 },
    5: { maxHealth: 8, maxEnergy: 6 },
    6: { maxHealth: 9, maxEnergy: 7 },
  },
  PALADIN: {
    1: { maxHealth: 4, maxEnergy: 2 },
    2: { maxHealth: 6, maxEnergy: 2 },
    3: { maxHealth: 7, maxEnergy: 3 },
    4: { maxHealth: 9, maxEnergy: 3 },
    5: { maxHealth: 10, maxEnergy: 4 },
    6: { maxHealth: 12, maxEnergy: 4 },
  },
  SHAMAN: {
    1: { maxHealth: 4, maxEnergy: 2 },
    2: { maxHealth: 5, maxEnergy: 3 },
    3: { maxHealth: 6, maxEnergy: 4 },
    4: { maxHealth: 7, maxEnergy: 5 },
    5: { maxHealth: 8, maxEnergy: 6 },
    6: { maxHealth: 9, maxEnergy: 7 },
  },
  DRUID: {
    1: { maxHealth: 4, maxEnergy: 2 },
    2: { maxHealth: 5, maxEnergy: 3 },
    3: { maxHealth: 6, maxEnergy: 4 },
    4: { maxHealth: 7, maxEnergy: 5 },
    5: { maxHealth: 8, maxEnergy: 6 },
    6: { maxHealth: 9, maxEnergy: 7 },
  }
};

export const CLASS_COLORS: Record<string, string> = {
  WARRIOR: "#C79C6E",
  MAGE: "#40C7EB",
  ROGUE: "#FFF569",
  PRIEST: "#FFFFFF",
  WARLOCK: "#8787ED",
  HUNTER: "#ABD473",
  PALADIN: "#F58CBA",
  SHAMAN: "#0070DE",
  DRUID: "#FF7D0A",
};

// Character definition metadata (races, initial stats, flavor)
export interface CharacterDefinition {
  classId: string;
  className: string;
  races: string[];
  baseRacialAbility: string;
  description: string;
}

export const CLASS_DEFINITIONS: Record<string, CharacterDefinition> = {
  WARRIOR: {
    classId: "WARRIOR",
    className: "Warrior",
    races: ["Human", "Orc", "Dwarf", "Undead"],
    baseRacialAbility: "Battle Shout: Spend 1 Energy to add 1 red die to your pool.",
    description: "Un combatiente de primera línea especializado en soportar castigo físico y asestar golpes devastadores.",
  },
  MAGE: {
    classId: "MAGE",
    className: "Mage",
    races: ["Human", "Gnome", "Undead", "Troll"],
    baseRacialAbility: "Arcane Intellect: Gain 1 extra reroll when casting spells.",
    description: "Un maestro del daño a distancia y control de masas empleando magia Arcana, de Fuego y de Escarcha.",
  },
  ROGUE: {
    classId: "ROGUE",
    className: "Rogue",
    races: ["Human", "Dwarf", "Night Elf", "Orc", "Undead", "Troll"],
    baseRacialAbility: "Evasion: Gain +1 green die to defend against physical attacks.",
    description: "Un asesino sigiloso y ágil que inflige daño masivo y esquiva ataques con suma facilidad.",
  },
  PRIEST: {
    classId: "PRIEST",
    className: "Priest",
    races: ["Human", "Dwarf", "Night Elf", "Undead", "Troll"],
    baseRacialAbility: "Power Word: Shield: Prevent 1 damage. Cooldown 1 round.",
    description: "Un sanador místico devoto a la Luz o la Sombra, vital para mantener con vida al grupo.",
  },
  HUNTER: {
    classId: "HUNTER",
    className: "Hunter",
    races: ["Dwarf", "Night Elf", "Orc", "Tauren", "Troll"],
    baseRacialAbility: "Track Beasts: +1 green die against Beast type creatures.",
    description: "Un rastreador experto a distancia acompañado de una fiel mascota que ataca de forma independiente.",
  },
  WARLOCK: {
    classId: "WARLOCK",
    className: "Warlock",
    races: ["Human", "Gnome", "Orc", "Undead"],
    baseRacialAbility: "Life Tap: Spend 1 Health to regain 1 Energy.",
    description: "Un invocador oscuro que drena la salud de sus enemigos y utiliza esbirros demoníacos.",
  },
  PALADIN: {
    classId: "PALADIN",
    className: "Paladin",
    races: ["Human", "Dwarf"],
    baseRacialAbility: "Lay on Hands: Heal an ally for full health once per game.",
    description: "Un guerrero sagrado que combina defensa impenetrable, sanación y auras protectoras.",
  },
  SHAMAN: {
    classId: "SHAMAN",
    className: "Shaman",
    races: ["Orc", "Tauren", "Troll"],
    baseRacialAbility: "Reincarnation: Revive with 1 Health once per game.",
    description: "Un guía espiritual que invoca tótems elementales para potenciar al grupo e infligir daño.",
  },
  DRUID: {
    classId: "DRUID",
    className: "Druid",
    races: ["Night Elf", "Tauren"],
    baseRacialAbility: "Gift of nature: Can heal or gain energy depending on form chosen.",
    description: "Un cambiaformas versátil que adopta formas de bestia para actuar como tanque, sanador o DPS.",
  }
};

export interface OfficialCharacterDefinition {
  id: string;
  displayName: string;
  faction: 'ALLIANCE' | 'HORDE';
  raceId: string;
  classId: string;
  sheetAssetId: string;
  sheetKey?: string;
  racialPowerId: string;
  racialPowerName: string;
  racialPowerDesc: string;
  startingClassPowerIds: string[];
  startingEquipment: {
    mainHand: string | null;
    offHand: string | null;
    armor: string | null;
    helmet: string | null;
    shield: string | null;
    trinket: string | null;
  };
  allowedSlots: {
    mainHand: boolean;
    offHand: boolean;
    armor: boolean;
    helmet: boolean;
    shield: boolean;
    trinket: boolean;
  };
  progressionTableId: string;
  layoutId: string;
  description: string;
}

export const OFFICIAL_CHARACTER_DEFINITIONS: OfficialCharacterDefinition[] = [
  // --- ALLIANCE ---
  {
    id: "human_paladin",
    displayName: "Human Paladin",
    faction: "ALLIANCE",
    raceId: "HUMAN",
    classId: "PALADIN",
    sheetAssetId: "human_paladin_sheet",
    racialPowerId: "diplomacy",
    racialPowerName: "Diplomacy",
    racialPowerDesc: "Gain +1 gold value when trading or receiving quest rewards.",
    startingClassPowerIds: [],
    startingEquipment: { mainHand: null, offHand: null, armor: null, helmet: null, shield: null, trinket: null },
    allowedSlots: { mainHand: true, offHand: true, armor: true, helmet: true, shield: true, trinket: true },
    progressionTableId: "PALADIN",
    layoutId: "human_paladin_layout",
    description: "A holy warrior combining physical defense, healing magic, and defensive auras."
  },
  {
    id: "dwarf_hunter",
    displayName: "Dwarf Hunter",
    faction: "ALLIANCE",
    raceId: "DWARF",
    classId: "HUNTER",
    sheetAssetId: "dwarf_hunter_sheet",
    racialPowerId: "stoneform",
    racialPowerName: "Stoneform",
    racialPowerDesc: "Gain +1 Green Die to defend against physical damage.",
    startingClassPowerIds: [],
    startingEquipment: { mainHand: null, offHand: null, armor: null, helmet: null, shield: null, trinket: null },
    allowedSlots: { mainHand: true, offHand: true, armor: true, helmet: true, shield: true, trinket: true },
    progressionTableId: "HUNTER",
    layoutId: "dwarf_hunter_layout",
    description: "A marksman of the wilderness, fighting alongside a beast companion."
  },
  {
    id: "night_elf_druid",
    displayName: "Night Elf Druid",
    faction: "ALLIANCE",
    raceId: "NIGHT_ELF",
    classId: "DRUID",
    sheetAssetId: "night_elf_druid_sheet",
    racialPowerId: "shadowmeld",
    racialPowerName: "Shadowmeld",
    racialPowerDesc: "Reduce enemy targeting priority or gain +1 reroll when sneaking.",
    startingClassPowerIds: [],
    startingEquipment: { mainHand: null, offHand: null, armor: null, helmet: null, shield: null, trinket: null },
    allowedSlots: { mainHand: true, offHand: true, armor: true, helmet: true, shield: true, trinket: true },
    progressionTableId: "DRUID",
    layoutId: "night_elf_druid_layout",
    description: "A versatile shapeshifter capable of tanking, healing, or inflicting rapid damage."
  },
  {
    id: "gnome_mage",
    displayName: "Gnome Mage",
    faction: "ALLIANCE",
    raceId: "GNOME",
    classId: "MAGE",
    sheetAssetId: "gnome_mage_sheet",
    racialPowerId: "expansive_mind",
    racialPowerName: "Expansive Mind",
    racialPowerDesc: "Gain +1 Blue Die when resolving spells.",
    startingClassPowerIds: [],
    startingEquipment: { mainHand: null, offHand: null, armor: null, helmet: null, shield: null, trinket: null },
    allowedSlots: { mainHand: true, offHand: true, armor: true, helmet: true, shield: true, trinket: true },
    progressionTableId: "MAGE",
    layoutId: "gnome_mage_layout",
    description: "An intellect-focused caster specializing in massive elemental bursts."
  },
  {
    id: "human_priest",
    displayName: "Human Priest",
    faction: "ALLIANCE",
    raceId: "HUMAN",
    classId: "PRIEST",
    sheetAssetId: "human_priest_sheet",
    racialPowerId: "lights_grace",
    racialPowerName: "The Light's Grace",
    racialPowerDesc: "Spend 1 Energy to restore 1 HP to yourself or an ally.",
    startingClassPowerIds: [],
    startingEquipment: { mainHand: null, offHand: null, armor: null, helmet: null, shield: null, trinket: null },
    allowedSlots: { mainHand: true, offHand: true, armor: true, helmet: true, shield: true, trinket: true },
    progressionTableId: "PRIEST",
    layoutId: "human_priest_layout",
    description: "A divine caster specializing in shields, healing, and holy damage."
  },
  {
    id: "dwarf_warrior",
    displayName: "Dwarf Warrior",
    faction: "ALLIANCE",
    raceId: "DWARF",
    classId: "WARRIOR",
    sheetAssetId: "dwarf_warrior_sheet",
    racialPowerId: "frost_resistance",
    racialPowerName: "Frost Resistance",
    racialPowerDesc: "Gain +1 Green Die when defending against Frost attacks.",
    startingClassPowerIds: [],
    startingEquipment: { mainHand: null, offHand: null, armor: null, helmet: null, shield: null, trinket: null },
    allowedSlots: { mainHand: true, offHand: true, armor: true, helmet: true, shield: true, trinket: true },
    progressionTableId: "WARRIOR",
    layoutId: "dwarf_warrior_layout",
    description: "A heavy-armored vanguard who excels in high threat management and defensive stances."
  },
  {
    id: "night_elf_rogue",
    displayName: "Night Elf Rogue",
    faction: "ALLIANCE",
    raceId: "NIGHT_ELF",
    classId: "ROGUE",
    sheetAssetId: "night_elf_rogue_sheet",
    racialPowerId: "quickness",
    racialPowerName: "Quickness",
    racialPowerDesc: "Gain +1 Reroll during physical combat rounds.",
    startingClassPowerIds: [],
    startingEquipment: { mainHand: null, offHand: null, armor: null, helmet: null, shield: null, trinket: null },
    allowedSlots: { mainHand: true, offHand: true, armor: true, helmet: true, shield: true, trinket: true },
    progressionTableId: "ROGUE",
    layoutId: "night_elf_rogue_layout",
    description: "A stealthy rogue who inflicts bleed effects and excels in lethal dual-wield attacks."
  },
  {
    id: "gnome_warlock",
    displayName: "Gnome Warlock",
    faction: "ALLIANCE",
    raceId: "GNOME",
    classId: "WARLOCK",
    sheetAssetId: "gnome_warlock_sheet",
    racialPowerId: "escape_artist",
    racialPowerName: "Escape Artist",
    racialPowerDesc: "Remove 1 restriction status (Stun or Curse) once per combat.",
    startingClassPowerIds: [],
    startingEquipment: { mainHand: null, offHand: null, armor: null, helmet: null, shield: null, trinket: null },
    allowedSlots: { mainHand: true, offHand: true, armor: true, helmet: true, shield: true, trinket: true },
    progressionTableId: "WARLOCK",
    layoutId: "gnome_warlock_layout",
    description: "A dark summoner who controls demons and saps the health of their foes."
  },

  // --- HORDE ---
  {
    id: "orc_warrior",
    displayName: "Orc Warrior",
    faction: "HORDE",
    raceId: "ORC",
    classId: "WARRIOR",
    sheetAssetId: "orc_warrior_sheet",
    racialPowerId: "blood_fury",
    racialPowerName: "Blood Fury",
    racialPowerDesc: "Spend 1 Energy to add 1 red die to your pool.",
    startingClassPowerIds: [],
    startingEquipment: { mainHand: null, offHand: null, armor: null, helmet: null, shield: null, trinket: null },
    allowedSlots: { mainHand: true, offHand: true, armor: true, helmet: true, shield: true, trinket: true },
    progressionTableId: "WARRIOR",
    layoutId: "orc_warrior_layout",
    description: "A frontline combatant specialized in taking damage and landing heavy physical attacks."
  },
  {
    id: "tauren_hunter",
    displayName: "Tauren Hunter",
    faction: "HORDE",
    raceId: "TAUREN",
    classId: "HUNTER",
    sheetAssetId: "tauren_hunter_sheet",
    racialPowerId: "war_stomp",
    racialPowerName: "War Stomp",
    racialPowerDesc: "Stun 1 adjacent enemy at the start of combat.",
    startingClassPowerIds: [],
    startingEquipment: { mainHand: null, offHand: null, armor: null, helmet: null, shield: null, trinket: null },
    allowedSlots: { mainHand: true, offHand: true, armor: true, helmet: true, shield: true, trinket: true },
    progressionTableId: "HUNTER",
    layoutId: "tauren_hunter_layout",
    description: "A massive hunter with high base health and exceptional tracking abilities."
  },
  {
    id: "troll_shaman",
    displayName: "Troll Shaman",
    faction: "HORDE",
    raceId: "TROLL",
    classId: "SHAMAN",
    sheetAssetId: "troll_shaman_sheet",
    racialPowerId: "regeneration",
    racialPowerName: "Regeneration",
    racialPowerDesc: "Heal 1 HP at the start of your turn.",
    startingClassPowerIds: [],
    startingEquipment: { mainHand: null, offHand: null, armor: null, helmet: null, shield: null, trinket: null },
    allowedSlots: { mainHand: true, offHand: true, armor: true, helmet: true, shield: true, trinket: true },
    progressionTableId: "SHAMAN",
    layoutId: "troll_shaman_layout",
    description: "An elemental medium who summons totems to assist the party."
  },
  {
    id: "undead_warlock",
    displayName: "Undead Warlock",
    faction: "HORDE",
    raceId: "UNDEAD",
    classId: "WARLOCK",
    sheetAssetId: "undead_warlock_sheet",
    racialPowerId: "will_of_the_forsaken",
    racialPowerName: "Will of the Forsaken",
    racialPowerDesc: "Immunize against stun and fear effects.",
    startingClassPowerIds: [],
    startingEquipment: { mainHand: null, offHand: null, armor: null, helmet: null, shield: null, trinket: null },
    allowedSlots: { mainHand: true, offHand: true, armor: true, helmet: true, shield: true, trinket: true },
    progressionTableId: "WARLOCK",
    layoutId: "undead_warlock_layout",
    description: "A shadow-focused warlock utilizing health manipulation."
  },
  {
    id: "orc_shaman",
    displayName: "Orc Shaman",
    faction: "HORDE",
    raceId: "ORC",
    classId: "SHAMAN",
    sheetAssetId: "orc_shaman_sheet",
    racialPowerId: "hardiness",
    racialPowerName: "Hardiness",
    racialPowerDesc: "Reduce stun duration by 1 round.",
    startingClassPowerIds: [],
    startingEquipment: { mainHand: null, offHand: null, armor: null, helmet: null, shield: null, trinket: null },
    allowedSlots: { mainHand: true, offHand: true, armor: true, helmet: true, shield: true, trinket: true },
    progressionTableId: "SHAMAN",
    layoutId: "orc_shaman_layout",
    description: "A spiritual shaman using storm elements and heavy support skills."
  },
  {
    id: "tauren_druid",
    displayName: "Tauren Druid",
    faction: "HORDE",
    raceId: "TAUREN",
    classId: "DRUID",
    sheetAssetId: "tauren_druid_sheet",
    racialPowerId: "endurance",
    racialPowerName: "Endurance",
    racialPowerDesc: "Gain +1 maximum Health.",
    startingClassPowerIds: [],
    startingEquipment: { mainHand: null, offHand: null, armor: null, helmet: null, shield: null, trinket: null },
    allowedSlots: { mainHand: true, offHand: true, armor: true, helmet: true, shield: true, trinket: true },
    progressionTableId: "DRUID",
    layoutId: "tauren_druid_layout",
    description: "A durable druid shifting into bear, cat, or caster form."
  },
  {
    id: "troll_rogue",
    displayName: "Troll Rogue",
    faction: "HORDE",
    raceId: "TROLL",
    classId: "ROGUE",
    sheetAssetId: "troll_rogue_sheet",
    racialPowerId: "berserking",
    racialPowerName: "Berserking",
    racialPowerDesc: "Gain +1 Red Die if current Health is below 50%.",
    startingClassPowerIds: [],
    startingEquipment: { mainHand: null, offHand: null, armor: null, helmet: null, shield: null, trinket: null },
    allowedSlots: { mainHand: true, offHand: true, armor: true, helmet: true, shield: true, trinket: true },
    progressionTableId: "ROGUE",
    layoutId: "troll_rogue_layout",
    description: "An agile rogue using rapid dual-wielding and combo finishers."
  },
  {
    id: "undead_mage",
    displayName: "Undead Mage",
    faction: "HORDE",
    raceId: "UNDEAD",
    classId: "MAGE",
    sheetAssetId: "undead_mage_sheet",
    racialPowerId: "cannibalize",
    racialPowerName: "Cannibalize",
    racialPowerDesc: "Heal 2 HP by consuming a defeated non-demon creature.",
    startingClassPowerIds: [],
    startingEquipment: { mainHand: null, offHand: null, armor: null, helmet: null, shield: null, trinket: null },
    allowedSlots: { mainHand: true, offHand: true, armor: true, helmet: true, shield: true, trinket: true },
    progressionTableId: "MAGE",
    layoutId: "undead_mage_layout",
    description: "A cold, frost-and-shadow mage with superb sustain."
  },
  {
    id: "undead_priest",
    displayName: "Undead Priest",
    faction: "HORDE",
    raceId: "UNDEAD",
    classId: "PRIEST",
    sheetAssetId: "undead_priest_sheet",
    racialPowerId: "touch_of_weakness",
    racialPowerName: "Touch of Weakness",
    racialPowerDesc: "Deals 1 Shadow damage to an enemy when they strike you.",
    startingClassPowerIds: [],
    startingEquipment: { mainHand: null, offHand: null, armor: null, helmet: null, shield: null, trinket: null },
    allowedSlots: { mainHand: true, offHand: true, armor: true, helmet: true, shield: true, trinket: true },
    progressionTableId: "PRIEST",
    layoutId: "undead_priest_layout",
    description: "A dark shadow priest, focusing on health drain and shield manipulation."
  }
];

export interface EquipmentSlots {
  mainHand: string | null;  // mechanicalCardId
  offHand: string | null;   // mechanicalCardId
  armor: string | null;     // mechanicalCardId
  helmet: string | null;    // mechanicalCardId
  shield: string | null;    // mechanicalCardId
  trinket: string | null;   // mechanicalCardId
}

export interface BoardGameCharacter {
  id: string;
  name: string;
  classId: string; // e.g., "WARRIOR", "MAGE"
  race: string;    // e.g., "Human", "Orc"
  faction: 'ALLIANCE' | 'HORDE';
  characterDefinitionId: string;
  sheetKey?: string;
  level: number;   // 1 to 6
  currentHealth: number;
  currentEnergy: number;
  gold: number;
  xp: number;
  equipment: EquipmentSlots;
  inventory: string[];       // Bag items (mechanicalCardIds)
  spellbook: string[];       // Spells / Class powers (cardIds)
  talents: string[];         // Talents chosen (cardIds)
  racialAbilities: string[]; // Racial powers
  classAbilities: string[];  // Fixed class powers/passives
  statusTokens: {
    curse: boolean;
    stun: boolean;
  };
}

export interface ResolvedDicePool {
  red: number;
  blue: number;
  green: number;
}

export interface ResolvedPower {
  id: string;
  name: string;
  energyCost: number;
  timing: string;
  effect: string;
}

export interface ResolvedTriggeredEffect {
  id: string;
  name: string;
  trigger: string;
  condition: string;
  effect: string;
  activationMode: 'automatic' | 'optional' | 'cost';
  cost?: any;
  conditionType?: string;
  conditionPayload?: any;
  effectType?: string;
  effectPayload?: any;
}

export interface CharacterResolvedSheet {
  maxHealth: number;
  maxEnergy: number;
  dicePool: ResolvedDicePool;
  reroll: number;
  attrition: number;
  passiveEffects: string[];
  activatablePowers: ResolvedPower[];
  triggeredEffects: ResolvedTriggeredEffect[];
  restrictions: string[];
  // Backwards tracking of source contributions for UI transparency
  contributions: {
    dicePool: {
      red: Array<{ source: string; amount: number }>;
      blue: Array<{ source: string; amount: number }>;
      green: Array<{ source: string; amount: number }>;
    };
    reroll: Array<{ source: string; amount: number }>;
    attrition: Array<{ source: string; amount: number }>;
  };
}

export const BAG_CAPACITY = 3;

/**
 * Ensures the card index is loaded with the official YAML file
 */
export function ensureCardsLoaded() {
  if (CardReferenceIndex.getAllCards().length === 0) {
    console.log("[CharacterModel] Pre-populating CardReferenceIndex with items_core_triangle.yaml...");
    try {
      CardReferenceImporter.parseYamlContent(triangleYaml, "items_core_triangle.yaml");
    } catch (e) {
      console.error("[CharacterModel] Error parsing triangle YAML: ", e);
    }
  }
}

/**
 * Checks if an item counts toward the bag size limit.
 * Potions, foods, and items containing specific text do not count toward bag limit.
 */
export function doesItemCountTowardBagLimit(cardId: string): boolean {
  ensureCardsLoaded();
  const card = CardReferenceIndex.getCard(cardId);
  if (!card) return true;

  // Manual ignore based on typical consumable types or text
  const isConsumable = card.type === "ITEM" && (card as any).metadata?.itemType === "CONSUMABLE";
  if (isConsumable) return false;

  const text = (card.text || "").toLowerCase();
  if (text.includes("does not count toward your bag limit") || text.includes("bag limit exempt")) {
    return false;
  }

  // Also check raw effects of unmapped YAML structure
  const rawEffects = (card as any).rawEffects;
  if (Array.isArray(rawEffects)) {
    for (const effect of rawEffects) {
      if (typeof effect === "string" && effect.toLowerCase().includes("does not count toward your bag limit")) {
        return false;
      }
    }
  }

  return true;
}

/**
 * Calculates current bag occupied slots
 */
export function getBagUsage(inventory: string[]): number {
  return inventory.filter(doesItemCountTowardBagLimit).length;
}

/**
 * CharacterSheetResolver - Compiles character statistics and modifiers 
 * into a single unified character sheet for the UI and Combat Engine.
 */
export function CharacterSheetResolver(character: BoardGameCharacter): CharacterResolvedSheet {
  ensureCardsLoaded();

  const classId = character.classId.toUpperCase();
  const level = character.level;

  // Base Stats from Progression Table
  const classProgressions = CLASS_PROGRESSION_TABLE[classId];
  const levelProgression = classProgressions?.[level] || { maxHealth: 4, maxEnergy: 1 };

  const resolved: CharacterResolvedSheet = {
    maxHealth: levelProgression.maxHealth,
    maxEnergy: levelProgression.maxEnergy,
    dicePool: { red: 0, blue: 0, green: 0 },
    reroll: 0,
    attrition: 0,
    passiveEffects: [],
    activatablePowers: [],
    triggeredEffects: [],
    restrictions: [],
    contributions: {
      dicePool: { red: [], blue: [], green: [] },
      reroll: [],
      attrition: []
    }
  };

  // 1. Add Base Class / Racial passive effects and active skills
  const officialDef = OFFICIAL_CHARACTER_SHEETS.find(d => d.id === character.characterDefinitionId);
  if (officialDef) {
    resolved.passiveEffects.push(`Racial: ${officialDef.racialPowerName}: ${officialDef.racialPowerDescription}`);
    // Extract base power as activatable
    if (officialDef.racialPowerDescription.includes("Spend 1 Energy") || officialDef.racialPowerDescription.includes("Spend 1 Health") || officialDef.racialPowerDescription.includes("Prevent 1 damage") || officialDef.racialPowerDescription.toLowerCase().includes("add 1 red die")) {
      resolved.activatablePowers.push({
        id: `racial-${character.classId}`,
        name: officialDef.racialPowerName,
        energyCost: officialDef.racialPowerDescription.includes("Spend 1 Energy") ? 1 : 0,
        timing: "Anytime / Combat Round",
        effect: officialDef.racialPowerDescription
      });
    }
  } else {
    const classDef = CLASS_DEFINITIONS[classId];
    if (classDef) {
      resolved.passiveEffects.push(`Racial: ${classDef.baseRacialAbility}`);
      // Extract base power as activatable
      if (classDef.baseRacialAbility.includes("Spend 1 Energy") || classDef.baseRacialAbility.includes("Spend 1 Health") || classDef.baseRacialAbility.includes("Prevent 1 damage")) {
        resolved.activatablePowers.push({
          id: `racial-${character.classId}`,
          name: classDef.baseRacialAbility.split(":")[0],
          energyCost: classDef.baseRacialAbility.includes("Spend 1 Energy") ? 1 : 0,
          timing: "Anytime / Combat Round",
          effect: classDef.baseRacialAbility
        });
      }
    }
  }

  // 2. Scan Equipped Items
  const equippedIds = [
    { slot: "Main Hand", id: character.equipment.mainHand },
    { slot: "Off Hand", id: character.equipment.offHand },
    { slot: "Armor", id: character.equipment.armor },
    { slot: "Helmet", id: character.equipment.helmet },
    { slot: "Shield", id: character.equipment.shield },
    { slot: "Trinket", id: character.equipment.trinket }
  ].filter(e => e.id !== null) as Array<{ slot: string; id: string }>;

  for (const { slot, id } of equippedIds) {
    const card = CardReferenceIndex.getCard(id);
    if (!card) continue;

    const sourceName = `${card.name} (${slot})`;

    // Check raw dice pool modifications
    const rawDicePool = (card as any).rawDicePool;
    if (rawDicePool) {
      if (rawDicePool.add) {
        const addPool = Array.isArray(rawDicePool.add) ? rawDicePool.add : [rawDicePool.add];
        for (const diceGroup of addPool) {
          if (diceGroup.red) {
            resolved.dicePool.red += diceGroup.red;
            resolved.contributions.dicePool.red.push({ source: sourceName, amount: diceGroup.red });
          }
          if (diceGroup.blue) {
            resolved.dicePool.blue += diceGroup.blue;
            resolved.contributions.dicePool.blue.push({ source: sourceName, amount: diceGroup.blue });
          }
          if (diceGroup.green) {
            resolved.dicePool.green += diceGroup.green;
            resolved.contributions.dicePool.green.push({ source: sourceName, amount: diceGroup.green });
          }
        }
      } else if (rawDicePool.choose_one) {
        // For choose_one, standard behavior is to default to first option or list it as passive effect for player choice
        const options = Array.isArray(rawDicePool.choose_one) ? rawDicePool.choose_one : [rawDicePool.choose_one];
        const optionDesc = options.map((o: any) => Object.entries(o).map(([k, v]) => `${v} ${k}`).join(", ")).join(" or ");
        resolved.passiveEffects.push(`${card.name} Choose Pool: ${optionDesc}`);
        
        // Let's add first option as active or write a passive effect
        // To be safe, let's add the first option to dicePool but log it
        const firstOpt = options[0];
        if (firstOpt) {
          if (firstOpt.red) {
            resolved.dicePool.red += firstOpt.red;
            resolved.contributions.dicePool.red.push({ source: `${sourceName} [Default Option]`, amount: firstOpt.red });
          }
          if (firstOpt.blue) {
            resolved.dicePool.blue += firstOpt.blue;
            resolved.contributions.dicePool.blue.push({ source: `${sourceName} [Default Option]`, amount: firstOpt.blue });
          }
          if (firstOpt.green) {
            resolved.dicePool.green += firstOpt.green;
            resolved.contributions.dicePool.green.push({ source: `${sourceName} [Default Option]`, amount: firstOpt.green });
          }
        }
      }
    }

    // Check metadata level additions if Zod validated
    if (card.type === "ITEM") {
      const item = card as any;
      if (item.mechanics) {
        for (const mechanic of item.mechanics) {
          // If validated via UCL Zod model
          if (mechanic.trigger === "PASSIVE_WHILE_EQUIPPED") {
            for (const effect of mechanic.effects) {
              if (effect.type === "ADD_DICE") {
                if (effect.color === "RED") {
                  resolved.dicePool.red += effect.value || 0;
                  resolved.contributions.dicePool.red.push({ source: sourceName, amount: effect.value || 0 });
                }
                if (effect.color === "BLUE") {
                  resolved.dicePool.blue += effect.value || 0;
                  resolved.contributions.dicePool.blue.push({ source: sourceName, amount: effect.value || 0 });
                }
                if (effect.color === "GREEN") {
                  resolved.dicePool.green += effect.value || 0;
                  resolved.contributions.dicePool.green.push({ source: sourceName, amount: effect.value || 0 });
                }
              }
              if (effect.type === "ADD_REROLL_BONUS") {
                resolved.reroll += effect.value || 0;
                resolved.contributions.reroll.push({ source: sourceName, amount: effect.value || 0 });
              }
              if (effect.type === "ADD_ATTRITION") {
                resolved.attrition += effect.value || 0;
                resolved.contributions.attrition.push({ source: sourceName, amount: effect.value || 0 });
              }
            }
          }
        }
      }
    }

    // Check raw effects (unstructured YAML)
    const rawEffects = (card as any).rawEffects;
    if (rawEffects) {
      for (const effect of rawEffects) {
        if (typeof effect === "object") {
          // Stat modifications
          if (effect.energy_capacity) {
            resolved.maxEnergy += effect.energy_capacity;
            resolved.passiveEffects.push(`${card.name}: +${effect.energy_capacity} Max Energy Capacity`);
          }
          if (effect.health_capacity) {
            resolved.maxHealth += effect.health_capacity;
            resolved.passiveEffects.push(`${card.name}: +${effect.health_capacity} Max Health Capacity`);
          }

          // Reroll additions
          if (effect.reroll) {
            resolved.reroll += effect.reroll;
            resolved.contributions.reroll.push({ source: sourceName, amount: effect.reroll });
          }
          // Attrition additions
          if (effect.attrition) {
            resolved.attrition += effect.attrition;
            resolved.contributions.attrition.push({ source: sourceName, amount: effect.attrition });
          }
          // Triggered effects (like trogg_club or potions)
          if (effect.trigger) {
            // Determine activation mode
            let activationMode: 'automatic' | 'optional' | 'cost' = effect.activationMode || effect.activation || 'automatic';
            
            // Legacy fallbacks / auto-detection if not specified
            if (!effect.activationMode && !effect.activation) {
              const effectText = ((effect.effect || "") + " " + (effect.penalty || "")).toLowerCase();
              if (effect.cost) {
                activationMode = 'cost';
              } else if (effectText.includes("you may")) {
                activationMode = 'optional';
              }
            }

            const effectDescription = effect.effect || effect.penalty || "";

            if (activationMode === 'optional' || activationMode === 'cost') {
              console.log("[ItemEffect] available optional effect", `${card.id}-${effect.trigger}`, card.id);
              console.log("[ItemEffect] blocked auto execution: requiresPlayerChoice", `${card.id}-${effect.trigger}`);
            }

            resolved.triggeredEffects.push({
              id: `${card.id}-${effect.trigger}-${resolved.triggeredEffects.length}`,
              name: card.name,
              trigger: effect.trigger,
              condition: effect.condition || "",
              effect: effectDescription,
              activationMode,
              cost: effect.cost,
              conditionType: effect.conditionType,
              conditionPayload: effect.conditionPayload,
              effectType: effect.effectType,
              effectPayload: effect.effectPayload
            });

            // Handle nested dice_pool in effects (if automatic/passive)
            if (effect.dice_pool && effect.dice_pool.add && activationMode === 'automatic') {
              const addPool = Array.isArray(effect.dice_pool.add) ? effect.dice_pool.add : [effect.dice_pool.add];
              for (const diceGroup of addPool) {
                if (diceGroup.red) {
                  resolved.dicePool.red += diceGroup.red;
                  resolved.contributions.dicePool.red.push({ source: `${sourceName} (Conditional)`, amount: diceGroup.red });
                }
                if (diceGroup.blue) {
                  resolved.dicePool.blue += diceGroup.blue;
                  resolved.contributions.dicePool.blue.push({ source: `${sourceName} (Conditional)`, amount: diceGroup.blue });
                }
                if (diceGroup.green) {
                  resolved.dicePool.green += diceGroup.green;
                  resolved.contributions.dicePool.green.push({ source: `${sourceName} (Conditional)`, amount: diceGroup.green });
                }
              }
            }
          }
          // Restrictions
          if (effect.restriction) {
            resolved.restrictions.push(`${card.name}: ${effect.restriction}`);
          }
        } else if (typeof effect === "string") {
          resolved.passiveEffects.push(`${card.name}: ${effect}`);
        }
      }
    }
  }

  // 3. Process status effect tokens
  if (character.statusTokens.curse) {
    resolved.restrictions.push("Curse active: Your dice pool results are hindered.");
    // In actual game, curse may remove a die or affect rerolls. Let's record it.
  }
  if (character.statusTokens.stun) {
    resolved.restrictions.push("Stun active: You cannot take actions or activate powers this round.");
  }

  return resolved;
}
