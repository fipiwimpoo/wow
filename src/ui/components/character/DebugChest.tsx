import React from 'react';
import { CardVisual } from './CardVisual';
import { Sparkles, FlaskConical, X } from 'lucide-react';

interface DebugChestProps {
  onClose: () => void;
  onGainItem: (cardId: string) => void;
}

const TEST_CARDS = [
  'scimitar_i',
  'trogg_club',
  'cured_leather_armor',
  'ring_of_defense',
  'minor_healing_potion'
];

export function DebugChest({ onClose, onGainItem }: DebugChestProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm">
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-4xl max-h-[80vh] flex flex-col shadow-2xl">
        <div className="p-4 border-b border-neutral-800 flex justify-between items-center bg-neutral-950/50">
          <div className="flex items-center gap-3">
            <FlaskConical className="w-5 h-5 text-yellow-500" />
            <h3 className="text-sm font-black text-white uppercase tracking-widest">Cofre de Pruebas (Debug)</h3>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-neutral-800 rounded-full transition-colors">
            <X className="w-5 h-5 text-neutral-500" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto">
          <p className="text-xs text-neutral-500 mb-6 bg-neutral-950 p-3 rounded-lg border border-neutral-800 italic">
            Este panel es solo para desarrollo. Permite añadir cartas oficiales directamente al inventario para probar las mecánicas de la ficha resuelta.
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
            {TEST_CARDS.map(cardId => (
              <div key={cardId} className="flex flex-col gap-3">
                <CardVisual cardId={cardId} className="w-full" />
                <button 
                  onClick={() => onGainItem(cardId)}
                  className="w-full py-2 bg-yellow-600 text-neutral-950 text-[10px] font-black uppercase rounded hover:bg-yellow-500 shadow-lg"
                >
                  Obtener
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="p-4 border-t border-neutral-800 bg-neutral-950/50 flex justify-end">
          <button onClick={onClose} className="px-6 py-2 bg-neutral-800 text-white text-xs font-bold uppercase rounded-lg hover:bg-neutral-700">
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
