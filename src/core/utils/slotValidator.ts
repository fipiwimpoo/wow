import { CharacterSheetSlot } from '../models/layouts';
import { ItemCardReference } from '../models/cardReference';
import { normalizeTerm } from './characterSheetLayoutResolver';

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

export function validateItemForSlot(item: ItemCardReference, slot: CharacterSheetSlot, characterClass: string, characterRace?: string): ValidationResult {
  if (slot.slotType !== 'item') {
    return { isValid: false, error: "Este slot no acepta ítems." };
  }

  const config = slot.itemConfig;
  if (!config) return { isValid: true }; // Generic item slot if no config

  const meta = item.metadata;
  if (!meta) return { isValid: false, error: "El objeto no tiene metadatos de sistema." };

  const itemCategory = normalizeTerm(meta.itemCategory || meta.itemType);
  const armorSubtype = normalizeTerm(meta.armorSubtype || meta.armorType);
  const weaponSubtype = normalizeTerm(meta.weaponSubtype || meta.weaponType);
  const handRule = normalizeTerm(meta.handRule || (meta.handRequirement === 2 ? 'TWO_HANDED' : 'ONE_HANDED'));
  const charClass = normalizeTerm(characterClass);
  const charRace = normalizeTerm(characterRace);

  const slotCategories = (config.categories || []).map(normalizeTerm);
  const slotArmorSubtypes = (config.armorSubtypes || []).map(normalizeTerm);
  const slotWeaponSubtypes = (config.weaponSubtypes || []).map(normalizeTerm);
  const slotHandRules = (config.handRules || []).map(normalizeTerm);
  const slotClasses = (config.allowedClasses || []).map(normalizeTerm);
  const slotRaces = (config.allowedRaces || []).map(normalizeTerm);

  // LOGS (Requested)
  console.log("[slotValidator] item", item.name, item.id);
  console.log("[slotValidator] slot", slot.label, slot.id);
  console.log("[slotValidator] itemCategory", itemCategory);
  console.log("[slotValidator] slotCategories", slotCategories);
  console.log("[slotValidator] item armorSubtype", armorSubtype);
  console.log("[slotValidator] slot armorSubtypes", slotArmorSubtypes);
  console.log("[slotValidator] classRestrictions", slotClasses);
  console.log("[slotValidator] raceRestrictions", slotRaces);
  console.log("[slotValidator] character class", charClass);
  console.log("[slotValidator] character race", charRace);

  // 1. Check Classes
  if (slotClasses.length > 0 && !slotClasses.includes('ANY') && !slotClasses.includes('ANY_CLASS')) {
    if (!slotClasses.includes(charClass)) {
      const result = { isValid: false, error: `Este personaje (${characterClass}) no puede usar este slot.` };
      console.log("[slotValidator] validation result", result);
      return result;
    }
  }

  // 2. Check Races
  if (slotRaces.length > 0 && !slotRaces.includes('ANY') && !slotRaces.includes('ANY_RACE')) {
    if (!slotRaces.includes(charRace)) {
      const result = { isValid: false, error: `Esta raza (${characterRace}) no puede usar este slot.` };
      console.log("[slotValidator] validation result", result);
      return result;
    }
  }

  // 3. Item Categories
  if (slotCategories.length > 0) {
    if (!slotCategories.includes(itemCategory) && !slotCategories.includes('ANY_ITEM') && !slotCategories.includes('ANY')) {
      const result = { isValid: false, error: `Este slot solo acepta: ${config.categories?.join(', ')}.` };
      console.log("[slotValidator] validation result", result);
      return result;
    }
  }

  // 4. Weapon Subtypes
  if (itemCategory === 'WEAPON' && slotWeaponSubtypes.length > 0) {
    if (!slotWeaponSubtypes.includes('ANY_WEAPON') && !slotWeaponSubtypes.includes('ANY') && !slotWeaponSubtypes.includes(weaponSubtype)) {
      const result = { isValid: false, error: `Este slot no acepta este tipo de arma: ${weaponSubtype}.` };
      console.log("[slotValidator] validation result", result);
      return result;
    }
  }

  // 5. Armor Subtypes
  if (itemCategory === 'ARMOR' && slotArmorSubtypes.length > 0) {
    if (!slotArmorSubtypes.includes('ANY_ARMOR') && !slotArmorSubtypes.includes('ANY') && !slotArmorSubtypes.includes(armorSubtype)) {
      const result = { isValid: false, error: `Este personaje no puede usar ${armorSubtype} en este slot.` };
      console.log("[slotValidator] validation result", result);
      return result;
    }
  }

  // 6. Hand Rules
  if (itemCategory === 'WEAPON' && slotHandRules.length > 0) {
    if (!slotHandRules.includes('ANY') && !slotHandRules.includes(handRule)) {
      const result = { isValid: false, error: `Este slot requiere una regla de mano diferente (${handRule}).` };
      console.log("[slotValidator] validation result", result);
      return result;
    }
  }

  const successResult = { isValid: true };
  console.log("[slotValidator] validation result", successResult);
  return successResult;
}
