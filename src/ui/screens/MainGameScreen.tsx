import { useState, useEffect } from 'react';
import { useAppStore } from '../../core/state/store';
import { BoardViewer } from '../components/board/BoardViewer';
import { CardSheetImporter } from '../components/tools/CardSheetImporter';
import { AssetLibrary } from '../components/tools/AssetLibrary';
import { WorldMapper } from '../components/tools/WorldMapper';
import { MonsterDatabaseEditor } from '../components/tools/MonsterDatabaseEditor';
import { User, Map as MapIcon, Scissors, Library, EyeOff as EyeOffIcon, Play, Database, HardDrive, Layout, Swords } from 'lucide-react';
import { BackupPanel } from '../components/tools/BackupPanel';
import { CharacterSheetPanel } from '../components/character/CharacterSheetPanel';
import { CharacterSheetMapper } from '../components/tools/CharacterSheetMapper';
import { CombatLab } from '../components/combat/CombatLab';
import { CombatAreaMapper } from '../components/tools/CombatAreaMapper';

type ViewMode = 'BOARD' | 'CHARACTER';

export function MainGameScreen() {
  const [viewMode, setViewMode] = useState<ViewMode>('BOARD');
  const selectedExpansions = useAppStore(state => state.selectedExpansions);
  const hasOutland = selectedExpansions.includes('burning_crusade');
  
  const activeBoard = useAppStore(state => state.activeBoard);
  const setActiveBoard = useAppStore(state => state.setActiveBoard);
  const questSpawnPreview = useAppStore(state => state.questSpawnPreview);
  const setQuestSpawnPreview = useAppStore(state => state.setQuestSpawnPreview);

  const [showImporter, setShowImporter] = useState(false);
  const [showAssetLibrary, setShowAssetLibrary] = useState(false);
  const [showWorldMapper, setShowWorldMapper] = useState(false);
  const [showMonsterDb, setShowMonsterDb] = useState(false);
  const [showBackupPanel, setShowBackupPanel] = useState(false);
  const [showSheetMapper, setShowSheetMapper] = useState(false);
  const [showCombatLab, setShowCombatLab] = useState(false);
  const [showCombatMapper, setShowCombatMapper] = useState(false);
  const [isBoardFullscreen, setIsBoardFullscreen] = useState(() => {
    const saved = localStorage.getItem('isBoardFullscreen');
    return saved !== null ? JSON.parse(saved) : false;
  });
  const [isBoardFlipped, setIsBoardFlipped] = useState(false);

  useEffect(() => {
    const handleOpenMapper = () => setShowSheetMapper(true);
    window.addEventListener('open-sheet-mapper', handleOpenMapper);
    return () => window.removeEventListener('open-sheet-mapper', handleOpenMapper);
  }, []);

  useEffect(() => {
    console.log("[MainGameScreen] isBoardFullscreen:", isBoardFullscreen);
    localStorage.setItem('isBoardFullscreen', JSON.stringify(isBoardFullscreen));
  }, [isBoardFullscreen]);

  const toggleFullscreen = () => {
    console.log("[MainGameScreen] Toggling Fullscreen");
    setIsBoardFullscreen(prev => !prev);
  }

  const toggleFlip = () => {
    console.log("[MainGameScreen] Toggling Flip");
    setIsBoardFlipped(prev => !prev);
  }

  return (
    <div className="flex flex-col h-screen bg-neutral-950 text-white overflow-hidden">
      <header className="flex flex-wrap items-center justify-between p-4 bg-neutral-900 border-b border-neutral-800 z-10 gap-4">
        <div className="flex items-center gap-6">
          <div className="flex flex-col">
            <h1 className="text-xl font-black text-yellow-500 hidden sm:block tracking-tighter uppercase italic">World of Warcraft</h1>
            <span className="text-[9px] font-bold text-neutral-500 uppercase tracking-[0.3em] ml-1">The Board Game · Engine</span>
          </div>

          <nav className="flex gap-1 bg-black/40 p-1.5 rounded-xl border border-white/5">
            <button 
              onClick={() => setViewMode('BOARD')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${viewMode === 'BOARD' ? 'bg-yellow-600 text-neutral-950 shadow-lg shadow-yellow-600/20' : 'text-neutral-500 hover:text-neutral-300'}`}
            >
              <MapIcon className="w-3.5 h-3.5" />
              Tablero
            </button>
            <button 
              onClick={() => setViewMode('CHARACTER')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${viewMode === 'CHARACTER' ? 'bg-yellow-600 text-neutral-950 shadow-lg shadow-yellow-600/20' : 'text-neutral-500 hover:text-neutral-300'}`}
            >
              <User className="w-3.5 h-3.5" />
              Personaje
            </button>
          </nav>
        </div>
        
        <div className="flex items-center gap-3">
          {viewMode === 'BOARD' && (
            <div className="flex items-center gap-3 border-r border-neutral-800 pr-3 mr-3">
              <button 
                onClick={toggleFullscreen}
                className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-black uppercase tracking-widest transition-all border ${!isBoardFullscreen ? 'bg-yellow-600/10 text-yellow-500 border-yellow-500/30' : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border-neutral-700'}`}
              >
                {!isBoardFullscreen ? 'HUD Activo' : 'Pura Visual'}
              </button>
              <button 
                onClick={toggleFlip}
                className="flex items-center gap-2 px-3 py-1.5 rounded text-xs font-black uppercase tracking-widest bg-neutral-800 hover:bg-neutral-700 text-neutral-400 border border-neutral-700 transition-colors"
              >
                Invertir
              </button>
            </div>
          )}
          {questSpawnPreview && (
            <div className="flex items-center gap-2 bg-yellow-950/60 border border-yellow-800/60 text-yellow-200 px-3 py-1 rounded text-xs font-semibold animate-pulse">
              <Play className="w-3.5 h-3.5 text-yellow-400 shrink-0" />
              <span>Simulando Spawn: ID {questSpawnPreview.questId}</span>
              <button
                onClick={() => setQuestSpawnPreview(null)}
                className="bg-red-950/60 text-red-300 hover:bg-red-900 border border-red-800/50 px-2 py-0.5 rounded flex items-center gap-1 transition-colors ml-2"
                title="Clear Quest Preview"
              >
                <EyeOffIcon className="w-3 h-3" />
                <span>Clear Quest Preview</span>
              </button>
            </div>
          )}
          <button 
            onClick={() => setShowMonsterDb(true)}
            className="flex items-center gap-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 px-3 py-1.5 rounded text-sm font-medium transition-colors border border-neutral-700"
          >
            <Database className="w-4 h-4" />
            Monster DB
          </button>
          <button 
            onClick={() => setShowCombatLab(true)}
            className="flex items-center gap-2 bg-yellow-600 hover:bg-yellow-500 text-neutral-950 px-3 py-1.5 rounded text-sm font-black transition-colors border border-yellow-500 shadow-lg shadow-yellow-600/20"
          >
            <Swords className="w-4 h-4" />
            Combat Lab
          </button>
          <button 
            onClick={() => setShowCombatMapper(true)}
            className="flex items-center gap-2 bg-neutral-800 hover:bg-neutral-700 text-yellow-500 px-3 py-1.5 rounded text-sm font-medium transition-colors border border-neutral-700"
          >
            <MapIcon className="w-4 h-4" />
            Combat Mapper
          </button>
          <button 
            onClick={() => setShowBackupPanel(true)}
            className="flex items-center gap-2 bg-neutral-800 hover:bg-neutral-700 text-yellow-500 px-3 py-1.5 rounded text-sm font-medium transition-colors border border-neutral-700"
          >
            <HardDrive className="w-4 h-4" />
            Backup
          </button>
          <button 
            onClick={() => setShowSheetMapper(true)}
            className="flex items-center gap-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 px-3 py-1.5 rounded text-sm font-medium transition-colors border border-neutral-700"
          >
            <Layout className="w-4 h-4" />
            Sheet Mapper
          </button>
          <button 
            onClick={() => setShowWorldMapper(true)}
            className="flex items-center gap-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 px-3 py-1.5 rounded text-sm font-medium transition-colors border border-neutral-700"
          >
            <MapIcon className="w-4 h-4" />
            World Mapper
          </button>
          <button 
            onClick={() => setShowAssetLibrary(true)}
            className="flex items-center gap-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 px-3 py-1.5 rounded text-sm font-medium transition-colors border border-neutral-700"
          >
            <Library className="w-4 h-4" />
            Biblioteca de Assets
          </button>
          <button 
            onClick={() => setShowImporter(true)}
            className="flex items-center gap-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 px-3 py-1.5 rounded text-sm font-medium transition-colors border border-neutral-700"
          >
            <Scissors className="w-4 h-4" />
            Importar Cartas
          </button>
          <div className="text-sm text-neutral-400 hidden md:block">
            Fase: Mantenimiento (Placeholder)
          </div>
        </div>
      </header>

      <div className="flex-1 flex flex-col overflow-hidden">
        {viewMode === 'BOARD' ? (
          <div className="flex-1 flex flex-col lg:flex-row overflow-hidden min-h-0">
            <main className={`flex-1 relative flex flex-col overflow-hidden min-h-0 ${isBoardFullscreen ? 'board-area-fullscreen' : ''}`}>
              {isBoardFullscreen && <div className="absolute top-4 left-4 z-20 bg-yellow-600/90 backdrop-blur-md text-neutral-950 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] rounded-full shadow-2xl border border-yellow-400/30">Tablero Pura Visual</div>}
              {isBoardFlipped && <div className={`absolute top-4 z-20 bg-red-600 text-white px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] rounded-full shadow-2xl border border-red-400/30 ${isBoardFullscreen ? 'left-48' : 'left-4'}`}>Invertido</div>}
              <BoardViewer boardType={activeBoard} isBoardFlipped={isBoardFlipped} />
            </main>

            {!isBoardFullscreen && (
              <aside className="w-full lg:w-[440px] shrink-0 border-t lg:border-t-0 lg:border-l border-neutral-900 overflow-y-auto flex flex-col bg-neutral-950 z-10">
                 {/* Mini Character View (Basic info) */}
                 <div className="p-4 border-b border-neutral-900 bg-neutral-900/20 flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-widest text-neutral-500">Mini Character View</span>
                    <button 
                      onClick={() => setViewMode('CHARACTER')}
                      className="text-[10px] font-black uppercase text-yellow-500 hover:underline"
                    >
                      Ampliar Hoja
                    </button>
                 </div>
                 <div className="flex-1 overflow-y-auto">
                    <CharacterSheetPanel miniMode={true} />
                 </div>
              </aside>
            )}
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto bg-neutral-950">
            <CharacterSheetPanel fullWidth={true} />
          </div>
        )}
      </div>

      {showImporter && (
        <CardSheetImporter onClose={() => setShowImporter(false)} />
      )}

      {showAssetLibrary && (
        <AssetLibrary onClose={() => setShowAssetLibrary(false)} />
      )}

      {showWorldMapper && (
        <WorldMapper onClose={() => setShowWorldMapper(false)} />
      )}

      {showMonsterDb && (
        <MonsterDatabaseEditor onClose={() => setShowMonsterDb(false)} />
      )}

      {showSheetMapper && (
        <div className="fixed inset-0 z-[100] flex flex-col bg-neutral-950">
          <div className="bg-neutral-900 border-b border-neutral-800 p-2 flex justify-end">
            <button 
              onClick={() => setShowSheetMapper(false)}
              className="p-1 px-3 bg-red-600 text-white rounded text-xs font-bold uppercase"
            >
              Cerrar Mapper
            </button>
          </div>
          <div className="flex-1 overflow-hidden">
            <CharacterSheetMapper />
          </div>
        </div>
      )}

      {showBackupPanel && (
        <BackupPanel onClose={() => setShowBackupPanel(false)} />
      )}

      {showCombatLab && (
        <CombatLab onClose={() => setShowCombatLab(false)} />
      )}

      {showCombatMapper && (
        <CombatAreaMapper onClose={() => setShowCombatMapper(false)} />
      )}
    </div>
  );
}
