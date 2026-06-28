import { deleteSheetImage, getSheetImage, clearSheetStore } from './db';
import { CharacterSheetAsset, CharacterSheetLayout } from '../models/layouts';
import { CHARACTER_SHEET_ASSETS } from '../models/layouts';

export interface DeleteResult {
  deletedAsset: boolean;
  deletedImage: boolean;
  removedLayouts: string[];
  removedAssociations: string[];
}

export async function deleteCustomSheetCascade(sheetId: string): Promise<DeleteResult> {
  console.log("[SheetPersistence] deleteCustomSheetCascade start", sheetId);
  
  const assetsJson = localStorage.getItem('custom_sheet_assets');
  if (!assetsJson) throw new Error("No hay hojas custom registradas.");
  
  const assets: CharacterSheetAsset[] = JSON.parse(assetsJson);
  const sheet = assets.find(a => a.id === sheetId);
  
  if (!sheet) {
    throw new Error(`La hoja ${sheetId} no existe en la biblioteca.`);
  }
  
  if (!sheet.isCustom) {
    throw new Error("No se pueden eliminar hojas oficiales.");
  }

  const result: DeleteResult = {
    deletedAsset: false,
    deletedImage: false,
    removedLayouts: [],
    removedAssociations: []
  };

  // 1. Delete image from IndexedDB
  if (sheet.imageAssetId) {
    try {
      await deleteSheetImage(sheet.imageAssetId);
      result.deletedImage = true;
    } catch (err) {
      console.warn("[SheetPersistence] Could not delete image from IndexedDB", err);
    }
  }

  // 2. Remove metadata from localStorage
  const updatedAssets = assets.filter(a => a.id !== sheetId);
  localStorage.setItem('custom_sheet_assets', JSON.stringify(updatedAssets));
  result.deletedAsset = true;

  // 3. Delete specific layout data layout_${sheetId}
  localStorage.removeItem(`layout_${sheetId}`);
  result.removedLayouts.push(`layout_${sheetId}`);

  // 4. Remove associations from character_sheet_layouts_map
  const layoutsMapJson = localStorage.getItem('character_sheet_layouts_map');
  if (layoutsMapJson) {
    const layoutsMap = JSON.parse(layoutsMapJson);
    const keysToDelete: string[] = [];
    
    for (const key in layoutsMap) {
      const entry = layoutsMap[key];
      if (!entry) continue;

      if (
        entry.sheetAssetId === sheetId ||
        entry.id === `${sheetId}_layout` ||
        entry.layoutId === `${sheetId}_layout` ||
        entry.sheetId === sheetId ||
        key.includes(sheetId)
      ) {
        keysToDelete.push(key);
      }
    }
    
    for (const key of keysToDelete) {
      delete layoutsMap[key];
      result.removedAssociations.push(key);
    }
    
    localStorage.setItem('character_sheet_layouts_map', JSON.stringify(layoutsMap));
  }

  console.log("[SheetPersistence] deleteCustomSheetCascade finished", result);
  return result;
}

export async function clearAllCustomSheets(): Promise<void> {
  console.log("[SheetPersistence] clearAllCustomSheets start");
  
  const assetsJson = localStorage.getItem('custom_sheet_assets');
  if (assetsJson) {
    const assets: CharacterSheetAsset[] = JSON.parse(assetsJson);
    for (const sheet of assets) {
      if (sheet.imageAssetId) {
        await deleteSheetImage(sheet.imageAssetId);
      }
      localStorage.removeItem(`layout_${sheet.id}`);
    }
  }

  localStorage.removeItem('custom_sheet_assets');

  const layoutsMapJson = localStorage.getItem('character_sheet_layouts_map');
  if (layoutsMapJson) {
    const layoutsMap = JSON.parse(layoutsMapJson);
    const keysToDelete: string[] = [];
    
    for (const key in layoutsMap) {
      const entry = layoutsMap[key];
      if (!entry) continue;
      
      if (
        entry.id?.startsWith('custom_') || 
        entry.sheetAssetId?.startsWith('custom_') ||
        entry.layoutId?.startsWith('custom_') ||
        key.includes('custom_')
      ) {
        keysToDelete.push(key);
      }
    }
    
    for (const key of keysToDelete) {
      delete layoutsMap[key];
    }
    
    localStorage.setItem('character_sheet_layouts_map', JSON.stringify(layoutsMap));
  }

  await clearSheetStore();
  console.log("[SheetPersistence] clearAllCustomSheets finished");
}

export async function cleanOrphanCharacterSheetLinks(): Promise<number> {
  console.log("[SheetPersistence] cleanOrphanCharacterSheetLinks start");
  
  const layoutsMapJson = localStorage.getItem('character_sheet_layouts_map');
  if (!layoutsMapJson) return 0;
  
  const layoutsMap = JSON.parse(layoutsMapJson);
  const customAssetsJson = localStorage.getItem('custom_sheet_assets');
  const assets: CharacterSheetAsset[] = customAssetsJson ? JSON.parse(customAssetsJson) : [];
  
  const validAssetIds = new Set([
    ...CHARACTER_SHEET_ASSETS.map(a => a.id),
    ...assets.map(a => a.id)
  ]);
  
  let count = 0;
  const keysToDelete: string[] = [];
  
  for (const key in layoutsMap) {
    const assetId = layoutsMap[key].sheetAssetId;
    if (!validAssetIds.has(assetId)) {
      keysToDelete.push(key);
      count++;
    }
  }
  
  for (const key of keysToDelete) {
    delete layoutsMap[key];
  }
  
  if (count > 0) {
    localStorage.setItem('character_sheet_layouts_map', JSON.stringify(layoutsMap));
  }
  
  // Also clean orphan layout data files
  const keys = Object.keys(localStorage);
  for (const key of keys) {
    if (key.startsWith('layout_')) {
      const assetId = key.replace('layout_', '');
      if (!validAssetIds.has(assetId)) {
        localStorage.removeItem(key);
      }
    }
  }
  
  console.log("[SheetPersistence] cleanOrphanCharacterSheetLinks finished, removed", count);
  return count;
}
