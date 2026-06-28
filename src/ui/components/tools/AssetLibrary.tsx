import React, { useState, useEffect, useMemo } from "react";
import {
  AssetRecord,
  getAllAssetRecords,
  deleteAssetRecord,
  deleteBatch,
  saveAssetRecord,
  getCardImage,
} from "../../../core/utils/db";
import { BlobImage } from "./BlobImage";
import {
  X,
  Search,
  Trash2,
  Download,
  Edit2,
  Check,
  Maximize2,
  Archive,
  Database
} from "lucide-react";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import { CardDataEditor } from "./CardDataEditor";
import { CardAssetBinder } from "./CardAssetBinder";

export function AssetLibrary({ onClose }: { onClose: () => void }) {
  const [records, setRecords] = useState<AssetRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  // Filters
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [factionFilter, setFactionFilter] = useState("");
  const [deckFilter, setDeckFilter] = useState("");
  const [expansionFilter, setExpansionFilter] = useState("");
  const [batchFilter, setBatchFilter] = useState("");
  const [reviewFilter, setReviewFilter] = useState("");

  // States for actions
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [viewingRecord, setViewingRecord] = useState<AssetRecord | null>(null);
  const [editingDataRecord, setEditingDataRecord] = useState<AssetRecord | null>(null);

  const loadRecords = async () => {
    setLoading(true);
    try {
      const data = await getAllAssetRecords();
      // Sort by timestamp descending
      data.sort((a, b) => b.timestamp - a.timestamp);
      setRecords(data);
    } catch (err) {
      console.error("Failed to load records", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRecords();
  }, []);

  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      if (
        search &&
        !r.id.includes(search) &&
        !r.displayName.includes(search) &&
        !r.batchId.includes(search)
      )
        return false;
      if (typeFilter && r.type !== typeFilter) return false;
      if (factionFilter && r.faction !== factionFilter) return false;
      if (deckFilter && r.deckOrColor !== deckFilter) return false;
      if (expansionFilter && r.expansion !== expansionFilter) return false;
      if (batchFilter && r.batchId !== batchFilter) return false;
      if (reviewFilter && (r.reviewState || 'visual_only') !== reviewFilter) return false;
      return true;
    });
  }, [
    records,
    search,
    typeFilter,
    factionFilter,
    deckFilter,
    expansionFilter,
    batchFilter,
    reviewFilter
  ]);

  // Extract unique values for filters
  const types = Array.from(new Set(records.map((r) => r.type)));
  const factions = Array.from(new Set(records.map((r) => r.faction)));
  const decks = Array.from(new Set(records.map((r) => r.deckOrColor)));
  const expansions = Array.from(new Set(records.map((r) => r.expansion)));
  const batches = Array.from(new Set(records.map((r) => r.batchId)));

  const handleDelete = async (id: string) => {
    const record = records.find(r => r.id === id);
    const displayName = record ? record.displayName : id;
    if (!confirm(`¿Estás seguro de que deseas eliminar el asset "${displayName}" permanentemente?\n\nSe eliminará la imagen de IndexedDB, el registro de asset y todos los datos asociados de la carta sin dejar registros huérfanos.`)) return;
    await deleteAssetRecord(id);
    loadRecords();
  };

  const handleDeleteBatch = async (batchId: string) => {
    if (!confirm(`⚠️ ¡ATENCIÓN! ¿Estás seguro de que deseas eliminar TODO el lote "${batchId}" permanentemente?\n\nEsto borrará todos los assets de este lote, sus imágenes y sus datos asociados de forma irrevocable.`)) return;
    await deleteBatch(batchId);
    loadRecords();
  };

  const startRename = (record: AssetRecord) => {
    setEditingId(record.id);
    setEditName(record.displayName);
  };

  const saveRename = async (record: AssetRecord) => {
    if (!editName.trim()) return;
    await saveAssetRecord({ ...record, displayName: editName });
    setEditingId(null);
    loadRecords();
  };

  const exportJSON = () => {
    const dataStr =
      "data:text/json;charset=utf-8," +
      encodeURIComponent(JSON.stringify(records, null, 2));
    const a = document.createElement("a");
    a.href = dataStr;
    a.download = `asset_registry_${Date.now()}.json`;
    a.click();
  };

  const exportZip = async () => {
    if (records.length === 0) return;
    setExporting(true);
    try {
      const zip = new JSZip();
      const assetsFolder = zip.folder("assets");
      const cardsFolder = assetsFolder?.folder("cards");
      const monstersFolder = assetsFolder?.folder("monsters");
      const registryFolder = assetsFolder?.folder("registry");

      const registryData = records.map((r) => {
        let imagePath = `/assets/cards/${r.id}.png`;
        if (r.type === "monster_portrait") {
          const monsterId = r.id.replace("monster_portrait_", "");
          imagePath = `/assets/monsters/${monsterId}.png`;
        }
        return {
          ...r,
          imagePath,
        };
      });

      registryFolder?.file(
        "asset-registry.json",
        JSON.stringify(registryData, null, 2),
      );

      for (const record of records) {
        const blob = await getCardImage(record.id);
        if (blob) {
          if (record.type === "monster_portrait") {
            const monsterId = record.id.replace("monster_portrait_", "");
            monstersFolder?.file(`${monsterId}.png`, blob);
          } else {
            cardsFolder?.file(`${record.id}.png`, blob);
          }
        }
      }

      const content = await zip.generateAsync({ type: "blob" });
      saveAs(content, `wow_board_game_assets_${Date.now()}.zip`);
    } catch (err) {
      console.error("Failed to export ZIP", err);
      alert("Failed to export ZIP");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] bg-black/90 flex flex-col p-4 md:p-8 overflow-hidden font-sans text-neutral-200">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white">
            Biblioteca de Assets
          </h2>
          <p className="text-neutral-400">Total assets: {records.length}</p>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={exportJSON}
            className="flex items-center gap-2 bg-neutral-800 hover:bg-neutral-700 px-4 py-2 rounded font-medium transition-colors border border-neutral-700"
          >
            <Download className="w-4 h-4" />
            Exportar Registry JSON
          </button>
          <button
            onClick={exportZip}
            disabled={exporting || records.length === 0}
            className="flex items-center gap-2 bg-yellow-600 hover:bg-yellow-500 disabled:opacity-50 text-white px-4 py-2 rounded font-medium transition-colors shadow-lg"
          >
            <Archive className="w-4 h-4" />
            {exporting ? "Exportando..." : "Exportar Batch ZIP"}
          </button>
          <button
            onClick={onClose}
            className="p-2 hover:bg-neutral-800 rounded-full transition-colors ml-4"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4 mb-6 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-neutral-500" />
          <input
            type="text"
            placeholder="Buscar por ID, nombre o batch..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-neutral-900 border border-neutral-800 rounded pl-10 pr-4 py-2 text-white focus:outline-none focus:border-neutral-600"
          />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="bg-neutral-900 border border-neutral-800 rounded px-4 py-2 text-white text-sm max-w-[150px]"
        >
          <option value="">Todos los tipos</option>
          {types.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <select
          value={expansionFilter}
          onChange={(e) => setExpansionFilter(e.target.value)}
          className="bg-neutral-900 border border-neutral-800 rounded px-4 py-2 text-white text-sm max-w-[150px]"
        >
          <option value="">Todas las exp</option>
          {expansions.map((e) => (
            <option key={e} value={e}>
              {e}
            </option>
          ))}
        </select>
        <select
          value={factionFilter}
          onChange={(e) => setFactionFilter(e.target.value)}
          className="bg-neutral-900 border border-neutral-800 rounded px-4 py-2 text-white text-sm max-w-[150px]"
        >
          <option value="">Todas facciones</option>
          {factions.map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </select>
        <select
          value={deckFilter}
          onChange={(e) => setDeckFilter(e.target.value)}
          className="bg-neutral-900 border border-neutral-800 rounded px-4 py-2 text-white text-sm max-w-[150px]"
        >
          <option value="">Todos mazos</option>
          {decks.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
        <select
          value={batchFilter}
          onChange={(e) => setBatchFilter(e.target.value)}
          className="bg-neutral-900 border border-neutral-800 rounded px-4 py-2 text-white text-sm max-w-[150px] truncate"
        >
          <option value="">Todos los lotes</option>
          {batches.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </select>
        <select
          value={reviewFilter}
          onChange={(e) => setReviewFilter(e.target.value)}
          className="bg-neutral-900 border border-neutral-800 rounded px-4 py-2 text-white text-sm max-w-[150px]"
        >
          <option value="">Cualquier estado</option>
          <option value="visual_only">Visual Only</option>
          <option value="data_pending">Data Pending</option>
          <option value="data_complete">Data Complete</option>
          <option value="verified">Verified</option>
        </select>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto min-h-0 bg-neutral-900 border border-neutral-800 rounded-xl p-4">
        {loading ? (
          <div className="text-center py-20 text-neutral-500">Cargando...</div>
        ) : filteredRecords.length === 0 ? (
          <div className="text-center py-20 text-neutral-500">
            No hay assets encontrados.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredRecords.map((record) => (
              <div
                key={record.id}
                className="bg-neutral-950 border border-neutral-800 rounded-lg p-3 flex gap-4 group hover:border-neutral-700 transition-colors"
              >
                {/* Thumbnail */}
                <div
                  className={`${record.type === "monster_portrait" ? "w-20 h-20 rounded-full" : "w-20 h-28 rounded"} shrink-0 relative overflow-hidden bg-black border border-neutral-800 cursor-pointer`}
                  onClick={() => setViewingRecord(record)}
                >
                  <BlobImage
                    cardId={record.id}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Maximize2 className="w-6 h-6 text-white" />
                  </div>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0 flex flex-col">
                  <div className="flex justify-between items-start">
                    {editingId === record.id ? (
                      <div className="flex items-center gap-1 w-full">
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="flex-1 bg-neutral-800 border border-neutral-600 rounded px-2 py-1 text-xs text-white"
                          autoFocus
                        />
                        <button
                          onClick={() => saveRename(record)}
                          className="text-green-500 hover:text-green-400 p-1"
                        >
                          <Check className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <div className="group/name flex items-start justify-between w-full">
                        <h3
                          className="font-bold text-white truncate text-sm mr-2"
                          title={record.displayName}
                        >
                          {record.displayName}
                        </h3>
                        <button
                          onClick={() => startRename(record)}
                          className="opacity-0 group-hover/name:opacity-100 text-neutral-500 hover:text-white p-1 transition-opacity"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>

                  <div
                    className="text-[10px] text-neutral-500 truncate mb-1"
                    title={record.id}
                  >
                    {record.id}
                  </div>

                  <div className="grid grid-cols-2 gap-x-2 gap-y-1 mt-auto text-xs">
                    <div className="text-neutral-400">
                      <span className="text-neutral-600">Type:</span>{" "}
                      {record.type}
                    </div>
                    <div className="text-neutral-400">
                      <span className="text-neutral-600">Fac:</span>{" "}
                      {record.faction}
                    </div>
                    <div className="text-neutral-400">
                      <span className="text-neutral-600">Deck:</span>{" "}
                      {record.deckOrColor}
                    </div>
                    <div className="text-neutral-400">
                      <span className="text-neutral-600">Exp:</span>{" "}
                      {record.expansion}
                    </div>
                  </div>

                  <div className="mt-2 flex items-center justify-between">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded border ${
                      record.reviewState === 'verified' ? 'bg-green-900/50 text-green-400 border-green-800' :
                      record.reviewState === 'data_complete' ? 'bg-blue-900/50 text-blue-400 border-blue-800' :
                      record.reviewState === 'data_pending' ? 'bg-yellow-900/50 text-yellow-400 border-yellow-800' :
                      'bg-neutral-800 text-neutral-400 border-neutral-700'
                    }`}>
                      {record.reviewState || 'visual_only'}
                    </span>
                    <button
                      onClick={() => setEditingDataRecord(record)}
                      className="text-neutral-500 hover:text-white transition-colors"
                      title="Editar Datos de Carta"
                    >
                      <Database className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="mt-2 flex items-center justify-between border-t border-neutral-800/50 pt-2 gap-2">
                    <button
                      type="button"
                      onClick={async (e) => {
                        e.preventDefault();
                        e.stopPropagation();

                        console.log("DELETE BATCH CLICK", record.batchId);
                        alert("DELETE BATCH CLICK " + record.batchId);

                        console.log("Before Delete Batch");
                        await deleteBatch(record.batchId);
                        console.log("After Delete Batch");

                        await loadRecords();
                      }}
                      className="text-[10px] text-neutral-500 hover:text-red-400 flex items-center gap-1 transition-colors truncate max-w-[110px]"
                      title={`Eliminar lote completo: ${record.batchId}`}
                    >
                      <Trash2 className="w-3 h-3 shrink-0" />
                      <span className="truncate">TEST DELETE BATCH</span>
                    </button>
                    <button
                      type="button"
                      onClick={async (e) => {
                        e.preventDefault();
                        e.stopPropagation();

                        console.log("DELETE ASSET CLICK", record.id);
                        alert("DELETE ASSET CLICK " + record.id);

                        console.log("Before Delete Asset");
                        await deleteAssetRecord(record.id);
                        console.log("After Delete Asset");

                        await loadRecords();
                      }}
                      className="text-[10px] bg-red-950/40 hover:bg-red-900/50 text-red-400 border border-red-900/50 px-2 py-0.5 rounded flex items-center gap-1 transition-colors shrink-0"
                      title="Eliminar este asset"
                    >
                      <Trash2 className="w-3 h-3 shrink-0" />
                      <span>TEST DELETE ASSET</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Fullscreen View */}
      {viewingRecord && (
        <div
          className="fixed inset-0 z-[300] bg-black/95 flex items-center justify-center p-8"
          onClick={() => setViewingRecord(null)}
        >
          <button
            className="absolute top-4 right-4 p-2 text-neutral-400 hover:text-white"
            onClick={() => setViewingRecord(null)}
          >
            <X className="w-8 h-8" />
          </button>
          <div
            className="max-h-full max-w-full relative"
            onClick={(e) => e.stopPropagation()}
          >
            <BlobImage
              cardId={viewingRecord.id}
              className={`${viewingRecord.type === "monster_portrait" ? "w-[60vh] h-[60vh] rounded-full object-cover" : "max-h-[85vh] max-w-full object-contain rounded-lg"} mx-auto shadow-2xl border border-neutral-800`}
            />
            <div className="absolute -bottom-16 left-0 right-0 text-center">
              <h3 className="text-xl font-bold text-white">
                {viewingRecord.displayName}
              </h3>
              <p className="text-neutral-400 text-sm">
                {viewingRecord.cardWidth}x{viewingRecord.cardHeight} •{" "}
                {new Date(viewingRecord.timestamp).toLocaleString()}
              </p>
              <button onClick={() => { setEditingDataRecord(viewingRecord); setViewingRecord(null); }} className="mt-4 bg-neutral-800 hover:bg-neutral-700 text-white px-4 py-2 rounded font-bold flex items-center gap-2 mx-auto transition-colors border border-neutral-700">
                <Database className="w-4 h-4" />
                Editar Card Data
              </button>
            </div>
          </div>
        </div>
      )}

      {editingDataRecord && editingDataRecord.type === "item" && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-neutral-900 rounded-xl shadow-2xl overflow-hidden w-[95vw] h-[95vh] border border-neutral-800">
            <CardAssetBinder 
              currentRecord={editingDataRecord}
              onClose={() => {
                setEditingDataRecord(null);
                loadRecords();
              }}
              onNext={() => {
                const idx = filteredRecords.findIndex(r => r.id === editingDataRecord.id);
                if (idx < filteredRecords.length - 1) setEditingDataRecord(filteredRecords[idx + 1]);
              }}
              onPrev={() => {
                const idx = filteredRecords.findIndex(r => r.id === editingDataRecord.id);
                if (idx > 0) setEditingDataRecord(filteredRecords[idx - 1]);
              }}
              hasPrev={filteredRecords.findIndex(r => r.id === editingDataRecord.id) > 0}
              hasNext={filteredRecords.findIndex(r => r.id === editingDataRecord.id) < filteredRecords.length - 1}
            />
          </div>
        </div>
      )}

      {editingDataRecord && editingDataRecord.type !== "item" && (
        <CardDataEditor 
          initialRecord={editingDataRecord} 
          records={filteredRecords} 
          onClose={() => {
            setEditingDataRecord(null);
            loadRecords(); // Refresh to show new states
          }} 
        />
      )}
    </div>
  );
}
