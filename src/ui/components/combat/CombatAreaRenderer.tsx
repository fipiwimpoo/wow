import React, { useMemo } from 'react';
import { CombatAreaLayout, CombatAreaZone } from '../../../core/models/combatArea';
import { CombatStateTokens, TokenInstance, normalizeCombatTokens } from '../../../core/models/combat';
import { BlobImage } from '../tools/BlobImage';
import { getPseudoRandomPosition } from '../../../core/utils/geometry';
import { motion, AnimatePresence } from 'motion/react';

interface CombatAreaRendererProps {
  layout: CombatAreaLayout;
  tokens: CombatStateTokens;
  debug?: boolean;
}

export function CombatAreaRenderer({ layout, tokens, debug = false }: CombatAreaRendererProps) {
  
  const allTokens = useMemo(() => {
    const safeTokens = normalizeCombatTokens(tokens);
    console.log("[CombatTokens] normalized", safeTokens);
    return [
      ...safeTokens.damageBox.hits,
      ...safeTokens.defenseBox.hits,
      ...safeTokens.defenseBox.armor,
      ...safeTokens.attritionBox.hits
    ];
  }, [tokens]);

  const renderPolygon = (zone: CombatAreaZone) => {
    if (!debug || zone.polygon.length === 0) return null;
    const pointsStr = zone.polygon.map(p => `${p.x},${p.y}`).join(' ');
    let color = '255, 255, 255';
    if (zone.id === 'damage') color = '220, 38, 38';
    if (zone.id === 'defense') color = '59, 130, 246';
    if (zone.id === 'attrition') color = '168, 85, 247';
    
    return (
      <svg key={`poly-${zone.id}`} className="absolute inset-0 w-full h-full pointer-events-none overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none">
        <polygon 
          points={pointsStr} 
          fill={`rgba(${color}, 0.2)`}
          stroke={`rgba(${color}, 0.8)`}
          strokeWidth="0.5"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    );
  };

  const renderToken = (token: TokenInstance, zone: CombatAreaZone, index: number) => {
    const pos = getPseudoRandomPosition(token.id, zone.polygon, zone.tokenSize);
    
    let tokenAssetId = '';
    let fallbackColor = '';
    if (token.type === 'hit') {
      tokenAssetId = layout.hitTokenAssetId || '';
      fallbackColor = 'bg-red-600 border-red-400';
    } else if (token.type === 'armor') {
      tokenAssetId = layout.armorTokenAssetId || '';
      fallbackColor = 'bg-emerald-500 border-emerald-300';
    } else {
      tokenAssetId = layout.attritionTokenAssetId || '';
      fallbackColor = 'bg-purple-600 border-purple-400';
    }

    return (
      <motion.div
        key={token.id}
        initial={token.isNew ? { scale: 0, opacity: 0, y: -20 } : { scale: 1, opacity: 1, y: 0 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        className="absolute z-10 transform -translate-x-1/2 -translate-y-1/2"
        style={{ 
          left: `${pos.x}%`, 
          top: `${pos.y}%`, 
          width: `${zone.tokenSize}%`,
          aspectRatio: '1/1'
        }}
      >
        <div className="w-full h-full relative group shadow-[0_4px_10px_rgba(0,0,0,0.5)] rounded-full">
          {tokenAssetId ? (
            <BlobImage cardId={tokenAssetId} className="w-full h-full object-contain drop-shadow-xl" />
          ) : (
            <div className={`w-full h-full rounded-full border-2 ${fallbackColor} shadow-inner flex items-center justify-center`}>
              <span className="text-[8px] font-black uppercase text-white/50">{token.type[0]}</span>
            </div>
          )}
          
          {token.isNew && (
            <div className="absolute inset-0 rounded-full border-2 border-white animate-ping opacity-75" />
          )}

          {token.sourceCardId && (
            <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-black text-[8px] text-white font-mono px-2 py-0.5 rounded border border-neutral-700 whitespace-nowrap z-20 pointer-events-none">
              {token.sourceCardId}
            </div>
          )}
        </div>
      </motion.div>
    );
  };

  return (
    <div className="relative w-full h-full bg-black flex items-center justify-center overflow-hidden">
      <div 
        className="relative w-full max-w-4xl" 
        style={{ aspectRatio: '16/9' }} // Will be overridden if image loaded
      >
        {layout.backgroundAssetId ? (
          <BlobImage 
            cardId={layout.backgroundAssetId} 
            className="absolute inset-0 w-full h-full object-contain"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center border-2 border-dashed border-neutral-800 text-neutral-600 font-bold uppercase tracking-widest text-sm">
            Background Missing
          </div>
        )}

        {layout.zones.map(renderPolygon)}

        {allTokens.map((token, i) => {
          const zone = layout.zones.find(z => z.id === token.box);
          if (!zone) return null;
          return renderToken(token, zone, i);
        })}
      </div>
    </div>
  );
}
