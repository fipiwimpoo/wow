import React, { useState, useEffect } from 'react';
import { CardReferenceIndex } from '../../../core/utils/cardReferenceIndex';
import { motion } from 'motion/react';
import { getAllCardData } from '../../../core/utils/db';
import { BlobImage } from '../tools/BlobImage';

type CardVariant = 'sheet' | 'inventory' | 'detail';

interface CardVisualProps {
  cardId: string;
  className?: string;
  onClick?: () => void;
  showActions?: boolean;
  onAction?: (action: 'equip' | 'discard' | 'view') => void;
  variant?: CardVariant;
}

export function CardVisual({ 
  cardId, 
  className = "", 
  onClick, 
  showActions, 
  onAction,
  variant = 'detail'
}: CardVisualProps) {
  const card = CardReferenceIndex.getCard(cardId);
  const [assetId, setAssetId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    getAllCardData().then(allBinds => {
      if (!active) return;
      const bind = allBinds.find(b => b.linkedCardReferenceId === cardId);
      if (bind) {
        setAssetId(bind.assetId);
      }
    });
    return () => { active = false; };
  }, [cardId]);

  if (!card) {
    return (
      <div className={`aspect-[2/3] bg-neutral-800 border border-neutral-700 rounded-sm flex items-center justify-center p-2 text-center text-[10px] text-neutral-500 ${className}`}>
        Missing Card: {cardId}
      </div>
    );
  }

  const cardColor = card.tags?.includes('weapon') ? 'border-red-900/50' : 
                    card.tags?.includes('armor') ? 'border-blue-900/50' : 
                    card.tags?.includes('ability') ? 'border-yellow-900/50' : 'border-neutral-700';

  // Variant: "sheet" - Used for rendering ON the character sheet slots
  if (variant === 'sheet') {
    return (
      <div 
        onClick={onClick}
        className={`w-full h-full relative group cursor-pointer ${className}`}
      >
        {assetId ? (
          <BlobImage cardId={assetId} className="w-full h-full object-contain" />
        ) : (
          <div className="w-full h-full bg-neutral-900/40 border border-white/5 rounded flex flex-col items-center justify-center">
            <div className="text-[10px] font-black text-white/20 uppercase rotate-12">{card.name}</div>
          </div>
        )}
      </div>
    );
  }

  return (
    <motion.div 
      whileHover={{ scale: 1.02 }}
      className={`relative aspect-[2/3] group cursor-pointer ${className}`}
      onClick={onClick}
    >
      {/* Card Body */}
      <div className={`w-full h-full bg-neutral-900 border-2 rounded-md shadow-lg overflow-hidden flex flex-col ${cardColor}`}>
        {/* Asset Image */}
        <div className="flex-1 bg-neutral-800 relative overflow-hidden">
          {assetId ? (
            <BlobImage cardId={assetId} className="w-full h-full object-contain" />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center opacity-20">
              <span className="text-[40px] font-black uppercase rotate-45 select-none">{card.id.split('_')[0]}</span>
            </div>
          )}
          
          {/* Card Label - Hidden in "sheet" mode, minimal in "inventory" */}
          {(variant === 'inventory' || variant === 'detail') && (
            <div className="absolute bottom-0 left-0 right-0 p-1.5 bg-black/70 backdrop-blur-sm border-t border-white/10">
              <div className="text-[8px] font-black uppercase text-yellow-500 tracking-tighter">
                {card.tags?.join(' · ')}
              </div>
              <div className="text-[10px] font-bold text-white truncate">
                {card.name}
              </div>
            </div>
          )}
        </div>

        {/* Card Text Area - Only in "detail" mode */}
        {variant === 'detail' && (
          <div className="h-1/3 p-1.5 bg-neutral-900 text-[8px] leading-tight text-neutral-400">
            {card.text}
          </div>
        )}
      </div>

      {/* Hover Actions */}
      {showActions && onAction && (
        <div className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-2 rounded-md z-10">
          <button 
            onClick={(e) => { e.stopPropagation(); onAction('equip'); }}
            className="w-full py-1 bg-yellow-500 text-neutral-950 text-[10px] font-black uppercase rounded hover:bg-yellow-400"
          >
            Equipar
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); onAction('view'); }}
            className="w-full py-1 bg-neutral-700 text-white text-[10px] font-bold uppercase rounded hover:bg-neutral-600"
          >
            Ver
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); onAction('discard'); }}
            className="w-full py-1 bg-red-900/50 text-red-200 text-[10px] font-bold uppercase rounded hover:bg-red-800"
          >
            Descartar
          </button>
        </div>
      )}
    </motion.div>
  );
}
