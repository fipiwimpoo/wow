import React, { useState, useRef, useEffect } from "react";
import { saveCardImage, saveAssetRecord } from "../../../core/utils/db";
import { X, Upload, Grid3X3, Trash2, Check, Scissors, Save } from "lucide-react";

interface CropRect {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

const DEFAULT_PRESETS: Record<string, { name: string; w: number; h: number }> = {
  custom: { name: "Custom", w: 300, h: 400 },
  quest: { name: "Quest Card", w: 375, h: 585 },
  power: { name: "Power/Talent Card", w: 375, h: 585 },
  item: { name: "Item Card", w: 375, h: 585 },
  event: { name: "Event Card", w: 375, h: 585 },
  overlord: { name: "Overlord Sheet", w: 800, h: 600 },
};

export function CardSheetImporter({ onClose }: { onClose: () => void }) {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crops, setCrops] = useState<CropRect[]>([]);
  const [imageDimensions, setImageDimensions] = useState({ w: 0, h: 0 });
  const [fileName, setFileName] = useState("");

  const [customPresets, setCustomPresets] = useState<Record<string, { name: string; w: number; h: number }>>({});

  useEffect(() => {
    const saved = localStorage.getItem("card_sheet_custom_presets");
    if (saved) {
      try {
        setCustomPresets(JSON.parse(saved));
      } catch (e) {}
    }
  }, []);

  const PRESETS = { ...DEFAULT_PRESETS, ...customPresets };

  // Presets and Grid settings
  const [preset, setPreset] = useState("quest");
  const [cardWidth, setCardWidth] = useState(PRESETS.quest.w);
  const [cardHeight, setCardHeight] = useState(PRESETS.quest.h);
  const [gapX, setGapX] = useState(0);
  const [gapY, setGapY] = useState(0);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);

  // Metadata
  const [expansion, setExpansion] = useState("base");
  const [cardType, setCardType] = useState("quest");
  const [faction, setFaction] = useState("horde");
  const [deckOrColor, setDeckOrColor] = useState("green");
  const [batchName, setBatchName] = useState("");

  // Grid config
  const [gridRows, setGridRows] = useState(3);
  const [gridCols, setGridCols] = useState(7);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const originalImageRef = useRef<HTMLImageElement | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFileName(file.name);
      setBatchName(file.name.split(".")[0]);
      const url = URL.createObjectURL(file);
      setImageSrc(url);
    }
  };

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    originalImageRef.current = img;
    setImageDimensions({ w: img.naturalWidth, h: img.naturalHeight });

    if (canvasRef.current) {
      canvasRef.current.width = img.naturalWidth;
      canvasRef.current.height = img.naturalHeight;
      const ctx = canvasRef.current.getContext("2d");
      if (ctx) {
        ctx.drawImage(img, 0, 0);
      }
    }
  };

  const handlePresetChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setPreset(val);
    if (PRESETS[val] && val !== "custom") {
      setCardWidth(PRESETS[val].w);
      setCardHeight(PRESETS[val].h);
    }
  };

  const handleSavePreset = () => {
    const name = prompt("Nombre del preset personalizado:");
    if (!name) return;
    
    const id = `custom_${Date.now()}`;
    const newPresets = {
      ...customPresets,
      [id]: { name, w: cardWidth, h: cardHeight }
    };
    
    setCustomPresets(newPresets);
    localStorage.setItem("card_sheet_custom_presets", JSON.stringify(newPresets));
    setPreset(id);
  };

  const autoDetectOffset = () => {
    if (!imageDimensions.w || !imageDimensions.h || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const imageData = ctx.getImageData(
      0,
      0,
      imageDimensions.w,
      imageDimensions.h,
    );
    const data = imageData.data;

    const isDark = (i: number) => {
      const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3;
      return brightness < 30; // Threshold
    };

    let foundX = 0;
    let foundY = 0;
    let found = false;

    // Scan from top-left to find first non-dark pixel
    for (let y = 0; y < imageDimensions.h; y++) {
      for (let x = 0; x < imageDimensions.w; x++) {
        const i = (y * imageDimensions.w + x) * 4;
        if (!isDark(i)) {
          foundX = x;
          foundY = y;
          found = true;
          break;
        }
      }
      if (found) break;
    }

    if (found) {
      setOffsetX(foundX);
      setOffsetY(foundY);
    }
  };

  const generateGrid = React.useCallback(() => {
    if (!imageDimensions.w || !imageDimensions.h) return;
    
    if (cardWidth <= 0 || cardHeight <= 0 || gridRows <= 0 || gridCols <= 0) {
      setCrops([]);
      return;
    }

    const newCrops: CropRect[] = [];

    for (let r = 0; r < gridRows; r++) {
      for (let c = 0; c < gridCols; c++) {
        newCrops.push({
          id: `crop_${r}_${c}`,
          x: offsetX + c * (cardWidth + gapX),
          y: offsetY + r * (cardHeight + gapY),
          w: cardWidth,
          h: cardHeight,
        });
      }
    }
    setCrops(newCrops);
  }, [
    imageDimensions.w,
    imageDimensions.h,
    gridRows,
    gridCols,
    cardWidth,
    cardHeight,
    gapX,
    gapY,
    offsetX,
    offsetY,
  ]);

  useEffect(() => {
    generateGrid();
  }, [generateGrid]);

  const isGridOutOfBounds = () => {
    if (crops.length === 0) return false;
    const lastCrop = crops[crops.length - 1];
    return (
      lastCrop.x + lastCrop.w > imageDimensions.w ||
      lastCrop.y + lastCrop.h > imageDimensions.h
    );
  };

  const updateCrop = (id: string, field: keyof CropRect, value: number) => {
    setCrops((prev) =>
      prev.map((c) => (c.id === id ? { ...c, [field]: value } : c)),
    );
  };

  const removeCrop = (id: string) => {
    setCrops((prev) => prev.filter((c) => c.id !== id));
  };

  const processAndSave = async () => {
    if (!originalImageRef.current || crops.length === 0) return;

    const img = originalImageRef.current;
    const tempCanvas = document.createElement("canvas");
    const ctx = tempCanvas.getContext("2d");
    if (!ctx) return;

    const batchId = `batch_${Date.now()}`;
    const timestamp = Date.now();

    for (let i = 0; i < crops.length; i++) {
      const crop = crops[i];
      tempCanvas.width = crop.w;
      tempCanvas.height = crop.h;

      // Draw cropped area to temp canvas
      ctx.clearRect(0, 0, crop.w, crop.h);
      ctx.drawImage(
        img,
        crop.x,
        crop.y,
        crop.w,
        crop.h, // source
        0,
        0,
        crop.w,
        crop.h, // destination
      );

      // Convert to blob
      const blob = await new Promise<Blob | null>((resolve) =>
        tempCanvas.toBlob(resolve, "image/png"),
      );
      if (blob) {
        // Standardized naming format: {type}_{faction}_{deckColor}_{batchName}_{index}
        const safeBatchName = batchName.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase() || 'batch';
        const deckSafe = deckOrColor.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase() || 'none';
        const cardId = `${cardType}_${faction}_${deckSafe}_${safeBatchName}_${String(i + 1).padStart(3, '0')}`;
        
        await saveCardImage(cardId, blob);
        await saveAssetRecord({
          id: cardId,
          displayName: cardId,
          originalFileName: fileName,
          batchId,
          type: cardType,
          expansion,
          faction,
          deckOrColor,
          index: i,
          timestamp,
          presetName: PRESETS[preset]?.name || "Custom",
          isCustomSize: preset === "custom" || preset.startsWith("custom_"),
          cardWidth,
          cardHeight,
          rows: gridRows,
          columns: gridCols,
          gapX,
          gapY,
          offsetX,
          offsetY,
        });
      }
    }

    alert(`Se importaron ${crops.length} cartas con éxito.`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[200] bg-black/90 flex flex-col p-4 md:p-8 overflow-hidden font-sans text-neutral-200">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Scissors className="w-6 h-6 text-yellow-500" />
            Card Sheet Importer
          </h2>
          <p className="text-neutral-400">
            Extrae cartas individuales a partir de una imagen (hoja) y
            regístralas en IndexedDB.
          </p>
        </div>
        <button
          onClick={onClose}
          className="p-2 hover:bg-neutral-800 rounded-full transition-colors"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row gap-6 min-h-0">
        {/* Left Column: Image & Preview */}
        <div className="flex-1 flex flex-col min-w-0 bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden">
          {/* Uploader / Canvas */}
          <div className="flex-1 relative overflow-auto bg-neutral-950 p-4">
            {!imageSrc ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <Upload className="w-16 h-16 text-neutral-600 mb-4" />
                <label className="bg-yellow-600 hover:bg-yellow-500 text-white px-6 py-3 rounded-lg font-bold cursor-pointer transition-colors shadow-lg">
                  Subir imagen desde PC
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                </label>
              </div>
            ) : (
              <div className="relative inline-block border border-neutral-700 shadow-2xl">
                <img
                  src={imageSrc}
                  alt="Sheet"
                  onLoad={handleImageLoad}
                  className="block max-w-full h-auto"
                />
                {/* SVG Overlay for crops */}
                <svg
                  className="absolute inset-0 w-full h-full pointer-events-none"
                  viewBox={`0 0 ${imageDimensions.w} ${imageDimensions.h}`}
                  preserveAspectRatio="none"
                >
                  {crops.map((crop, i) => (
                    <g key={crop.id}>
                      <rect
                        x={crop.x}
                        y={crop.y}
                        width={crop.w}
                        height={crop.h}
                        fill="rgba(234, 179, 8, 0.2)"
                        stroke="rgba(234, 179, 8, 0.8)"
                        strokeWidth="2"
                      />
                      <text
                        x={crop.x + 5}
                        y={crop.y + 20}
                        fill="white"
                        fontSize="16"
                        fontWeight="bold"
                        stroke="black"
                        strokeWidth="1"
                      >
                        #{i + 1}
                      </text>
                    </g>
                  ))}
                </svg>
              </div>
            )}
            <canvas ref={canvasRef} className="hidden" />
          </div>

          {/* Recortes Preview Scrollbar */}
          {crops.length > 0 && originalImageRef.current && (
            <div className="h-64 border-t border-neutral-800 bg-neutral-900 p-4 flex gap-4 overflow-x-auto items-start">
              {crops.map((crop, i) => {
                const scale = 100 / crop.h; // normalize height to 100px for the preview image
                return (
                  <div
                    key={crop.id}
                    className="relative group shrink-0 flex flex-col gap-2 bg-neutral-950 border border-neutral-700 rounded p-2 hover:border-yellow-500 transition-colors"
                  >
                    <div
                      className="relative border border-neutral-800 bg-black overflow-hidden"
                      style={{ width: crop.w * scale, height: 100 }}
                    >
                      <img
                        src={imageSrc!}
                        alt={`Crop ${i}`}
                        className="max-w-none"
                        style={{
                          width: imageDimensions.w * scale,
                          height: imageDimensions.h * scale,
                          transform: `translate(-${crop.x * scale}px, -${crop.y * scale}px)`,
                        }}
                      />
                      <div className="absolute top-1 left-1 bg-black/80 px-1 text-[10px] text-white rounded">
                        #{i + 1}
                      </div>
                      <button
                        onClick={() => removeCrop(crop.id)}
                        className="absolute top-1 right-1 bg-red-600 hover:bg-red-500 text-white p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-1 text-[10px]">
                      <div className="flex items-center gap-1">
                        <span className="text-neutral-500 w-2">X</span>
                        <input
                          type="number"
                          value={crop.x}
                          onChange={(e) =>
                            updateCrop(crop.id, "x", Number(e.target.value))
                          }
                          className="w-12 bg-neutral-900 border border-neutral-700 rounded px-1 py-0.5 text-white"
                        />
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-neutral-500 w-2">Y</span>
                        <input
                          type="number"
                          value={crop.y}
                          onChange={(e) =>
                            updateCrop(crop.id, "y", Number(e.target.value))
                          }
                          className="w-12 bg-neutral-900 border border-neutral-700 rounded px-1 py-0.5 text-white"
                        />
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-neutral-500 w-2">W</span>
                        <input
                          type="number"
                          value={crop.w}
                          onChange={(e) =>
                            updateCrop(crop.id, "w", Number(e.target.value))
                          }
                          className="w-12 bg-neutral-900 border border-neutral-700 rounded px-1 py-0.5 text-white"
                        />
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-neutral-500 w-2">H</span>
                        <input
                          type="number"
                          value={crop.h}
                          onChange={(e) =>
                            updateCrop(crop.id, "h", Number(e.target.value))
                          }
                          className="w-12 bg-neutral-900 border border-neutral-700 rounded px-1 py-0.5 text-white"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Controls */}
        <div className="w-full lg:w-80 flex flex-col gap-6 overflow-y-auto">
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
            <h3 className="font-bold text-white mb-4 flex items-center gap-2">
              <Grid3X3 className="w-5 h-5 text-neutral-400" />
              Tamaño de Carta
            </h3>
            
            <div className="space-y-4 mb-6 pb-6 border-b border-neutral-800">
              <div>
                <label className="block text-xs text-neutral-400 mb-1">
                  Preset de carta
                </label>
                <select
                  value={preset}
                  onChange={handlePresetChange}
                  className="w-full bg-neutral-950 border border-neutral-700 rounded px-3 py-2 text-white"
                >
                  {Object.entries(PRESETS).map(([key, data]: [string, any]) => (
                    <option key={key} value={key}>
                      {data.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-neutral-400 mb-1">
                    Ancho
                  </label>
                  <input
                    type="number"
                    value={cardWidth}
                    onChange={(e) => setCardWidth(Number(e.target.value))}
                    className="w-full bg-neutral-950 border border-neutral-700 rounded px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-neutral-400 mb-1">
                    Alto
                  </label>
                  <input
                    type="number"
                    value={cardHeight}
                    onChange={(e) => setCardHeight(Number(e.target.value))}
                    className="w-full bg-neutral-950 border border-neutral-700 rounded px-3 py-2 text-white"
                  />
                </div>
              </div>

              <button
                onClick={handleSavePreset}
                className="w-full flex items-center justify-center gap-2 bg-neutral-800 hover:bg-neutral-700 text-xs text-neutral-300 py-1.5 rounded transition-colors border border-neutral-700"
              >
                <Save className="w-3.5 h-3.5" />
                Guardar tamaño como preset
              </button>
            </div>

            <h3 className="font-bold text-white mb-4 flex items-center gap-2">
              <Grid3X3 className="w-5 h-5 text-neutral-400" />
              Grilla
            </h3>

            {isGridOutOfBounds() && (
              <div className="mb-4 bg-red-950/50 border border-red-900/50 text-red-400 text-[10px] p-2 rounded">
                ⚠️ Advertencia: Algunos recortes exceden el tamaño real de la imagen. Por favor ajusta las filas, columnas o espaciado.
              </div>
            )}

            <div className="space-y-4 mb-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-neutral-400 mb-1">
                    Filas
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={gridRows}
                    onChange={(e) => setGridRows(Number(e.target.value))}
                    className="w-full bg-neutral-950 border border-neutral-700 rounded px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-neutral-400 mb-1">
                    Columnas
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={gridCols}
                    onChange={(e) => setGridCols(Number(e.target.value))}
                    className="w-full bg-neutral-950 border border-neutral-700 rounded px-3 py-2 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-neutral-400 mb-1">
                    Espaciado X
                  </label>
                  <input
                    type="number"
                    value={gapX}
                    onChange={(e) => setGapX(Number(e.target.value))}
                    className="w-full bg-neutral-950 border border-neutral-700 rounded px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-neutral-400 mb-1">
                    Espaciado Y
                  </label>
                  <input
                    type="number"
                    value={gapY}
                    onChange={(e) => setGapY(Number(e.target.value))}
                    className="w-full bg-neutral-950 border border-neutral-700 rounded px-3 py-2 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-neutral-400 mb-1">
                    Offset X
                  </label>
                  <input
                    type="number"
                    value={offsetX}
                    onChange={(e) => setOffsetX(Number(e.target.value))}
                    className="w-full bg-neutral-950 border border-neutral-700 rounded px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-neutral-400 mb-1">
                    Offset Y
                  </label>
                  <input
                    type="number"
                    value={offsetY}
                    onChange={(e) => setOffsetY(Number(e.target.value))}
                    className="w-full bg-neutral-950 border border-neutral-700 rounded px-3 py-2 text-white"
                  />
                </div>
              </div>

              <button
                onClick={autoDetectOffset}
                disabled={!imageSrc}
                className="w-full bg-neutral-800 hover:bg-neutral-700 text-xs text-neutral-300 disabled:opacity-50 py-1.5 rounded transition-colors border border-neutral-700"
              >
                Detectar offset automáticamente
              </button>
            </div>
            
            <div className="text-center text-xs text-neutral-400 mt-2">
              Se generarán <strong className="text-white">{crops.length}</strong> recortes.
            </div>
          </div>

          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
            <h3 className="font-bold text-white mb-4">Metadata del Lote</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-xs text-neutral-400 mb-1">
                  Nombre del Lote
                </label>
                <input
                  type="text"
                  value={batchName}
                  onChange={(e) => setBatchName(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-700 rounded px-3 py-2 text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-neutral-400 mb-1">
                  Expansión
                </label>
                <select
                  value={expansion}
                  onChange={(e) => setExpansion(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-700 rounded px-3 py-2 text-white"
                >
                  <option value="base">Base Game</option>
                  <option value="shadows_of_war">Shadows of War</option>
                  <option value="burning_crusade">Burning Crusade</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-neutral-400 mb-1">
                  Tipo de Carta
                </label>
                <select
                  value={cardType}
                  onChange={(e) => setCardType(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-700 rounded px-3 py-2 text-white"
                >
                  <option value="quest">Quest</option>
                  <option value="item">Item</option>
                  <option value="event">Event</option>
                  <option value="class_ability">Class Ability</option>
                  <option value="class_talent">Class Talent</option>
                  <option value="creature">Creature</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-neutral-400 mb-1">
                    Facción
                  </label>
                  <select
                    value={faction}
                    onChange={(e) => setFaction(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-700 rounded px-3 py-2 text-white"
                  >
                    <option value="horde">Horda</option>
                    <option value="alliance">Alianza</option>
                    <option value="neutral">Neutral</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-neutral-400 mb-1">
                    Mazo/Color
                  </label>
                  <input
                    type="text"
                    value={deckOrColor}
                    onChange={(e) => setDeckOrColor(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-700 rounded px-3 py-2 text-white"
                    placeholder="Ej: verde"
                  />
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={processAndSave}
            disabled={crops.length === 0}
            className="w-full mt-auto bg-green-700 hover:bg-green-600 disabled:bg-neutral-800 disabled:text-neutral-500 text-white font-bold py-4 rounded-xl transition-colors shadow-lg flex items-center justify-center gap-2"
          >
            <Check className="w-5 h-5" />
            Guardar {crops.length} Cartas
          </button>
        </div>
      </div>
    </div>
  );
}

