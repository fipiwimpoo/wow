import { EquipmentSlots } from './character';

export type SlotContentType = 
  | 'item' 
  | 'power' 
  | 'ability' 
  | 'talent' 
  | 'resource' 
  | 'token' 
  | 'note' 
  | 'generic';

export type ItemSlotRole = 
  | 'main_hand' 
  | 'off_hand' 
  | 'ranged_weapon' 
  | 'armor' 
  | 'helmet'
  | 'shield'
  | 'trinket' 
  | 'consumable' 
  | 'bag' 
  | 'quest_item' 
  | 'any_item';

export type ItemCategory = 'weapon' | 'armor' | 'trinket' | 'consumable' | 'quest' | 'miscellaneous';

export type WeaponSubtype = 
  | 'sword' | 'axe' | 'mace' | 'dagger' | 'staff' 
  | 'bow' | 'gun' | 'crossbow' | 'wand' | 'shield' | 'any_weapon';

export type ArmorSubtype = 'cloth' | 'leather' | 'mail' | 'plate' | 'shield' | 'any_armor';

export type HandRule = 'one_handed' | 'two_handed' | 'off_hand' | 'ranged' | 'none';

export interface CharacterSheetAsset {
  id: string;
  name: string;
  imageUrl?: string; // Optional if using imageAssetId
  imageAssetId?: string; // ID for IndexedDB blob
  classId?: string;
  raceId?: string;
  faction?: 'ALLIANCE' | 'HORDE';
  naturalWidth?: number;
  naturalHeight?: number;
  isCustom?: boolean;
}

export interface CharacterSheetSlot {
  id: string;
  label: string;
  slotType: SlotContentType; // Changed from SlotType
  
  // Coordinates
  xPercent: number;
  yPercent: number;
  widthPercent: number;
  heightPercent: number;
  rotation?: number;
  zIndex?: number;
  locked?: boolean;

  // Metadata
  accepts: string[]; // Legacy tags
  
  // Item specific metadata
  itemConfig?: {
    role?: ItemSlotRole;
    categories?: ItemCategory[];
    weaponSubtypes?: WeaponSubtype[];
    armorSubtypes?: ArmorSubtype[];
    handRules?: HandRule[];
    allowedClasses?: string[];
    allowedRaces?: string[];
  };
}

export interface CharacterSheetLayout {
  id: string;
  characterKey: string; // e.g. "orc_warrior"
  sheetAssetId: string;
  slots: CharacterSheetSlot[];
}

export const CHARACTER_SHEET_ASSETS: CharacterSheetAsset[] = [
  {
    id: "orc_warrior_sheet_bg",
    name: "Orc Warrior Official Sheet",
    imageUrl: "/assets/sheets/orc_warrior_sheet.png", // Mock URL
    classId: "WARRIOR",
    raceId: "ORC",
    faction: "HORDE"
  },
  {
    id: "human_paladin_sheet_bg",
    name: "Human Paladin Official Sheet",
    imageUrl: "/assets/sheets/human_paladin_sheet.png",
    classId: "PALADIN",
    raceId: "HUMAN",
    faction: "ALLIANCE"
  }
];

export const CHARACTER_SHEET_LAYOUTS: Record<string, CharacterSheetLayout> = {
  "orc_warrior_layout": {
    id: "orc_warrior_layout",
    characterKey: "orc_warrior",
    sheetAssetId: "orc_warrior_sheet_bg",
    slots: [
      {
        id: "mainHand",
        label: "Main Hand",
        slotType: "item",
        accepts: ["sword", "axe", "mace", "polearm", "staff", "weapon_1h", "weapon_2h"],
        xPercent: 12.5, yPercent: 45.0, widthPercent: 14.0, heightPercent: 22.0,
        itemConfig: {
          role: 'main_hand',
          categories: ['weapon'],
          weaponSubtypes: ['sword', 'axe', 'mace', 'any_weapon'],
          handRules: ['one_handed', 'two_handed'],
          allowedClasses: ['WARRIOR']
        }
      },
      {
        id: "offHand",
        label: "Off Hand",
        slotType: "item",
        accepts: ["shield", "weapon_1h", "offhand_item"],
        xPercent: 28.5, yPercent: 45.0, widthPercent: 14.0, heightPercent: 22.0,
        itemConfig: {
          role: 'off_hand',
          categories: ['weapon', 'armor'],
          weaponSubtypes: ['any_weapon'],
          armorSubtypes: ['shield'],
          handRules: ['off_hand'],
          allowedClasses: ['WARRIOR']
        }
      },
      {
        id: "armor",
        label: "Armor",
        slotType: "item",
        accepts: ["armor_mail", "armor_plate", "armor_leather", "armor"],
        xPercent: 44.5, yPercent: 45.0, widthPercent: 14.0, heightPercent: 22.0,
        itemConfig: {
          role: 'armor',
          categories: ['armor'],
          armorSubtypes: ['mail', 'plate'],
          allowedClasses: ['WARRIOR']
        }
      },
      {
        id: "trinket",
        label: "Trinket",
        slotType: "item",
        accepts: ["trinket"],
        xPercent: 60.5, yPercent: 45.0, widthPercent: 14.0, heightPercent: 22.0,
        itemConfig: {
          role: 'trinket',
          categories: ['trinket']
        }
      }
    ]
  }
};
