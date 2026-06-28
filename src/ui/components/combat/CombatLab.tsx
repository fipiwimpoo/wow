
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Swords, 
  Dice5, 
  ChevronRight, 
  RotateCcw, 
  User, 
  Skull, 
  Zap, 
  AlertCircle,
  MessageSquare,
  Terminal,
  X,
  Wand2
} from 'lucide-react';
import { useCharacterStore } from '../../../core/state/characterStore';
import { CombatPhase, CombatEffectLog, DiceColor, Die, CombatStateTokens, TokenInstance, createEmptyCombatTokens, normalizeCombatTokens, CombatState } from '../../../core/models/combat';
import { getAllMonsters } from '../../../core/utils/db';
import { MonsterData } from '../../../core/models/monsterData';
import { BlobImage } from '../../components/tools/BlobImage';
import { motion } from 'motion/react';
import { v4 as uuidv4 } from 'uuid';
import { CombatAreaRenderer } from './CombatAreaRenderer';
import { CombatAreaLayout } from '../../../core/models/combatArea';
import { CombatEngine, RNG } from '../../../core/engine';

interface CombatLabProps {
  onClose: () => void;
}

export function CombatLab({ onClose }: CombatLabProps) {
  const activeCharacter = useCharacterStore(state => state.activeCharacter);
  const resolvedSheet = useCharacterStore(state => state.resolvedSheet);

  const engineRef = useRef<CombatEngine | null>(null);
  if (!engineRef.current) {
    engineRef.current = new CombatEngine();
  }
  const engine = engineRef.current;

  const [engineState, setEngineState] = useState<CombatState>(engine.state);

  useEffect(() => {
    engine.onStateChange((newState) => {
      setEngineState(newState);
    });
  }, [engine]);

  const [monsters, setMonsters] = useState<MonsterData[]>([]);
  const [selectedMonster, setSelectedMonster] = useState<MonsterData | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<'green' | 'red' | 'purple' | 'blue'>('green');
  
  const [combatActive, setCombatActive] = useState(false);
  const [combatLayout, setCombatLayout] = useState<CombatAreaLayout | null>(null);
  const [showDebugLayout, setShowDebugLayout] = useState(false);

  // Destructure engineState for easier access (adapters)
  const phase = engineState.phase;
  const round = engineState.round;
  const dicePool = engineState.dicePool;
  const logs = engineState.effectLog;
  const tokens = engineState.tokens;

  // Load monsters and layout
  useEffect(() => {
    getAllMonsters().then(setMonsters);
    
    const savedLayout = localStorage.getItem('combatAreaLayout');
    if (savedLayout) {
      setCombatLayout(JSON.parse(savedLayout));
    }
  }, []);

  const monsterStats = useMemo(() => {
    if (!selectedMonster) return null;
    return selectedMonster.variants[selectedVariant] || null;
  }, [selectedMonster, selectedVariant]);

  const resetCombat = () => {
    engine.startCombat();
    setCombatActive(false);
  };

  const rollDie = (sides: number = 8) => RNG.rollDie(sides);

  const processEffects = (currentPhase: string, currentPool: Die[]) => {
    if (!resolvedSheet) return currentPool;

    const newLogs: CombatEffectLog[] = [];
    let updatedPool = [...currentPool];

    resolvedSheet.triggeredEffects.forEach(effect => {
      const trigger = effect.trigger.toLowerCase();
      
      let isMatch = false;
      if (currentPhase === 'START_OF_COMBAT' && trigger.includes('start of combat')) isMatch = true;
      if (currentPhase === 'START_OF_FIRST_ROUND' && round === 1 && trigger.includes('start of the first round')) isMatch = true;
      if (currentPhase === 'START_OF_DICE_POOL_STEP' && trigger.includes('start of your dice pool step')) isMatch = true;
      if (currentPhase === 'END_OF_DICE_POOL_STEP' && trigger.includes('end of your dice pool step')) isMatch = true;
      if (currentPhase === 'START_OF_REROLL_STEP' && trigger.includes('start of your reroll step')) isMatch = true;
      if (currentPhase === 'END_OF_REROLL_STEP' && trigger.includes('end of your reroll step')) isMatch = true;
      if (currentPhase === 'END_OF_COMBAT' && trigger.includes('end of combat')) isMatch = true;

      if (isMatch) {
        if (effect.activationMode === 'automatic') {
          // Check condition
          let conditionMet = true;
          if (effect.conditionType === 'spot_die' && effect.conditionPayload) {
            const { color, minValue } = effect.conditionPayload;
            const hasMatchingDie = updatedPool.some(d => d.color === color && d.value >= minValue);
            conditionMet = hasMatchingDie;
          } else if (effect.condition) {
             // Legacy fallback log if it has a text condition but no structured condition
             newLogs.push({
               cardName: effect.name,
               trigger: effect.trigger,
               activationMode: 'automatic',
               conditionMet: false,
               autoExecuted: false,
               result: "Cannot parse legacy text condition. Not executed.",
               isLegacyFallback: true
             });
             return;
          }

          if (conditionMet) {
             let executed = false;
             let resultMsg = "";
             if (effect.effectType === 'roll_additional_die' && effect.effectPayload) {
               const { color, count } = effect.effectPayload;
               for (let i = 0; i < count; i++) {
                 const newVal = rollDie();
                 updatedPool.push({
                   id: uuidv4(),
                   color: color,
                   value: newVal,
                   sourceCardId: effect.name,
                   generatedByEffectId: effect.id,
                   isNew: true,
                   rerolled: false,
                   isConsumed: false
                 });
                 resultMsg += `tiró 1 dado ${color} adicional: ${newVal}. `;
               }
               executed = true;
             } else {
               resultMsg = "Using legacy text parser fallback - effect applied textually but not simulated.";
             }

             newLogs.push({
                cardName: effect.name,
                trigger: effect.trigger,
                activationMode: 'automatic',
                conditionMet: true,
                autoExecuted: true,
                result: `${effect.name} detectó condición → ${resultMsg.trim()}`,
                isLegacyFallback: !executed
             });
          }
        } else {
          newLogs.push({
            cardName: effect.name,
            trigger: effect.trigger,
            activationMode: effect.activationMode,
            conditionMet: true,
            autoExecuted: false,
            result: "Disponible para activación manual"
          });
        }
      }
    });

    newLogs.forEach(l => engine.logger.addLog(l));
    return updatedPool;
  };

  const nextStep = () => {
    if (!combatActive) {
      setCombatActive(true);
      engine.forceSetPhase('START_OF_COMBAT');
      const updatedPool = processEffects('START_OF_COMBAT', dicePool);
      engine.updateState(state => {
        state.dicePool = updatedPool;
      });
      return;
    }

    const phases: CombatPhase[] = [
      'START_OF_COMBAT',
      'START_OF_FIRST_ROUND',
      'START_OF_DICE_POOL_STEP',
      'DICE_POOL_STEP',
      'END_OF_DICE_POOL_STEP',
      'START_OF_REROLL_STEP',
      'END_OF_REROLL_STEP',
      'PLACE_TOKENS_STEP',
      'END_OF_COMBAT'
    ];

    const currentIndex = phases.indexOf(phase);
    if (currentIndex < phases.length - 1) {
      const nextPhase = phases[currentIndex + 1];
      engine.forceSetPhase(nextPhase);

      engine.updateState(state => {
        // Clear 'isNew' flags from previous step for tokens and dice
        const safePrev = normalizeCombatTokens(state.tokens);
        state.tokens = {
          damageBox: { hits: safePrev.damageBox.hits.map(t => ({ ...t, isNew: false })) },
          defenseBox: { 
            hits: safePrev.defenseBox.hits.map(t => ({ ...t, isNew: false })), 
            armor: safePrev.defenseBox.armor.map(t => ({ ...t, isNew: false })) 
          },
          attritionBox: { hits: safePrev.attritionBox.hits.map(t => ({ ...t, isNew: false })) }
        };
        
        let currentPool = state.dicePool.map(d => ({ ...d, isNew: false }));

        if (nextPhase === 'DICE_POOL_STEP') {
          if (resolvedSheet) {
             const newPool: Die[] = [];
             ['red', 'blue', 'green'].forEach(col => {
               const count = resolvedSheet.dicePool[col as keyof typeof resolvedSheet.dicePool] as number;
               for (let i = 0; i < count; i++) {
                 newPool.push({
                   id: uuidv4(),
                   color: col as DiceColor,
                   value: rollDie(),
                   isNew: true,
                   rerolled: false,
                   isConsumed: false
                 });
               }
             });
             currentPool = newPool;
          }
        }

        if (nextPhase === 'PLACE_TOKENS_STEP' && monsterStats) {
          const threat = monsterStats.threat;
          const newTokens = normalizeCombatTokens(state.tokens);
          let individualLogs: string[] = [];

          currentPool = currentPool.map(die => {
            if (!die.isConsumed && !die.placedToken && die.value >= threat) {
              const tokenInstance: TokenInstance = {
                id: uuidv4(),
                type: "hit",
                box: "damage",
                sourceDieId: die.id,
                sourceCardId: die.sourceCardId || `${die.color} die (${die.value})`,
                createdAtStep: nextPhase,
                isNew: true
              };

              const sourceName = die.sourceCardId || `Basic ${die.color} die`;

              if (die.color === 'blue') {
                tokenInstance.box = 'damage';
                tokenInstance.type = 'hit';
                newTokens.damageBox.hits.push(tokenInstance);
                individualLogs.push(`Blue die ${die.value} from ${sourceName} → Hit Token created in Damage Box`);
              } else if (die.color === 'red') {
                tokenInstance.box = 'defense';
                tokenInstance.type = 'hit';
                newTokens.defenseBox.hits.push(tokenInstance);
                individualLogs.push(`Red die ${die.value} from ${sourceName} → Hit Token created in Defense Box`);
              } else if (die.color === 'green') {
                tokenInstance.box = 'defense';
                tokenInstance.type = 'armor';
                newTokens.defenseBox.armor.push(tokenInstance);
                individualLogs.push(`Green die ${die.value} from ${sourceName} → Armor Token created in Defense Box`);
              }
              return { ...die, placedToken: true };
            }
            return die;
          });

          const attritionValue = resolvedSheet?.attrition || 0;
          if (attritionValue > 0) {
            for (let i = 0; i < attritionValue; i++) {
              newTokens.attritionBox.hits.push({
                id: uuidv4(),
                type: "hit",
                box: "attrition",
                createdAtStep: nextPhase,
                isNew: true
              });
            }
            individualLogs.push(`Attrition value ${attritionValue} → +${attritionValue} Hit Token(s) in Attrition Box`);
          } else {
            individualLogs.push(`Attrition value 0 → no attrition tokens`);
          }

          state.tokens = newTokens;
          
          const logMsg = `Threat objetivo: ${threat}.\n` + (individualLogs.length > 0 ? individualLogs.join('\n') : 'Ningún dado superó el Threat.');

          engine.logger.addLog({
            cardName: 'System',
            trigger: 'Place Tokens Step',
            activationMode: 'automatic',
            conditionMet: true,
            autoExecuted: true,
            result: logMsg
          });
        }

        const updatedPool = processEffects(nextPhase, currentPool);
        state.dicePool = updatedPool;
      });
    }
  };

  // God Mode specific functions
  const forcePlaceTokensTest = () => {
    engine.updateState(state => {
      state.dicePool = [
        { id: uuidv4(), color: 'red', value: 8, sourceCardId: 'Trogg Club', isNew: true, rerolled: false, isConsumed: false },
        { id: uuidv4(), color: 'red', value: 2, sourceCardId: 'Trogg Club', isNew: true, rerolled: false, isConsumed: false },
        { id: uuidv4(), color: 'green', value: 5, sourceCardId: 'Cured Leather Armor', isNew: true, rerolled: false, isConsumed: false },
        { id: uuidv4(), color: 'green', value: 2, sourceCardId: 'Cured Leather Armor', isNew: true, rerolled: false, isConsumed: false },
        { id: uuidv4(), color: 'green', value: 5, sourceCardId: 'Cured Leather Armor', isNew: true, rerolled: false, isConsumed: false },
        { id: uuidv4(), color: 'green', value: 8, sourceCardId: 'Cured Leather Armor', isNew: true, rerolled: false, isConsumed: false },
        { id: uuidv4(), color: 'blue', value: 7, sourceCardId: 'Magic Wand', isNew: true, rerolled: false, isConsumed: false }
      ];
    });
    engine.forceSetPhase('END_OF_REROLL_STEP');
    if (!combatActive) setCombatActive(true);
  };

  const forceRedEight = () => {
    engine.updateState(state => {
      state.dicePool = [
         ...state.dicePool.map(d => ({ ...d, isNew: false })),
         {
           id: uuidv4(),
           color: 'red',
           value: 8,
           sourceCardId: 'GodMode',
           isNew: true,
           rerolled: false,
           isConsumed: false
         }
       ];
    });
  };

  const updateDieValue = (id: string, newValue: number) => {
    engine.updateState(state => {
      state.dicePool = state.dicePool.map(d => d.id === id ? { ...d, value: newValue } : d);
    });
  };

  const getDiceByColor = (color: DiceColor) => dicePool.filter(d => d.color === color);

  return (
    <div className="fixed inset-0 z-[200] bg-neutral-950 flex flex-col overflow-hidden font-sans text-neutral-200">
      {/* Header */}
      <header className="flex justify-between items-center p-4 bg-neutral-900 border-b border-neutral-800">
        <div className="flex items-center gap-3">
          <div className="bg-yellow-600 p-2 rounded-lg shadow-lg shadow-yellow-600/20">
            <Swords className="w-5 h-5 text-neutral-950" />
          </div>
          <div>
            <h2 className="text-lg font-black uppercase tracking-tighter text-white">Combat Lab <span className="text-neutral-500 font-medium text-xs ml-2 tracking-widest italic">Fase 2</span></h2>
            <p className="text-[10px] text-neutral-500 uppercase font-bold tracking-widest">Motor de resolución de Triggers & Dice Pool Vivo</p>
          </div>
        </div>
        <button onClick={onClose} className="p-2 hover:bg-neutral-800 rounded-full transition-colors">
          <X className="w-6 h-6" />
        </button>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar: Setup */}
        <aside className="w-80 border-r border-neutral-900 bg-black/20 overflow-y-auto p-4 flex flex-col gap-6">
          <section>
            <h3 className="text-[10px] font-black text-neutral-500 uppercase tracking-widest mb-3 px-1 flex items-center gap-2">
              <User className="w-3 h-3" /> Personaje Seleccionado
            </h3>
            {activeCharacter ? (
              <div className="bg-neutral-900/50 rounded-xl p-3 border border-neutral-800 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-neutral-800 flex items-center justify-center shrink-0 border border-neutral-700">
                  <User className="w-5 h-5 text-neutral-500" />
                </div>
                <div>
                  <div className="font-bold text-sm text-neutral-200">{activeCharacter.name}</div>
                  <div className="text-[10px] text-neutral-500 font-bold uppercase">{activeCharacter.classId} • Nivel {activeCharacter.level}</div>
                </div>
              </div>
            ) : (
              <div className="p-4 text-center text-xs text-neutral-600 bg-neutral-900/20 rounded-lg border border-dashed border-neutral-800 italic">
                Carga un personaje primero
              </div>
            )}
          </section>

          <section>
            <h3 className="text-[10px] font-black text-neutral-500 uppercase tracking-widest mb-3 px-1 flex items-center gap-2">
              <Skull className="w-3 h-3" /> Enemigo de Prueba
            </h3>
            <div className="flex flex-col gap-3">
              <select 
                className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-yellow-600/50"
                value={selectedMonster?.id || ''}
                onChange={(e) => {
                  const m = monsters.find(m => m.id === e.target.value);
                  setSelectedMonster(m || null);
                  resetCombat();
                }}
              >
                <option value="">Seleccionar Criatura...</option>
                {monsters.map(m => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>

              {selectedMonster && (
                <div className="bg-neutral-900/50 rounded-xl p-4 border border-neutral-800 flex flex-col gap-4">
                  <div className="flex gap-3 items-center">
                    <div className="w-12 h-12 rounded-full overflow-hidden shrink-0 border border-neutral-700">
                      {selectedMonster.imageAssetId ? (
                        <BlobImage cardId={selectedMonster.imageAssetId} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-neutral-800 flex items-center justify-center text-[10px] font-bold text-neutral-600 uppercase">IMG</div>
                      )}
                    </div>
                    <div>
                      <div className="font-black text-xs uppercase text-white leading-tight">{selectedMonster.name}</div>
                      <div className="text-[9px] text-neutral-500 font-bold uppercase tracking-wider">{selectedMonster.expansion}</div>
                    </div>
                  </div>

                  <div className="flex gap-1 bg-black/40 p-1 rounded-lg">
                    {(['green', 'red', 'purple', 'blue'] as const).map(c => (
                      <button
                        key={c}
                        onClick={() => { setSelectedVariant(c); resetCombat(); }}
                        className={`flex-1 py-1 rounded text-[9px] font-black uppercase transition-all ${
                          selectedVariant === c 
                            ? `bg-${c === 'purple' ? 'purple' : c === 'green' ? 'emerald' : c}-600 text-white shadow-lg` 
                            : 'text-neutral-500 hover:text-neutral-300'
                        }`}
                      >
                        {c}
                      </button>
                    ))}
                  </div>

                  {monsterStats && (
                    <div className="grid grid-cols-3 gap-2">
                      <div className="bg-black/40 p-2 rounded border border-neutral-800 text-center">
                        <div className="text-[8px] font-black text-neutral-500 uppercase mb-0.5">Threat</div>
                        <div className="text-sm font-black text-amber-500">{monsterStats.threat}</div>
                      </div>
                      <div className="bg-black/40 p-2 rounded border border-neutral-800 text-center">
                        <div className="text-[8px] font-black text-neutral-500 uppercase mb-0.5">Attack</div>
                        <div className="text-sm font-black text-red-500">{monsterStats.attack}</div>
                      </div>
                      <div className="bg-black/40 p-2 rounded border border-neutral-800 text-center">
                        <div className="text-[8px] font-black text-neutral-500 uppercase mb-0.5">Health</div>
                        <div className="text-sm font-black text-emerald-500">{monsterStats.health}</div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>

          {/* God Mode Tools */}
          <section className="mt-4 p-4 bg-purple-950/20 border border-purple-900/30 rounded-xl flex flex-col gap-3">
             <h3 className="text-[10px] font-black text-purple-400 uppercase tracking-widest flex items-center gap-2">
               <Wand2 className="w-3.5 h-3.5" /> God Mode Tools
             </h3>
             <button 
               onClick={forceRedEight}
               disabled={!combatActive}
               className="w-full bg-red-950/40 hover:bg-red-900/60 text-red-400 border border-red-900/50 rounded py-2 text-xs font-black uppercase disabled:opacity-50 transition-colors"
             >
               Forzar Dado Rojo (8)
             </button>
             <button 
               onClick={forcePlaceTokensTest}
               className="w-full bg-emerald-950/40 hover:bg-emerald-900/60 text-emerald-400 border border-emerald-900/50 rounded py-2 text-xs font-black uppercase transition-colors"
             >
               Forzar Place Tokens Test
             </button>
          </section>

          <div className="mt-auto">
            <button 
              onClick={resetCombat}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-xs font-black uppercase tracking-widest text-neutral-400 transition-all active:scale-95"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reiniciar Combat Lab
            </button>
          </div>
        </aside>

        {/* Main Content: Combat Simulation */}
        <main className="flex-1 flex flex-col bg-neutral-950 overflow-hidden">
          {/* Phase Toolbar */}
          <div className="p-4 bg-neutral-900/30 border-b border-neutral-900 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-blue-600/20 px-3 py-1.5 rounded-lg border border-blue-500/30">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-400">FASE ACTUAL:</span>
                <span className="ml-3 text-sm font-black text-white italic">{phase.replace(/_/g, ' ')}</span>
              </div>
              <div className="text-neutral-500 font-bold text-xs uppercase tracking-widest">Ronda {round}</div>
            </div>

            <button 
              onClick={nextStep}
              disabled={!selectedMonster}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                !selectedMonster 
                  ? 'bg-neutral-800 text-neutral-600 cursor-not-allowed opacity-50' 
                  : 'bg-yellow-600 text-neutral-950 shadow-lg shadow-yellow-600/20 hover:bg-yellow-500 active:scale-95'
              }`}
            >
              {!combatActive ? 'Iniciar Combate' : phase === 'END_OF_COMBAT' ? 'Finalizado' : 'Resolver Siguiente Paso'}
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-8">
            
            {/* Combat Area Visualizer */}
            {combatLayout ? (
              <section className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-[10px] font-black text-neutral-500 uppercase tracking-widest flex items-center gap-2 px-1">
                    Combat Area
                  </h3>
                  <button 
                    onClick={() => setShowDebugLayout(!showDebugLayout)}
                    className="text-[9px] px-2 py-1 rounded bg-neutral-900 border border-neutral-700 text-neutral-400 font-bold uppercase"
                  >
                    Toggle Debug Layout
                  </button>
                </div>
                <div className="w-full bg-neutral-900/50 rounded-2xl border border-neutral-800 overflow-hidden" style={{ minHeight: '300px' }}>
                  <CombatAreaRenderer layout={combatLayout} tokens={tokens} debug={showDebugLayout} />
                </div>
              </section>
            ) : (
              <div className="p-4 bg-yellow-950/20 border border-yellow-900/50 rounded-xl text-yellow-500/80 text-xs text-center font-bold">
                Combat Area Layout not configured. Use Combat Mapper tool first.
              </div>
            )}

            {/* Dice Pool Display */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-[10px] font-black text-neutral-500 uppercase tracking-widest flex items-center gap-2 px-1">
                  <Dice5 className="w-3.5 h-3.5" /> Live Dice Pool
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {(['red', 'blue', 'green', 'black'] as DiceColor[]).map(color => {
                  const diceOfColor = getDiceByColor(color);
                  return (
                    <div key={color} className={`bg-neutral-900/40 rounded-2xl border p-4 flex flex-col gap-3 min-h-[140px] transition-all ${
                      diceOfColor.length > 0 ? `border-${color === 'black' ? 'white/20' : color + '-500/30'}` : 'border-neutral-800 border-dashed opacity-40'
                    }`}>
                      <div className="flex justify-between items-center">
                        <span className={`text-[10px] font-black uppercase tracking-widest ${
                          color === 'red' ? 'text-red-500' : 
                          color === 'blue' ? 'text-blue-500' : 
                          color === 'green' ? 'text-green-500' : 'text-neutral-400'
                        }`}>
                          {color} Dice
                        </span>
                        <span className="text-xs font-black text-neutral-500">{diceOfColor.length}</span>
                      </div>
                      <div className="flex flex-wrap gap-3">
                        {diceOfColor.map(die => (
                          <motion.div 
                            initial={die.isNew ? { scale: 0, rotate: -45 } : false}
                            animate={{ scale: 1, rotate: 0 }}
                            key={die.id} 
                            className="relative group cursor-pointer"
                            onClick={() => {
                              const v = prompt("Cambiar valor del dado (1-8):", String(die.value));
                              if (v && !isNaN(Number(v))) {
                                updateDieValue(die.id, Math.max(1, Math.min(8, Number(v))));
                              }
                            }}
                          >
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl font-black shadow-lg ${
                              color === 'red' ? 'bg-red-600 text-white shadow-red-900/20 border-red-500/50' : 
                              color === 'blue' ? 'bg-blue-600 text-white shadow-blue-900/20 border-blue-500/50' : 
                              color === 'green' ? 'bg-emerald-600 text-white shadow-emerald-900/20 border-emerald-500/50' : 
                              'bg-neutral-800 text-neutral-200 shadow-neutral-950/50 border-neutral-700/50'
                            } border-b-4 border-r-2 ${die.placedToken ? 'opacity-40 grayscale' : ''}`}>
                              {die.value}
                            </div>
                            {die.isNew && (
                              <div className="absolute -top-2 -right-2 bg-yellow-500 text-black text-[8px] font-black px-1.5 py-0.5 rounded shadow-lg animate-bounce uppercase z-20">
                                NEW
                              </div>
                            )}
                            {die.placedToken && (
                              <div className="absolute inset-0 flex items-center justify-center">
                                <span className="bg-black/80 text-white text-[8px] font-black uppercase px-2 py-0.5 rounded backdrop-blur-sm shadow-xl z-10 border border-white/20 -rotate-12">PLACED</span>
                              </div>
                            )}
                            {die.sourceCardId && (
                               <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-black text-[9px] text-neutral-400 font-mono px-2 py-0.5 rounded border border-neutral-800 whitespace-nowrap z-10 pointer-events-none">
                                 {die.sourceCardId}
                               </div>
                            )}
                          </motion.div>
                        ))}
                        {diceOfColor.length === 0 && (
                          <div className="flex-1 flex items-center justify-center text-[10px] font-bold text-neutral-700 uppercase italic">Empty</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Effect Resolution Log */}
              <section className="flex flex-col gap-4">
                <h3 className="text-[10px] font-black text-neutral-500 uppercase tracking-widest flex items-center gap-2 px-1">
                  <Terminal className="w-3.5 h-3.5" /> Resolution Log
                </h3>
                <div className="flex-1 bg-black/40 rounded-2xl border border-neutral-900 overflow-hidden flex flex-col min-h-[300px]">
                  <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2 font-mono">
                    {logs.map((log, i) => (
                      <div key={i} className={`text-xs border-b border-neutral-800/50 pb-2 last:border-0 ${log.isLegacyFallback ? 'opacity-60' : ''}`}>
                        <div className="flex justify-between items-center gap-2 mb-1">
                          <span className="text-yellow-500 font-bold">[{log.cardName}]</span>
                          <span className={`text-[8px] font-black px-1.5 py-0.5 rounded border uppercase shrink-0 ${
                            log.activationMode === 'automatic' ? 'bg-blue-900/30 text-blue-400 border-blue-800/50' : 'bg-yellow-900/30 text-yellow-400 border-yellow-800/50'
                          }`}>
                            {log.activationMode}
                          </span>
                        </div>
                        <div className="text-neutral-400 text-[10px] italic mb-1 uppercase tracking-tighter">Trigger: {log.trigger}</div>
                        <div className={`flex items-center gap-2 ${log.autoExecuted ? 'text-emerald-400' : 'text-neutral-500'}`}>
                          <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${log.autoExecuted ? 'bg-emerald-500 animate-pulse' : 'bg-neutral-700'}`} />
                          <span className="leading-tight break-words">{log.result}</span>
                        </div>
                      </div>
                    ))}
                    {logs.length === 0 && (
                      <div className="flex-1 flex flex-col items-center justify-center text-neutral-700 italic text-xs gap-2">
                        <MessageSquare className="w-6 h-6 opacity-20" />
                        No effects triggered in this session yet.
                      </div>
                    )}
                  </div>
                </div>
              </section>

              {/* Available Actions (Manual/Optional) */}
              <section className="flex flex-col gap-4">
                <h3 className="text-[10px] font-black text-neutral-500 uppercase tracking-widest flex items-center gap-2 px-1 text-yellow-500">
                  <Zap className="w-3.5 h-3.5" /> Available Actions
                </h3>
                <div className="flex-1 bg-yellow-950/5 rounded-2xl border border-yellow-900/20 p-4 flex flex-col gap-3">
                  {resolvedSheet?.triggeredEffects.filter(e => e.activationMode !== 'automatic').map((action, i) => {
                     const trigger = action.trigger.toLowerCase();
                     let isMatch = false;
                     if (phase === 'START_OF_COMBAT' && trigger.includes('start of combat')) isMatch = true;
                     if (phase === 'START_OF_FIRST_ROUND' && round === 1 && trigger.includes('start of the first round')) isMatch = true;
                     if (phase === 'START_OF_DICE_POOL_STEP' && trigger.includes('start of your dice pool step')) isMatch = true;
                     if (phase === 'END_OF_DICE_POOL_STEP' && trigger.includes('end of your dice pool step')) isMatch = true;
                     if (phase === 'START_OF_REROLL_STEP' && trigger.includes('start of your reroll step')) isMatch = true;
                     if (phase === 'END_OF_REROLL_STEP' && trigger.includes('end of your reroll step')) isMatch = true;

                     return (
                        <div key={action.id} className={`p-4 rounded-xl border transition-all ${
                          isMatch ? 'bg-yellow-600/10 border-yellow-500/40' : 'bg-neutral-900/20 border-neutral-800 opacity-40'
                        }`}>
                          <div className="flex justify-between items-start mb-2">
                            <span className="font-bold text-sm text-yellow-500">{action.name}</span>
                            <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-yellow-500 text-black uppercase">{action.activationMode}</span>
                          </div>
                          <div className="text-[10px] text-neutral-500 font-bold uppercase mb-2 tracking-tight italic">Trigger: {action.trigger}</div>
                          <p className="text-xs text-neutral-300 leading-relaxed italic border-l-2 border-yellow-600/30 pl-3">"{action.effect}"</p>
                          {action.cost && (
                            <div className="mt-3 flex items-center gap-2 bg-black/40 px-3 py-1.5 rounded-lg border border-white/5">
                              <Zap className="w-3 h-3 text-blue-400" />
                              <span className="text-[10px] font-black uppercase text-blue-400 tracking-wider">Costo: {typeof action.cost === 'string' ? action.cost : JSON.stringify(action.cost)}</span>
                            </div>
                          )}
                        </div>
                     );
                  })}
                  {resolvedSheet?.triggeredEffects.filter(e => e.activationMode !== 'automatic').length === 0 && (
                    <div className="flex-1 flex flex-col items-center justify-center text-neutral-700 italic text-xs gap-2">
                      <AlertCircle className="w-6 h-6 opacity-20" />
                      No player actions available with current items.
                    </div>
                  )}
                </div>
              </section>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
