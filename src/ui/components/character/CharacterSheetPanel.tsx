import React, { useState } from 'react';
import { useCharacterStore } from '../../../core/state/characterStore';
import { 
  CLASS_COLORS, 
  CLASS_DEFINITIONS, 
  OfficialCharacterDefinition,
  OFFICIAL_CHARACTER_DEFINITIONS,
  EquipmentSlots
} from '../../../core/models/character';
import { CardReferenceIndex } from '../../../core/utils/cardReferenceIndex';
import { CHARACTER_SHEET_LAYOUTS, CharacterSheetLayout } from '../../../core/models/layouts';

import { 
  User,
  Layout,
  ShoppingBag,
  BookOpen,
  Dices,
  RotateCcw,
  FlaskConical,
  X,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';

import { CharacterSheetRenderer } from './CharacterSheetRenderer';
import { CharacterBag } from './CharacterBag';
import { CharacterPowers } from './CharacterPowers';
import { MechanicalSummary } from './MechanicalSummary';
import { DebugChest } from './DebugChest';
import { resolveCharacterSheetLayout } from '../../../core/utils/characterSheetLayoutResolver';

type CharacterTab = 'tablero' | 'mochila' | 'poderes' | 'resumen';

interface CharacterSheetPanelProps {
  miniMode?: boolean;
  fullWidth?: boolean;
}

export function CharacterSheetPanel({ miniMode = false, fullWidth = false }: CharacterSheetPanelProps) {
  const activeCharacter = useCharacterStore(state => state.activeCharacter);
  const resolvedSheet = useCharacterStore(state => state.resolvedSheet);
  const deleteCharacter = useCharacterStore(state => state.deleteCharacter);
  
  const gainItem = useCharacterStore(state => state.gainItem);
  const removeItem = useCharacterStore(state => state.removeItem);
  const equipItem = useCharacterStore(state => state.equipItem);
  const unequipItem = useCharacterStore(state => state.unequipItem);

  const [activeTab, setActiveTab] = useState<CharacterTab>('tablero');
  const [showDebug, setShowDebug] = useState(false);
  const [debugSheet, setDebugSheet] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [successText, setSuccessText] = useState<string | null>(null);
  const [equipModalCardId, setEquipModalCardId] = useState<string | null>(null);
  const [unequipSlot, setUnequipSlot] = useState<keyof EquipmentSlots | null>(null);

  if (!activeCharacter || !resolvedSheet) {
    return (
      <div className={`flex flex-col items-center justify-center h-full p-6 text-neutral-400 bg-neutral-950 ${!fullWidth ? 'border-l border-neutral-900' : ''}`}>
        <User className="w-12 h-12 text-neutral-800 mb-4" />
        <p className="text-center font-black text-neutral-500 uppercase tracking-widest text-sm">No hay personaje cargado</p>
      </div>
    );
  }

  if (miniMode) {
    return (
      <div className="flex flex-col h-full bg-neutral-950 overflow-hidden">
        {/* Simple Sidebar Content for Board View */}
        <div className="p-4 flex flex-col gap-4">
           <div className="bg-neutral-900/50 p-4 rounded-xl border border-neutral-800 shadow-lg">
             <h4 className="text-[10px] font-black uppercase text-yellow-500 tracking-widest mb-2">Estado Vital</h4>
             <div className="grid grid-cols-2 gap-3">
               <div className="bg-neutral-800/40 p-2 rounded border border-white/5">
                 <div className="text-[9px] text-neutral-500 uppercase font-black">Salud</div>
                 <div className="text-lg font-black text-red-500">{activeCharacter.currentHealth} / {resolvedSheet.maxHealth}</div>
               </div>
               <div className="bg-neutral-800/40 p-2 rounded border border-white/5">
                 <div className="text-[9px] text-neutral-500 uppercase font-black">Energía</div>
                 <div className="text-lg font-black text-blue-400">{activeCharacter.currentEnergy} / {resolvedSheet.maxEnergy}</div>
               </div>
             </div>
           </div>

           <div className="bg-neutral-900/50 p-4 rounded-xl border border-neutral-800 shadow-lg">
             <h4 className="text-[10px] font-black uppercase text-neutral-400 tracking-widest mb-3">Equipo Activo</h4>
             <div className="flex flex-col gap-2">
               {['mainHand', 'offHand', 'armor'].map(slot => {
                 const itemId = (activeCharacter.equipment as any)[slot];
                 const item = itemId ? CardReferenceIndex.getCard(itemId) : null;
                 return (
                   <div key={slot} className="flex items-center gap-3 bg-neutral-950 p-2 rounded border border-white/5">
                     <div className="w-8 h-8 rounded bg-neutral-800 flex items-center justify-center shrink-0 border border-neutral-700">
                        <span className="text-[10px] font-black text-neutral-600 uppercase">{slot[0]}</span>
                     </div>
                     <div className="min-w-0">
                       <div className="text-[8px] text-neutral-600 uppercase font-black">{slot.replace(/([A-Z])/g, ' $1')}</div>
                       <div className="text-[10px] font-bold text-neutral-300 truncate">{item?.name || 'Vacio'}</div>
                     </div>
                   </div>
                 );
               })}
             </div>
           </div>
        </div>
      </div>
    );
  }

  const definition = OFFICIAL_CHARACTER_DEFINITIONS.find(d => d.id === activeCharacter.characterDefinitionId);
  const classColor = CLASS_COLORS[activeCharacter.classId] || '#ffffff';

  const clearMessages = () => {
    setErrorText(null);
    setSuccessText(null);
  };

  const handleGainItem = (itemId: string) => {
    clearMessages();
    const res = gainItem(itemId);
    if (!res.success) {
      setErrorText(res.error || "No se pudo obtener el ítem.");
    } else {
      setSuccessText(`¡${CardReferenceIndex.getCard(itemId)?.name} añadido a la mochila!`);
    }
  };

  const handleEquipClick = (itemId: string) => {
    clearMessages();
    setEquipModalCardId(itemId);
  };

  const executeEquip = (slotKey: keyof EquipmentSlots) => {
    if (!equipModalCardId || !activeCharacter) return;
    
    // Resolve the active layout for the character using the central resolver
    const { layout } = resolveCharacterSheetLayout(activeCharacter);

    // Find slot that matches this equipment key (by ID or by Role)
    const layoutSlot = layout.slots.find(s => 
      s.id === slotKey || 
      s.itemConfig?.role === slotKey.replace(/([A-Z])/g, '_$1').toLowerCase()
    );

    console.log("[CharacterSheetPanel] executeEquip resolved layout:", layout.id);
    console.log("[CharacterSheetPanel] target slotKey:", slotKey, "found layoutSlot:", layoutSlot?.id);

    const res = equipItem(equipModalCardId, slotKey, layoutSlot);
    if (!res.success) {
      setErrorText(res.error || "No se pudo equipar.");
    } else {
      setSuccessText("Objeto equipado correctamente.");
      setEquipModalCardId(null);
      setActiveTab('tablero');
    }
  };

  const executeUnequip = (slot: keyof EquipmentSlots) => {
    clearMessages();
    const res = unequipItem(slot);
    if (!res.success) {
      setErrorText(res.error || "No se pudo desequipar.");
    } else {
      setSuccessText("Objeto desequipado correctamente.");
      setUnequipSlot(null);
    }
  };

  const handleDiscard = (itemId: string) => {
    clearMessages();
    removeItem(itemId);
    setSuccessText("Objeto descartado.");
  };

  const handleReset = () => {
    if (confirm("¿Estás seguro de que quieres borrar el personaje actual?")) {
      deleteCharacter();
      const appStoreSetScreen = (window as any).setAppScreen || (() => {});
      appStoreSetScreen('classes');
    }
  };

  const tabs: { id: CharacterTab; label: string; icon: React.ReactNode }[] = [
    { id: 'tablero', label: 'TABLERO', icon: <Layout className="w-4 h-4" /> },
    { id: 'mochila', label: 'MOCHILA', icon: <ShoppingBag className="w-4 h-4" /> },
    { id: 'poderes', label: 'PODERES', icon: <BookOpen className="w-4 h-4" /> },
    { id: 'resumen', label: 'RESUMEN', icon: <Dices className="w-4 h-4" /> },
  ];

  return (
    <div className={`flex flex-col h-full bg-neutral-950 text-white font-sans overflow-hidden ${fullWidth ? 'min-h-screen' : ''}`}>
      
      {/* Top Bar Navigation */}
      <nav className={`shrink-0 bg-neutral-900 border-b border-neutral-800 px-6 flex justify-between items-center ${fullWidth ? 'h-20' : 'h-16'}`}>
        <div className="flex items-center gap-8 h-full">
           <div className="flex items-center gap-3 pr-8 border-r border-neutral-800">
             <div style={{ backgroundColor: classColor }} className="w-4 h-4 rounded-full shadow-lg shadow-current/20" />
             <div className="flex flex-col">
               <span className="text-[10px] font-black uppercase tracking-widest text-neutral-500">Hoja del Jugador</span>
               <span className="text-sm font-black uppercase tracking-tighter text-white">{activeCharacter.race} {activeCharacter.classId}</span>
             </div>
           </div>
           
           <div className="flex h-full">
             {tabs.map(tab => (
               <button
                 key={tab.id}
                 onClick={() => setActiveTab(tab.id)}
                 className={`flex items-center gap-2 px-6 border-b-2 transition-all text-[11px] font-black uppercase tracking-widest ${
                   activeTab === tab.id 
                    ? 'border-yellow-500 text-yellow-500 bg-yellow-500/5' 
                    : 'border-transparent text-neutral-500 hover:text-neutral-300 hover:bg-neutral-800'
                 }`}
               >
                 {tab.icon}
                 {tab.label}
               </button>
             ))}
           </div>
        </div>

        <div className="flex items-center gap-3">
          {activeTab === 'tablero' && (
            <button 
              onClick={() => setDebugSheet(!debugSheet)}
              className={`p-2 rounded border transition-colors ${debugSheet ? 'bg-yellow-500 border-yellow-600 text-neutral-950' : 'bg-neutral-800 border-neutral-700 text-neutral-500 hover:text-white'}`}
              title="Debug Slots"
            >
              <Layout className="w-4 h-4" />
            </button>
          )}
          <button 
            onClick={() => setShowDebug(true)}
            className="p-2 rounded bg-neutral-800 text-neutral-500 hover:text-yellow-500 transition-colors border border-neutral-700"
            title="Cofre de Pruebas"
          >
            <FlaskConical className="w-4 h-4" />
          </button>
          <button 
            onClick={handleReset}
            className="p-2 rounded bg-neutral-800 text-neutral-500 hover:text-red-500 transition-colors border border-neutral-700"
            title="Reset Personaje"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </nav>

      {/* Main content viewport */}
      <main className="flex-1 overflow-y-auto p-8 relative">
        
        {/* Messages Overlay */}
        <div className="fixed top-20 right-8 z-40 flex flex-col gap-2 max-w-sm">
          {errorText && (
            <div className="bg-red-950 border border-red-800 p-3 rounded-lg flex items-center gap-3 shadow-2xl animate-bounce-in">
              <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
              <span className="text-xs font-bold text-red-200">{errorText}</span>
              <button onClick={() => setErrorText(null)}><X className="w-4 h-4 text-red-800" /></button>
            </div>
          )}
          {successText && (
            <div className="bg-green-950 border border-green-800 p-3 rounded-lg flex items-center gap-3 shadow-2xl animate-bounce-in">
              <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
              <span className="text-xs font-bold text-green-200">{successText}</span>
              <button onClick={() => setSuccessText(null)}><X className="w-4 h-4 text-green-800" /></button>
            </div>
          )}
        </div>

        {/* Tab Content */}
        <div className="max-w-6xl mx-auto w-full">
          {activeTab === 'tablero' && (
            <div className="animate-fade-in flex flex-col gap-8">
               <div className="text-center">
                 <h2 className="text-3xl font-black text-white uppercase tracking-tighter">Tablero del Jugador</h2>
                 <p className="text-xs text-neutral-500 uppercase font-bold tracking-widest mt-1">Representación digital de la hoja oficial</p>
               </div>
               <CharacterSheetRenderer 
                 character={activeCharacter} 
                 debugMode={debugSheet} 
                 onSlotClick={(slot) => setUnequipSlot(slot)} 
               />
            </div>
          )}

          {activeTab === 'mochila' && (
            <CharacterBag 
              character={activeCharacter} 
              onEquip={handleEquipClick}
              onDiscard={handleDiscard}
            />
          )}

          {activeTab === 'poderes' && (
            <CharacterPowers character={activeCharacter} />
          )}

          {activeTab === 'resumen' && (
            <MechanicalSummary character={activeCharacter} resolved={resolvedSheet} />
          )}
        </div>
      </main>

      {/* Modals & Overlays */}
      {showDebug && (
        <DebugChest 
          onClose={() => setShowDebug(false)} 
          onGainItem={handleGainItem} 
        />
      )}

      {/* Equip Selector Modal */}
      {equipModalCardId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-md">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-8 max-w-md w-full shadow-2xl">
            <h3 className="text-xl font-black text-white uppercase tracking-tight">Equipar Objeto</h3>
            <p className="text-xs text-neutral-400 mt-2">Selecciona un slot válido en el tablero para colocar esta carta.</p>
            
            <div className="grid grid-cols-2 gap-4 mt-6">
              {['mainHand', 'offHand', 'armor', 'helmet', 'shield', 'trinket'].map(slot => (
                <button
                  key={slot}
                  onClick={() => executeEquip(slot as keyof EquipmentSlots)}
                  className="p-4 bg-neutral-950 border border-neutral-800 rounded-xl hover:border-yellow-600 hover:bg-neutral-900 transition-all text-xs font-black uppercase tracking-widest text-neutral-400 hover:text-yellow-500"
                >
                  {slot.replace(/([A-Z])/g, ' $1')}
                </button>
              ))}
            </div>

            <button 
              onClick={() => setEquipModalCardId(null)}
              className="w-full mt-6 py-3 text-xs font-bold text-neutral-500 hover:text-white transition-colors uppercase tracking-widest"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Unequip Confirmation Modal */}
      {unequipSlot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-md">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-8 max-w-sm w-full shadow-2xl">
            <h3 className="text-xl font-black text-white uppercase tracking-tight">Gestionar Equipo</h3>
            <p className="text-xs text-neutral-400 mt-2">
              Slot: <span className="text-yellow-500 font-black uppercase">{unequipSlot.replace(/([A-Z])/g, ' $1')}</span>
            </p>
            
            <div className="flex flex-col gap-3 mt-8">
              <button
                onClick={() => {
                  const itemId = (activeCharacter.equipment as any)[unequipSlot];
                  if (itemId) {
                    // Logic to show detail could go here if requested, 
                    // for now just unequip or cancel
                  }
                  executeUnequip(unequipSlot);
                }}
                className="w-full py-4 bg-red-950/20 border border-red-900/40 rounded-xl hover:bg-red-900/40 hover:border-red-500 transition-all text-xs font-black uppercase tracking-widest text-red-500"
              >
                Desequipar
              </button>
              
              <button 
                onClick={() => setUnequipSlot(null)}
                className="w-full py-3 text-xs font-bold text-neutral-500 hover:text-white transition-colors uppercase tracking-widest border border-neutral-800 rounded-xl"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
