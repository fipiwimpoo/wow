import React, { useState, useMemo, useRef, useEffect } from "react";
import { loadWorldDb } from "../../../core/utils/worldDb";
import { PlayableZone } from "../../../core/types/world";
import { Search, X, MapPin } from "lucide-react";

interface PlayableZonePickerProps {
  valuePlayableZoneId?: string;
  onChange: (updates: {
    spawnPlayableZoneId: string;
    spawnPlayableZoneName: string;
    spawnWorldRegionId: string;
    spawnWorldRegionName: string;
  } | null) => void;
}

export function PlayableZonePicker({ valuePlayableZoneId, onChange }: PlayableZonePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const db = useMemo(() => loadWorldDb(), []);

  // Prepare options
  const options = useMemo(() => {
    const zones = Object.values(db.playableZones) as PlayableZone[];
    return zones.map((pz) => {
      const region = db.regions[pz.worldRegionId];
      return {
        playableZoneId: pz.id,
        playableZoneName: pz.name,
        worldRegionId: pz.worldRegionId,
        worldRegionName: region ? region.name : "Unknown Region",
        boardId: pz.boardId,
      };
    }).sort((a, b) => {
      const nameA = `${a.worldRegionName} > ${a.playableZoneName}`;
      const nameB = `${b.worldRegionName} > ${b.playableZoneName}`;
      return nameA.localeCompare(nameB);
    });
  }, [db]);

  // Find currently selected option
  const selectedOption = useMemo(() => {
    if (!valuePlayableZoneId) return null;
    return options.find(o => o.playableZoneId === valuePlayableZoneId) || null;
  }, [options, valuePlayableZoneId]);

  // Filter options based on search
  const filteredOptions = useMemo(() => {
    if (!searchTerm.trim()) return options;
    const term = searchTerm.toLowerCase();
    return options.filter(
      (o) =>
        o.playableZoneName.toLowerCase().includes(term) ||
        o.worldRegionName.toLowerCase().includes(term) ||
        o.playableZoneId.toLowerCase().includes(term)
    );
  }, [options, searchTerm]);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (opt: typeof options[0]) => {
    onChange({
      spawnPlayableZoneId: opt.playableZoneId,
      spawnPlayableZoneName: opt.playableZoneName,
      spawnWorldRegionId: opt.worldRegionId,
      spawnWorldRegionName: opt.worldRegionName,
    });
    setIsOpen(false);
    setSearchTerm("");
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null);
    setSearchTerm("");
  };

  return (
    <div ref={containerRef} className="relative w-full">
      {selectedOption ? (
        <div className="flex items-center justify-between bg-blue-950/40 border border-blue-900/60 hover:border-blue-800/80 rounded px-3 py-1.5 text-sm text-blue-300">
          <div className="flex items-center gap-2 truncate">
            <MapPin className="w-3.5 h-3.5 text-blue-400 shrink-0" />
            <span className="font-semibold text-xs text-neutral-400 uppercase tracking-wider shrink-0">
              {selectedOption.worldRegionName}
            </span>
            <span className="text-neutral-500 text-xs shrink-0">&gt;</span>
            <span className="truncate text-white font-medium">
              {selectedOption.playableZoneName}
            </span>
            <span className="text-[10px] text-neutral-500 bg-neutral-900/60 px-1.5 py-0.2 rounded border border-neutral-800 shrink-0">
              {selectedOption.boardId}
            </span>
          </div>
          <button
            type="button"
            onClick={handleClear}
            className="text-neutral-400 hover:text-red-400 p-0.5 rounded transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="w-full text-left bg-neutral-900 border border-neutral-800 hover:border-neutral-700 rounded px-3 py-2 text-sm text-neutral-400 flex items-center justify-between"
        >
          <span>Seleccionar PlayableZone...</span>
          <Search className="w-4 h-4 text-neutral-500" />
        </button>
      )}

      {isOpen && (
        <div className="absolute z-50 left-0 right-0 mt-1 bg-neutral-950 border border-neutral-800 rounded-lg shadow-xl max-h-60 overflow-hidden flex flex-col">
          <div className="p-2 border-b border-neutral-800 flex items-center gap-2 bg-neutral-900/40">
            <Search className="w-4 h-4 text-neutral-500 shrink-0" />
            <input
              type="text"
              placeholder="Buscar zona o región..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-transparent focus:outline-none text-sm text-white"
              autoFocus
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                className="text-neutral-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <div className="overflow-y-auto flex-1 py-1">
            {filteredOptions.length === 0 ? (
              <div className="p-3 text-xs text-neutral-500 text-center">
                No hay zonas que coincidan
              </div>
            ) : (
              filteredOptions.map((opt) => (
                <button
                  key={opt.playableZoneId}
                  type="button"
                  onClick={() => handleSelect(opt)}
                  className="w-full text-left px-3 py-2 hover:bg-neutral-800/60 flex flex-col gap-0.5 border-b border-neutral-900/40 last:border-0"
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="text-white text-sm font-medium">
                      {opt.playableZoneName}
                    </span>
                    <span className="text-[10px] uppercase text-neutral-500 font-mono">
                      {opt.boardId}
                    </span>
                  </div>
                  <span className="text-xs text-neutral-400">
                    {opt.worldRegionName}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
