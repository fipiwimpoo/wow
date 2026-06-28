import { create } from 'zustand';
import { 
  BoardGameCharacter, 
  CharacterResolvedSheet, 
  CharacterSheetResolver, 
  CLASS_PROGRESSION_TABLE, 
  CLASS_DEFINITIONS,
  BAG_CAPACITY,
  doesItemCountTowardBagLimit,
  getBagUsage,
  EquipmentSlots
} from '../models/character';
import { OFFICIAL_CHARACTER_SHEETS } from '../../data/officialCharacters';
import { CardReferenceIndex } from '../utils/cardReferenceIndex';
import { CharacterSheetLayout, CharacterSheetSlot } from '../models/layouts';
import { validateItemForSlot } from '../utils/slotValidator';
import { ItemCardReference } from '../models/cardReference';
import { resolveCharacterSheetLayout } from '../utils/characterSheetLayoutResolver';

interface CharacterState {
  activeCharacter: BoardGameCharacter | null;
  resolvedSheet: CharacterResolvedSheet | null;
  
  // Store Actions
  createCharacter: (name: string, definitionId: string) => void;
  deleteCharacter: () => void;
  updateStats: (healthDiff: number, energyDiff: number, goldDiff: number, xpDiff: number) => void;
  setLevel: (level: number) => void;
  toggleStatus: (status: 'curse' | 'stun') => void;
  
  // Equipment / Bag management
  gainItem: (itemId: string) => { success: boolean; error?: string };
  removeItem: (itemId: string) => void;
  equipItem: (itemId: string, slot: keyof EquipmentSlots, layoutSlot?: CharacterSheetSlot) => { success: boolean; error?: string };
  unequipItem: (slot: keyof EquipmentSlots) => { success: boolean; error?: string };
  
  // Spells / Talents management
  addSpell: (spellId: string) => void;
  removeSpell: (spellId: string) => void;
  addTalent: (talentId: string) => void;
  removeTalent: (talentId: string) => void;
  
  // Load and refresh
  loadCharacter: () => void;
  recalculateSheet: () => void;
}

const STORAGE_KEY = 'wow_board_game_character_save';

export const useCharacterStore = create<CharacterState>((set, get) => ({
  activeCharacter: null,
  resolvedSheet: null,

  createCharacter: (name, definitionId) => {
    const def = OFFICIAL_CHARACTER_SHEETS.find(d => d.id === definitionId);
    if (!def) {
      console.error("[CharacterStore] CharacterDefinition not found for ID:", definitionId);
      return;
    }

    const classIdUpper = def.classId.toUpperCase();
    
    const newChar: BoardGameCharacter = {
      id: `char-${Date.now()}`,
      name: name.trim() || def.displayName,
      classId: classIdUpper,
      race: def.race,
      faction: def.faction,
      characterDefinitionId: def.id,
      sheetKey: def.sheetKey,
      level: 1,
      currentHealth: def.hp,
      currentEnergy: def.energy,
      gold: 0,
      xp: 0,
      equipment: {
        mainHand: null,
        offHand: null,
        armor: null,
        helmet: null,
        shield: null,
        trinket: null,
      },
      inventory: [],
      spellbook: [],
      talents: [],
      racialAbilities: [def.racialPowerName],
      classAbilities: [],
      statusTokens: {
        curse: false,
        stun: false,
      },
    };

    const resolved = CharacterSheetResolver(newChar);
    
    set({
      activeCharacter: newChar,
      resolvedSheet: resolved
    });
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newChar));
    console.log("[CharacterStore] Created new character:", newChar);
  },

  deleteCharacter: () => {
    set({ activeCharacter: null, resolvedSheet: null });
    localStorage.removeItem(STORAGE_KEY);
  },

  updateStats: (healthDiff, energyDiff, goldDiff, xpDiff) => {
    const char = get().activeCharacter;
    const resolved = get().resolvedSheet;
    if (!char || !resolved) return;

    let nextHealth = char.currentHealth + healthDiff;
    if (nextHealth > resolved.maxHealth) nextHealth = resolved.maxHealth;
    if (nextHealth < 0) nextHealth = 0;

    let nextEnergy = char.currentEnergy + energyDiff;
    if (nextEnergy > resolved.maxEnergy) nextEnergy = resolved.maxEnergy;
    if (nextEnergy < 0) nextEnergy = 0;

    const nextGold = Math.max(0, char.gold + goldDiff);
    const nextXp = Math.max(0, char.xp + xpDiff);

    const updatedChar = {
      ...char,
      currentHealth: nextHealth,
      currentEnergy: nextEnergy,
      gold: nextGold,
      xp: nextXp
    };

    set({ activeCharacter: updatedChar });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedChar));
  },

  setLevel: (level) => {
    const char = get().activeCharacter;
    if (!char) return;

    const boundedLevel = Math.max(1, Math.min(6, level));
    const updatedChar = {
      ...char,
      level: boundedLevel
    };

    const resolved = CharacterSheetResolver(updatedChar);
    
    // Leveling up heals and restores energy to full capacities
    updatedChar.currentHealth = resolved.maxHealth;
    updatedChar.currentEnergy = resolved.maxEnergy;

    set({ activeCharacter: updatedChar, resolvedSheet: resolved });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedChar));
    console.log("[CharacterStore] Level updated to:", boundedLevel);
  },

  toggleStatus: (status) => {
    const char = get().activeCharacter;
    if (!char) return;

    const updatedChar = {
      ...char,
      statusTokens: {
        ...char.statusTokens,
        [status]: !char.statusTokens[status]
      }
    };

    const resolved = CharacterSheetResolver(updatedChar);
    set({ activeCharacter: updatedChar, resolvedSheet: resolved });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedChar));
  },

  gainItem: (itemId) => {
    const char = get().activeCharacter;
    if (!char) return { success: false, error: "No active character." };

    const itemCard = CardReferenceIndex.getCard(itemId);
    if (!itemCard) {
      return { success: false, error: `Card ID '${itemId}' not found in database.` };
    }

    // Verify bag space limits
    const currentBagUsage = getBagUsage(char.inventory);
    const counts = doesItemCountTowardBagLimit(itemId);

    if (counts && currentBagUsage >= BAG_CAPACITY) {
      return { 
        success: false, 
        error: `Mochila llena. Máximo de ${BAG_CAPACITY} ítems físicos excedido.` 
      };
    }

    const updatedChar = {
      ...char,
      inventory: [...char.inventory, itemId]
    };

    const resolved = CharacterSheetResolver(updatedChar);
    set({ activeCharacter: updatedChar, resolvedSheet: resolved });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedChar));

    return { success: true };
  },

  removeItem: (itemId) => {
    const char = get().activeCharacter;
    if (!char) return;

    const idx = char.inventory.indexOf(itemId);
    if (idx === -1) return;

    const updatedInv = [...char.inventory];
    updatedInv.splice(idx, 1);

    const updatedChar = {
      ...char,
      inventory: updatedInv
    };

    const resolved = CharacterSheetResolver(updatedChar);
    set({ activeCharacter: updatedChar, resolvedSheet: resolved });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedChar));
  },

  equipItem: (itemId, slot, layoutSlot) => {
    const char = get().activeCharacter;
    if (!char) return { success: false, error: "No active character." };

    const itemCard = CardReferenceIndex.getCard(itemId) as ItemCardReference;
    if (!itemCard) {
      return { success: false, error: "Item definition not found." };
    }

    // NEW: Always resolve active layout to find compatible slots
    const { layout } = resolveCharacterSheetLayout(char);
    
    // If layoutSlot was passed (legacy UI behavior), use it. 
    // Otherwise, find all candidate slots in the layout that match the role or id.
    const candidateSlots = layoutSlot ? [layoutSlot] : layout.slots.filter(s => {
      if (s.slotType !== 'item') return false;
      const role = s.itemConfig?.role;
      return s.id === slot || role === slot.replace(/([A-Z])/g, '_$1').toLowerCase();
    });

    console.log("[CharacterStore] equipItem candidate slots count:", candidateSlots.length);

    let finalSlot: CharacterSheetSlot | null = null;
    let lastError: string | null = null;

    // Try each candidate slot
    for (const s of candidateSlots) {
      const validation = validateItemForSlot(itemCard, s, char.classId, char.race);
      if (validation.isValid) {
        finalSlot = s;
        break;
      } else {
        lastError = validation.error || "Validación fallida.";
      }
    }

    if (!finalSlot) {
      return { success: false, error: lastError || `No se encontró un slot compatible para ${itemCard.name}.` };
    }

    // Process Equipping
    const nextInv = [...char.inventory];
    const itemIdx = nextInv.indexOf(itemId);
    if (itemIdx !== -1) {
      nextInv.splice(itemIdx, 1);
    }

    const previousEquipped = char.equipment[slot];
    if (previousEquipped) {
      nextInv.push(previousEquipped);
    }

    // Hand requirements: if equipping a Two-Hand weapon, unequip off-hand
    const itemMeta = itemCard.metadata;
    const itemSlot = itemMeta.slot || "NONE";
    
    let offHandToUnequip: string | null = null;
    if (slot === 'mainHand' && itemSlot === 'TWO_HAND') {
      if (char.equipment.offHand) {
        offHandToUnequip = char.equipment.offHand;
      }
    }

    const updatedEquipment = {
      ...char.equipment,
      [slot]: itemId
    };

    if (offHandToUnequip) {
      updatedEquipment.offHand = null;
      nextInv.push(offHandToUnequip);
    }

    const updatedChar = {
      ...char,
      equipment: updatedEquipment,
      inventory: nextInv
    };

    const resolved = CharacterSheetResolver(updatedChar);
    
    // Check for "on equip" effects like Ring of Infinite Wisdom
    const itemEffects = (itemCard as any).effects;
    if (itemEffects) {
      const onEquipRegain = itemEffects.find((e: any) => e.trigger === 'When you equip this card' && (e.effect || "").toLowerCase().includes('regain 1 energy'));
      if (onEquipRegain) {
        updatedChar.currentEnergy = Math.min(resolved.maxEnergy, updatedChar.currentEnergy + 1);
        console.log("[CharacterStore] Triggered on-equip energy regain");
      }
    }

    // Clamp stats to new capacities
    updatedChar.currentHealth = Math.min(updatedChar.currentHealth, resolved.maxHealth);
    updatedChar.currentEnergy = Math.min(updatedChar.currentEnergy, resolved.maxEnergy);

    set({ activeCharacter: updatedChar, resolvedSheet: resolved });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedChar));

    return { success: true };
  },

  unequipItem: (slot) => {
    const char = get().activeCharacter;
    if (!char) return { success: false, error: "No active character." };

    const itemId = char.equipment[slot];
    if (!itemId) return { success: false, error: "No item equipped in that slot." };

    // Check if bag space is available
    const usage = getBagUsage(char.inventory);
    const counts = doesItemCountTowardBagLimit(itemId);

    if (counts && usage >= BAG_CAPACITY) {
      return {
        success: false,
        error: `Mochila llena. Libera espacio antes de desequipar.`
      };
    }

    const updatedEquipment = {
      ...char.equipment,
      [slot]: null
    };

    const updatedChar = {
      ...char,
      equipment: updatedEquipment,
      inventory: [...char.inventory, itemId]
    };

    const resolved = CharacterSheetResolver(updatedChar);

    // Clamp stats to new capacities (e.g. if losing max energy/health from unequipped item)
    updatedChar.currentHealth = Math.min(updatedChar.currentHealth, resolved.maxHealth);
    updatedChar.currentEnergy = Math.min(updatedChar.currentEnergy, resolved.maxEnergy);

    set({ activeCharacter: updatedChar, resolvedSheet: resolved });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedChar));

    return { success: true };
  },

  addSpell: (spellId) => {
    const char = get().activeCharacter;
    if (!char) return;
    if (char.spellbook.includes(spellId)) return;

    const updatedChar = {
      ...char,
      spellbook: [...char.spellbook, spellId]
    };
    const resolved = CharacterSheetResolver(updatedChar);
    set({ activeCharacter: updatedChar, resolvedSheet: resolved });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedChar));
  },

  removeSpell: (spellId) => {
    const char = get().activeCharacter;
    if (!char) return;

    const updatedChar = {
      ...char,
      spellbook: char.spellbook.filter(id => id !== spellId)
    };
    const resolved = CharacterSheetResolver(updatedChar);
    set({ activeCharacter: updatedChar, resolvedSheet: resolved });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedChar));
  },

  addTalent: (talentId) => {
    const char = get().activeCharacter;
    if (!char) return;
    if (char.talents.includes(talentId)) return;

    const updatedChar = {
      ...char,
      talents: [...char.talents, talentId]
    };
    const resolved = CharacterSheetResolver(updatedChar);
    set({ activeCharacter: updatedChar, resolvedSheet: resolved });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedChar));
  },

  removeTalent: (talentId) => {
    const char = get().activeCharacter;
    if (!char) return;

    const updatedChar = {
      ...char,
      talents: char.talents.filter(id => id !== talentId)
    };
    const resolved = CharacterSheetResolver(updatedChar);
    set({ activeCharacter: updatedChar, resolvedSheet: resolved });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedChar));
  },

  loadCharacter: () => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as BoardGameCharacter;
        const resolved = CharacterSheetResolver(parsed);
        set({ activeCharacter: parsed, resolvedSheet: resolved });
        console.log("[CharacterStore] Loaded character successfully:", parsed);
      } catch (e) {
        console.error("[CharacterStore] Error parsing saved character data:", e);
      }
    }
  },

  recalculateSheet: () => {
    const char = get().activeCharacter;
    if (char) {
      const resolved = CharacterSheetResolver(char);
      set({ resolvedSheet: resolved });
    }
  }
}));
