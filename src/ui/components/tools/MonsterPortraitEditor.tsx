import React, { useState, useEffect, useRef } from "react";
import { X, ZoomIn, ZoomOut, RotateCw, RefreshCw, Check, Maximize, Upload, Download, Eye } from "lucide-react";
import { getAssetRecord } from "../../../core/utils/db";

interface MonsterPortraitEditorProps {
  imageSrc: string; // Base64 or object URL of the uploaded image
  monsterId: string;
  monsterName: string;
  onSave: (assetId: string) => void;
  onCancel: () => void;
}

export function MonsterPortraitEditor({
  imageSrc,
  monsterId,
  monsterName,
  onSave,
  onCancel
}: MonsterPortraitEditorProps) {
  const [zoom, setZoom] = useState(1);
  const [posX, setPosX] = useState(0);
  const [posY, setPosY] = useState(0);
  const [rotation, setRotation] = useState(0);

  const [naturalWidth, setNaturalWidth] = useState(0);
  const [naturalHeight, setNaturalHeight] = useState(0);
  const [baseScale, setBaseScale] = useState(1);

  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const imageRef = useRef<HTMLImageElement | null>(null);

  // Token Generator states
  const [selectedTokenColor, setSelectedTokenColor] = useState<"green" | "red" | "blue" | "purple">("green");
  const [includeAccessibilityLetter, setIncludeAccessibilityLetter] = useState(true);

  // Load natural dimensions of the image to compute baseScale (covering 256x256)
  useEffect(() => {
    const img = new Image();
    img.src = imageSrc;
    img.onload = () => {
      setNaturalWidth(img.width);
      setNaturalHeight(img.height);
      const coverScale = Math.max(256 / img.width, 256 / img.height);
      setBaseScale(coverScale);
      // Reset position/zoom
      setZoom(1);
      setPosX(0);
      setPosY(0);
      setRotation(0);
    };
  }, [imageSrc]);

  // Drag handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    dragStart.current = { x: e.clientX - posX, y: e.clientY - posY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPosX(e.clientX - dragStart.current.x);
    setPosY(e.clientY - dragStart.current.y);
  };

  const handleMouseUpOrLeave = () => {
    setIsDragging(false);
  };

  // Touch support for mobile devices
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length !== 1) return;
    setIsDragging(true);
    const touch = e.touches[0];
    dragStart.current = { x: touch.clientX - posX, y: touch.clientY - posY };
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || e.touches.length !== 1) return;
    const touch = e.touches[0];
    setPosX(touch.clientX - dragStart.current.x);
    setPosY(touch.clientY - dragStart.current.y);
  };

  const handleCenter = () => {
    setPosX(0);
    setPosY(0);
  };

  const handleReset = () => {
    setZoom(1);
    setPosX(0);
    setPosY(0);
    setRotation(0);
  };

  const getTailwindColorHex = (color: string) => {
    switch (color) {
      case "green": return "#22c55e";
      case "red": return "#ef4444";
      case "blue": return "#3b82f6";
      case "purple": return "#a855f7";
      default: return "#eab308";
    }
  };

  // Helper to draw the crop onto a 256x256 canvas
  const drawCroppedImage = (canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, callback: () => void) => {
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.clearRect(0, 0, 256, 256);
    ctx.save();

    // 1. Center the coordinate system at (128, 128)
    ctx.translate(128, 128);

    // 2. Apply posX and posY translations from drag offsets
    ctx.translate(posX, posY);

    // 3. Apply rotation
    ctx.rotate((rotation * Math.PI) / 180);

    // 4. Apply scale (Zoom * CoverScale)
    const finalScale = zoom * baseScale;
    ctx.scale(finalScale, finalScale);

    // 5. Draw image centered
    const img = new Image();
    img.src = imageSrc;
    img.onload = () => {
      ctx.drawImage(img, -naturalWidth / 2, -naturalHeight / 2, naturalWidth, naturalHeight);
      ctx.restore();
      callback();
    };
  };

  const handleSavePortrait = () => {
    if (naturalWidth === 0 || naturalHeight === 0) return;

    // Create a 256x256 canvas to render the cropped portrait
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext("2d");

    if (!ctx) {
      alert("Error al inicializar el procesador de imágenes canvas.");
      return;
    }

    drawCroppedImage(canvas, ctx, async () => {
      canvas.toBlob((blob) => {
        if (!blob) {
          alert("Error al generar el archivo de imagen de retrato.");
          return;
        }

        // Generate unique asset ID and save
        const assetId = `monster_portrait_${monsterId}`;
        
        // Save in IndexedDB
        import("../../../core/utils/db").then(async (dbModule) => {
          try {
            await dbModule.saveCardImage(assetId, blob);
            
            // Versioning and date tracking
            const existingAsset = await getAssetRecord(assetId).catch(() => null);
            const currentVersion = existingAsset?.portraitVersion ? (existingAsset.portraitVersion + 1) : 1;
            const createdAt = existingAsset?.createdAt || Date.now();

            const assetRecord = {
              id: assetId,
              displayName: `Retrato - ${monsterName}`,
              originalFileName: `monster_${monsterId}.png`,
              batchId: "monster_portraits_batch",
              type: "monster_portrait",
              expansion: "base_game", // Default or current expansion
              faction: "neutral",
              deckOrColor: "neutral",
              index: 0,
              timestamp: Date.now(),
              reviewState: "verified" as const,
              createdAt,
              updatedAt: Date.now(),
              portraitVersion: currentVersion
            };
            
            await dbModule.saveAssetRecord(assetRecord);
            onSave(assetId);
          } catch (err) {
            console.error(err);
            alert("Error al guardar el retrato en IndexedDB.");
          }
        });
      }, "image/png");
    });
  };

  // Generate and download a circular Token image with a colored border and optional G/R/B/P badge
  const handleDownloadToken = () => {
    if (naturalWidth === 0 || naturalHeight === 0) return;

    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext("2d");

    if (!ctx) {
      alert("Error al inicializar el canvas.");
      return;
    }

    drawCroppedImage(canvas, ctx, () => {
      // Now draw circular token frame on top of the cropped image
      const tokenCanvas = document.createElement("canvas");
      tokenCanvas.width = 256;
      tokenCanvas.height = 256;
      const tCtx = tokenCanvas.getContext("2d");
      if (!tCtx) return;

      // Enable smoothing
      tCtx.imageSmoothingEnabled = true;
      tCtx.imageSmoothingQuality = "high";

      // 1. Draw Circular Clip of the cropped portrait
      tCtx.save();
      tCtx.beginPath();
      tCtx.arc(128, 128, 120, 0, Math.PI * 2);
      tCtx.clip();
      tCtx.drawImage(canvas, 0, 0);
      tCtx.restore();

      // 2. Draw styled outer border matching the variant color
      tCtx.strokeStyle = getTailwindColorHex(selectedTokenColor);
      tCtx.lineWidth = 10;
      tCtx.beginPath();
      tCtx.arc(128, 128, 120, 0, Math.PI * 2);
      tCtx.stroke();

      // Inner thin golden or dark ring for aesthetics
      tCtx.strokeStyle = "rgba(0, 0, 0, 0.4)";
      tCtx.lineWidth = 3;
      tCtx.beginPath();
      tCtx.arc(128, 128, 114, 0, Math.PI * 2);
      tCtx.stroke();

      tCtx.strokeStyle = "rgba(255, 255, 255, 0.2)";
      tCtx.lineWidth = 2;
      tCtx.beginPath();
      tCtx.arc(128, 128, 125, 0, Math.PI * 2);
      tCtx.stroke();

      // 3. Draw accessibility badge if enabled
      if (includeAccessibilityLetter) {
        const letter = selectedTokenColor.charAt(0).toUpperCase();
        const badgeRadius = 22;
        const bx = 128 + 115 * Math.cos(-Math.PI / 4); // top right
        const by = 128 + 115 * Math.sin(-Math.PI / 4);

        // Badge background shadow
        tCtx.shadowColor = "rgba(0, 0, 0, 0.5)";
        tCtx.shadowBlur = 8;

        tCtx.fillStyle = getTailwindColorHex(selectedTokenColor);
        tCtx.beginPath();
        tCtx.arc(bx, by, badgeRadius, 0, Math.PI * 2);
        tCtx.fill();

        // White border for badge
        tCtx.shadowBlur = 0; // turn off shadow
        tCtx.strokeStyle = "#ffffff";
        tCtx.lineWidth = 2;
        tCtx.beginPath();
        tCtx.arc(bx, by, badgeRadius, 0, Math.PI * 2);
        tCtx.stroke();

        // Badge Text
        tCtx.fillStyle = selectedTokenColor === "green" ? "#022c22" : "#ffffff";
        tCtx.font = "bold 20px system-ui, -apple-system, sans-serif";
        tCtx.textAlign = "center";
        tCtx.textBaseline = "middle";
        tCtx.fillText(letter, bx, by + 1);
      }

      // Convert to file download
      tokenCanvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `token_circular_${monsterId}_${selectedTokenColor}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, "image/png");
    });
  };

  // Helper to render preview items
  const renderPreviewItem = (sizePx: number, label: string) => {
    const scale = sizePx / 256;
    return (
      <div className="flex flex-col items-center gap-2 bg-neutral-950 p-2.5 rounded-lg border border-neutral-850">
        <div 
          className="relative rounded-full border border-neutral-700 bg-neutral-950 overflow-hidden shrink-0 shadow-lg"
          style={{ width: `${sizePx}px`, height: `${sizePx}px` }}
        >
          {imageSrc && naturalWidth > 0 && (
            <img
              src={imageSrc}
              alt="Realtime preview"
              draggable={false}
              className="max-w-none origin-center pointer-events-none select-none"
              style={{
                width: naturalWidth * scale,
                height: naturalHeight * scale,
                position: "absolute",
                left: "50%",
                top: "50%",
                transform: `translate(calc(-50% + ${posX * scale}px), calc(-50% + ${posY * scale}px)) rotate(${rotation}deg) scale(${zoom * baseScale})`,
              }}
            />
          )}
        </div>
        <div className="text-center">
          <div className="text-[10px] font-bold text-neutral-300 leading-tight">{label}</div>
          <div className="text-[9px] text-neutral-500 font-mono mt-0.5">{sizePx}x{sizePx} px</div>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[300] bg-black/95 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl max-w-4xl w-full p-6 shadow-2xl flex flex-col gap-5 text-neutral-200">
        
        {/* Header */}
        <div className="flex justify-between items-start border-b border-neutral-800 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-bold text-white text-lg">Estudio de Retratos y Tokens</h4>
              <span className="text-[10px] bg-yellow-600/20 text-yellow-500 font-mono px-2 py-0.5 rounded border border-yellow-600/30">
                PRO PORTRAIT SYSTEM
              </span>
            </div>
            <p className="text-xs text-neutral-400 mt-0.5">Encuadra el retrato de <strong>{monsterName}</strong> y genera tokens de combate listos para el tablero.</p>
          </div>
          <button
            onClick={onCancel}
            className="p-1 hover:bg-neutral-800 rounded text-neutral-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Workspace Body Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
          
          {/* Left Column: Interactive Cropper Viewport & Direct Controls */}
          <div className="md:col-span-7 flex flex-col gap-4">
            
            <div className="flex flex-col items-center justify-center bg-neutral-950 p-4 rounded-xl border border-neutral-850">
              <span className="text-[10px] text-neutral-500 uppercase font-mono tracking-wider mb-2">Visor de Recorte Interactivo</span>
              
              <div
                id="circular-crop-viewport"
                className="relative w-64 h-64 rounded-full border-2 border-yellow-500 shadow-[0_0_25px_rgba(234,179,8,0.25)] bg-neutral-950 overflow-hidden cursor-move select-none touch-none"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUpOrLeave}
                onMouseLeave={handleMouseUpOrLeave}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleMouseUpOrLeave}
              >
                {/* 1. Concentric Safe Area Circle */}
                <div className="absolute inset-[10%] border-2 border-dashed border-emerald-500/50 rounded-full pointer-events-none z-10 flex items-center justify-center">
                  <span className="text-[9px] text-emerald-400/40 font-mono font-black tracking-wider uppercase bg-neutral-950/40 px-1 py-0.2 rounded">
                    ZONA SEGURA (80%)
                  </span>
                </div>

                {/* Grid Overlay lines */}
                <div className="absolute top-1/2 left-0 right-0 h-px bg-white/5 pointer-events-none z-10" />
                <div className="absolute left-1/2 top-0 bottom-0 w-px bg-white/5 pointer-events-none z-10" />
                
                {/* Image element under cropping */}
                {imageSrc && naturalWidth > 0 && (
                  <img
                    ref={imageRef}
                    src={imageSrc}
                    alt="Active crop"
                    draggable={false}
                    className="max-w-none origin-center pointer-events-none"
                    style={{
                      width: naturalWidth,
                      height: naturalHeight,
                      position: "absolute",
                      left: "50%",
                      top: "50%",
                      transform: `translate(calc(-50% + ${posX}px), calc(-50% + ${posY}px)) rotate(${rotation}deg) scale(${zoom * baseScale})`,
                    }}
                  />
                )}
              </div>

              <div className="mt-4 flex gap-6 text-[10px] text-neutral-400 font-mono">
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-yellow-500 inline-block" /> Límite (256x256)
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full border border-dashed border-emerald-500 inline-block" /> Zona Segura (Evitar cortes)
                </span>
              </div>
            </div>

            {/* Direct Tool Buttons Panel */}
            <div className="bg-neutral-950 p-4 border border-neutral-850 rounded-xl flex flex-col gap-3">
              <div className="flex items-center justify-between text-xs text-neutral-400 font-semibold border-b border-neutral-900 pb-2">
                <span>Controles de Ajuste de Imagen</span>
                <span className="font-mono text-yellow-500 text-[10px]">Zoom: {Math.round(zoom * 100)}%</span>
              </div>

              <div className="grid grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.min(4, z + 0.1))}
                  className="bg-neutral-900 hover:bg-neutral-850 text-white border border-neutral-800 p-2 rounded flex flex-col items-center gap-1 transition-colors hover:border-neutral-700"
                  title="Aumentar Zoom"
                >
                  <ZoomIn className="w-4 h-4 text-yellow-500" />
                  <span className="text-[9px]">Zoom +</span>
                </button>
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.max(0.5, z - 0.1))}
                  className="bg-neutral-900 hover:bg-neutral-850 text-white border border-neutral-800 p-2 rounded flex flex-col items-center gap-1 transition-colors hover:border-neutral-700"
                  title="Disminuir Zoom"
                >
                  <ZoomOut className="w-4 h-4 text-yellow-500" />
                  <span className="text-[9px]">Zoom -</span>
                </button>
                <button
                  type="button"
                  onClick={() => setRotation((r) => (r + 90) % 360)}
                  className="bg-neutral-900 hover:bg-neutral-850 text-white border border-neutral-800 p-2 rounded flex flex-col items-center gap-1 transition-colors hover:border-neutral-700"
                  title="Rotar 90º"
                >
                  <RotateCw className="w-4 h-4 text-yellow-500" />
                  <span className="text-[9px]">Rotar 90º</span>
                </button>
                <button
                  type="button"
                  onClick={handleCenter}
                  className="bg-neutral-900 hover:bg-neutral-850 text-white border border-neutral-800 p-2 rounded flex flex-col items-center gap-1 transition-colors hover:border-neutral-700"
                  title="Centrar"
                >
                  <Maximize className="w-4 h-4 text-yellow-500" />
                  <span className="text-[9px]">Centrar</span>
                </button>
              </div>

              <div className="flex justify-between items-center mt-1 border-t border-neutral-900 pt-2 text-[11px]">
                <span className="text-neutral-500">¿Deseas empezar de cero?</span>
                <button
                  type="button"
                  onClick={handleReset}
                  className="flex items-center gap-1 bg-neutral-900 hover:bg-neutral-850 border border-neutral-800 text-[10px] text-neutral-400 px-2.5 py-1 rounded transition-colors hover:text-white"
                >
                  <RefreshCw className="w-3 h-3" />
                  Restablecer
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Previews in all game sizes & Token Generator Utility */}
          <div className="md:col-span-5 flex flex-col gap-4">
            
            {/* Previews Panel */}
            <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-850">
              <div className="flex items-center gap-1.5 border-b border-neutral-900 pb-2 mb-3">
                <Eye className="w-4 h-4 text-yellow-500" />
                <span className="text-xs font-bold text-white uppercase tracking-wider">Resoluciones Simultáneas</span>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                {renderPreviewItem(96, "Tooltip Popup")}
                {renderPreviewItem(64, "Monster Picker")}
                {renderPreviewItem(48, "Map Quest Preview")}
                {renderPreviewItem(256, "Retrato Original")}
              </div>
            </div>

            {/* Token Generator Utility */}
            <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-850 flex flex-col gap-3">
              <div className="flex items-center gap-1.5 border-b border-neutral-900 pb-2 mb-1">
                <Download className="w-4 h-4 text-yellow-500" />
                <span className="text-xs font-bold text-white uppercase tracking-wider">Monster Token Generator</span>
              </div>
              
              <p className="text-[10px] text-neutral-400 leading-normal">
                Genera automáticamente un asset circular con el anillo del color de la variante y la letra de accesibilidad.
              </p>

              <div className="grid grid-cols-2 gap-2 mt-1">
                {/* Color Selector */}
                <div className="flex flex-col gap-1">
                  <span className="text-[9px] text-neutral-500 font-bold uppercase">Color de Variante</span>
                  <div className="flex gap-1 bg-neutral-900 p-1 rounded border border-neutral-800">
                    {(["green", "red", "blue", "purple"] as const).map((col) => (
                      <button
                        key={col}
                        type="button"
                        onClick={() => setSelectedTokenColor(col)}
                        className={`w-5 h-5 rounded-full border transition-all ${selectedTokenColor === col ? "border-white ring-2 ring-yellow-500/50 scale-110" : "border-transparent opacity-60 hover:opacity-100"}`}
                        style={{ backgroundColor: getTailwindColorHex(col) }}
                        title={`Variante ${col}`}
                      />
                    ))}
                  </div>
                </div>

                {/* Accessibility Toggle */}
                <div className="flex flex-col gap-1">
                  <span className="text-[9px] text-neutral-500 font-bold uppercase">Accesibilidad</span>
                  <label className="flex items-center gap-1.5 bg-neutral-900 p-1.5 rounded border border-neutral-800 cursor-pointer text-[10px] text-neutral-300">
                    <input
                      type="checkbox"
                      checked={includeAccessibilityLetter}
                      onChange={(e) => setIncludeAccessibilityLetter(e.target.checked)}
                      className="accent-yellow-500"
                    />
                    <span>Incluir letra ({selectedTokenColor.charAt(0).toUpperCase()})</span>
                  </label>
                </div>
              </div>

              {/* Action Button */}
              <button
                type="button"
                onClick={handleDownloadToken}
                className="w-full flex items-center justify-center gap-2 bg-neutral-900 hover:bg-neutral-850 text-yellow-500 hover:text-yellow-400 border border-yellow-500/20 hover:border-yellow-500/40 px-3 py-2 rounded text-xs transition-colors font-bold mt-1"
              >
                <Download className="w-3.5 h-3.5" />
                Descargar Token Circular PNG
              </button>
            </div>

          </div>

        </div>

        {/* Footer Actions */}
        <div className="flex justify-end gap-3 border-t border-neutral-800 pt-4">
          <button
            type="button"
            onClick={onCancel}
            className="bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-neutral-700 px-5 py-2.5 rounded font-medium text-xs transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSavePortrait}
            className="bg-yellow-600 hover:bg-yellow-500 text-white px-6 py-2.5 rounded font-bold text-xs flex items-center gap-1.5 transition-colors shadow-lg active:scale-95"
          >
            <Check className="w-4 h-4" />
            Guardar retrato circular
          </button>
        </div>

      </div>
    </div>
  );
}
