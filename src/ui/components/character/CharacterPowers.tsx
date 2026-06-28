import React from 'react';
import { BoardGameCharacter, OFFICIAL_CHARACTER_DEFINITIONS } from '../../../core/models/character';
import { CardVisual } from './CardVisual';
import { BookOpen, Sparkles } from 'lucide-react';

interface CharacterPowersProps {
  character: BoardGameCharacter;
}

export function CharacterPowers({ character }: CharacterPowersProps) {
  const definition = OFFICIAL_CHARACTER_DEFINITIONS.find(d => d.id === character.characterDefinitionId);

  return (
    <div className="flex flex-col gap-8 animate-fade-in pb-10">
      <div className="border-b border-neutral-900 pb-4">
        <h3 className="text-2xl font-black text-white uppercase tracking-tight flex items-center gap-3">
          <BookOpen className="w-6 h-6 text-neutral-500" />
          Libro de Poderes
        </h3>
        <p className="text-xs text-neutral-500 mt-1">
          Habilidades raciales, de clase y talentos obtenidos durante la progresión del héroe.
        </p>
      </div>

      {/* Racial Ability */}
      <section className="flex flex-col gap-4">
        <h4 className="text-xs font-black text-yellow-500 uppercase tracking-widest flex items-center gap-2">
          <Sparkles className="w-4 h-4" /> Poder Racial Único
        </h4>
        <div className="bg-neutral-900/40 p-6 rounded-2xl border border-neutral-800 flex flex-col md:flex-row gap-6 items-center">
          <div className="w-40 shrink-0">
             {/* Mocking the racial power card visual */}
             <div className="aspect-[2/3] bg-neutral-950 border-2 border-yellow-600 rounded-md p-3 flex flex-col justify-between shadow-xl">
               <div className="text-[10px] font-black text-yellow-500 uppercase">Racial Power</div>
               <div className="text-xs font-bold text-white text-center py-4">{definition?.racialPowerName}</div>
               <div className="text-[8px] text-neutral-400 italic text-center leading-tight">"{definition?.racialPowerDesc}"</div>
             </div>
          </div>
          <div className="flex-1">
            <h5 className="text-xl font-black text-white uppercase">{definition?.racialPowerName}</h5>
            <p className="text-sm text-neutral-400 mt-2 leading-relaxed italic">
              {definition?.racialPowerDesc}
            </p>
            <div className="mt-4 flex gap-2">
              <span className="text-[10px] font-black bg-neutral-800 text-neutral-300 px-2 py-1 rounded border border-neutral-700 uppercase">Pasiva</span>
              <span className="text-[10px] font-black bg-neutral-800 text-neutral-300 px-2 py-1 rounded border border-neutral-700 uppercase">Ficha Oficial</span>
            </div>
          </div>
        </div>
      </section>

      {/* Class Powers Placeholder */}
      <section className="flex flex-col gap-4">
        <h4 className="text-xs font-black text-neutral-500 uppercase tracking-widest flex items-center gap-2">
          Poderes de Clase & Talentos
        </h4>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
          {/* Add class powers as cards here in the future */}
          {[1,2,3].map(i => (
            <div key={i} className="aspect-[2/3] bg-neutral-900/20 border-2 border-dashed border-neutral-800 rounded-md flex flex-col items-center justify-center p-4 text-center">
              <BookOpen className="w-6 h-6 text-neutral-800 mb-2" />
              <span className="text-[9px] font-bold text-neutral-700 uppercase tracking-widest">Espacio para Poder</span>
              <span className="text-[8px] text-neutral-800 mt-1 italic">Nivel {i*2}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
