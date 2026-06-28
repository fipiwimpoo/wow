import React from "react";
import { BlobImage } from "../tools/BlobImage";

interface CreatureVariant {
  colorKey: string;
  count: number;
  creatureType: string;
  threat?: number;
  attack?: number;
  health?: number;
  questOwnership?: "alliance" | "horde" | "neutral" | "hostile" | string;
  spawnSource?: string;
  spawnPlayableZoneName?: string;
}

interface CreatureMapTooltipProps {
  monsterName: string;
  expansion?: string;
  imageAssetId?: string;
  rulesText?: string;
  variants: CreatureVariant[];
  zoneName: string;
}

export function CreatureMapTooltip({
  monsterName,
  expansion,
  imageAssetId,
  rulesText,
  variants,
  zoneName,
}: CreatureMapTooltipProps) {
  const expText = expansion === "BASE_GAME" || !expansion ? "Criatura" : expansion.replace(/_/g, " ");

  return (
    <div className="absolute left-1/2 bottom-full mb-1.5 -translate-x-1/2 hidden group-hover:flex flex-col w-[160px] bg-black/85 border border-yellow-700/40 rounded-lg p-1.5 shadow-lg z-[200] pointer-events-none transition-all animate-in fade-in zoom-in-95 duration-200 backdrop-blur-sm">
      
      {/* Header */}
      <div className="flex items-center gap-1.5 border-b border-white/10 pb-1 mb-1">
        <div className="w-6 h-6 rounded-full border border-yellow-700/50 shadow-inner overflow-hidden shrink-0 bg-neutral-900">
          {imageAssetId ? (
            <BlobImage cardId={imageAssetId} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-[10px]">👾</div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-bold text-yellow-500 leading-tight truncate">
            {monsterName}
          </div>
          <div className="text-[9px] text-neutral-400 capitalize truncate">
            {expText} · {variants[0]?.creatureType ? (
              variants[0].creatureType.toLowerCase() === "elite" ? "Élite" :
              variants[0].creatureType.toLowerCase() === "boss" ? "Jefe" : "Grupo"
            ) : "Grupo"}
          </div>
        </div>
      </div>

      {/* Variants (Stats & Badges) */}
      <div className="flex flex-col gap-1 max-h-[140px] overflow-y-auto pr-0.5">
        {variants.map((v, idx) => {
          const faction = v.questOwnership?.toLowerCase() || "neutral";
          let factionColor = "bg-neutral-600/40 text-neutral-300 border-neutral-500";
          let factionName = "Neu";
          
          if (faction === "alliance") {
            factionColor = "bg-blue-900/40 text-blue-300 border-blue-700/50";
            factionName = "Ali";
          } else if (faction === "horde") {
            factionColor = "bg-red-900/40 text-red-300 border-red-700/50";
            factionName = "Hor";
          } else if (faction === "hostile") {
            factionColor = "bg-red-950/60 text-red-500 border-red-900";
            factionName = "Hos";
          }

          return (
            <div key={idx} className="flex flex-col gap-0.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <span className={`text-[8px] font-bold px-1 py-0 rounded border ${factionColor}`}>
                    {factionName}
                  </span>
                  <span className="text-[8px] font-black text-white bg-white/10 px-1 py-0 rounded border border-white/20">
                    x{v.count}
                  </span>
                </div>
              </div>
              
              {/* Stats in a single row */}
              <div className="flex justify-center items-center gap-2 text-[9px] font-bold bg-black/40 px-1 py-0.5 rounded border border-white/5 mt-0.5">
                <span className="text-red-400">❤️{v.health ?? "-"}</span>
                <span className="text-yellow-500">⚔{v.attack ?? "-"}</span>
                <span className="text-neutral-400">🛡{v.threat ?? "-"}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Rules */}
      {rulesText && (
        <div className="text-[8px] text-neutral-300 border-t border-white/10 pt-1 mt-1 leading-snug text-left line-clamp-2">
          {rulesText}
        </div>
      )}
      
      {/* Zone Name - Subtle */}
      <div className="text-center mt-1">
        <span className="text-[8px] text-neutral-500 font-medium tracking-tight">
          {zoneName}
        </span>
      </div>
      
      {/* Arrow */}
      <div className="absolute top-full left-1/2 -translate-x-1/2 border-[3px] border-transparent border-t-yellow-700/40" />
    </div>
  );
}
