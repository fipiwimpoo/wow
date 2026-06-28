import React, { useState, useEffect, useMemo } from "react";
import { Search, ChevronDown, Check, ShieldAlert, Star } from "lucide-react";
import { MonsterData, MonsterVariant } from "../../../core/models/monsterData";
import { getAllMonsters } from "../../../core/utils/db";
import { BlobImage } from "./BlobImage";

interface MonsterPickerProps {
  selectedMonsterId?: string;
  selectedVariantColor?: string;
  onSelect: (monsterId: string, monsterName: string, variantColor: string, imageAssetId: string) => void;
}

export function MonsterPicker({
  selectedMonsterId = "",
  selectedVariantColor = "green",
  onSelect
}: MonsterPickerProps) {
  const [monsters, setMonsters] = useState<MonsterData[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    getAllMonsters().then((data) => {
      setMonsters(data);
    });
  }, [isOpen]);

  const selectedMonster = useMemo(() => {
    return monsters.find((m) => m.id === selectedMonsterId);
  }, [monsters, selectedMonsterId]);

  const filteredMonsters = useMemo(() => {
    return monsters.filter(
      (m) =>
        m.name.toLowerCase().includes(search.toLowerCase()) ||
        m.id.toLowerCase().includes(search.toLowerCase())
    );
  }, [monsters, search]);

  const selectedStats = useMemo(() => {
    if (!selectedMonster) return null;
    const variant = selectedMonster.variants[selectedVariantColor as "green" | "red" | "purple" | "blue"];
    return variant || null;
  }, [selectedMonster, selectedVariantColor]);

  const handleSelectMonster = (m: MonsterData) => {
    // Default to green or the first available variant color
    const availableColors: ("green" | "red" | "purple" | "blue")[] = ["green", "red", "purple", "blue"];
    let chosenColor = "green";
    for (const col of availableColors) {
      if (m.variants[col]) {
        chosenColor = col;
        break;
      }
    }
    onSelect(m.id, m.name, chosenColor, m.imageAssetId || "");
    setIsOpen(false);
  };

  const handleSelectColor = (color: string) => {
    if (!selectedMonster) return;
    onSelect(selectedMonster.id, selectedMonster.name, color, selectedMonster.imageAssetId || "");
  };

  const nameColorClass = {
    green: "text-green-400",
    red: "text-red-400",
    purple: "text-purple-400",
    blue: "text-blue-400"
  }[selectedVariantColor] || "text-white";

  const borderRingClass = {
    green: "border-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]",
    red: "border-red-500 shadow-[0_0_8px_rgba(239,68,68,0.4)]",
    purple: "border-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.4)]",
    blue: "border-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.4)]"
  }[selectedVariantColor] || "border-neutral-800";

  return (
    <div className="bg-neutral-900/60 p-2 border border-neutral-800 rounded flex flex-col gap-2 font-sans">
      {/* Monster Dropdown Selector */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`w-full bg-neutral-950 border border-neutral-800 text-left px-3 py-1.5 rounded text-xs flex justify-between items-center hover:border-neutral-700 transition-colors ${nameColorClass}`}
        >
          {selectedMonster ? (
            <div className="flex items-center gap-2">
              <div className={`w-6 h-6 bg-neutral-900 border-2 rounded-full overflow-hidden shrink-0 relative ${borderRingClass}`}>
                {selectedMonster.imageAssetId ? (
                  <BlobImage cardId={selectedMonster.imageAssetId} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-neutral-800 flex items-center justify-center text-[8px] font-bold text-neutral-500 uppercase">
                    ?
                  </div>
                )}
              </div>
              <span className="font-bold">{selectedMonster.name}</span>
              <span className="text-[9px] text-neutral-500 bg-neutral-900 px-1 py-0.2 rounded uppercase font-mono border border-neutral-800">
                {selectedMonster.id}
              </span>
              <span className="text-[9px] font-mono font-black uppercase tracking-wider px-1.5 py-0.2 rounded bg-neutral-900/60">
                {selectedVariantColor}
              </span>
            </div>
          ) : (
            <span className="text-neutral-500">-- Seleccionar Monstruo --</span>
          )}
          <ChevronDown className="w-3.5 h-3.5 text-neutral-500" />
        </button>

        {isOpen && (
          <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-neutral-950 border border-neutral-800 rounded shadow-xl max-h-64 overflow-hidden flex flex-col">
            <div className="p-1.5 border-b border-neutral-800 flex items-center bg-neutral-900">
              <Search className="w-3.5 h-3.5 text-neutral-500 ml-1 shrink-0" />
              <input
                type="text"
                placeholder="Buscar monstruo..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                className="w-full bg-transparent border-0 text-xs px-2 py-1 text-white focus:outline-none"
              />
            </div>
            <div className="overflow-y-auto flex-1 max-h-48 py-1">
              {filteredMonsters.length === 0 ? (
                <div className="text-center py-4 text-[11px] text-neutral-500">
                  {monsters.length === 0
                    ? "Registra monstruos en Monster Database"
                    : "No se encontraron resultados"}
                </div>
              ) : (
                filteredMonsters.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => handleSelectMonster(m)}
                    className={`w-full text-left px-3 py-1.5 text-xs flex items-center gap-2 hover:bg-neutral-900 transition-colors ${selectedMonsterId === m.id ? "bg-yellow-950/20 text-yellow-500 font-bold" : "text-neutral-300"}`}
                  >
                    <div className="w-4 h-4 bg-neutral-900 rounded-full overflow-hidden shrink-0">
                      {m.imageAssetId ? (
                        <BlobImage cardId={m.imageAssetId} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-neutral-800" />
                      )}
                    </div>
                    <span className="truncate flex-1">{m.name}</span>
                    <span className="text-[9px] text-neutral-500 shrink-0 capitalize">
                      {m.expansion?.replace(/_/g, " ")}
                    </span>
                    {selectedMonsterId === m.id && <Check className="w-3 h-3 text-yellow-500" />}
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Color Variant selector & Stats display */}
      {selectedMonster && (
        <div className="grid grid-cols-2 gap-2 mt-1">
          {/* Variants radio/select */}
          <div>
            <label className="text-[10px] text-neutral-500 block mb-0.5">Variante de Color</label>
            <div className="flex gap-1.5">
              {(["green", "red", "purple", "blue"] as const).map((col) => {
                const isAvailable = !!selectedMonster.variants[col];
                const bgStyles = {
                  green: "bg-green-500",
                  red: "bg-red-500",
                  purple: "bg-purple-500",
                  blue: "bg-blue-500"
                };

                return (
                  <button
                    key={col}
                    type="button"
                    disabled={!isAvailable}
                    onClick={() => handleSelectColor(col)}
                    className={`w-5 h-5 rounded-full flex items-center justify-center transition-all ${bgStyles[col]} ${selectedVariantColor === col ? "ring-2 ring-white scale-110 shadow" : "opacity-40 hover:opacity-100 disabled:opacity-10"}`}
                    title={`${col.toUpperCase()}${!isAvailable ? " (No definido)" : ""}`}
                  >
                    {selectedVariantColor === col && (
                      <span className="w-1.5 h-1.5 bg-black rounded-full" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Stats Preview */}
          <div className="bg-neutral-950/60 p-1.5 rounded border border-neutral-800/80 flex flex-col justify-center">
            {selectedStats ? (
              <div className="flex justify-around items-center text-center">
                <div>
                  <div className="text-[9px] text-neutral-500 uppercase leading-none">Thr</div>
                  <div className="text-xs font-bold text-yellow-500 leading-tight">{selectedStats.threat}</div>
                </div>
                <div className="border-l border-neutral-800 h-4" />
                <div>
                  <div className="text-[9px] text-neutral-500 uppercase leading-none">Atk</div>
                  <div className="text-xs font-bold text-red-500 leading-tight">{selectedStats.attack}</div>
                </div>
                <div className="border-l border-neutral-800 h-4" />
                <div>
                  <div className="text-[9px] text-neutral-500 uppercase leading-none">Hp</div>
                  <div className="text-xs font-bold text-green-500 leading-tight">{selectedStats.health}</div>
                </div>
              </div>
            ) : (
              <div className="text-[9px] text-red-400 text-center italic leading-tight">
                Stats de esta variante no definidos
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
