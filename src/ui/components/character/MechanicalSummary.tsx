import React from 'react';
import { CharacterResolvedSheet, BoardGameCharacter } from '../../../core/models/character';
import { Dices, Heart, Zap, Skull } from 'lucide-react';

interface MechanicalSummaryProps {
  character: BoardGameCharacter;
  resolved: CharacterResolvedSheet;
}

export function MechanicalSummary({ character, resolved }: MechanicalSummaryProps) {
  return (
    <div className="flex flex-col gap-6 animate-fade-in pb-10">
      {/* Resource Header */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-neutral-900 p-4 rounded-xl border border-neutral-800 flex flex-col gap-2">
          <div className="flex justify-between items-center">
             <span className="text-xs font-black uppercase tracking-widest text-red-500 flex items-center gap-1.5">
               <Heart className="w-4 h-4 fill-red-500/10" /> Vida
             </span>
             <span className="text-sm font-bold text-neutral-300">{character.currentHealth} / {resolved.maxHealth}</span>
          </div>
          <div className="h-2 bg-neutral-950 rounded-full overflow-hidden border border-neutral-800">
            <div 
              style={{ width: `${(character.currentHealth / resolved.maxHealth) * 100}%` }}
              className="h-full bg-red-600 transition-all duration-300"
            />
          </div>
        </div>

        <div className="bg-neutral-900 p-4 rounded-xl border border-neutral-800 flex flex-col gap-2">
          <div className="flex justify-between items-center">
             <span className="text-xs font-black uppercase tracking-widest text-blue-500 flex items-center gap-1.5">
               <Zap className="w-4 h-4 fill-blue-500/10" /> Energía
             </span>
             <span className="text-sm font-bold text-neutral-300">{character.currentEnergy} / {resolved.maxEnergy}</span>
          </div>
          <div className="h-2 bg-neutral-950 rounded-full overflow-hidden border border-neutral-800">
            <div 
              style={{ width: `${(character.currentEnergy / resolved.maxEnergy) * 100}%` }}
              className="h-full bg-blue-500 transition-all duration-300"
            />
          </div>
        </div>
      </div>

      {/* Combat Pool */}
      <div className="bg-neutral-900 p-6 rounded-2xl border border-neutral-800 flex flex-col gap-4">
        <h4 className="text-xs font-black text-neutral-400 uppercase tracking-widest flex items-center gap-2">
          <Dices className="w-4 h-4 text-yellow-500" /> Dice Pool & Combat Stats
        </h4>

        <div className="grid grid-cols-3 sm:grid-cols-5 gap-4">
          <div className="bg-neutral-950 p-3 rounded-xl border border-neutral-800 flex flex-col items-center gap-1">
            <div className="w-8 h-8 bg-red-600 rounded-md flex items-center justify-center font-black text-white shadow-lg">R</div>
            <span className="text-xl font-black text-white">{resolved.dicePool.red}</span>
          </div>
          <div className="bg-neutral-950 p-3 rounded-xl border border-neutral-800 flex flex-col items-center gap-1">
            <div className="w-8 h-8 bg-blue-600 rounded-md flex items-center justify-center font-black text-white shadow-lg">A</div>
            <span className="text-xl font-black text-white">{resolved.dicePool.blue}</span>
          </div>
          <div className="bg-neutral-950 p-3 rounded-xl border border-neutral-800 flex flex-col items-center gap-1">
            <div className="w-8 h-8 bg-green-600 rounded-md flex items-center justify-center font-black text-white shadow-lg">V</div>
            <span className="text-xl font-black text-white">{resolved.dicePool.green}</span>
          </div>
          <div className="bg-neutral-950 p-3 rounded-xl border border-neutral-800 flex flex-col items-center gap-1">
            <div className="text-[10px] font-black text-neutral-500 uppercase">Rerolls</div>
            <span className="text-xl font-black text-yellow-500">{resolved.reroll}</span>
          </div>
          <div className="bg-neutral-950 p-3 rounded-xl border border-neutral-800 flex flex-col items-center gap-1">
            <div className="text-[10px] font-black text-neutral-500 uppercase">Attrit.</div>
            <span className="text-xl font-black text-red-500">{resolved.attrition}</span>
          </div>
        </div>
      </div>

      {/* Passive Effects & Triggered Actions */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="flex flex-col gap-3">
          <h5 className="text-[10px] font-black text-neutral-500 uppercase tracking-widest px-1">Passive Effects</h5>
          <div className="flex flex-col gap-2">
            {resolved.passiveEffects.map((effect, idx) => (
              <div key={idx} className="bg-neutral-900/50 p-3 rounded-lg border border-neutral-800 text-xs text-neutral-300">
                {effect}
              </div>
            ))}
            {resolved.passiveEffects.length === 0 && <span className="text-xs text-neutral-600 italic px-1">No passive effects active.</span>}
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <h5 className="text-[10px] font-black text-neutral-500 uppercase tracking-widest px-1">Triggered Effects & Abilities</h5>
          <div className="flex flex-col gap-2">
            {resolved.triggeredEffects.map((effect, idx) => {
              const isOptional = effect.activationMode === 'optional' || effect.activationMode === 'cost';
              return (
                <div key={idx} className={`p-3 rounded-lg border text-xs flex flex-col gap-1.5 transition-all ${
                  isOptional 
                    ? 'bg-yellow-500/5 border-yellow-500/20' 
                    : 'bg-neutral-900/50 border-neutral-800'
                }`}>
                  <div className="flex justify-between items-start gap-2">
                    <span className={`font-black uppercase text-[9px] px-1.5 py-0.5 rounded ${
                      isOptional ? 'bg-yellow-500 text-black' : 'bg-neutral-800 text-neutral-400'
                    }`}>
                      {effect.activationMode?.replace('_', ' ') || 'Automatic'}
                    </span>
                    <span className="text-[9px] font-bold text-neutral-500 uppercase text-right">{effect.trigger}</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="font-bold text-neutral-200">{effect.name}</span>
                    {effect.condition && (
                      <span className="text-[10px] text-neutral-500 font-medium leading-tight">
                        <span className="uppercase font-black text-[8px] opacity-60">Condición:</span> {effect.condition}
                      </span>
                    )}
                    <span className="text-neutral-400 leading-relaxed italic">
                      {effect.effect}
                    </span>
                    {effect.cost && (
                      <div className="mt-1 flex items-center gap-1.5">
                        <Zap className="w-3 h-3 text-blue-500" />
                        <span className="text-[9px] font-black uppercase text-blue-400">
                          Costo: {typeof effect.cost === 'string' ? effect.cost : JSON.stringify(effect.cost)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            {resolved.triggeredEffects.length === 0 && <span className="text-xs text-neutral-600 italic px-1">No triggered effects.</span>}
          </div>
        </div>
      </div>

      {/* Status & Restrictions */}
      <div className="flex flex-col gap-3">
        <h5 className="text-[10px] font-black text-neutral-500 uppercase tracking-widest px-1">Status & Restrictions</h5>
        <div className="flex flex-col gap-2">
          {character.statusTokens.curse && (
            <div className="bg-purple-950/20 p-3 rounded-lg border border-purple-900/40 text-xs text-purple-300 flex items-center gap-2">
              <Skull className="w-4 h-4" /> CURSED: Unable to heal during combat.
            </div>
          )}
          {character.statusTokens.stun && (
            <div className="bg-amber-950/20 p-3 rounded-lg border border-amber-900/40 text-xs text-amber-300 flex items-center gap-2">
              <Skull className="w-4 h-4" /> STUNNED: Lose 1 action or turn.
            </div>
          )}
          {resolved.restrictions.map((r, i) => (
            <div key={i} className="bg-red-950/20 p-3 rounded-lg border border-red-900/40 text-xs text-red-300">
              {r}
            </div>
          ))}
          {!character.statusTokens.curse && !character.statusTokens.stun && resolved.restrictions.length === 0 && (
            <span className="text-xs text-neutral-600 italic px-1">No active restrictions.</span>
          )}
        </div>
      </div>
    </div>
  );
}
