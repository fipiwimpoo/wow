import { CharacterSheetLayout, CHARACTER_SHEET_LAYOUTS } from '../models/layouts';
import { BoardGameCharacter, OFFICIAL_CHARACTER_DEFINITIONS } from '../models/character';
import { CharacterSheetAsset } from '../models/layouts';

export interface ResolvedLayoutResult {
  layout: CharacterSheetLayout | null;
  asset: CharacterSheetAsset | null;
  resolvedKey: string;
  source: 'custom' | 'official' | 'default' | 'none';
}

const NORM_MAP: Record<string, string> = {
  // Factions
  'HORDA': 'HORDE',
  'ALIANZA': 'ALLIANCE',
  // Classes
  'GUERRERO': 'WARRIOR',
  'CAZADOR': 'HUNTER',
  'PALADÍN': 'PALADIN',
  'PALADIN': 'PALADIN',
  'MAGO': 'MAGE',
  'PÍCARO': 'ROGUE',
  'PICARO': 'ROGUE',
  'SACERDOTE': 'PRIEST',
  'CHAMÁN': 'SHAMAN',
  'CHAMAN': 'SHAMAN',
  'DRUIDA': 'DRUID',
  'BRUJO': 'WARLOCK',
  // Races
  'ORCO': 'ORC',
  'HUMANO': 'HUMAN',
  'ENANO': 'DWARF',
  'ELFO': 'ELF',
  'ELFO_DE_LA_NOCHE': 'NIGHT_ELF',
  'NIGHT ELF': 'NIGHT_ELF',
  'BLOOD ELF': 'BLOOD_ELF',
  'ELFO_DE_SANGRE': 'BLOOD_ELF',
  'DRAENEI': 'DRAENEI',
  'TAUREN': 'TAUREN',
  'TROLL': 'TROLL',
  'GNOMO': 'GNOME',
  'UNDEAD': 'UNDEAD',
  'NO_MUERTO': 'UNDEAD',
  'NOMUERTO': 'UNDEAD',
};

export function normalizeTerm(term: string | undefined): string {
  if (!term) return 'ANY';
  let t = term.trim().toUpperCase().replace(/[-\s]/g, '_');
  return NORM_MAP[t] || t;
}

export function resolveCharacterSheetLayout(character: BoardGameCharacter): ResolvedLayoutResult {
  const faction = normalizeTerm(character.faction);
  const race = normalizeTerm(character.race);
  const cls = normalizeTerm(character.classId);

  // Prioritize character.sheetKey if it exists (modern characters)
  const primaryKey = character.sheetKey || `${faction}_${race}_${cls}`;
  
  if (!character.sheetKey) {
    console.warn("[CharacterCreation] Legacy character without sheetKey, using generated:", primaryKey);
  }

  const candidateKeys = [
    primaryKey,
    `ANY_${race}_${cls}`,
    `${faction}_ANY_${cls}`,
    `ANY_ANY_${cls}`
  ];

  console.log("[LayoutResolver] Resolving for character:", character.name, `(Primary: ${primaryKey})`);
  console.log("[LayoutResolver] Candidate keys:", candidateKeys);

  console.log("[LayoutResolver] candidateKeys", candidateKeys);
  console.log("[LayoutResolver] skipping generic ANY_ANY_ANY because no explicit generic allowed");

  // 1. Check Custom Layouts Map
  const layoutsMapJson = localStorage.getItem('character_sheet_layouts_map');
  const layoutsMap = layoutsMapJson ? JSON.parse(layoutsMapJson) : {};

  for (const key of candidateKeys) {
    if (layoutsMap[key]) {
      const layout = layoutsMap[key] as CharacterSheetLayout;
      console.log("[LayoutResolver] Found custom layout via key:", key);
      
      // Resolve asset for this layout
      const asset = resolveAssetForLayout(layout);
      
      return {
        layout,
        asset,
        resolvedKey: key,
        source: 'custom'
      };
    }
  }

  // 2. Check Official Definition Backup
  const definition = OFFICIAL_CHARACTER_DEFINITIONS.find(d => d.id === character.characterDefinitionId);
  if (definition) {
    // Check if there's a custom layout saved specifically for this assetId (legacy but kept for safety)
    const assetId = definition.sheetAssetId;
    const savedLayoutJson = localStorage.getItem(`layout_${assetId}`);
    if (savedLayoutJson) {
      const layout = JSON.parse(savedLayoutJson) as CharacterSheetLayout;
      console.log("[LayoutResolver] Found custom layout via official assetId:", assetId);
      return {
        layout,
        asset: resolveAssetForLayout(layout),
        resolvedKey: definition.id,
        source: 'custom'
      };
    }

    // Official Layout Fallback
    const layoutId = definition.layoutId;
    if (CHARACTER_SHEET_LAYOUTS[layoutId]) {
      console.log("[LayoutResolver] Using official layout:", layoutId);
      const layout = CHARACTER_SHEET_LAYOUTS[layoutId];
      return {
        layout,
        asset: resolveAssetForLayout(layout),
        resolvedKey: layoutId,
        source: 'official'
      };
    }
  }

  // 3. No match found
  console.log("[LayoutResolver] No layout found for character.");
  return {
    layout: null,
    asset: null,
    resolvedKey: `${faction}_${race}_${cls}`,
    source: 'none'
  };
}

function resolveAssetForLayout(layout: CharacterSheetLayout): CharacterSheetAsset | null {
  if (!layout.sheetAssetId) return null;

  // Check Custom Library
  const customAssetsJson = localStorage.getItem('custom_sheet_assets');
  const customAssets: CharacterSheetAsset[] = customAssetsJson ? JSON.parse(customAssetsJson) : [];
  const customAsset = customAssets.find(a => a.id === layout.sheetAssetId);
  if (customAsset) return customAsset;

  // Check Official Library (if needed - currently using IDs)
  // For now, if not in custom, we return null and the renderer might handle official IDs if they were registered
  return null;
}
