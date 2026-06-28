import React, { useState, useEffect, useRef } from 'react';
import { Settings, Image as ImageIcon, Save, Trash2, X, Plus, Trash } from 'lucide-react';
import { CombatAreaLayout, CombatAreaZone, Point } from '../../../core/models/combatArea';
import { BlobImage } from './BlobImage';
import { getAllAssetRecords, saveAssetRecord, saveCardImage } from '../../../core/utils/db';

interface CombatAreaMapperProps {
  onClose: () => void;
}

const DEFAULT_LAYOUT: CombatAreaLayout = {
  backgroundAssetId: '',
  hitTokenAssetId: '',
  armorTokenAssetId: '',
  zones: [
    { id: 'damage', label: 'Damage', polygon: [], tokenLayout: 'scatter', tokenSize: 10 },
    { id: 'defense', label: 'Defense', polygon: [], tokenLayout: 'scatter', tokenSize: 10 },
    { id: 'attrition', label: 'Attrition', polygon: [], tokenLayout: 'scatter', tokenSize: 10 },
  ]
};

export function CombatAreaMapper({ onClose }: CombatAreaMapperProps) {
  const [layout, setLayout] = useState<CombatAreaLayout>(DEFAULT_LAYOUT);
  const [activeZoneId, setActiveZoneId] = useState<string | null>(null);
  const [images, setImages] = useState<{ id: string; name: string }[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importTarget, setImportTarget] = useState<'backgroundAssetId' | 'hitTokenAssetId' | 'armorTokenAssetId' | null>(null);

  const loadImages = async () => {
    const allAssets = await getAllAssetRecords();
    setImages(allAssets.filter(a => a.type.startsWith('image/')).map(a => ({ id: a.id, name: a.displayName || a.originalFileName })));
  };

  useEffect(() => {
    // Load from local storage
    const saved = localStorage.getItem('combatAreaLayout');
    if (saved) {
      setLayout(JSON.parse(saved));
    }
    loadImages();
  }, []);

  const handleImportClick = (target: 'backgroundAssetId' | 'hitTokenAssetId' | 'armorTokenAssetId') => {
    setImportTarget(target);
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !importTarget) return;

    try {
      const newId = `asset_${Date.now()}`;
      await saveCardImage(newId, file);
      
      const assetRecord = {
        id: newId,
        displayName: file.name.replace(/\.[^/.]+$/, ""),
        originalFileName: file.name,
        batchId: 'combat_mapper',
        type: file.type,
        expansion: 'base',
        faction: 'neutral',
        deckOrColor: 'neutral',
        index: 0,
        timestamp: Date.now(),
        reviewState: 'verified' as const
      };
      
      await saveAssetRecord(assetRecord);
      await loadImages();
      
      setLayout(prev => ({
        ...prev,
        [importTarget]: newId
      }));
    } catch (err) {
      console.error("Error importing image:", err);
      alert("Error al importar la imagen.");
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
      setImportTarget(null);
    }
  };

  const saveLayout = () => {
    localStorage.setItem('combatAreaLayout', JSON.stringify(layout));
    alert('Layout saved to localStorage!');
  };

  const handleImageClick = (e: React.MouseEvent) => {
    if (!activeZoneId || !containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    
    setLayout(prev => {
      const newZones = [...prev.zones];
      const zoneIndex = newZones.findIndex(z => z.id === activeZoneId);
      if (zoneIndex >= 0) {
        newZones[zoneIndex] = {
          ...newZones[zoneIndex],
          polygon: [...newZones[zoneIndex].polygon, { x, y }]
        };
      }
      return { ...prev, zones: newZones };
    });
  };

  const undoLastPoint = () => {
    if (!activeZoneId) return;
    setLayout(prev => {
      const newZones = [...prev.zones];
      const zoneIndex = newZones.findIndex(z => z.id === activeZoneId);
      if (zoneIndex >= 0 && newZones[zoneIndex].polygon.length > 0) {
        const newPoly = [...newZones[zoneIndex].polygon];
        newPoly.pop();
        newZones[zoneIndex] = { ...newZones[zoneIndex], polygon: newPoly };
      }
      return { ...prev, zones: newZones };
    });
  };

  const clearZone = () => {
    if (!activeZoneId) return;
    setLayout(prev => {
      const newZones = [...prev.zones];
      const zoneIndex = newZones.findIndex(z => z.id === activeZoneId);
      if (zoneIndex >= 0) {
        newZones[zoneIndex] = { ...newZones[zoneIndex], polygon: [] };
      }
      return { ...prev, zones: newZones };
    });
  };

  const renderPolygon = (zone: CombatAreaZone, isActive: boolean) => {
    if (zone.polygon.length === 0) return null;
    
    const pointsStr = zone.polygon.map(p => `${p.x},${p.y}`).join(' ');
    
    let color = '255, 255, 255';
    if (zone.id === 'damage') color = '220, 38, 38'; // red
    if (zone.id === 'defense') color = '59, 130, 246'; // blue
    if (zone.id === 'attrition') color = '168, 85, 247'; // purple
    
    return (
      <svg key={zone.id} className="absolute inset-0 w-full h-full pointer-events-none overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none">
        <polygon 
          points={pointsStr} 
          fill={`rgba(${color}, ${isActive ? '0.3' : '0.1'})`}
          stroke={`rgba(${color}, ${isActive ? '0.9' : '0.4'})`}
          strokeWidth="0.5"
          vectorEffect="non-scaling-stroke"
        />
        {isActive && zone.polygon.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="0.8" fill={`rgb(${color})`} />
        ))}
      </svg>
    );
  };

  return (
    <div className="fixed inset-0 z-[300] bg-neutral-950 flex font-sans text-neutral-200">
      <input 
        type="file" 
        ref={fileInputRef} 
        className="hidden" 
        accept="image/png,image/jpeg,image/webp" 
        onChange={handleFileChange} 
      />
      {/* Left Sidebar */}
      <aside className="w-80 bg-neutral-900 border-r border-neutral-800 flex flex-col h-full">
        <div className="p-4 border-b border-neutral-800 flex justify-between items-center bg-black/20">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-emerald-500" />
            <h2 className="font-black text-sm uppercase tracking-widest text-white">Combat Area Mapper</h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-neutral-800 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-black uppercase text-neutral-500 tracking-widest">Background Image (combate.png)</label>
            <div className="flex gap-2">
              <select 
                value={layout.backgroundAssetId || ''}
                onChange={(e) => setLayout({...layout, backgroundAssetId: e.target.value})}
                className="flex-1 bg-neutral-950 border border-neutral-800 rounded p-2 text-xs text-neutral-300 min-w-0"
              >
                <option value="">Select image...</option>
                {images.map(img => <option key={img.id} value={img.id}>{img.name}</option>)}
              </select>
              <button
                onClick={() => handleImportClick('backgroundAssetId')}
                className="bg-neutral-800 hover:bg-neutral-700 text-neutral-200 px-3 rounded text-xs font-bold whitespace-nowrap"
              >
                Importar
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-black uppercase text-neutral-500 tracking-widest">Hit Token (impacto.png)</label>
            <div className="flex gap-2">
              <select 
                value={layout.hitTokenAssetId || ''}
                onChange={(e) => setLayout({...layout, hitTokenAssetId: e.target.value})}
                className="flex-1 bg-neutral-950 border border-neutral-800 rounded p-2 text-xs text-neutral-300 min-w-0"
              >
                <option value="">Select image...</option>
                {images.map(img => <option key={img.id} value={img.id}>{img.name}</option>)}
              </select>
              <button
                onClick={() => handleImportClick('hitTokenAssetId')}
                className="bg-neutral-800 hover:bg-neutral-700 text-neutral-200 px-3 rounded text-xs font-bold whitespace-nowrap"
              >
                Importar
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-black uppercase text-neutral-500 tracking-widest">Armor Token (defensa.png)</label>
            <div className="flex gap-2">
              <select 
                value={layout.armorTokenAssetId || ''}
                onChange={(e) => setLayout({...layout, armorTokenAssetId: e.target.value})}
                className="flex-1 bg-neutral-950 border border-neutral-800 rounded p-2 text-xs text-neutral-300 min-w-0"
              >
                <option value="">Select image...</option>
                {images.map(img => <option key={img.id} value={img.id}>{img.name}</option>)}
              </select>
              <button
                onClick={() => handleImportClick('armorTokenAssetId')}
                className="bg-neutral-800 hover:bg-neutral-700 text-neutral-200 px-3 rounded text-xs font-bold whitespace-nowrap"
              >
                Importar
              </button>
            </div>
          </div>

          <div className="h-px bg-neutral-800 w-full my-2" />

          <div className="flex flex-col gap-3">
            <h3 className="text-[10px] font-black uppercase text-neutral-500 tracking-widest">Zones</h3>
            {layout.zones.map(zone => (
              <div 
                key={zone.id} 
                className={`p-3 rounded-lg border transition-all cursor-pointer ${
                  activeZoneId === zone.id 
                    ? 'bg-neutral-800/80 border-neutral-500' 
                    : 'bg-neutral-950 border-neutral-800 hover:border-neutral-700'
                }`}
                onClick={() => setActiveZoneId(zone.id)}
              >
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-bold uppercase">{zone.label}</span>
                  <span className="text-[10px] text-neutral-500 font-mono">{zone.polygon.length} pts</span>
                </div>
                
                {activeZoneId === zone.id && (
                  <div className="flex gap-2 mt-3">
                    <button 
                      onClick={(e) => { e.stopPropagation(); undoLastPoint(); }}
                      disabled={zone.polygon.length === 0}
                      className="flex-1 py-1 bg-neutral-700 hover:bg-neutral-600 disabled:opacity-50 text-[10px] uppercase font-bold rounded"
                    >
                      Undo
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); clearZone(); }}
                      disabled={zone.polygon.length === 0}
                      className="flex-1 py-1 bg-red-900/40 text-red-400 hover:bg-red-900/60 disabled:opacity-50 text-[10px] uppercase font-bold rounded"
                    >
                      Clear
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="p-4 bg-black/40 border-t border-neutral-800">
          <button 
            onClick={saveLayout}
            className="w-full flex items-center justify-center gap-2 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-black uppercase tracking-widest transition-colors"
          >
            <Save className="w-4 h-4" /> Save Layout
          </button>
        </div>
      </aside>

      {/* Main Canvas */}
      <main className="flex-1 relative bg-neutral-950 flex items-center justify-center p-8 overflow-hidden">
        {layout.backgroundAssetId ? (
          <div 
            ref={containerRef}
            className="relative bg-neutral-900 shadow-2xl"
            style={{ 
              width: '100%', 
              maxWidth: '800px', 
              aspectRatio: '16/9', // fallback
              backgroundImage: 'radial-gradient(circle, #222 1px, transparent 1px)',
              backgroundSize: '20px 20px'
            }}
            onClick={handleImageClick}
          >
            <BlobImage 
              cardId={layout.backgroundAssetId} 
              className="absolute inset-0 w-full h-full object-contain pointer-events-none"
            />
            {layout.zones.map(z => renderPolygon(z, activeZoneId === z.id))}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4 text-neutral-600">
            <ImageIcon className="w-16 h-16 opacity-20" />
            <p className="text-sm font-bold uppercase tracking-widest">Select a background image to start mapping</p>
          </div>
        )}
      </main>
    </div>
  );
}
