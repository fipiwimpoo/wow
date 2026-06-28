import React, { useState, useRef, MouseEvent, useEffect, useMemo } from "react";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import { useAppStore, SpawnedCreaturePreview } from "../../../core/state/store";
import { saveBoardImage, getBoardImage, getAllMonsters } from "../../../core/utils/db";
import { loadWorldDb } from "../../../core/utils/worldDb";
import { MonsterData } from "../../../core/models/monsterData";
import { BlobImage } from "../tools/BlobImage";
import { CreatureMapTooltip } from "./CreatureMapTooltip";

// We define the native resolutions of the boards to maintain exact proportions.
// These are typical aspect ratios for the WoW Board Game maps.
const BOARD_DIMENSIONS = {
  lordaeron: { width: 4000, height: 2667 }, // Roughly 1.5 aspect ratio
  outland: { width: 4000, height: 4000 }, // Roughly square
};

const BOARD_IMAGES = {
  lordaeron: "/assets/boards/lordaeron_board.jpg",
  outland: "/assets/boards/outland_board.jpg",
};

interface BoardViewerProps {
  boardType: "lordaeron" | "outland";
  isBoardFlipped: boolean;
}

function getTailwindColorForCreatureColor(color: string): string {
  const c = color.toLowerCase();
  if (c.includes("green") || c.includes("verde")) return "#4ade80";
  if (c.includes("red") || c.includes("rojo")) return "#f87171";
  if (c.includes("blue") || c.includes("azul")) return "#60a5fa";
  if (c.includes("yellow") || c.includes("amarillo")) return "#facc15";
  if (c.includes("purple") || c.includes("morado")) return "#c084fc";
  if (c.includes("orange") || c.includes("naranja")) return "#fb923c";
  return "#ffffff";
}

export function BoardViewer({ boardType, isBoardFlipped }: BoardViewerProps) {
  const [isDebugMode, setIsDebugMode] = useState(false);
  const DEV_MODE = false;

  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 });
  const [boardPos, setBoardPos] = useState({ x: 0, y: 0 });
  const [imageState, setImageState] = useState<"loading" | "loaded" | "error">(
    "loading",
  );
  const [imgInfo, setImgInfo] = useState({ naturalWidth: 0, naturalHeight: 0 });
  const boardRef = useRef<HTMLDivElement>(null);
  const transformRef = useRef<any>(null);

  const customUrl = useAppStore((state) => state.boardUrls[boardType]);
  const setBoardUrl = useAppStore((state) => state.setBoardUrl);
  const questSpawnPreview = useAppStore((state) => state.questSpawnPreview);
  const boardStackingMode = useAppStore((state) => state.boardStackingMode);
  const setBoardStackingMode = useAppStore((state) => state.setBoardStackingMode);
  const accessibilityIndicators = useAppStore((state) => state.accessibilityIndicators);
  const setAccessibilityIndicators = useAppStore((state) => state.setAccessibilityIndicators);

  const [localImageUrl, setLocalImageUrl] = useState<string | null>(null);
  const [worldDb, setWorldDb] = useState(() => loadWorldDb());
  const [monsters, setMonsters] = useState<MonsterData[]>([]);

  // Load monsters when preview changes
  useEffect(() => {
    getAllMonsters().then((data) => {
      setMonsters(data);
    });
  }, [questSpawnPreview]);

  const dimensions = BOARD_DIMENSIONS[boardType];
  const imageUrl = localImageUrl || customUrl || BOARD_IMAGES[boardType];

  // Keep worldDb in sync with preview changes
  useEffect(() => {
    setWorldDb(loadWorldDb());
  }, [questSpawnPreview]);

  // Centering camera effect on spawn zones
  useEffect(() => {
    if (!questSpawnPreview || !transformRef.current || !boardRef.current) return;
    
    const spawnedCreatures = questSpawnPreview.spawnedCreatures || [];
    const relevantSpawns = spawnedCreatures.filter(c => {
      const pz = worldDb.playableZones[c.playableZoneId];
      return pz && pz.boardId === boardType;
    });

    if (relevantSpawns.length === 0) return;

    // Calculate average coordinates
    let totalX = 0;
    let totalY = 0;
    let validCount = 0;

    relevantSpawns.forEach(c => {
      const pz = worldDb.playableZones[c.playableZoneId];
      if (pz) {
        totalX += pz.coordinatesPercent.x;
        totalY += pz.coordinatesPercent.y;
        validCount++;
      }
    });

    if (validCount > 0) {
      const avgXPercent = totalX / validCount;
      const avgYPercent = totalY / validCount;

      setTimeout(() => {
        const wrapper = boardRef.current;
        if (!wrapper) return;
        
        const wrapperRect = wrapper.getBoundingClientRect();
        const wrapperWidth = wrapperRect.width;
        const wrapperHeight = wrapperRect.height;

        const img = wrapper.querySelector('img');
        if (!img) return;

        const imgWidth = img.clientWidth || wrapperWidth;
        const imgHeight = img.clientHeight || wrapperHeight;

        const targetXPixels = (avgXPercent / 100) * imgWidth;
        const targetYPixels = (avgYPercent / 100) * imgHeight;

        const scale = 1.6;
        const posX = - (targetXPixels * scale) + wrapperWidth / 2;
        const posY = - (targetYPixels * scale) + wrapperHeight / 2;

        transformRef.current.setTransform(posX, posY, scale, 600, "easeOut");
      }, 150);
    }
  }, [questSpawnPreview, boardType, worldDb]);

  // Group spawns by playable zone
  const spawnsByZone = useMemo(() => {
    const spawnedCreatures = questSpawnPreview?.spawnedCreatures || [];
    const map: Record<string, SpawnedCreaturePreview[]> = {};
    spawnedCreatures.forEach((c) => {
      const pz = worldDb.playableZones[c.playableZoneId];
      if (pz && pz.boardId === boardType) {
        if (!map[c.playableZoneId]) {
          map[c.playableZoneId] = [];
        }
        map[c.playableZoneId].push(c);
      }
    });
    return map;
  }, [questSpawnPreview, worldDb, boardType]);

  // Pre-grouped spawns per zone by monsterId for Compact View
  const groupedSpawnsByZone = useMemo(() => {
    const result: Record<string, {
      monsterId: string;
      monsterName: string;
      imageAssetId?: string;
      rulesText?: string;
      expansion?: string;
      variants: {
        colorKey: "green" | "red" | "purple" | "blue";
        count: number;
        creatureType: string;
        creatureAssetId?: string;
        threat?: number;
        attack?: number;
        health?: number;
        questOwnership?: "alliance" | "horde" | "neutral";
        spawnSource?: "quest_target" | "quest_elite" | "quest_boss" | "world_spawn";
        spawnPlayableZoneName?: string;
      }[];
    }[]> = {};

    (Object.entries(spawnsByZone) as [string, SpawnedCreaturePreview[]][]).forEach(([zoneId, creatures]) => {
      const groups: Record<string, typeof result[string][number]> = {};

      creatures.forEach(c => {
        const monster = monsters.find((m) => m.id === c.monsterId);
        const mId = c.monsterId || c.creatureType || "unknown";
        const colorKey = (c.variantColor || c.creatureColor || "green").toLowerCase() as "green" | "red" | "purple" | "blue";
        const variantStats = monster?.variants?.[colorKey];

        if (!groups[mId]) {
          groups[mId] = {
            monsterId: mId,
            monsterName: monster?.name || c.creatureType,
            imageAssetId: c.creatureAssetId || monster?.imageAssetId,
            rulesText: monster?.rulesText,
            expansion: monster?.expansion,
            variants: []
          };
        }

        const existingVariant = groups[mId].variants.find(v => v.colorKey === colorKey);
        if (existingVariant) {
          existingVariant.count += c.count;
        } else {
          groups[mId].variants.push({
            colorKey,
            count: c.count,
            creatureType: c.creatureType,
            creatureAssetId: c.creatureAssetId,
            threat: variantStats?.threat,
            attack: variantStats?.attack,
            health: variantStats?.health,
            questOwnership: c.questOwnership,
            spawnSource: c.spawnSource,
            spawnPlayableZoneName: c.spawnPlayableZoneName,
          });
        }
      });

      result[zoneId] = Object.values(groups);
    });

    return result;
  }, [spawnsByZone, monsters]);

  useEffect(() => {
    let active = true;

    const loadFromDB = async () => {
      try {
        setImageState("loading");
        const blob = await getBoardImage(boardType);
        if (blob && active) {
          const url = URL.createObjectURL(blob);
          setLocalImageUrl(url);
          return;
        }
      } catch (err) {
        console.error("Error loading from indexedDB", err);
      }
      if (active) {
        setLocalImageUrl(null); // Fallback to default/custom
      }
    };

    loadFromDB();

    return () => {
      active = false;
    };
  }, [boardType]);

  // Reset image state when url changes
  useEffect(() => {
    setImageState("loading");

    // Fallback: if the image doesn't fire onLoad or onError within 2 seconds, assume it failed.
    // This is useful in dev servers where missing images might return a 200 OK with HTML content that never fires onError.
    const timer = setTimeout(() => {
      setImageState((current) => (current === "loading" ? "error" : current));
    }, 2000);

    return () => clearTimeout(timer);
  }, [imageUrl]);

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDebugMode || !boardRef.current) return;

    const rect = boardRef.current.getBoundingClientRect();
    const relativeX = ((e.clientX - rect.left) / rect.width) * dimensions.width;
    const relativeY =
      ((e.clientY - rect.top) / rect.height) * dimensions.height;

    setCursorPos({ x: e.clientX, y: e.clientY });
    setBoardPos({ x: Math.round(relativeX), y: Math.round(relativeY) });
  };

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    console.log(
      `[BoardViewer] Image loaded successfully for: ${boardType} from ${imageUrl}`,
    );
    setImageState("loaded");
    if (e.currentTarget) {
      setImgInfo({
        naturalWidth: e.currentTarget.naturalWidth,
        naturalHeight: e.currentTarget.naturalHeight,
      });
    }
  };

  const handleImageError = () => {
    console.error(
      `[BoardViewer] Error loading image for: ${boardType} from ${imageUrl}`,
    );
    setImageState("error");
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        await saveBoardImage(boardType, file);
        const url = URL.createObjectURL(file);
        setLocalImageUrl(url);
        setBoardUrl(boardType, url);
      } catch (err) {
        console.error("Error saving file to IndexedDB", err);
      }
    }
  };

  const handleUrlSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const input = form.elements.namedItem("url") as HTMLInputElement;
    if (input.value) {
      setBoardUrl(boardType, input.value);
      setLocalImageUrl(null);
    }
  };

  const handleChangeImage = () => {
    setImageState("error"); // Trigger fallback panel to show uploader again
  };

  return (
    <div className="relative w-full flex-1 bg-neutral-950 flex flex-col overflow-hidden">
      {isDebugMode && (
        <div className="absolute top-4 left-4 z-[100] bg-black/80 border border-yellow-500/50 p-4 rounded text-sm text-yellow-400 font-mono pointer-events-auto backdrop-blur-sm">
          <h3 className="font-bold mb-2 text-white border-b border-yellow-500/50 pb-1">
            Board Diagnostic Panel
          </h3>
          <div>BoardViewer Mounted: TRUE</div>
          <div>Current Board: {boardType}</div>
          <div>
            Image URL:{" "}
            {imageUrl
              ? imageUrl.startsWith("blob:")
                ? "blob:..."
                : imageUrl
              : "NULL"}
          </div>
          <div>Image State: {imageState}</div>
          <div>Image Loaded: {imageState === "loaded" ? "TRUE" : "FALSE"}</div>
          <div>Image Error: {imageState === "error" ? "TRUE" : "FALSE"}</div>
          <div>Show Fallback: {imageState !== "loaded" ? "TRUE" : "FALSE"}</div>
          <div className="mt-2 pt-2 border-t border-yellow-500/30">
            <div>
              Img Natural: {imgInfo.naturalWidth} x {imgInfo.naturalHeight}
            </div>
            <div>
              Board Native: {dimensions.width} x {dimensions.height}
            </div>
          </div>
          <div className="mt-2 pt-2 border-t border-yellow-500/30">
            <div>Debug Mode: {isDebugMode ? "TRUE" : "FALSE"}</div>
          </div>
        </div>
      )}

      {/* Overlay explicitly outside the main image container to guarantee visibility */}
      {imageState !== "loaded" && (
        <div className="absolute inset-0 z-[80] flex flex-col items-center justify-center bg-neutral-900/95 backdrop-blur-sm text-white p-4 md:p-8 overflow-y-auto pointer-events-auto">
          <div className="max-w-2xl w-full flex flex-col items-center bg-neutral-900 p-8 rounded-xl shadow-2xl border-2 border-red-900/50">
            <span className="text-6xl text-red-600 mb-4">⚠️</span>
            <h2 className="text-2xl md:text-3xl font-bold uppercase text-red-500 mb-2">
              {imageState === "loading"
                ? "Cargando tablero..."
                : "Tablero no encontrado"}
            </h2>
            <p className="text-lg md:text-xl mb-6">
              Tablero seleccionado:{" "}
              <strong className="text-yellow-500 capitalize">
                {boardType}
              </strong>
            </p>

            <div className="w-full text-left">
              <div className="mb-6 bg-neutral-950 p-4 rounded border border-neutral-800 overflow-hidden">
                <p className="text-neutral-400 mb-2 text-sm">Ruta intentada:</p>
                <code className="block text-red-400 text-xs break-all">
                  {imageUrl}
                </code>
              </div>

              <div className="mb-6 border-t border-neutral-700 pt-6">
                <p className="text-white mb-4 font-bold text-lg">
                  Subir tablero desde mi PC
                </p>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="block w-full text-sm text-neutral-400
                    file:mr-4 file:py-3 file:px-6
                    file:rounded file:border-0
                    file:text-sm file:font-bold
                    file:bg-yellow-600 file:text-white
                    hover:file:bg-yellow-500 cursor-pointer
                    bg-neutral-950 border border-neutral-800 rounded p-2"
                />
              </div>

              <div className="mb-6 border-t border-neutral-700 pt-6">
                <p className="text-white mb-4 font-bold text-lg">
                  Pegar URL del tablero
                </p>
                <form
                  onSubmit={handleUrlSubmit}
                  className="flex flex-col sm:flex-row gap-2"
                >
                  <input
                    type="url"
                    name="url"
                    placeholder="https://..."
                    className="flex-1 bg-neutral-950 border border-neutral-600 rounded px-4 py-3 text-white placeholder-neutral-500 focus:outline-none focus:border-yellow-500"
                    required
                  />
                  <button
                    type="submit"
                    className="bg-neutral-700 hover:bg-neutral-600 text-white px-6 py-3 rounded font-bold transition-colors shadow-lg"
                  >
                    Cargar URL
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Simple Image Renderer - Now with Zoom/Pan */}
      <div
        className="flex-1 relative bg-neutral-900 overflow-hidden"
        ref={boardRef}
        onMouseMove={handleMouseMove}
      >
        {/* Floating Map Customization Options */}
        {imageState === "loaded" && (
          <div className="absolute top-4 left-4 z-50 pointer-events-auto bg-neutral-900/95 border border-neutral-800 p-3 rounded-xl shadow-2xl flex flex-col gap-2.5 max-w-[240px] backdrop-blur-sm">
            <div className="flex items-center gap-1.5 border-b border-neutral-800 pb-1.5">
              <span className="text-[10px] font-black uppercase text-yellow-500 tracking-wider">Configuración del Mapa</span>
            </div>
            
            {/* Stacking Mode Toggle */}
            <div className="flex flex-col gap-1">
              <span className="text-[9px] text-neutral-500 uppercase font-bold">Apilamiento de Criaturas</span>
              <div className="grid grid-cols-2 gap-1 bg-neutral-950 p-0.5 rounded border border-neutral-850">
                <button
                  type="button"
                  onClick={() => setBoardStackingMode("compact")}
                  className={`px-2 py-1 text-[10px] font-bold rounded transition-colors ${boardStackingMode === "compact" ? "bg-yellow-600 text-white" : "text-neutral-400 hover:text-white"}`}
                >
                  Compacto
                </button>
                <button
                  type="button"
                  onClick={() => setBoardStackingMode("expanded")}
                  className={`px-2 py-1 text-[10px] font-bold rounded transition-colors ${boardStackingMode === "expanded" ? "bg-yellow-600 text-white" : "text-neutral-400 hover:text-white"}`}
                >
                  Expandido
                </button>
              </div>
            </div>

            {/* Accessibility Toggle */}
            <div className="flex flex-col gap-1">
              <span className="text-[9px] text-neutral-500 uppercase font-bold">Modo de Accesibilidad</span>
              <button
                type="button"
                onClick={() => setAccessibilityIndicators(!accessibilityIndicators)}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded text-[10px] font-bold border transition-colors ${accessibilityIndicators ? "bg-emerald-950/40 border-emerald-500/50 text-emerald-400" : "bg-neutral-950 border-neutral-850 text-neutral-400 hover:text-white"}`}
              >
                <span>Letras G / R / B / P</span>
                <span className={`w-1.5 h-1.5 rounded-full ${accessibilityIndicators ? "bg-emerald-400 animate-ping" : "bg-neutral-600"}`} />
              </button>
            </div>
          </div>
        )}

        <TransformWrapper
          ref={transformRef}
          initialScale={1}
          minScale={1}
          maxScale={3}
          centerOnInit={true}
          wheel={{ step: 0.05 }}
          pinch={{ step: 5 }}
          doubleClick={{ disabled: true }}
          limitToBounds={true}
        >
          {({
            zoomIn,
            zoomOut,
            zoomToElement,
            resetTransform,
            setTransform,
            state,
          }) => (
            <>
              {/* Debug Tools and Controls */}
              <div className="absolute top-4 right-4 z-50 flex flex-col items-end gap-2 pointer-events-none">
                {imageState === "loaded" && (
                  <>
                    <button
                      className="pointer-events-auto px-3 py-1 bg-yellow-600 hover:bg-yellow-500 text-xs text-white rounded font-bold transition-colors shadow-lg"
                      onClick={() => resetTransform(1, 300, "easeOut")}
                    >
                      Centrar tablero
                    </button>
                    <button
                      className="pointer-events-auto px-3 py-1 bg-neutral-800 border border-neutral-600 hover:bg-neutral-700 text-xs text-white rounded transition-colors shadow-lg"
                      onClick={() => resetTransform(0.8, 300, "easeOut")}
                    >
                      Fit Board
                    </button>
                    <button
                      className="pointer-events-auto px-3 py-1 bg-neutral-800 border border-neutral-600 hover:bg-neutral-700 text-xs text-white rounded transition-colors shadow-lg"
                      onClick={handleChangeImage}
                    >
                      Cambiar imagen
                    </button>
                  </>
                )}
                {DEV_MODE && (
                  <button
                    className="pointer-events-auto px-3 py-1 bg-neutral-800 border border-neutral-600 text-xs text-white rounded opacity-80 hover:opacity-100"
                    onClick={() => setIsDebugMode(!isDebugMode)}
                  >
                    {isDebugMode ? "Disable Debug Mode" : "Enable Debug Mode"}
                  </button>
                )}
                {isDebugMode && (
                  <div className="bg-black/80 border border-yellow-500/50 p-2 rounded text-xs text-green-400 font-mono text-right backdrop-blur-sm">
                    <div>
                      Screen: {cursorPos.x}, {cursorPos.y}
                    </div>
                    <div>
                      Board: {boardPos.x}, {boardPos.y}
                    </div>
                  </div>
                )}
              </div>

              {/* Bottom right zoom controls */}
              {imageState === "loaded" && (
                <div className="absolute bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
                  <div className="flex gap-1 justify-end">
                    {[1, 1.25, 1.5, 2].map((scale) => (
                      <button
                        key={scale}
                        onClick={() =>
                          setTransform(
                            state.positionX,
                            state.positionY,
                            scale,
                            300,
                          )
                        }
                        className={`pointer-events-auto px-2 py-1 text-xs font-bold rounded shadow-lg transition-colors ${
                          Math.abs(state.scale - scale) < 0.05
                            ? "bg-yellow-600 text-white"
                            : "bg-neutral-800 border border-neutral-600 hover:bg-neutral-700 text-neutral-300"
                        }`}
                      >
                        {scale * 100}%
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-2 justify-end items-center pointer-events-auto bg-neutral-900/80 p-1 rounded-lg backdrop-blur-sm border border-neutral-700">
                    <span className="text-white text-sm font-bold w-16 text-center">
                      {Math.round(state.scale * 100)}%
                    </span>
                    <button
                      onClick={() => zoomOut(0.15)}
                      className="w-10 h-10 bg-neutral-800 border border-neutral-600 hover:bg-neutral-700 text-white rounded shadow-lg text-xl font-bold flex items-center justify-center transition-colors"
                    >
                      -
                    </button>
                    <button
                      onClick={() => zoomIn(0.15)}
                      className="w-10 h-10 bg-neutral-800 border border-neutral-600 hover:bg-neutral-700 text-white rounded shadow-lg text-xl font-bold flex items-center justify-center transition-colors"
                    >
                      +
                    </button>
                  </div>
                </div>
              )}

              <TransformComponent
                wrapperClass="!w-full !h-full"
                contentClass="!w-full !h-full flex items-center justify-center p-4"
              >
                <div 
                  className="relative inline-block max-w-full h-full"
                  style={{ 
                    transform: isBoardFlipped ? 'rotate(180deg)' : 'none',
                    transition: 'transform 0.3s ease',
                    height: '100%'
                  }}
                >
                  <img
                    src={imageUrl}
                    alt={`${boardType} board`}
                    draggable={false}
                    className={`max-w-full h-full object-contain block transition-opacity duration-300 cursor-grab active:cursor-grabbing ${imageState === "loaded" ? "opacity-100" : "opacity-0"}`}
                    onLoad={handleImageLoad}
                    onError={handleImageError}
                  />

                  {/* Spawn markers overlay */}
                  {imageState === "loaded" && (
                    boardStackingMode === "compact" ? (
                      // COMPACT VIEW RENDERER (Grouped by Monster)
                      (Object.entries(groupedSpawnsByZone) as [string, any][]).map(([zoneId, groups]) => {
                        const pz = worldDb.playableZones[zoneId];
                        if (!pz || groups.length === 0) return null;

                        return (
                          <div
                            key={zoneId}
                            className="absolute -translate-x-1/2 -translate-y-1/2 z-[100] flex flex-col items-center pointer-events-auto group"
                            style={{
                              left: `${pz.coordinatesPercent.x}%`,
                              top: `${pz.coordinatesPercent.y}%`,
                              transform: `scale(${1 / Math.max(0.4, Math.sqrt(state.scale))})`,
                              transformOrigin: "center center"
                            }}
                          >
                            <div className="relative flex flex-row flex-wrap gap-1 items-center justify-center max-w-[120px]">
                              {groups.map((g, idx) => {
                                // Find primary variant's color for styling elements
                                const primaryVariant = g.variants[0];
                                const primaryFaction = primaryVariant?.questOwnership || "neutral";
                                const isSimulated = primaryVariant?.spawnSource === "simulation";

                                const borderRingClass = {
                                  alliance: "border-blue-500 shadow-[0_0_6px_rgba(59,130,246,0.5)]",
                                  horde: "border-red-500 shadow-[0_0_6px_rgba(239,68,68,0.5)]",
                                  hostile: "border-red-900 shadow-[0_0_6px_rgba(127,29,29,0.5)]",
                                  neutral: "border-neutral-500 shadow-[0_0_6px_rgba(115,115,115,0.5)]"
                                }[primaryFaction] || "border-neutral-500 shadow-[0_0_6px_rgba(115,115,115,0.5)]";
                                
                                const animationClass = isSimulated ? "animate-pulse ring-yellow-500/40" : "ring-neutral-950/30";

                                return (
                                  <div
                                    key={g.monsterId}
                                    className="relative flex flex-col items-center justify-center transition-all duration-300 hover:scale-110"
                                    style={{ zIndex: groups.length - idx }}
                                  >
                                    {/* Group Portrait Frame */}
                                    <div className={`w-8 h-8 rounded-full border-[1.5px] bg-neutral-900 overflow-hidden flex items-center justify-center ring-2 shrink-0 cursor-pointer relative ${borderRingClass} ${animationClass}`}>
                                      {g.imageAssetId ? (
                                        <BlobImage cardId={g.imageAssetId} className="w-full h-full object-cover" />
                                      ) : (
                                        <div className="w-full h-full flex items-center justify-center bg-neutral-950 text-white text-[9px] font-black uppercase">
                                          👾
                                        </div>
                                      )}
                                    </div>

                                    {/* Mini Pills underneath indicating active variants */}
                                    <div className="flex gap-0.5 mt-0.5 justify-center max-w-[60px] flex-wrap">
                                      {g.variants.map((v, vidx) => {
                                        const pillColor = {
                                          green: "bg-green-500 border-green-600 text-green-950",
                                          red: "bg-red-500 border-red-600 text-white",
                                          purple: "bg-purple-500 border-purple-600 text-white",
                                          blue: "bg-blue-500 border-blue-600 text-white"
                                        }[v.colorKey] || "bg-neutral-600 border-neutral-700 text-white";

                                        return (
                                          <span
                                            key={vidx}
                                            className={`text-[7px] font-black px-0.5 py-0 rounded border flex items-center gap-0.5 leading-none shrink-0 ${pillColor}`}
                                          >
                                            {accessibilityIndicators && <span>{v.colorKey.charAt(0).toUpperCase()}</span>}
                                            <span>x{v.count}</span>
                                          </span>
                                        );
                                      })}
                                    </div>

                                    <CreatureMapTooltip
                                      monsterName={g.monsterName}
                                      expansion={g.expansion}
                                      imageAssetId={g.imageAssetId}
                                      rulesText={g.rulesText}
                                      variants={g.variants}
                                      zoneName={pz.name}
                                    />
                                  </div>
                                );
                              })}
                            </div>

                            {/* Zone Name Badge */}
                            <div className="mt-1 bg-neutral-950/80 border border-neutral-800 px-1 py-0.5 rounded-sm shadow-sm pointer-events-none select-none">
                              <span className="text-[7px] font-black uppercase text-yellow-500/80 tracking-wide whitespace-nowrap">
                                {pz.name}
                              </span>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      // EXPANDED VIEW RENDERER (Original Stacked Mode, Fully Hardened)
                      (Object.entries(spawnsByZone) as [string, SpawnedCreaturePreview[]][]).map(([zoneId, creatures]) => {
                        const pz = worldDb.playableZones[zoneId];
                        if (!pz) return null;

                        return (
                          <div
                            key={zoneId}
                            className="absolute -translate-x-1/2 -translate-y-1/2 z-[100] flex flex-col items-center pointer-events-auto group"
                            style={{
                              left: `${pz.coordinatesPercent.x}%`,
                              top: `${pz.coordinatesPercent.y}%`,
                              transform: `scale(${1 / Math.max(0.4, Math.sqrt(state.scale))})`,
                              transformOrigin: "center center"
                            }}
                          >
                            {/* Interactive stacked pin/fiches */}
                            <div className="relative flex flex-row flex-wrap gap-1 items-center justify-center max-w-[120px]">
                              {creatures.map((c, idx) => {
                                const monster = monsters.find((m) => m.id === c.monsterId);
                                const colorKey = (c.variantColor || c.creatureColor || "green").toLowerCase() as "green" | "red" | "purple" | "blue";
                                const variantStats = monster?.variants?.[colorKey];

                                const faction = c.questOwnership || "neutral";
                                const isSimulated = (c as any).spawnSource === "simulation";

                                const borderRingClass = {
                                  alliance: "border-blue-500 shadow-[0_0_6px_rgba(59,130,246,0.5)]",
                                  horde: "border-red-500 shadow-[0_0_6px_rgba(239,68,68,0.5)]",
                                  hostile: "border-red-900 shadow-[0_0_6px_rgba(127,29,29,0.5)]",
                                  neutral: "border-neutral-500 shadow-[0_0_6px_rgba(115,115,115,0.5)]"
                                }[faction] || "border-neutral-500 shadow-[0_0_6px_rgba(115,115,115,0.5)]";
                                
                                const animationClass = isSimulated ? "animate-pulse ring-yellow-500/40" : "ring-neutral-950/30";

                                const badgeColor = {
                                  green: "bg-green-500 text-green-950",
                                  red: "bg-red-500 text-white",
                                  purple: "bg-purple-500 text-white",
                                  blue: "bg-blue-500 text-white"
                                }[colorKey] || "bg-yellow-500 text-yellow-950";

                                const nameColorClass = {
                                  green: "text-green-400",
                                  red: "text-red-400",
                                  purple: "text-purple-400",
                                  blue: "text-blue-400"
                                }[colorKey] || "text-white";

                                const pillCol = {
                                  green: "bg-green-500/10 text-green-400 border border-green-500/20",
                                  red: "bg-red-500/10 text-red-400 border border-red-500/20",
                                  purple: "bg-purple-500/10 text-purple-400 border border-purple-500/20",
                                  blue: "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                                }[colorKey];

                                return (
                                  <div
                                    key={idx}
                                    className="relative flex items-center justify-center transition-all duration-300 hover:scale-110"
                                    style={{ zIndex: creatures.length - idx }}
                                  >
                                    {/* Circular Monster Token */}
                                    <div className={`w-8 h-8 rounded-full border-[1.5px] bg-neutral-900 overflow-hidden flex items-center justify-center ring-2 shrink-0 cursor-pointer relative ${borderRingClass} ${animationClass}`}>
                                      {c.creatureAssetId || monster?.imageAssetId ? (
                                        <BlobImage cardId={c.creatureAssetId || monster?.imageAssetId} className="w-full h-full object-cover" />
                                      ) : (
                                        <div className="w-full h-full flex items-center justify-center bg-neutral-950 text-white text-[9px] font-black uppercase">
                                          👾
                                        </div>
                                      )}

                                      {/* Accessibility Code Overlay (G / R / B / P) */}
                                      {accessibilityIndicators && (
                                        <div className={`absolute top-0 right-0 w-3 h-3 rounded-full border border-neutral-950 font-black text-[6px] flex items-center justify-center ${badgeColor}`}>
                                          {colorKey.charAt(0).toUpperCase()}
                                        </div>
                                      )}

                                      {/* Badge count overlay */}
                                      <div className={`absolute -bottom-0.5 -left-0.5 font-black text-[7.5px] w-4 h-4 rounded-full flex items-center justify-center border border-neutral-950 ${badgeColor}`}>
                                        {c.count}
                                      </div>
                                    </div>

                                    <CreatureMapTooltip
                                      monsterName={monster?.name || c.creatureType}
                                      expansion={monster?.expansion}
                                      imageAssetId={c.creatureAssetId || monster?.imageAssetId}
                                      rulesText={monster?.rulesText}
                                      variants={[
                                        {
                                          colorKey,
                                          count: c.count,
                                          creatureType: c.creatureType,
                                          threat: variantStats?.threat,
                                          attack: variantStats?.attack,
                                          health: variantStats?.health,
                                          questOwnership: c.questOwnership,
                                          spawnSource: c.spawnSource,
                                          spawnPlayableZoneName: c.spawnPlayableZoneName,
                                        }
                                      ]}
                                      zoneName={pz.name}
                                    />
                                  </div>
                                );
                              })}
                            </div>

                            {/* Zone Name Badge */}
                            <div className="mt-1 bg-neutral-950/80 border border-neutral-800 px-1 py-0.5 rounded-sm shadow-sm pointer-events-none select-none">
                              <span className="text-[7px] font-black uppercase text-yellow-500/80 tracking-wide whitespace-nowrap">
                                {pz.name}
                              </span>
                            </div>
                          </div>
                        );
                      })
                    )
                  )}
                </div>
              </TransformComponent>
            </>
          )}
        </TransformWrapper>
      </div>
    </div>
  );
}
