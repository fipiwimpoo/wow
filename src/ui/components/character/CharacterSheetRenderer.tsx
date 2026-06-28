import React, { useMemo } from 'react';
import { BoardGameCharacter } from '../../../core/models/character';
import { 
  CharacterSheetSlot,
  CHARACTER_SHEET_ASSETS
} from '../../../core/models/layouts';
import { CardVisual } from './CardVisual';
import { CardReferenceIndex } from '../../../core/utils/cardReferenceIndex';
import { ItemCardReference } from '../../../core/models/cardReference';
import { Layout, Loader2 } from 'lucide-react';
import { SheetCanvasFrame } from './SheetCanvasFrame';
import { resolveCharacterSheetLayout } from '../../../core/utils/characterSheetLayoutResolver';
import { useCharacterSheetImage } from '../../hooks/useCharacterSheetImage';

interface CharacterSheetRendererProps {
  character: BoardGameCharacter;
  debugMode?: boolean;
  onSlotClick?: (slotKey: any) => void;
}

export function CharacterSheetRenderer({ character, debugMode = false, onSlotClick }: CharacterSheetRendererProps) {
  // 1. Resolve layout and asset using central logic
  const { layout, asset: customAsset, source, resolvedKey } = useMemo(() => resolveCharacterSheetLayout(character), [character]);

  // 2. Determine which asset to use (handle official assets not in custom list)
  const asset = useMemo(() => {
    if (customAsset) return customAsset;
    return layout ? CHARACTER_SHEET_ASSETS.find(a => a.id === layout.sheetAssetId) : null;
  }, [layout, customAsset]);

  const { imageUrl: resolvedImageUrl, isLoading: isImageLoading } = useCharacterSheetImage(asset || null);

  console.log("[CharacterSheetRenderer] Active Character Key:", resolvedKey);
  console.log("[CharacterSheetRenderer] Found layout:", layout?.id, "Source:", source);

  if (!layout) {
    return (
      <div className="w-full aspect-[1.6/1] bg-neutral-900 rounded-lg border border-neutral-800 flex flex-col items-center justify-center p-8 text-center shadow-inner">
        <div className="w-20 h-20 bg-neutral-800 rounded-full flex items-center justify-center mb-6 border border-neutral-700 shadow-xl">
          <Layout className="w-10 h-10 text-neutral-600" />
        </div>
        <h3 className="text-xl font-black text-white uppercase tracking-tighter mb-3">Hoja no mapeada</h3>
        <p className="text-xs text-neutral-500 max-w-sm uppercase font-bold leading-relaxed mb-8">
          No hay una hoja oficial mapeada para este personaje ({resolvedKey}). 
          Por favor, abre el Sheet Mapper para configurar una.
        </p>
        <button 
          onClick={() => {
            window.dispatchEvent(new CustomEvent('open-sheet-mapper'));
          }}
          className="px-8 py-3 bg-yellow-600 hover:bg-yellow-500 text-neutral-950 text-xs font-black uppercase tracking-[0.2em] rounded-full shadow-lg shadow-yellow-600/20 transition-all hover:scale-105 active:scale-95"
        >
          Abrir Sheet Mapper
        </button>
      </div>
    );
  }

  return (
    <div className="relative w-full max-w-5xl mx-auto aspect-[1.6/1] bg-neutral-900 rounded-lg shadow-2xl overflow-hidden border border-neutral-800 flex items-center justify-center">
      {isImageLoading ? (
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 text-yellow-500/20 animate-spin" />
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-neutral-700">Cargando Hoja...</span>
        </div>
      ) : resolvedImageUrl ? (
        <SheetCanvasFrame imageUrl={resolvedImageUrl} className="w-full h-full">
          {/* Slots Layer */}
          {layout.slots.map((slot: CharacterSheetSlot) => {
            let cardId: string | null = null;
            
            // Map logical slots to character equipment
            let slotKey: any = null;
            if (slot.id === 'mainHand' || slot.itemConfig?.role === 'main_hand') slotKey = 'mainHand';
            else if (slot.id === 'offHand' || slot.itemConfig?.role === 'off_hand') slotKey = 'offHand';
            else if (slot.id === 'armor' || slot.itemConfig?.role === 'armor') slotKey = 'armor';
            else if (slot.id === 'helmet' || slot.itemConfig?.role === 'helmet') slotKey = 'helmet';
            else if (slot.id === 'shield' || slot.itemConfig?.role === 'shield') slotKey = 'shield';
            else if (slot.id === 'trinket' || slot.itemConfig?.role === 'trinket') slotKey = 'trinket';
            
            if (slotKey) cardId = (character.equipment as any)[slotKey];
            
            const card = cardId ? CardReferenceIndex.getCard(cardId) as ItemCardReference : null;

            return (
              <div 
                key={slot.id}
                className={`absolute flex flex-col items-center justify-center transition-all ${
                  debugMode ? 'border border-dashed border-yellow-500/60 bg-yellow-500/10 group' : ''
                }`}
                style={{
                  left: `${slot.xPercent}%`,
                  top: `${slot.yPercent}%`,
                  width: `${slot.widthPercent}%`,
                  height: `${slot.heightPercent}%`,
                  transform: slot.rotation ? `rotate(${slot.rotation}deg)` : undefined,
                  zIndex: slot.zIndex || 5
                }}
              >
                {cardId ? (
                  <CardVisual 
                    cardId={cardId} 
                    variant="sheet" 
                    className="w-full h-full shadow-2xl animate-fade-in" 
                    onClick={() => onSlotClick?.(slotKey || slot.id)}
                  />
                ) : (
                  debugMode && (
                    <div className="text-center p-2 bg-black/60 backdrop-blur-sm rounded border border-yellow-500/20">
                      <div className="text-[8px] font-black uppercase text-yellow-500">
                        {slot.label}
                      </div>
                      {slot.itemConfig && (
                        <div className="text-[7px] text-neutral-400 mt-1 uppercase font-bold">
                          {slot.itemConfig.role?.replace('_', ' ')}
                        </div>
                      )}
                    </div>
                  )
                )}
              </div>
            );
          })}
        </SheetCanvasFrame>
      ) : (
        <div className="w-full h-full bg-neutral-950 flex flex-col items-center justify-center p-20 text-center opacity-40">
           <div className="text-neutral-700 font-black text-6xl uppercase leading-tight mb-4">
              {asset?.name || "Physical Board"}
           </div>
           <p className="text-neutral-800 text-xs font-bold uppercase tracking-[1em]">Official Physical Board Placeholder</p>
        </div>
      )}

      {/* Racial Ability Area (Legacy fallback if not mapped in slots) */}
      {!layout.slots.find(s => s.id === 'racial' || s.slotType === 'power') && (
        <div className="absolute top-4 right-4 w-1/4 p-4 bg-neutral-950/80 backdrop-blur-md border border-neutral-800 rounded-lg z-20 shadow-2xl animate-fade-in">
          <h5 className="text-[10px] font-black uppercase text-yellow-500 mb-1 tracking-widest">Racial Power</h5>
          <p className="text-[11px] font-bold text-neutral-200 leading-tight">{character.racialAbilities[0]}</p>
        </div>
      )}

      {/* Class/Faction Branding Overlay */}
      <div className="absolute top-4 left-4 flex items-center gap-3 z-20 bg-black/60 backdrop-blur-md p-2.5 pr-5 rounded-full border border-white/10 shadow-2xl transition-all hover:scale-105 active:scale-95">
        <div className={`w-11 h-11 rounded-full border-2 border-neutral-700 flex items-center justify-center shadow-inner ${character.faction === 'ALLIANCE' ? 'bg-blue-900/40 text-blue-400 border-blue-500/30' : 'bg-red-900/40 text-red-500 border-red-500/30'}`}>
           <span className="text-lg font-black italic tracking-tighter">{character.faction[0]}</span>
        </div>
        <div className="flex flex-col">
          <h4 className="text-sm font-black text-white leading-none uppercase tracking-tighter">{character.name}</h4>
          <div className="flex items-center gap-1.5 mt-1">
             <span className="text-[9px] font-black text-neutral-300 uppercase tracking-widest">LVL {character.level}</span>
             <span className="w-1 h-1 rounded-full bg-neutral-600" />
             <span className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest">{character.race} {character.classId}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
