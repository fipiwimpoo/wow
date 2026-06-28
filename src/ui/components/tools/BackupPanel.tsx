import { useState, useRef } from 'react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { Database, AlertTriangle, CheckCircle, Download, X, AlertOctagon, Upload } from 'lucide-react';
import { initDB, getAllAssetRecords, getAllCardData, getAllMonsters, getCardImage, getBoardImage, clearAllStores, saveAssetRecord, saveCardData, saveMonster, saveCardImage, saveBoardImage } from '../../../core/utils/db';
import { loadWorldDb, saveWorldDb } from '../../../core/utils/worldDb';

interface BackupPanelProps {
  onClose: () => void;
}

export function BackupPanel({ onClose }: BackupPanelProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isInspecting, setIsInspecting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [report, setReport] = useState<{
    status: 'idle' | 'checking' | 'ready' | 'incomplete' | 'exporting' | 'importing' | 'imported' | 'inspecting' | 'inspected';
    errors: string[];
    warnings: string[];
    success: boolean;
    counts: any;
    metadata: any;
    healthScore: number;
  }>({
    status: 'idle',
    errors: [],
    warnings: [],
    success: false,
    counts: {},
    metadata: null,
    healthScore: 0,
  });

  const inspectBackup = async (file: File) => {
    setIsInspecting(true);
    setReport({ status: 'inspecting', errors: [], warnings: [], success: false, counts: {}, metadata: null, healthScore: 0 });
    
    try {
        const zip = await JSZip.loadAsync(file);
        
        // 1. Verify existence of files
        const requiredFiles = ['project.json', 'data/asset_registry.json', 'data/card_data.json', 'data/monster_db.json', 'data/world_db.json'];
        for (const file of requiredFiles) {
            if (!zip.file(file)) throw new Error(`Missing required file: ${file}`);
        }

        // 2. Load JSON
        const project = JSON.parse(await zip.file('project.json')!.async('string'));
        const registry = JSON.parse(await zip.file('data/asset_registry.json')!.async('string'));
        const cardData = JSON.parse(await zip.file('data/card_data.json')!.async('string'));
        
        // 3. Simple Validations
        const errors: string[] = [];
        const warnings: string[] = [];

        // Example relationship check
        for (const card of cardData) {
            if (!registry.find((a: any) => a.id === card.assetId)) {
                errors.push(`Card ${card.assetId} has missing asset.`);
            }
            if (!zip.file(`assets/cards/${card.assetId}.png`)) {
                 errors.push(`Card ${card.assetId} image blob missing.`);
            }
        }
        
        const healthScore = errors.length === 0 ? 100 : (errors.length > 5 ? 50 : 80);
        
        setReport({
            status: 'inspected',
            errors,
            warnings,
            success: healthScore >= 90,
            counts: {
                assets: registry.length,
                cardData: cardData.length
            },
            metadata: project,
            healthScore
        });
    } catch (e) {
        setReport({ status: 'incomplete', errors: [`Inspection failed: ${e}`], warnings: [], success: false, counts: {}, metadata: null, healthScore: 0 });
    } finally {
        setIsInspecting(false);
    }
  };

  // ... runIntegrityCheck and exportBackup remain largely same ...
  // [Added importBackup]

  const importBackup = async (file: File) => {
    setIsImporting(true);
    setReport({ status: 'importing', errors: [], warnings: [], success: false, counts: {} });
    try {
        const zip = await JSZip.loadAsync(file);
        
        // 1. Wipe
        await clearAllStores();

        // 2. Restore JSON
        const assetRegistry = JSON.parse(await zip.file('data/asset_registry.json')!.async('string'));
        const monsterDb = JSON.parse(await zip.file('data/monster_db.json')!.async('string'));
        const worldDb = JSON.parse(await zip.file('data/world_db.json')!.async('string'));
        const cardData = JSON.parse(await zip.file('data/card_data.json')!.async('string'));

        for (const record of assetRegistry) await saveAssetRecord(record);
        for (const monster of monsterDb) await saveMonster(monster);
        saveWorldDb(worldDb);
        for (const card of cardData) await saveCardData(card);

        // 3. Restore Blobs
        const files = zip.files;
        for (const [path, fileObj] of Object.entries(files)) {
            if (path.startsWith('assets/')) {
                const blob = await fileObj.async('blob');
                const id = path.split('/').pop()?.replace('.png', '');
                if (id) {
                    if (path.includes('assets/cards/')) await saveCardImage(id, blob);
                    else if (path.includes('assets/boards/')) await saveBoardImage(id, blob);
                }
            }
        }

        setReport({ status: 'imported', errors: [], warnings: [], success: true, counts: {} });
        alert("Restore complete! Refreshing app...");
        window.location.reload();
    } catch (e) {
        setReport({ status: 'incomplete', errors: [`Import failed: ${e}`], warnings: [], success: false, counts: {} });
    } finally {
        setIsImporting(false);
    }
  };
// ...

  const runIntegrityCheck = async () => {
    setReport({ status: 'checking', errors: [], warnings: [], success: false, counts: {} });
    const errors: string[] = [];
    const warnings: string[] = [];
    
    try {
        const assets = await getAllAssetRecords();
        const monsters = await getAllMonsters();
        const worldDb = loadWorldDb();
        const cardDataList = await getAllCardData();
        
        // Validation logic
        // 1. Assets
        for (const asset of assets) {
            if (!asset.id) errors.push(`Asset missing ID`);
        }

        // 2. Cross references
        // Card Data <-> Asset Registry
        for (const card of cardDataList) {
            if (!assets.find(a => a.id === card.assetId)) {
                errors.push(`Card ${card.assetId} references non-existent asset.`);
            }
        }
        
    } catch (e) {
        errors.push(`Error running check: ${e}`);
    }

    setReport({
        status: errors.length > 0 ? 'incomplete' : 'ready',
        errors,
        warnings,
        success: errors.length === 0,
        counts: {
            assets: 0 // Will fill during export
        }
    });
  };

  const exportBackup = async () => {
    setIsExporting(true);
    const zip = new JSZip();
    
    const assets = await getAllAssetRecords();
    const monsters = await getAllMonsters();
    const worldDb = loadWorldDb();
    const cardDataList = await getAllCardData();
    
    // Create folders
    zip.folder('assets/cards');
    zip.folder('assets/monster_portraits');
    zip.folder('assets/boards');
    zip.folder('data');

    // Add JSONs
    const projectManifest = { 
        backupType: 'full_project', 
        createdAt: Date.now(),
        isComplete: report.success,
        counts: {
            assets: assets.length,
            cardData: cardDataList.length,
            monsters: monsters.length
        }
    };
    zip.file('project.json', JSON.stringify(projectManifest, null, 2));
    zip.file('data/asset_registry.json', JSON.stringify(assets, null, 2));
    zip.file('data/monster_db.json', JSON.stringify(monsters, null, 2));
    zip.file('data/world_db.json', JSON.stringify(worldDb, null, 2));
    zip.file('data/card_data.json', JSON.stringify(cardDataList, null, 2));

    // Add Blobs
    for (const asset of assets) {
        const blob = await getCardImage(asset.id) || await getBoardImage(asset.id);
        if (blob) {
            const folder = asset.type === 'monster_portrait' ? 'assets/monster_portraits' : 
                         asset.type === 'board' ? 'assets/boards' : 'assets/cards';
            zip.file(`${folder}/${asset.id}.png`, blob);
        }
    }

    const content = await zip.generateAsync({type:"blob"});
    saveAs(content, "wow_board_project_backup.zip");
    setIsExporting(false);
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <div className="bg-neutral-900 border border-neutral-800 rounded-lg w-full max-w-2xl p-6 space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Database className="w-5 h-5 text-yellow-500" />
            Project Backup System
          </h2>
          <button onClick={onClose}><X className="w-5 h-5 text-neutral-500 hover:text-white" /></button>
        </div>
        
        <div className="space-y-2">
            <button 
                onClick={runIntegrityCheck}
                className="w-full bg-neutral-800 hover:bg-neutral-700 text-white p-3 rounded text-sm font-semibold border border-neutral-700"
            >
                Run Integrity Validator
            </button>
            
            {report.status !== 'idle' && (
                <div className="bg-neutral-950 p-4 rounded border border-neutral-800 space-y-2">
                    {report.errors.length > 0 ? (
                        <div className="text-red-400 text-xs font-mono space-y-1">
                            <p className="font-bold flex items-center gap-2"><AlertOctagon className="w-4 h-4"/> Errors found:</p>
                            {report.errors.map((e, i) => <p key={i}>- {e}</p>)}
                        </div>
                    ) : report.status === 'ready' || report.status === 'inspected' ? (
                        <div className="space-y-1">
                            <p className="text-green-500 text-xs font-bold flex items-center gap-2">
                                <CheckCircle className="w-4 h-4" /> Integrity check passed!
                            </p>
                            {report.metadata && (
                                <p className="text-neutral-400 text-xs">
                                    {report.metadata.counts.assets} assets, {report.metadata.counts.cardData} cards. Health: {report.healthScore}%
                                </p>
                            )}
                        </div>
                    ) : (
                        <p className="text-neutral-400 text-xs">Checking...</p>
                    )}
                </div>
            )}
        </div>

        <button 
            disabled={!report.success || isExporting}
            onClick={exportBackup}
            className={`w-full p-3 rounded text-sm font-bold flex items-center justify-center gap-2 ${
                report.success ? 'bg-yellow-600 hover:bg-yellow-500 text-white' : 'bg-neutral-800 text-neutral-600 cursor-not-allowed'
            }`}
        >
            <Download className="w-4 h-4" />
            {isExporting ? 'Exporting...' : 'Export Full Project Backup'}
        </button>

        <div className="border-t border-neutral-700 pt-4 mt-4 space-y-2">
            <input 
                type="file" 
                ref={fileInputRef} 
                onChange={(e) => e.target.files?.[0] && inspectBackup(e.target.files[0])}
                className="hidden" 
                accept=".zip"
            />
            <button 
                onClick={() => fileInputRef.current?.click()}
                disabled={isInspecting || isImporting}
                className="w-full p-3 rounded text-sm font-bold flex items-center justify-center gap-2 bg-neutral-700 hover:bg-neutral-600 text-white"
            >
                <Upload className="w-4 h-4" />
                {isInspecting ? 'Inspecting...' : 'Inspect & Import Project Backup'}
            </button>
            {report.status === 'inspected' && (
                <button 
                    disabled={!report.success || isImporting}
                    onClick={() => importBackup(fileInputRef.current!.files![0])}
                    className={`w-full p-3 rounded text-sm font-bold flex items-center justify-center gap-2 ${
                        report.success ? 'bg-green-700 hover:bg-green-600 text-white' : 'bg-neutral-800 text-neutral-600 cursor-not-allowed'
                    }`}
                >
                    {report.success ? 'Confirm & Restore' : 'Unsafe Backup'}
                </button>
            )}
        </div>
      </div>
    </div>
  );
}
