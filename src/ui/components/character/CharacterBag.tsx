import React from 'react';
import { BoardGameCharacter, BAG_CAPACITY, getBagUsage } from '../../../core/models/character';
import { CardVisual } from './CardVisual';
import { ShoppingBag } from 'lucide-react';

interface CharacterBagProps {
  character: BoardGameCharacter;
  onEquip: (cardId: string) => void;
  onDiscard: (cardId: string) => void;
}

export function CharacterBag({ character, onEquip, onDiscard }: CharacterBagProps) {
  const bagUsage = getBagUsage(character.inventory);

  return (
    <div className="flex flex-col gap-6 animate-fade-in pb-10">
      <div className="flex justify-between items-end border-b border-neutral-900 pb-4">
        <div>
          <h3 className="text-2xl font-black text-white uppercase tracking-tight flex items-center gap-3">
            <ShoppingBag className="w-6 h-6 text-neutral-500" />
            Mochila del Héroe
          </h3>
          <p className="text-xs text-neutral-500 mt-1">
            Los objetos guardados aquí no otorgan beneficios hasta que sean equipados en el tablero.
          </p>
        </div>
        <div className="text-right">
          <span className="text-[10px] font-black text-neutral-500 uppercase tracking-widest block">Capacidad de Carga</span>
          <span className={`text-lg font-black ${bagUsage >= BAG_CAPACITY ? 'text-red-500' : 'text-yellow-500'}`}>
            {bagUsage} / {BAG_CAPACITY}
          </span>
        </div>
      </div>

      {character.inventory.length === 0 ? (
        <div className="py-20 flex flex-col items-center justify-center text-neutral-600 bg-neutral-900/20 rounded-3xl border-2 border-dashed border-neutral-900">
          <ShoppingBag className="w-12 h-12 mb-4 opacity-20" />
          <span className="text-sm font-bold uppercase tracking-widest opacity-40">Mochila Vacía</span>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
          {character.inventory.map((cardId, idx) => (
            <div key={`${cardId}-${idx}`}>
              <CardVisual 
                cardId={cardId} 
                variant="inventory"
                showActions 
                onAction={(action) => {
                  if (action === 'equip') onEquip(cardId);
                  if (action === 'discard') onDiscard(cardId);
                }}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
