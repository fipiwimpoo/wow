import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  CharacterSheetAsset, 
  CharacterSheetSlot, 
  CharacterSheetLayout, 
  CHARACTER_SHEET_ASSETS,
  SlotContentType,
  ItemSlotRole,
  ItemCategory,
  WeaponSubtype,
  ArmorSubtype,
  HandRule
} from '../../../core/models/layouts';
import { 
  Settings, 
  Maximize, 
  Plus, 
  Trash2, 
  Download, 
  Upload, 
  Lock, 
  Unlock, 
  Eye, 
  EyeOff, 
  ChevronRight,
  Move,
  Type,
  Image as ImageIcon,
  Copy,
  FileJson,
  AlertTriangle,
  RotateCcw,
  Eraser
} from 'lucide-react';
import { useCharacterStore } from '../../../core/state/characterStore';
import { normalizeTerm } from '../../../core/utils/characterSheetLayoutResolver';
import { saveSheetImage } from '../../../core/utils/db';
import { useCharacterSheetImage } from '../../hooks/useCharacterSheetImage';
import { SheetCanvasFrame } from '../character/SheetCanvasFrame';
import { 
  deleteCustomSheetCascade, 
  clearAllCustomSheets, 
  cleanOrphanCharacterSheetLinks 
} from '../../../core/utils/characterSheetPersistence';

const SLOT_TYPES: SlotContentType[] = ['item', 'power', 'ability', 'talent', 'resource', 'token', 'note', 'generic'];
const ITEM_ROLES: ItemSlotRole[] = ['main_hand', 'off_hand', 'ranged_weapon', 'armor', 'helmet', 'shield', 'trinket', 'consumable', 'bag', 'quest_item', 'any_item'];
const ITEM_CATEGORIES: ItemCategory[] = ['weapon', 'armor', 'trinket', 'consumable', 'quest', 'miscellaneous'];
const WEAPON_SUBTYPES: WeaponSubtype[] = ['sword', 'axe', 'mace', 'dagger', 'staff', 'bow', 'gun', 'crossbow', 'wand', 'shield', 'any_weapon'];
const ARMOR_SUBTYPES: ArmorSubtype[] = ['cloth', 'leather', 'mail', 'plate', 'shield', 'any_armor'];
const HAND_RULES: HandRule[] = ['one_handed', 'two_handed', 'off_hand', 'ranged', 'none'];
const CLASSES = ['WARRIOR', 'HUNTER', 'PALADIN', 'ROGUE', 'PRIEST', 'SHAMAN', 'DRUID', 'MAGE', 'WARLOCK', 'ANY'];
const RACES = ['ORC', 'TROLL', 'BLOOD_ELF', 'UNDEAD', 'TAUREN', 'NIGHT_ELF', 'DWARF', 'GNOME', 'HUMAN', 'DRAENEI', 'ANY'];
const FACTIONS = ['HORDE', 'ALLIANCE', 'ANY'];

export function CharacterSheetMapper() {
  const loadCustomAssetsFromStorage = (): CharacterSheetAsset[] => {
    try {
      const raw = localStorage.getItem('custom_sheet_assets');
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      console.error("[SheetMapper] Failed to read custom_sheet_assets", e);
      return [];
    }
  };

  const { activeCharacter } = useCharacterStore();
  const [customAssets, setCustomAssets] = useState<CharacterSheetAsset[]>(loadCustomAssetsFromStorage);
  
  const reloadCustomAssets = () => {
    const next = loadCustomAssetsFromStorage();
    console.log("[SheetMapper] reloadCustomAssets", next);
    setCustomAssets(next);
  };
  
  const [selectedAsset, setSelectedAsset] = useState<CharacterSheetAsset | null>(null);
  const [slots, setSlots] = useState<CharacterSheetSlot[]>([]);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [showDebugRects, setShowDebugRects] = useState(true);

  const { imageUrl: resolvedImageUrl, isLoading: isImageLoading, error: sheetLoadError } = useCharacterSheetImage(selectedAsset);

  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const importLayoutRef = useRef<HTMLInputElement>(null);

  const selectedSlot = slots.find(s => s.id === selectedSlotId);

  useEffect(() => {
    setImageLoaded(false);
    setImageError(false);
  }, [selectedAsset?.id, resolvedImageUrl]);

  // Migration logic: move base64 images from localStorage to IndexedDB
  useEffect(() => {
    async function migrate() {
      let migrated = false;
      const assets = loadCustomAssetsFromStorage();
      const updatedAssets = await Promise.all(assets.map(async (asset) => {
        if (asset.isCustom && asset.imageUrl && asset.imageUrl.startsWith('data:') && !asset.imageAssetId) {
          console.log("[SheetMapper] Migrating legacy base64 image to IndexedDB:", asset.id);
          try {
            const response = await fetch(asset.imageUrl);
            const blob = await response.blob();
            const imageAssetId = `asset_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            await saveSheetImage(imageAssetId, blob);
            
            migrated = true;
            return {
              ...asset,
              imageAssetId,
              imageUrl: undefined // Remove base64 from localStorage
            };
          } catch (err) {
            console.error("[SheetMapper] Migration failed for asset:", asset.id, err);
            return asset;
          }
        }
        return asset;
      }));

      if (migrated) {
        setCustomAssets(updatedAssets);
        localStorage.setItem('custom_sheet_assets', JSON.stringify(updatedAssets));
      }
    }
    migrate();
  }, []);

  const handleSelectAsset = (asset: CharacterSheetAsset) => {
    setSelectedAsset(asset);
    // Try to load saved layout for this asset from localStorage
    const savedLayout = localStorage.getItem(`layout_${asset.id}`);
    if (savedLayout) {
      const layoutData = JSON.parse(savedLayout);
      setSlots(layoutData.slots);
    } else {
      setSlots([]);
    }
    setSelectedSlotId(null);
  };

  const handleImportImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert("Este archivo no es una imagen válida (JPG, PNG, WebP).");
      return;
    }

    // Capture dimensions and save to IndexedDB
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    
    img.onload = async () => {
      try {
        const imageAssetId = `sheet_asset_${Date.now()}`;
        await saveSheetImage(imageAssetId, file); // Save original file blob

        const newAsset: CharacterSheetAsset = {
          id: `custom_${Date.now()}`,
          name: file.name.split('.')[0],
          imageAssetId,
          naturalWidth: img.naturalWidth,
          naturalHeight: img.naturalHeight,
          isCustom: true
        };

        const nextAssets = [...loadCustomAssetsFromStorage(), newAsset];
        setCustomAssets(nextAssets);
        localStorage.setItem('custom_sheet_assets', JSON.stringify(nextAssets));
        
        handleSelectAsset(newAsset);
        URL.revokeObjectURL(objectUrl);
        
        if (fileInputRef.current) fileInputRef.current.value = '';
      } catch (err) {
        console.error("Error saving to IndexedDB:", err);
        alert("Error crítico: No se pudo guardar la imagen. Es posible que el almacenamiento esté lleno o que IndexedDB esté bloqueado.");
      }
    };

    img.onerror = () => {
      alert("No se pudo cargar la imagen. El archivo podría estar dañado.");
      URL.revokeObjectURL(objectUrl);
    };

    img.src = objectUrl;
  };

  const addSlot = () => {
    const newSlot: CharacterSheetSlot = {
      id: `slot_${Date.now()}`,
      label: "Nuevo Slot",
      slotType: "item",
      accepts: [],
      xPercent: 10,
      yPercent: 10,
      widthPercent: 10,
      heightPercent: 15,
      itemConfig: {
        role: 'any_item',
        categories: ['weapon'],
        weaponSubtypes: ['any_weapon'],
        handRules: ['one_handed'],
        allowedClasses: ['ANY']
      }
    };
    setSlots([...slots, newSlot]);
    setSelectedSlotId(newSlot.id);
  };

  const deleteSlot = (id: string) => {
    setSlots(slots.filter(s => s.id !== id));
    if (selectedSlotId === id) setSelectedSlotId(null);
  };

  const updateSlot = (id: string, updates: Partial<CharacterSheetSlot>) => {
    setSlots(slots.map(s => s.id === id ? { ...s, ...updates } : s));
  };

  const updateItemConfig = (id: string, updates: Partial<NonNullable<CharacterSheetSlot['itemConfig']>>) => {
    setSlots(slots.map(s => {
      if (s.id !== id) return s;
      return {
        ...s,
        itemConfig: {
          ...(s.itemConfig || {}),
          ...updates
        }
      };
    }));
  };

  const toggleItemConfigArray = <T,>(id: string, key: keyof NonNullable<CharacterSheetSlot['itemConfig']>, value: T) => {
    const slot = slots.find(s => s.id === id);
    if (!slot) return;
    const current = (slot.itemConfig?.[key] as T[]) || [];
    const next = current.includes(value) 
      ? current.filter(v => v !== value) 
      : [...current, value];
    updateItemConfig(id, { [key]: next });
  };

  const handleMouseDown = (e: React.MouseEvent, slotId: string, type: 'move' | 'resize') => {
    e.stopPropagation();
    setSelectedSlotId(slotId);
    setIsDragging(type === 'move');
    setIsResizing(type === 'resize');
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if ((!isDragging && !isResizing) || !selectedSlot || !containerRef.current) return;

      // Ensure we are calculating relative to the inner frame which matches the image exactly
      const frame = containerRef.current.querySelector('[style*="width"]') as HTMLDivElement;
      const targetRect = frame ? frame.getBoundingClientRect() : containerRef.current.getBoundingClientRect();
      
      const dx = ((e.clientX - dragStart.x) / targetRect.width) * 100;
      const dy = ((e.clientY - dragStart.y) / targetRect.height) * 100;

      if (isDragging) {
        updateSlot(selectedSlot.id, {
          xPercent: Math.max(0, Math.min(100 - selectedSlot.widthPercent, selectedSlot.xPercent + dx)),
          yPercent: Math.max(0, Math.min(100 - selectedSlot.heightPercent, selectedSlot.yPercent + dy))
        });
      } else if (isResizing) {
        updateSlot(selectedSlot.id, {
          widthPercent: Math.max(1, Math.min(100 - selectedSlot.xPercent, selectedSlot.widthPercent + dx)),
          heightPercent: Math.max(1, Math.min(100 - selectedSlot.yPercent, selectedSlot.heightPercent + dy))
        });
      }

      setDragStart({ x: e.clientX, y: e.clientY });
    };

    const handleMouseUp = () => {
      if (isDragging || isResizing) {
        // Save automatically to local storage when dragging stops
        if (selectedAsset) {
          const layout: CharacterSheetLayout = {
            id: `${selectedAsset.id}_layout`,
            characterKey: `${selectedAsset.raceId?.toLowerCase() || 'any'}_${selectedAsset.classId?.toLowerCase() || 'any'}`,
            sheetAssetId: selectedAsset.id,
            slots
          };
          localStorage.setItem(`layout_${selectedAsset.id}`, JSON.stringify(layout));
        }
      }
      setIsDragging(false);
      setIsResizing(false);
    };

    if (isDragging || isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, isResizing, selectedSlot, dragStart, selectedAsset, slots]);

  const exportJson = () => {
    if (!selectedAsset) return;
    const layout: CharacterSheetLayout = {
      id: `${selectedAsset.id}_layout`,
      characterKey: `${selectedAsset.raceId?.toLowerCase() || 'any'}_${selectedAsset.classId?.toLowerCase() || 'any'}`,
      sheetAssetId: selectedAsset.id,
      slots
    };
    const blob = new Blob([JSON.stringify(layout, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${layout.id}.json`;
    a.click();
  };

  const handleImportLayout = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/json' && !file.name.endsWith('.json')) {
      alert("Este archivo no es un layout JSON válido.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const layout = JSON.parse(event.target?.result as string) as CharacterSheetLayout;
        
        if (!layout.slots || !Array.isArray(layout.slots)) {
          throw new Error("Formato de layout inválido");
        }

        if (selectedAsset && layout.sheetAssetId !== selectedAsset.id) {
          if (confirm(`Este layout fue creado para la hoja "${layout.sheetAssetId}". ¿Deseas aplicarlo a la hoja actual "${selectedAsset.id}"?`)) {
            setSlots(layout.slots);
          }
        } else {
          setSlots(layout.slots);
        }
        
        // Clear input
        if (importLayoutRef.current) importLayoutRef.current.value = '';
      } catch (err) {
        alert("Error al importar el layout: El JSON tiene un formato incorrecto o está dañado.");
      }
    };
    reader.readAsText(file);
  };

  async function handleDeleteSheet(sheetId: string) {
    alert("START DELETE " + sheetId);
    console.log("[SheetDelete] START", sheetId);

    const assetsBefore = loadCustomAssetsFromStorage();
    console.log("[SheetDelete] assetsBefore", assetsBefore);

    const sheet = assetsBefore.find(a => a.id === sheetId);

    if (!sheet) {
      alert("No se encontró la hoja en custom_sheet_assets: " + sheetId);
      return;
    }

    if (!sheet.isCustom) {
      alert("No se pueden eliminar hojas oficiales.");
      return;
    }

    if (!confirm(`¿Eliminar la hoja "${sheet.name}" y su layout?`)) return;

    try {
      const result = await deleteCustomSheetCascade(sheetId);
      console.log("[SheetDelete] cascade result", result);

      const assetsAfter = loadCustomAssetsFromStorage();
      console.log("[SheetDelete] assetsAfter", assetsAfter);

      setCustomAssets(assetsAfter);

      if (selectedAsset?.id === sheetId) {
        setSelectedAsset(null);
        setSlots([]);
        setSelectedSlotId(null);
      }

      window.dispatchEvent(new CustomEvent("characterSheetsChanged"));

      alert("Hoja eliminada correctamente.");
    } catch (error) {
      console.error("[SheetDelete] FAILED", error);
      alert("No se pudo eliminar la hoja: " + (error instanceof Error ? error.message : String(error)));
    }
  }

  const handleCleanOrphans = async () => {
    try {
      const count = await cleanOrphanCharacterSheetLinks();
      if (count > 0) {
        alert(`Se limpiaron ${count} asociaciones huérfanas.`);
      } else {
        alert("No se encontraron asociaciones huérfanas.");
      }
    } catch (error) {
      console.error("[CleanOrphans] error", error);
      alert("Error al limpiar asociaciones huérfanas.");
    }
  };

  const handleEmergencyCleanCustomSheets = async () => {
    try {
      alert("CLICK EMERGENCY CLEAN");
      console.log("[EmergencyCleanButton] CLICK");
      if (!confirm("Esto eliminará todas las hojas custom y sus layouts. ¿Continuar?")) {
        return;
      }

      const assetsBefore = loadCustomAssetsFromStorage();
      await clearAllCustomSheets();
      
      setCustomAssets([]);
      setSelectedAsset(null);
      setSlots([]);
      setSelectedSlotId(null);
      
      window.dispatchEvent(new CustomEvent("characterSheetsChanged"));
      
      console.log("[EmergencyClean] removed sheets", assetsBefore.length);
      console.log("[EmergencyClean] done");
      alert("Hojas custom eliminadas.");
    } catch (error) {
      console.error("[EmergencyClean] error", error);
      alert("Error en la limpieza de emergencia.");
    }
  };

  const updateAsset = (id: string, updates: Partial<CharacterSheetAsset>) => {
    const assets = loadCustomAssetsFromStorage();
    const updatedAssets = assets.map(a => a.id === id ? { ...a, ...updates } : a);
    setCustomAssets(updatedAssets);
    localStorage.setItem('custom_sheet_assets', JSON.stringify(updatedAssets));
    
    if (selectedAsset?.id === id) {
      setSelectedAsset(selectedAsset ? { ...selectedAsset, ...updates } : null);
    }
  };

  const getCharacterKey = (asset: CharacterSheetAsset) => {
    const faction = asset.faction || 'ANY';
    const race = asset.raceId || 'ANY';
    const cls = asset.classId || 'ANY';
    return `${faction}_${race}_${cls}`.toUpperCase();
  };

  const reassignToCurrentCharacter = () => {
    if (!selectedAsset || !activeCharacter) return;
    
    const faction = normalizeTerm(activeCharacter.faction);
    const race = normalizeTerm(activeCharacter.race);
    const cls = normalizeTerm(activeCharacter.classId);
    
    updateAsset(selectedAsset.id, {
      faction: faction as any,
      raceId: race,
      classId: cls
    });
    
    alert(`Asociación actualizada a: ${faction}_${race}_${cls}`);
  };

  const saveLayout = () => {
    if (!selectedAsset) return;
    
    const charKey = getCharacterKey(selectedAsset);
    
    if (charKey === 'ANY_ANY_ANY') {
      if (!confirm("Estás guardando una hoja genérica (ANY_ANY_ANY). ¿Seguro que quieres que se aplique como plantilla general?")) {
        return;
      }
    }
    const layout: CharacterSheetLayout = {
      id: `${selectedAsset.id}_layout`,
      characterKey: charKey,
      sheetAssetId: selectedAsset.id,
      slots
    };

    // 1. Persist the asset metadata changes
    const updatedAssets = customAssets.map(a => 
      a.id === selectedAsset.id ? { ...a, faction: selectedAsset.faction, raceId: selectedAsset.raceId, classId: selectedAsset.classId } : a
    );
    setCustomAssets(updatedAssets);
    localStorage.setItem('custom_sheet_assets', JSON.stringify(updatedAssets));

    // 2. Save by Asset ID (for mapper re-entry)
    localStorage.setItem(`layout_${selectedAsset.id}`, JSON.stringify(layout));
    
    // 3. Save by Character Key (for game association)
    const savedLayoutsJson = localStorage.getItem('character_sheet_layouts_map') || '{}';
    const layoutsMap = JSON.parse(savedLayoutsJson);
    layoutsMap[charKey] = layout;
    localStorage.setItem('character_sheet_layouts_map', JSON.stringify(layoutsMap));

    alert(`Layout guardado y asociado a: ${charKey}`);
  };

  return (
    <div className="flex h-screen bg-neutral-950 text-white font-sans overflow-hidden">
      {/* Sidebar: Asset Library & Slot List */}
      <div className="w-80 bg-neutral-900 border-r border-neutral-800 flex flex-col shrink-0">
        <div className="p-4 border-b border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-yellow-500" />
            <h2 className="font-black uppercase tracking-widest text-sm">Sheet Mapper</h2>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-6">
          {/* Asset Selection */}
          <section>
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-[10px] font-black text-neutral-500 uppercase tracking-widest">Biblioteca de Hojas</h3>
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 px-2 py-1 rounded bg-yellow-600/10 text-yellow-500 hover:bg-yellow-600/20 transition-colors text-[9px] font-black uppercase tracking-tighter"
                title="Importar Hoja (PNG/JPG)"
              >
                <Plus className="w-3 h-3" />
                Importar Hoja
              </button>
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept="image/png,image/jpeg,image/webp" 
                onChange={handleImportImage} 
              />
            </div>
            
            <div className="flex flex-col gap-2 max-h-64 overflow-y-auto pr-1">
              {[...CHARACTER_SHEET_ASSETS, ...customAssets].map(asset => (
                <div key={asset.id} className="flex items-stretch gap-2">
                  <button
                    type="button"
                    onClick={() => handleSelectAsset(asset)}
                    className={`flex-1 p-3 rounded-lg border text-left transition-all ${
                      selectedAsset?.id === asset.id 
                        ? 'bg-yellow-500/10 border-yellow-500 text-yellow-500' 
                        : 'bg-neutral-800 border-neutral-700 text-neutral-400 hover:bg-neutral-750'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <ImageIcon className="w-3.5 h-3.5 opacity-50" />
                      <div className="text-xs font-bold truncate">{asset.name}</div>
                    </div>
                    <div className="text-[9px] opacity-60 uppercase mt-1">
                      {asset.faction || 'Any'} · {asset.raceId || 'Any'} · {asset.classId || 'Any'} {asset.isCustom && '(Custom)'}
                    </div>
                  </button>

                  {asset.isCustom && (
                    <button
                      type="button"
                      onClick={async (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        alert("CLICK DELETE " + asset.id);
                        await handleDeleteSheet(asset.id);
                      }}
                      className="w-10 shrink-0 rounded-lg bg-red-950/80 text-red-400 hover:bg-red-800 hover:text-white transition-colors flex items-center justify-center border border-red-900/40"
                      title="Eliminar hoja"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* Character Association (New Section) */}
          {selectedAsset && selectedAsset.isCustom && (
            <section className="bg-neutral-950/40 p-4 rounded-xl border border-neutral-800 flex flex-col gap-4">
              <h3 className="text-[10px] font-black text-yellow-500 uppercase tracking-widest mb-1">Asociación de Personaje</h3>
              
              <div className="flex flex-col gap-1.5">
                <label className="text-[9px] font-bold text-neutral-500 uppercase">Facción</label>
                <select 
                  value={selectedAsset.faction || 'ANY'}
                  onChange={(e) => updateAsset(selectedAsset.id, { faction: e.target.value as any })}
                  className="bg-neutral-800 border border-neutral-700 rounded p-2 text-xs text-neutral-300"
                >
                  {FACTIONS.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[9px] font-bold text-neutral-500 uppercase">Raza</label>
                <select 
                  value={selectedAsset.raceId || 'ANY'}
                  onChange={(e) => updateAsset(selectedAsset.id, { raceId: e.target.value })}
                  className="bg-neutral-800 border border-neutral-700 rounded p-2 text-xs text-neutral-300"
                >
                  {RACES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[9px] font-bold text-neutral-500 uppercase">Clase</label>
                <select 
                  value={selectedAsset.classId || 'ANY'}
                  onChange={(e) => updateAsset(selectedAsset.id, { classId: e.target.value })}
                  className="bg-neutral-800 border border-neutral-700 rounded p-2 text-xs text-neutral-300"
                >
                  {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div className="mt-1 p-2 bg-black/40 rounded border border-white/5">
                <div className="text-[8px] text-neutral-600 uppercase font-black mb-1">Generated Key:</div>
                <div className="text-[10px] font-mono text-yellow-500/80 font-bold">{getCharacterKey(selectedAsset)}</div>
              </div>

              {getCharacterKey(selectedAsset) === 'ANY_ANY_ANY' && (
                <div className="p-3 bg-red-950/30 border border-red-900/50 rounded-lg animate-pulse">
                  <div className="flex items-center gap-2 text-red-500 mb-1">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-black uppercase">Hoja Genérica</span>
                  </div>
                  <p className="text-[9px] text-neutral-400 leading-tight">
                    Esta hoja se aplicará a CUALQUIER personaje sin hoja específica. Se recomienda reasignarla.
                  </p>
                </div>
              )}

              {activeCharacter && (
                <button
                  onClick={reassignToCurrentCharacter}
                  className="w-full py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-[9px] font-black uppercase tracking-widest text-neutral-400 hover:text-white hover:bg-neutral-700 transition-all flex items-center justify-center gap-2"
                >
                  <RotateCcw className="w-3 h-3" /> Reasignar a Personaje Actual
                </button>
              )}
            </section>
          )}

          {/* Layout Persistence Controls (Prominent) */}
          <section className="flex flex-col gap-2 p-3 bg-neutral-950/40 rounded-xl border border-neutral-800">
            <h3 className="text-[9px] font-black text-neutral-600 uppercase tracking-widest mb-1">Herramientas Avanzadas</h3>
            <div className="grid grid-cols-2 gap-2">
              <button 
                onClick={exportJson}
                disabled={!selectedAsset}
                className="py-2 rounded bg-neutral-800 border border-neutral-700 text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-neutral-700 disabled:opacity-50 transition-colors"
              >
                <Download className="w-3 h-3" /> Exportar
              </button>
              <button 
                onClick={() => importLayoutRef.current?.click()}
                disabled={!selectedAsset}
                className="py-2 rounded bg-neutral-800 border border-neutral-700 text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-neutral-700 disabled:opacity-50 transition-colors"
              >
                <Upload className="w-3 h-3" /> Importar
              </button>
              <button 
                onClick={handleCleanOrphans}
                className="col-span-2 py-2 rounded bg-red-950/20 border border-red-900/40 text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-red-900/40 transition-colors text-red-500 cursor-pointer"
              >
                <Eraser className="w-3 h-3" /> Limpiar Huérfanos
              </button>
              <button 
                onClick={async (e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  console.log("[EmergencyCleanButton] CLICK");
                  await handleEmergencyCleanCustomSheets();
                }}
                className="col-span-2 py-2 rounded bg-black border border-red-900/40 text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-red-900/60 transition-colors text-red-700 mt-2 cursor-pointer"
              >
                <Trash2 className="w-3 h-3" /> Limpiar Hojas Custom (Emergencia)
              </button>
              <input 
                type="file" 
                ref={importLayoutRef} 
                className="hidden" 
                accept="application/json,.json" 
                onChange={handleImportLayout} 
              />
            </div>
          </section>

          {/* Slot List */}
          {selectedAsset && (
            <section>
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-[10px] font-black text-neutral-500 uppercase tracking-widest">Slots Mapeados ({slots.length})</h3>
                <button 
                  onClick={addSlot}
                  className="p-1 rounded bg-yellow-600 text-neutral-950 hover:bg-yellow-500"
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>
              <div className="flex flex-col gap-1.5">
                {slots.map(slot => (
                  <div 
                    key={slot.id}
                    onClick={() => setSelectedSlotId(slot.id)}
                    className={`p-2 rounded flex items-center justify-between group cursor-pointer transition-colors ${
                      selectedSlotId === slot.id ? 'bg-neutral-800' : 'hover:bg-neutral-850'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className={`w-2 h-2 rounded-full ${selectedSlotId === slot.id ? 'bg-yellow-500' : 'bg-neutral-700'}`} />
                      <span className="text-[11px] font-bold truncate text-neutral-300">{slot.label}</span>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          const newId = `slot_${Date.now()}`;
                          setSlots([...slots, { ...slot, id: newId, xPercent: slot.xPercent + 2, yPercent: slot.yPercent + 2 }]);
                          setSelectedSlotId(newId);
                        }}
                        className="p-1 text-neutral-500 hover:text-white"
                        title="Duplicar"
                      >
                        <Copy className="w-3 h-3" />
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); deleteSlot(slot.id); }}
                        className="p-1 text-red-500 hover:bg-red-500/10 rounded"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-neutral-800 flex flex-col gap-2">
          <button 
            onClick={saveLayout}
            disabled={!selectedAsset}
            className="w-full py-2.5 rounded bg-yellow-600 text-neutral-950 text-[10px] font-black uppercase tracking-[0.2em] hover:bg-yellow-500 shadow-lg disabled:opacity-50"
          >
            Guardar Layout
          </button>
        </div>
      </div>

      {/* Main Canvas Area */}
      <div className="flex-1 relative flex flex-col overflow-hidden bg-black">
        {!selectedAsset ? (
          <div className="flex-1 flex flex-col items-center justify-center text-neutral-800">
            <Maximize className="w-16 h-16 mb-4 opacity-10" />
            <p className="text-sm font-black uppercase tracking-widest opacity-20">Selecciona o importa una hoja oficial</p>
          </div>
        ) : (
          <div className="flex-1 relative p-8 flex flex-col items-center justify-center overflow-auto" ref={containerRef}>
            {/* Debug Stats (Requested) */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 flex gap-4 text-[9px] font-black uppercase tracking-widest text-neutral-500 bg-neutral-900/50 backdrop-blur px-4 py-1.5 rounded-full border border-neutral-800 z-50">
              <span className="flex items-center gap-1"><span className="text-neutral-600">ID:</span> {selectedAsset.id}</span>
              <span className="flex items-center gap-1"><span className="text-neutral-600">NAME:</span> {selectedAsset.name}</span>
              <span className="flex items-center gap-1"><span className="text-neutral-600">DIM:</span> {selectedAsset.naturalWidth || '?'}x{selectedAsset.naturalHeight || '?'}</span>
              <span className="flex items-center gap-1"><span className="text-neutral-600">STATUS:</span> {imageError ? 'ERROR' : (imageLoaded ? 'LOADED' : 'LOADING')}</span>
            </div>

            {isImageLoading ? (
               <div className="flex flex-col items-center justify-center bg-neutral-900 w-full h-full rounded-xl">
                  <div className="w-12 h-12 border-4 border-yellow-500/20 border-t-yellow-500 rounded-full animate-spin mb-4" />
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-neutral-600 animate-pulse">Cargando Hoja...</p>
               </div>
            ) : resolvedImageUrl ? (
               <SheetCanvasFrame 
                 imageUrl={resolvedImageUrl} 
                 className={`shadow-2xl bg-neutral-900 border transition-all duration-500 rounded-lg ${imageError ? 'border-red-500/50' : 'border-neutral-800'}`}
                 onImageLoad={() => setImageLoaded(true)}
               >
                 {/* Slots Overlay */}
                 {slots.map(slot => (
                   <div
                     key={slot.id}
                     style={{
                       left: `${slot.xPercent}%`,
                       top: `${slot.yPercent}%`,
                       width: `${slot.widthPercent}%`,
                       height: `${slot.heightPercent}%`,
                       zIndex: selectedSlotId === slot.id ? 10 : 1,
                       borderColor: selectedSlotId === slot.id ? '#EAB308' : 'rgba(163, 163, 163, 0.4)',
                       borderStyle: slot.locked ? 'solid' : 'dashed'
                     }}
                     className={`absolute border-2 ${showDebugRects ? 'bg-yellow-500/5' : ''} flex items-center justify-center group select-none transition-shadow ${selectedSlotId === slot.id ? 'shadow-[0_0_20px_rgba(234,179,8,0.3)]' : ''}`}
                     onMouseDown={(e) => !slot.locked && handleMouseDown(e, slot.id, 'move')}
                   >
                     <div className={`text-[10px] font-black uppercase pointer-events-none text-center px-1 truncate drop-shadow-md ${selectedSlotId === slot.id ? 'text-yellow-500' : 'text-neutral-300 opacity-60'}`}>
                       {slot.label}
                     </div>

                     {/* Resize Handle */}
                     {!slot.locked && (
                       <div 
                         onMouseDown={(e) => { e.stopPropagation(); handleMouseDown(e, slot.id, 'resize'); }}
                         className="absolute bottom-0 right-0 w-3 h-3 bg-yellow-500 cursor-nwse-resize opacity-0 group-hover:opacity-100" 
                       />
                     )}
                     
                     {/* Status icons */}
                     <div className="absolute top-0 right-0 p-1 opacity-0 group-hover:opacity-100 pointer-events-none flex gap-1">
                       {slot.locked && <Lock className="w-2.5 h-2.5 text-neutral-500" />}
                       {slot.slotType === 'item' && <Settings className="w-2.5 h-2.5 text-yellow-500/50" />}
                     </div>
                   </div>
                 ))}
               </SheetCanvasFrame>
            ) : (
               <div className="w-full h-full bg-neutral-950 flex flex-col items-center justify-center p-20 text-center border border-neutral-800 rounded-xl">
                  <EyeOff className="w-12 h-12 text-neutral-800 mb-4" />
                  <p className="text-sm font-black uppercase tracking-widest text-neutral-700">No hay imagen de hoja</p>
               </div>
            )}
          </div>
        )}

        {/* Floating Tool Controls */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-neutral-900/90 backdrop-blur-md border border-neutral-800 p-2 rounded-full shadow-2xl z-50">
          <button 
            onClick={() => setShowDebugRects(!showDebugRects)}
            className={`p-2 rounded-full transition-colors ${showDebugRects ? 'bg-yellow-500 text-neutral-950' : 'text-neutral-500 hover:text-white'}`}
            title="Toggle Debug Rects"
          >
            {showDebugRects ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          </button>
          <div className="w-px h-4 bg-neutral-700 mx-1" />
          <button 
            onClick={addSlot}
            disabled={!selectedAsset}
            className="flex items-center gap-2 px-4 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-white text-[10px] font-black uppercase rounded-full border border-neutral-700 transition-all active:scale-95 disabled:opacity-50"
          >
            <Plus className="w-3.5 h-3.5 text-yellow-500" />
            Añadir Slot
          </button>
        </div>
      </div>

      {/* Properties Panel */}
      {selectedSlot && (
        <div className="w-96 bg-neutral-900 border-l border-neutral-800 flex flex-col shrink-0">
          <div className="p-4 border-b border-neutral-800 flex justify-between items-center bg-neutral-950/30">
             <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-yellow-500">Propiedades del Slot</h3>
             <div className="flex items-center gap-1">
               <button 
                 onClick={() => updateSlot(selectedSlot.id, { locked: !selectedSlot.locked })}
                 className={`p-1.5 rounded transition-colors ${selectedSlot.locked ? 'text-yellow-500 bg-yellow-500/10' : 'text-neutral-600 hover:text-white'}`}
               >
                 {selectedSlot.locked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
               </button>
               <button onClick={() => setSelectedSlotId(null)} className="p-1.5 text-neutral-600 hover:text-white transition-colors">
                  <Maximize className="w-3.5 h-3.5 rotate-45" />
               </button>
             </div>
          </div>

          <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-6">
            {/* Basic Info */}
            <section className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[9px] font-black text-neutral-500 uppercase tracking-widest">Etiqueta Visual</label>
                <div className="relative">
                  <input 
                    type="text" 
                    value={selectedSlot.label}
                    onChange={(e) => updateSlot(selectedSlot.id, { label: e.target.value })}
                    className="w-full bg-neutral-850 border border-neutral-700 rounded p-2 text-xs text-white focus:border-yellow-600 outline-none pl-8"
                  />
                  <Type className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-neutral-600" />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[9px] font-black text-neutral-500 uppercase tracking-widest">Tipo de Contenido</label>
                <select 
                  value={selectedSlot.slotType}
                  onChange={(e) => updateSlot(selectedSlot.id, { slotType: e.target.value as SlotContentType })}
                  className="bg-neutral-850 border border-neutral-700 rounded p-2 text-xs text-white focus:border-yellow-600 outline-none cursor-pointer"
                >
                  {SLOT_TYPES.map(type => (
                    <option key={type} value={type}>{type.charAt(0).toUpperCase() + type.slice(1)}</option>
                  ))}
                </select>
              </div>
            </section>

            {/* Smart Item Configuration */}
            {selectedSlot.slotType === 'item' && (
              <section className="bg-neutral-950/40 p-4 rounded-xl border border-neutral-800 flex flex-col gap-5 animate-fade-in">
                <div className="flex items-center gap-2 mb-1">
                  <Settings className="w-3 h-3 text-yellow-500" />
                  <h4 className="text-[10px] font-black text-neutral-300 uppercase tracking-widest">Configuración Inteligente</h4>
                </div>

                {/* Role Select */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-bold text-neutral-500 uppercase">Item Slot Role</label>
                  <select 
                    value={selectedSlot.itemConfig?.role || 'any_item'}
                    onChange={(e) => updateItemConfig(selectedSlot.id, { role: e.target.value as ItemSlotRole })}
                    className="bg-neutral-800 border border-neutral-700 rounded p-2 text-xs text-neutral-300"
                  >
                    {ITEM_ROLES.map(role => <option key={role} value={role}>{role.replace('_', ' ').toUpperCase()}</option>)}
                  </select>
                </div>

                {/* Categories */}
                <div className="flex flex-col gap-2">
                  <label className="text-[9px] font-bold text-neutral-500 uppercase">Categorías Aceptadas</label>
                  <div className="flex flex-wrap gap-1.5">
                    {ITEM_CATEGORIES.map(cat => (
                      <button
                        key={cat}
                        onClick={() => toggleItemConfigArray(selectedSlot.id, 'categories', cat)}
                        className={`px-2 py-1 rounded text-[9px] font-bold transition-all border ${
                          selectedSlot.itemConfig?.categories?.includes(cat)
                            ? 'bg-yellow-500/20 border-yellow-500 text-yellow-500'
                            : 'bg-neutral-800 border-neutral-700 text-neutral-500 hover:text-neutral-400'
                        }`}
                      >
                        {cat.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Weapon Subtypes */}
                {selectedSlot.itemConfig?.categories?.includes('weapon') && (
                  <div className="flex flex-col gap-2 animate-slide-down">
                    <label className="text-[9px] font-bold text-neutral-500 uppercase">Subtipos de Arma</label>
                    <div className="flex flex-wrap gap-1.5">
                      {WEAPON_SUBTYPES.map(sub => (
                        <button
                          key={sub}
                          onClick={() => toggleItemConfigArray(selectedSlot.id, 'weaponSubtypes', sub)}
                          className={`px-2 py-1 rounded text-[9px] font-bold transition-all border ${
                            selectedSlot.itemConfig?.weaponSubtypes?.includes(sub)
                              ? 'bg-blue-500/20 border-blue-500 text-blue-400'
                              : 'bg-neutral-800 border-neutral-700 text-neutral-500'
                          }`}
                        >
                          {sub.toUpperCase()}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Armor Subtypes */}
                {selectedSlot.itemConfig?.categories?.includes('armor') && (
                  <div className="flex flex-col gap-2 animate-slide-down">
                    <label className="text-[9px] font-bold text-neutral-500 uppercase">Subtipos de Armadura</label>
                    <div className="flex flex-wrap gap-1.5">
                      {ARMOR_SUBTYPES.map(sub => (
                        <button
                          key={sub}
                          onClick={() => toggleItemConfigArray(selectedSlot.id, 'armorSubtypes', sub)}
                          className={`px-2 py-1 rounded text-[9px] font-bold transition-all border ${
                            selectedSlot.itemConfig?.armorSubtypes?.includes(sub)
                              ? 'bg-green-500/20 border-green-500 text-green-400'
                              : 'bg-neutral-800 border-neutral-700 text-neutral-500'
                          }`}
                        >
                          {sub.toUpperCase()}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Hand Rules */}
                <div className="flex flex-col gap-2">
                  <label className="text-[9px] font-bold text-neutral-500 uppercase">Reglas de Mano</label>
                  <div className="flex flex-wrap gap-1.5">
                    {HAND_RULES.map(rule => (
                      <button
                        key={rule}
                        onClick={() => toggleItemConfigArray(selectedSlot.id, 'handRules', rule)}
                        className={`px-2 py-1 rounded text-[9px] font-bold transition-all border ${
                          selectedSlot.itemConfig?.handRules?.includes(rule)
                            ? 'bg-purple-500/20 border-purple-500 text-purple-400'
                            : 'bg-neutral-800 border-neutral-700 text-neutral-500'
                        }`}
                      >
                        {rule.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Classes */}
                <div className="flex flex-col gap-2">
                  <label className="text-[9px] font-bold text-neutral-500 uppercase">Clases Permitidas</label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {CLASSES.map(cls => (
                      <button
                        key={cls}
                        onClick={() => toggleItemConfigArray(selectedSlot.id, 'allowedClasses', cls)}
                        className={`px-2 py-1 rounded text-[9px] font-bold text-left transition-all border ${
                          selectedSlot.itemConfig?.allowedClasses?.includes(cls)
                            ? 'bg-red-500/20 border-red-500 text-red-400'
                            : 'bg-neutral-800 border-neutral-700 text-neutral-600'
                        }`}
                      >
                        {cls}
                      </button>
                    ))}
                  </div>
                </div>
              </section>
            )}

            {/* Transform Properties */}
            <section className="flex flex-col gap-3">
              <h4 className="text-[9px] font-black text-neutral-600 uppercase tracking-widest border-b border-neutral-800 pb-2">Geometría (%)</h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-bold text-neutral-500 uppercase">Posición X</label>
                  <input 
                    type="number" 
                    step="0.1"
                    value={selectedSlot.xPercent.toFixed(1)}
                    onChange={(e) => updateSlot(selectedSlot.id, { xPercent: parseFloat(e.target.value) })}
                    className="bg-neutral-850 border border-neutral-700 rounded p-2 text-xs text-white"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-bold text-neutral-500 uppercase">Posición Y</label>
                  <input 
                    type="number" 
                    step="0.1"
                    value={selectedSlot.yPercent.toFixed(1)}
                    onChange={(e) => updateSlot(selectedSlot.id, { yPercent: parseFloat(e.target.value) })}
                    className="bg-neutral-850 border border-neutral-700 rounded p-2 text-xs text-white"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-bold text-neutral-500 uppercase">Ancho</label>
                  <input 
                    type="number" 
                    step="0.1"
                    value={selectedSlot.widthPercent.toFixed(1)}
                    onChange={(e) => updateSlot(selectedSlot.id, { widthPercent: parseFloat(e.target.value) })}
                    className="bg-neutral-850 border border-neutral-700 rounded p-2 text-xs text-white"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-bold text-neutral-500 uppercase">Alto</label>
                  <input 
                    type="number" 
                    step="0.1"
                    value={selectedSlot.heightPercent.toFixed(1)}
                    onChange={(e) => updateSlot(selectedSlot.id, { heightPercent: parseFloat(e.target.value) })}
                    className="bg-neutral-850 border border-neutral-700 rounded p-2 text-xs text-white"
                  />
                </div>
              </div>
            </section>

            {/* Advanced / Meta */}
            <section className="flex flex-col gap-4">
               <div className="flex flex-col gap-1.5">
                <label className="text-[9px] font-black text-neutral-500 uppercase tracking-widest">Rotación (deg)</label>
                <input 
                  type="range" 
                  min="0" max="360"
                  value={selectedSlot.rotation || 0}
                  onChange={(e) => updateSlot(selectedSlot.id, { rotation: parseInt(e.target.value) })}
                  className="w-full accent-yellow-500"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[9px] font-black text-neutral-500 uppercase tracking-widest">Etiquetas Manuales (Legacy)</label>
                <textarea 
                  placeholder="Ej: sword, axe, mail"
                  value={selectedSlot.accepts.join(', ')}
                  onChange={(e) => updateSlot(selectedSlot.id, { accepts: e.target.value.split(',').map(t => t.trim()).filter(t => t) })}
                  className="bg-neutral-850 border border-neutral-700 rounded p-2 text-[11px] text-neutral-400 h-20 resize-none outline-none focus:border-neutral-600"
                />
              </div>
            </section>
          </div>
        </div>
      )}
    </div>
  );
}
