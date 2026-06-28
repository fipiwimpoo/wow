import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  X,
  Search,
  Trash2,
  Download,
  Edit2,
  Check,
  Plus,
  Upload,
  Database,
  AlertTriangle,
  Layers,
  Image as ImageIcon
} from "lucide-react";
import {
  MonsterData,
  MonsterVariant
} from "../../../core/models/monsterData";
import {
  saveMonster,
  getAllMonsters,
  deleteMonster,
  getAllAssetRecords,
  AssetRecord
} from "../../../core/utils/db";
import { BlobImage, clearBlobImageCache } from "./BlobImage";
import { MonsterPortraitEditor } from "./MonsterPortraitEditor";

interface MonsterDatabaseEditorProps {
  onClose: () => void;
}

export function MonsterDatabaseEditor({ onClose }: MonsterDatabaseEditorProps) {
  const [monsters, setMonsters] = useState<MonsterData[]>([]);
  const [assetRecords, setAssetRecords] = useState<AssetRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter/Search states
  const [search, setSearch] = useState("");
  const [expansionFilter, setExpansionFilter] = useState("");

  // Editing state
  const [selectedMonster, setSelectedMonster] = useState<MonsterData | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isNew, setIsNew] = useState(false);

  // Form Fields
  const [formId, setFormId] = useState("");
  const [formName, setFormName] = useState("");
  const [formExpansion, setFormExpansion] = useState("base_game");
  const [formRulesText, setFormRulesText] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [formImageAssetId, setFormImageAssetId] = useState("");
  const [formAliasesString, setFormAliasesString] = useState("");

  // Variant fields
  const [greenThreat, setGreenThreat] = useState("0");
  const [greenAttack, setGreenAttack] = useState("0");
  const [greenHealth, setGreenHealth] = useState("0");

  const [redThreat, setRedThreat] = useState("0");
  const [redAttack, setRedAttack] = useState("0");
  const [redHealth, setRedHealth] = useState("0");

  const [purpleThreat, setPurpleThreat] = useState("0");
  const [purpleAttack, setPurpleAttack] = useState("0");
  const [purpleHealth, setPurpleHealth] = useState("0");

  const [blueThreat, setBlueThreat] = useState("0");
  const [blueAttack, setBlueAttack] = useState("0");
  const [blueHealth, setBlueHealth] = useState("0");

  // Portal to choose image
  const [showImagePicker, setShowImagePicker] = useState(false);
  const [imageSearch, setImageSearch] = useState("");

  // Portrait Cropper States & Refs
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
  const [imageUrlInput, setImageUrlInput] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Load database on mount
  const loadData = async () => {
    setLoading(true);
    try {
      const allMonsters = await getAllMonsters();
      setMonsters(allMonsters);

      const allAssets = await getAllAssetRecords();
      setAssetRecords(allAssets);
    } catch (err) {
      console.error("Failed to load database", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filtered list
  const filteredMonsters = useMemo(() => {
    return monsters.filter((m) => {
      const matchesSearch =
        search === "" ||
        m.name.toLowerCase().includes(search.toLowerCase()) ||
        m.id.toLowerCase().includes(search.toLowerCase()) ||
        (m.aliases && m.aliases.some(a => a.toLowerCase().includes(search.toLowerCase())));

      const matchesExpansion =
        expansionFilter === "" || m.expansion === expansionFilter;

      return matchesSearch && matchesExpansion;
    });
  }, [monsters, search, expansionFilter]);

  const uniqueExpansions = useMemo(() => {
    const exps = new Set<string>();
    monsters.forEach((m) => {
      if (m.expansion) exps.add(m.expansion);
    });
    return Array.from(exps);
  }, [monsters]);

  const openEdit = (m: MonsterData) => {
    setSelectedMonster(m);
    setIsEditing(true);
    setIsNew(false);

    setFormId(m.id);
    setFormName(m.name);
    setFormExpansion(m.expansion || "base_game");
    setFormRulesText(m.rulesText || "");
    setFormNotes(m.notes || "");
    setFormImageAssetId(m.imageAssetId || "");
    setFormAliasesString(m.aliases ? m.aliases.join(", ") : "");

    // Load variant values
    setGreenThreat(String(m.variants?.green?.threat ?? 0));
    setGreenAttack(String(m.variants?.green?.attack ?? 0));
    setGreenHealth(String(m.variants?.green?.health ?? 0));

    setRedThreat(String(m.variants?.red?.threat ?? 0));
    setRedAttack(String(m.variants?.red?.attack ?? 0));
    setRedHealth(String(m.variants?.red?.health ?? 0));

    setPurpleThreat(String(m.variants?.purple?.threat ?? 0));
    setPurpleAttack(String(m.variants?.purple?.attack ?? 0));
    setPurpleHealth(String(m.variants?.purple?.health ?? 0));

    setBlueThreat(String(m.variants?.blue?.threat ?? 0));
    setBlueAttack(String(m.variants?.blue?.attack ?? 0));
    setBlueHealth(String(m.variants?.blue?.health ?? 0));
  };

  const openNew = () => {
    setSelectedMonster(null);
    setIsEditing(true);
    setIsNew(true);

    setFormId("");
    setFormName("");
    setFormExpansion("base_game");
    setFormRulesText("");
    setFormNotes("");
    setFormImageAssetId("");
    setFormAliasesString("");

    // Reset variants
    setGreenThreat("0");
    setGreenAttack("0");
    setGreenHealth("0");

    setRedThreat("0");
    setRedAttack("0");
    setRedHealth("0");

    setPurpleThreat("0");
    setPurpleAttack("0");
    setPurpleHealth("0");

    setBlueThreat("0");
    setBlueAttack("0");
    setBlueHealth("0");
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`¿Estás seguro de que deseas eliminar el monstruo "${name}" permanentemente de la base de datos?`)) {
      return;
    }
    await deleteMonster(id);
    await loadData();
    if (selectedMonster?.id === id) {
      setIsEditing(false);
      setSelectedMonster(null);
    }
  };

  // Real-time validations
  const validationErrors = useMemo(() => {
    if (!isEditing) return [];
    const errors: string[] = [];

    const idClean = formId.trim();
    if (!idClean) {
      errors.push("ID de monstruo requerido (ej: 'ghoul').");
    } else {
      const isDuplicated = monsters.some((m) => m.id === idClean && (!selectedMonster || selectedMonster.id !== idClean));
      if (isDuplicated) {
        errors.push(`El ID '${idClean}' ya está en uso por otro monstruo.`);
      }
    }

    if (!formName.trim()) {
      errors.push("Nombre de monstruo requerido.");
    }

    // Check values are valid non-negative numbers
    const checkVariant = (name: string, threatStr: string, attackStr: string, healthStr: string) => {
      const t = Number(threatStr);
      const a = Number(attackStr);
      const h = Number(healthStr);
      if (isNaN(t) || t < 0) errors.push(`Amenaza (Threat) para variante ${name} inválida.`);
      if (isNaN(a) || a < 0) errors.push(`Ataque (Attack) para variante ${name} inválido.`);
      if (isNaN(h) || h < 0) errors.push(`Salud (Health) para variante ${name} inválida.`);
    };

    checkVariant("Verde", greenThreat, greenAttack, greenHealth);
    checkVariant("Rojo", redThreat, redAttack, redHealth);
    checkVariant("Violeta", purpleThreat, purpleAttack, purpleHealth);
    checkVariant("Azul", blueThreat, blueAttack, blueHealth);

    return errors;
  }, [
    isEditing,
    formId,
    formName,
    monsters,
    selectedMonster,
    greenThreat,
    greenAttack,
    greenHealth,
    redThreat,
    redAttack,
    redHealth,
    purpleThreat,
    purpleAttack,
    purpleHealth,
    blueThreat,
    blueAttack,
    blueHealth
  ]);

  const handleSave = async () => {
    if (validationErrors.length > 0) {
      alert("Corrige los errores de validación antes de guardar:\n\n" + validationErrors.join("\n"));
      return;
    }

    const aliases = formAliasesString
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s !== "");

    const newMonster: MonsterData = {
      id: formId.trim().toLowerCase(),
      name: formName.trim(),
      expansion: formExpansion,
      imageAssetId: formImageAssetId,
      rulesText: formRulesText.trim(),
      notes: formNotes.trim() || undefined,
      aliases: aliases.length > 0 ? aliases : undefined,
      variants: {
        green: {
          threat: Number(greenThreat),
          attack: Number(greenAttack),
          health: Number(greenHealth)
        },
        red: {
          threat: Number(redThreat),
          attack: Number(redAttack),
          health: Number(redHealth)
        },
        purple: {
          threat: Number(purpleThreat),
          attack: Number(purpleAttack),
          health: Number(purpleHealth)
        },
        blue: {
          threat: Number(blueThreat),
          attack: Number(blueAttack),
          health: Number(blueHealth)
        }
      }
    };

    try {
      await saveMonster(newMonster);
      setIsEditing(false);
      setSelectedMonster(null);
      await loadData();
      alert(`¡Monstruo "${newMonster.name}" guardado con éxito!`);
    } catch (err) {
      console.error(err);
      alert("Error al guardar en la base de datos.");
    }
  };

  const handleExportJSON = () => {
    if (monsters.length === 0) {
      alert("No hay monstruos para exportar.");
      return;
    }
    const dataStr =
      "data:text/json;charset=utf-8," +
      encodeURIComponent(JSON.stringify(monsters, null, 2));
    const a = document.createElement("a");
    a.href = dataStr;
    a.download = `monster_db_${Date.now()}.json`;
    a.click();
  };

  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const content = evt.target?.result as string;
        const list = JSON.parse(content);
        if (!Array.isArray(list)) {
          alert("El archivo JSON debe contener un arreglo de monstruos.");
          return;
        }

        let importedCount = 0;
        for (const m of list) {
          // Check structure loosely
          if (m.id && m.name && m.variants) {
            await saveMonster(m);
            importedCount++;
          }
        }

        alert(`¡Importación exitosa! Se cargaron/actualizaron ${importedCount} monstruos en IndexedDB.`);
        await loadData();
      } catch (err) {
        console.error(err);
        alert("Error al parsear el archivo JSON.");
      }
    };
    reader.readAsText(file);
  };

  // Image Selector filter
  const filteredAssetImages = useMemo(() => {
    return assetRecords.filter((r) => {
      const cleanSearch = imageSearch.toLowerCase();
      return (
        r.displayName.toLowerCase().includes(cleanSearch) ||
        r.id.toLowerCase().includes(cleanSearch) ||
        r.type.toLowerCase().includes(cleanSearch)
      );
    });
  }, [assetRecords, imageSearch]);

  return (
    <div className="fixed inset-0 z-[200] bg-black/90 flex flex-col p-4 md:p-8 overflow-hidden font-sans text-neutral-200">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <div className="flex items-center gap-2">
            <Database className="w-6 h-6 text-yellow-500 animate-pulse" />
            <h2 className="text-2xl font-bold text-white">Monster Database System</h2>
          </div>
          <p className="text-neutral-400">Administra el bestiario canónico y stats de monstruos.</p>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={handleExportJSON}
            className="flex items-center gap-2 bg-neutral-800 hover:bg-neutral-700 px-4 py-2 rounded font-medium transition-colors border border-neutral-700 text-sm"
          >
            <Download className="w-4 h-4 text-green-400" />
            Exportar monster_db.json
          </button>
          <label className="flex items-center gap-2 bg-neutral-800 hover:bg-neutral-700 px-4 py-2 rounded font-medium transition-colors border border-neutral-700 text-sm cursor-pointer">
            <Upload className="w-4 h-4 text-blue-400" />
            Importar JSON
            <input
              type="file"
              accept=".json"
              onChange={handleImportJSON}
              className="hidden"
            />
          </label>
          <button
            onClick={onClose}
            className="p-2 hover:bg-neutral-800 rounded-full transition-colors ml-4"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
      </div>

      <div className="flex-1 flex gap-6 overflow-hidden">
        {/* Left Side: Monster List */}
        <div className="w-1/2 flex flex-col gap-4 bg-neutral-900 border border-neutral-800 rounded-xl p-4 overflow-hidden">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-neutral-500" />
              <input
                type="text"
                placeholder="Buscar por ID, nombre, alias..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:border-neutral-700"
              />
            </div>
            <select
              value={expansionFilter}
              onChange={(e) => setExpansionFilter(e.target.value)}
              className="bg-neutral-950 border border-neutral-800 rounded px-3 py-2 text-neutral-300 text-sm"
            >
              <option value="">Todas las Expansiones</option>
              {uniqueExpansions.map((exp) => (
                <option key={exp} value={exp}>
                  {exp}
                </option>
              ))}
            </select>
            <button
              onClick={openNew}
              className="bg-yellow-600 hover:bg-yellow-500 text-white font-bold px-4 py-2 rounded text-sm flex items-center gap-1.5 transition-colors shrink-0"
            >
              <Plus className="w-4 h-4" />
              Nuevo Monstruo
            </button>
          </div>

          {/* List scroll area */}
          <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-2">
            {loading ? (
              <div className="text-center py-20 text-neutral-500">Cargando base de datos...</div>
            ) : filteredMonsters.length === 0 ? (
              <div className="text-center py-20 text-neutral-500">
                No hay monstruos en la base de datos que coincidan.
              </div>
            ) : (
              filteredMonsters.map((m) => (
                <div
                  key={m.id}
                  onClick={() => openEdit(m)}
                  className={`p-3 rounded border transition-all cursor-pointer flex gap-4 items-center ${selectedMonster?.id === m.id ? "bg-yellow-950/20 border-yellow-600/80" : "bg-neutral-950 border-neutral-800 hover:border-neutral-700"}`}
                >
                  <div className="w-12 h-12 rounded-full overflow-hidden bg-neutral-800 flex-shrink-0 border border-neutral-700">
                    {m.imageAssetId ? (
                      <BlobImage cardId={m.imageAssetId} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-neutral-600 text-xs font-bold uppercase">
                        No img
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white truncate text-sm">{m.name}</span>
                      <span className="text-[10px] bg-neutral-800 text-neutral-400 px-1.5 py-0.5 rounded font-mono uppercase tracking-wide">
                        {m.id}
                      </span>
                    </div>
                    
                    {/* Portrait status badge */}
                    <div className="mt-1 flex items-center gap-1.5">
                      {!m.imageAssetId ? (
                        <span className="text-[9px] bg-amber-500/15 text-amber-500 px-1.5 py-0.5 rounded border border-amber-500/20 font-semibold uppercase tracking-wider">
                          ⚠️ Sin Retrato
                        </span>
                      ) : !assetRecords.some(a => a.id === m.imageAssetId) ? (
                        <span className="text-[9px] bg-red-500/15 text-red-500 px-1.5 py-0.5 rounded border border-red-500/20 font-semibold uppercase tracking-wider">
                          ⚠️ Retrato Desconectado
                        </span>
                      ) : (
                        <span className="text-[9px] bg-emerald-500/15 text-emerald-500 px-1.5 py-0.5 rounded border border-emerald-500/20 font-semibold uppercase tracking-wider flex items-center gap-1">
                          ✓ Retrato Verificado
                        </span>
                      )}
                      
                      <span className="text-[10px] text-neutral-500">•</span>
                      
                      <div className="text-xs text-neutral-500 truncate">
                        Expansión: <span className="text-neutral-300 capitalize">{m.expansion?.replace(/_/g, " ")}</span>
                      </div>
                    </div>

                    {m.rulesText && (
                      <p className="text-[11px] text-neutral-400 truncate mt-1 leading-normal italic">
                        {m.rulesText}
                      </p>
                    )}
                  </div>

                  {/* Tiny color dots or preview of variant stats */}
                  <div className="flex flex-col gap-1 items-end shrink-0">
                    <div className="flex gap-1">
                      {m.variants?.green && <span className="w-2.5 h-2.5 rounded-full bg-green-500" title="Green variant defined" />}
                      {m.variants?.red && <span className="w-2.5 h-2.5 rounded-full bg-red-500" title="Red variant defined" />}
                      {m.variants?.purple && <span className="w-2.5 h-2.5 rounded-full bg-purple-500" title="Purple variant defined" />}
                      {m.variants?.blue && <span className="w-2.5 h-2.5 rounded-full bg-blue-500" title="Blue variant defined" />}
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(m.id, m.name);
                      }}
                      className="text-neutral-500 hover:text-red-400 p-1 rounded hover:bg-neutral-800 transition-colors"
                      title="Eliminar de base de datos"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="text-xs text-neutral-500 border-t border-neutral-800/60 pt-2 flex justify-between">
            <span>Total en base de datos: {monsters.length}</span>
            <span>Filtrados: {filteredMonsters.length}</span>
          </div>
        </div>

        {/* Right Side: Editor Panel */}
        <div className="w-1/2 bg-neutral-900 border border-neutral-800 rounded-xl p-5 flex flex-col overflow-hidden">
          {!isEditing ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center text-neutral-500 p-8">
              <Database className="w-12 h-12 text-neutral-700 mb-3" />
              <p className="text-sm font-semibold text-neutral-400">No hay monstruo seleccionado</p>
              <p className="text-xs max-w-xs mt-1">
                Selecciona un monstruo de la lista izquierda para editarlo, o crea uno nuevo para empezar a definir sus estadísticas.
              </p>
            </div>
          ) : (
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="flex justify-between items-center border-b border-neutral-800 pb-3 mb-4">
                <h3 className="font-bold text-white text-base">
                  {isNew ? "Crear Nuevo Monstruo" : `Editar "${formName || selectedMonster?.name}"`}
                </h3>
                <button
                  onClick={() => setIsEditing(false)}
                  className="p-1 hover:bg-neutral-800 rounded text-neutral-400 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Form container */}
              <div className="flex-1 overflow-y-auto pr-2 space-y-4 text-xs">
                {/* ID & Name */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-neutral-400 mb-1 font-semibold">
                      Monster ID (Clave única)
                    </label>
                    <input
                      type="text"
                      disabled={!isNew}
                      value={formId}
                      onChange={(e) => setFormId(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ""))}
                      placeholder="ej: ghoul"
                      className="w-full bg-neutral-950 border border-neutral-800 rounded px-2.5 py-2 text-white text-xs disabled:opacity-50 focus:outline-none focus:border-neutral-700 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-neutral-400 mb-1 font-semibold">
                      Monster Name
                    </label>
                    <input
                      type="text"
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      placeholder="ej: Ghoul"
                      className="w-full bg-neutral-950 border border-neutral-800 rounded px-2.5 py-2 text-white text-xs focus:outline-none focus:border-neutral-700"
                    />
                  </div>
                </div>

                {/* Expansion & Aliases */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-neutral-400 mb-1 font-semibold">
                      Expansión
                    </label>
                    <select
                      value={formExpansion}
                      onChange={(e) => setFormExpansion(e.target.value)}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded px-2.5 py-2 text-white text-xs focus:outline-none"
                    >
                      <option value="base_game">Base Game (Lordaeron)</option>
                      <option value="burning_crusade">The Burning Crusade (Outland)</option>
                      <option value="shadow_of_war">Shadow of War</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-neutral-400 mb-1 font-semibold">
                      Aliases (Nombres alternativos separados por coma)
                    </label>
                    <input
                      type="text"
                      value={formAliasesString}
                      onChange={(e) => setFormAliasesString(e.target.value)}
                      placeholder="ej: Zombie, Come-muertos"
                      className="w-full bg-neutral-950 border border-neutral-800 rounded px-2.5 py-2 text-white text-xs focus:outline-none focus:border-neutral-700"
                    />
                  </div>
                </div>

                {/* Portrait Picker */}
                <div>
                  <label className="block text-neutral-400 mb-1 font-semibold">
                    Retrato / Imagen del Monstruo
                  </label>
                  <div className="flex flex-col gap-3 bg-neutral-950 border border-neutral-800 p-3 rounded-lg">
                    {/* Current Portrait Status */}
                    <div className="flex gap-3 items-center">
                      <div className="w-14 h-14 bg-neutral-900 border border-neutral-800 rounded-full overflow-hidden shrink-0 flex items-center justify-center">
                        {formImageAssetId ? (
                          <BlobImage cardId={formImageAssetId} className="w-full h-full object-cover" />
                        ) : (
                          <ImageIcon className="w-6 h-6 text-neutral-700" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold text-neutral-300 truncate">
                          {formImageAssetId ? `Asset ID: ${formImageAssetId}` : "Sin retrato asignado"}
                        </div>
                        {formImageAssetId && assetRecords.find(a => a.id === formImageAssetId) && (() => {
                          const asset = assetRecords.find(a => a.id === formImageAssetId);
                          return (
                            <div className="text-[10px] text-yellow-500 font-mono flex items-center gap-1.5 mt-0.5">
                              <span>Versión: v{asset?.portraitVersion ?? 1}</span>
                              <span>•</span>
                              <span>Modificado: {asset?.updatedAt ? new Date(asset.updatedAt).toLocaleDateString() : "Original"}</span>
                            </div>
                          );
                        })()}
                        <p className="text-[10px] text-neutral-500 mt-0.5">
                          El retrato circular se encuadra a 256x256 px para una visualización consistente.
                        </p>
                      </div>
                      {formImageAssetId && (
                        <button
                          type="button"
                          onClick={() => setFormImageAssetId("")}
                          className="text-neutral-500 hover:text-red-400 p-1.5 rounded hover:bg-neutral-900 transition-colors"
                          title="Quitar retrato"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    {!formId.trim() ? (
                      <div className="p-2.5 rounded bg-yellow-950/20 border border-yellow-900/40 text-[11px] text-yellow-400">
                        ⚠️ Define un <strong>Monster ID</strong> en la parte superior para habilitar las opciones de importación de retratos propios.
                      </div>
                    ) : (
                      <div className="border-t border-neutral-900 pt-3 flex flex-col gap-3">
                        {/* Own Portrait Import controls */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {/* File upload */}
                          <div className="flex flex-col gap-1">
                            <span className="text-[10px] text-neutral-500 font-semibold uppercase tracking-wider">Subir Archivo Local</span>
                            <button
                              type="button"
                              onClick={() => fileInputRef.current?.click()}
                              className="w-full flex items-center justify-center gap-2 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-white px-3 py-2 rounded text-xs transition-colors hover:border-neutral-700 font-medium"
                            >
                              <Upload className="w-4 h-4 text-yellow-500" />
                              Subir imagen de monstruo
                            </button>
                            <input
                              type="file"
                              ref={fileInputRef}
                              accept="image/*"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  const reader = new FileReader();
                                  reader.onload = (evt) => {
                                    if (evt.target?.result) {
                                      setCropImageSrc(evt.target.result as string);
                                    }
                                  };
                                  reader.readAsDataURL(file);
                                }
                                // Reset the value so the same file can be uploaded again if needed
                                e.target.value = "";
                              }}
                              className="hidden"
                            />
                          </div>

                          {/* URL Paste */}
                          <div className="flex flex-col gap-1">
                            <span className="text-[10px] text-neutral-500 font-semibold uppercase tracking-wider">Pegar URL de Internet</span>
                            <div className="flex gap-1">
                              <input
                                type="text"
                                placeholder="https://ejemplo.com/retrato.jpg"
                                value={imageUrlInput}
                                onChange={(e) => setImageUrlInput(e.target.value)}
                                className="flex-1 bg-neutral-900 border border-neutral-800 rounded px-2.5 py-1.5 text-white text-xs focus:outline-none focus:border-neutral-700"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  if (!imageUrlInput.trim()) {
                                    alert("Por favor, pega una dirección URL válida.");
                                    return;
                                  }
                                  setCropImageSrc(imageUrlInput.trim());
                                }}
                                className="bg-yellow-600 hover:bg-yellow-500 text-white font-semibold px-2.5 py-1.5 rounded text-xs transition-colors shrink-0"
                              >
                                Cargar
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Separate Alternative: Select from Asset Library */}
                        <div className="border-t border-neutral-900 pt-2 flex justify-between items-center text-[11px]">
                          <span className="text-neutral-500 font-mono text-[10px]">¿O usar un asset existente?</span>
                          <button
                            type="button"
                            onClick={() => setShowImagePicker(true)}
                            className="text-yellow-500 hover:text-yellow-400 font-bold transition-colors underline"
                          >
                            Seleccionar desde Asset Library
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Variants Stats Grid */}
                <div>
                  <div className="flex items-center gap-1.5 mb-2 border-b border-neutral-800 pb-1">
                    <Layers className="w-4 h-4 text-yellow-500" />
                    <span className="font-bold text-white text-xs uppercase tracking-wider">Estadísticas por Variante de Color</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {/* Green Variant */}
                    <div className="border border-green-800/40 bg-green-950/5 p-3 rounded-lg flex flex-col gap-2">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-green-500 shrink-0" />
                        <span className="font-bold text-green-400">Verde (Fácil)</span>
                      </div>
                      <div className="grid grid-cols-3 gap-1.5">
                        <div>
                          <label className="text-[10px] text-neutral-500 block mb-0.5">Threat</label>
                          <input
                            type="number"
                            min="0"
                            value={greenThreat}
                            onChange={(e) => setGreenThreat(e.target.value)}
                            className="w-full bg-neutral-950 border border-neutral-800 rounded px-1.5 py-1 text-white text-center"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-neutral-500 block mb-0.5">Attack</label>
                          <input
                            type="number"
                            min="0"
                            value={greenAttack}
                            onChange={(e) => setGreenAttack(e.target.value)}
                            className="w-full bg-neutral-950 border border-neutral-800 rounded px-1.5 py-1 text-white text-center"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-neutral-500 block mb-0.5">Health</label>
                          <input
                            type="number"
                            min="0"
                            value={greenHealth}
                            onChange={(e) => setGreenHealth(e.target.value)}
                            className="w-full bg-neutral-950 border border-neutral-800 rounded px-1.5 py-1 text-white text-center"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Red Variant */}
                    <div className="border border-red-800/40 bg-red-950/5 p-3 rounded-lg flex flex-col gap-2">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-red-500 shrink-0" />
                        <span className="font-bold text-red-400">Rojo (Medio)</span>
                      </div>
                      <div className="grid grid-cols-3 gap-1.5">
                        <div>
                          <label className="text-[10px] text-neutral-500 block mb-0.5">Threat</label>
                          <input
                            type="number"
                            min="0"
                            value={redThreat}
                            onChange={(e) => setRedThreat(e.target.value)}
                            className="w-full bg-neutral-950 border border-neutral-800 rounded px-1.5 py-1 text-white text-center"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-neutral-500 block mb-0.5">Attack</label>
                          <input
                            type="number"
                            min="0"
                            value={redAttack}
                            onChange={(e) => setRedAttack(e.target.value)}
                            className="w-full bg-neutral-950 border border-neutral-800 rounded px-1.5 py-1 text-white text-center"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-neutral-500 block mb-0.5">Health</label>
                          <input
                            type="number"
                            min="0"
                            value={redHealth}
                            onChange={(e) => setRedHealth(e.target.value)}
                            className="w-full bg-neutral-950 border border-neutral-800 rounded px-1.5 py-1 text-white text-center"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Purple Variant */}
                    <div className="border border-purple-800/40 bg-purple-950/5 p-3 rounded-lg flex flex-col gap-2">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-purple-500 shrink-0" />
                        <span className="font-bold text-purple-400">Violeta (Épico)</span>
                      </div>
                      <div className="grid grid-cols-3 gap-1.5">
                        <div>
                          <label className="text-[10px] text-neutral-500 block mb-0.5">Threat</label>
                          <input
                            type="number"
                            min="0"
                            value={purpleThreat}
                            onChange={(e) => setPurpleThreat(e.target.value)}
                            className="w-full bg-neutral-950 border border-neutral-800 rounded px-1.5 py-1 text-white text-center"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-neutral-500 block mb-0.5">Attack</label>
                          <input
                            type="number"
                            min="0"
                            value={purpleAttack}
                            onChange={(e) => setPurpleAttack(e.target.value)}
                            className="w-full bg-neutral-950 border border-neutral-800 rounded px-1.5 py-1 text-white text-center"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-neutral-500 block mb-0.5">Health</label>
                          <input
                            type="number"
                            min="0"
                            value={purpleHealth}
                            onChange={(e) => setPurpleHealth(e.target.value)}
                            className="w-full bg-neutral-950 border border-neutral-800 rounded px-1.5 py-1 text-white text-center"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Blue Variant */}
                    <div className="border border-blue-800/40 bg-blue-950/5 p-3 rounded-lg flex flex-col gap-2">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shrink-0" />
                        <span className="font-bold text-blue-400">Azul (Especial)</span>
                      </div>
                      <div className="grid grid-cols-3 gap-1.5">
                        <div>
                          <label className="text-[10px] text-neutral-500 block mb-0.5">Threat</label>
                          <input
                            type="number"
                            min="0"
                            value={blueThreat}
                            onChange={(e) => setBlueThreat(e.target.value)}
                            className="w-full bg-neutral-950 border border-neutral-800 rounded px-1.5 py-1 text-white text-center"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-neutral-500 block mb-0.5">Attack</label>
                          <input
                            type="number"
                            min="0"
                            value={blueAttack}
                            onChange={(e) => setBlueAttack(e.target.value)}
                            className="w-full bg-neutral-950 border border-neutral-800 rounded px-1.5 py-1 text-white text-center"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-neutral-500 block mb-0.5">Health</label>
                          <input
                            type="number"
                            min="0"
                            value={blueHealth}
                            onChange={(e) => setBlueHealth(e.target.value)}
                            className="w-full bg-neutral-950 border border-neutral-800 rounded px-1.5 py-1 text-white text-center"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Rules Text */}
                <div>
                  <label className="block text-neutral-400 mb-1 font-semibold">
                    Reglas Especiales (Rules Text)
                  </label>
                  <textarea
                    value={formRulesText}
                    onChange={(e) => setFormRulesText(e.target.value)}
                    placeholder="ej: Characters may not reroll dice using their Reroll values."
                    rows={2}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded px-2.5 py-2 text-white text-xs focus:outline-none focus:border-neutral-700 leading-normal"
                  />
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-neutral-400 mb-1 font-semibold">
                    Notas Internas
                  </label>
                  <textarea
                    value={formNotes}
                    onChange={(e) => setFormNotes(e.target.value)}
                    placeholder="Notas adicionales o comentarios de diseño..."
                    rows={2}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded px-2.5 py-2 text-white text-xs focus:outline-none focus:border-neutral-700"
                  />
                </div>

                {/* Real-time errors panel */}
                {validationErrors.length > 0 && (
                  <div className="p-3.5 rounded bg-red-950/20 border border-red-900/50 text-red-300 flex flex-col gap-1.5">
                    <div className="flex items-center gap-1.5 font-bold">
                      <AlertTriangle className="w-4 h-4 text-red-400" />
                      <span>Errores detectados ({validationErrors.length})</span>
                    </div>
                    <ul className="list-disc list-inside space-y-0.5 text-[11px] text-neutral-300">
                      {validationErrors.map((err, i) => (
                        <li key={i}>{err}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="border-t border-neutral-800 pt-4 mt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-neutral-700 px-4 py-2 rounded font-medium transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  className="bg-yellow-600 hover:bg-yellow-500 text-white px-5 py-2 rounded font-bold flex items-center gap-1.5 transition-colors shadow-md"
                >
                  <Check className="w-4 h-4" />
                  Guardar Monstruo
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Embedded Asset Image Selector Modal */}
      {showImagePicker && (
        <div className="fixed inset-0 z-[250] bg-black/80 flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 w-full max-w-2xl h-[70vh] rounded-xl flex flex-col p-5 overflow-hidden shadow-2xl">
            <div className="flex justify-between items-center border-b border-neutral-800 pb-3 mb-4">
              <div>
                <h4 className="font-bold text-white text-base">Seleccionar Retrato de Monstruo</h4>
                <p className="text-xs text-neutral-400">Escoge un asset cargado de la Biblioteca de Assets.</p>
              </div>
              <button
                onClick={() => setShowImagePicker(false)}
                className="p-1 hover:bg-neutral-800 rounded text-neutral-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-neutral-500" />
                <input
                  type="text"
                  placeholder="Buscar por ID de asset, nombre o tipo..."
                  value={imageSearch}
                  onChange={(e) => setImageSearch(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:border-neutral-700"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto min-h-0 bg-neutral-950 border border-neutral-800 rounded p-3">
              {filteredAssetImages.length === 0 ? (
                <div className="text-center py-20 text-neutral-500 text-sm">
                  No se encontraron assets de imagen cargados.
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {filteredAssetImages.map((record) => (
                    <div
                      key={record.id}
                      onClick={() => {
                        setFormImageAssetId(record.id);
                        setShowImagePicker(false);
                      }}
                      className="border border-neutral-800 hover:border-yellow-600 bg-neutral-900 rounded p-2 text-center cursor-pointer transition-colors group flex flex-col gap-1.5"
                    >
                      <div className="aspect-[4/5] bg-black rounded overflow-hidden relative flex items-center justify-center border border-neutral-800/80">
                        <BlobImage cardId={record.id} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200" />
                      </div>
                      <div className="text-[10px] font-bold text-neutral-300 truncate text-left" title={record.displayName}>
                        {record.displayName}
                      </div>
                      <div className="text-[9px] text-neutral-500 text-left capitalize truncate">
                        {record.type} • {record.expansion}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="border-t border-neutral-800 pt-3 mt-4 flex justify-between items-center text-xs text-neutral-500">
              <span>Total de assets elegibles: {filteredAssetImages.length}</span>
              <button
                onClick={() => setShowImagePicker(false)}
                className="bg-neutral-800 hover:bg-neutral-700 text-neutral-300 px-4 py-1.5 rounded transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {cropImageSrc && (
        <MonsterPortraitEditor
          imageSrc={cropImageSrc}
          monsterId={formId.trim().toLowerCase()}
          monsterName={formName.trim() || "Monstruo"}
          onSave={async (assetId) => {
            clearBlobImageCache(assetId);
            setFormImageAssetId(assetId);
            setCropImageSrc(null);
            setImageUrlInput("");
            // Reload assets and records immediately
            await loadData();
          }}
          onCancel={() => {
            setCropImageSrc(null);
          }}
        />
      )}
    </div>
  );
}
