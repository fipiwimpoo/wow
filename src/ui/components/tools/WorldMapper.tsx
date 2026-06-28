import React, {
  useState,
  useEffect,
  useRef,
  MouseEvent as ReactMouseEvent,
} from "react";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import { useAppStore } from "../../../core/state/store";
import { getBoardImage, getAllMonsters, getAllCardData } from "../../../core/utils/db";
import { MonsterData } from "../../../core/models/monsterData";
import { AnyCardData, QuestCardData } from "../../../core/models/cardData";
import { MonsterToken } from "./MonsterToken";
import { MonsterEncounterDetails } from "./MonsterEncounterDetails";
import {
  WorldDatabase,
  WorldRegion,
  PlayableZone,
  BoardId,
  PointPercent,
  Connection,
} from "../../../core/types/world";
import {
  loadWorldDb,
  saveWorldDb,
  exportWorldDb,
} from "../../../core/utils/worldDb";
import {
  X,
  Plus,
  MapPin,
  Network,
  Trash2,
  Crosshair,
  ChevronLeft,
  ChevronRight,
  Database,
  CheckCircle,
  AlertTriangle,
  Info,
  RefreshCw,
  Upload,
  Edit,
  Folder,
  Settings,
  Download,
  Eye,
  EyeOff,
} from "lucide-react";

interface WorldMapperProps {
  onClose: () => void;
}

const BOARD_IMAGES = {
  lordaeron: "/assets/boards/lordaeron_board.jpg",
  outland: "/assets/boards/outland_board.jpg",
};

interface ValidationError {
  type: "error" | "warning";
  msg: string;
  itemId?: string;
  itemType?: "region" | "playableZone";
  boardId?: BoardId;
}

export function WorldMapper({ onClose }: WorldMapperProps) {
  const [boardType, setBoardType] = useState<BoardId>("lordaeron");
  const [localImageUrl, setLocalImageUrl] = useState<string | null>(null);
  const customUrl = useAppStore((state) => state.boardUrls[boardType]);

  const [db, setDb] = useState<WorldDatabase>({ regions: {}, playableZones: {} });
  const [selectedWorldRegionId, setSelectedWorldRegionId] = useState<string | null>(null);
  const [selectedPlayableZoneId, setSelectedPlayableZoneId] = useState<string | null>(null);
  const [mode, setMode] = useState<"select" | "add_playable_zone" | "connect">("select");
  
  // Tabs: "database" (Hierarchical list, Import/Export, Stats) | "editor" (Active Region/Zone Editor) | "validation" (Diagnostics & settings)
  const [activeTab, setActiveTab] = useState<"database" | "editor" | "validation">("database");
  
  const [connectionSourceId, setConnectionSourceId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Map Toggles
  const [showPlayables, setShowPlayables] = useState(true);
  const [showLabels, setShowLabels] = useState(true);
  const [showConnections, setShowConnections] = useState(true);

  // Creation Modal State
  const [creationModal, setCreationModal] = useState<{
    type: "world_region" | "playable_zone";
    x?: number;
    y?: number;
  } | null>(null);
  const [creationName, setCreationName] = useState("");
  const [creationId, setCreationId] = useState("");
  const [creationParentRegionId, setCreationParentRegionId] = useState("");

  // Validation results
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [lastSaved, setLastSaved] = useState<string>("");

  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const transformWrapperRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const imageUrl = localImageUrl || customUrl || BOARD_IMAGES[boardType];

  // Load DB and trigger initial validation
  useEffect(() => {
    const loadedDb = loadWorldDb();
    setDb(loadedDb);
    triggerValidation(loadedDb);
    updateLastSavedTime();
    
    const loadData = async () => {
        setMonsters(await getAllMonsters());
        setCards(await getAllCardData());
    };
    loadData();
  }, []);

  const [monsters, setMonsters] = useState<MonsterData[]>([]);
  const [cards, setCards] = useState<AnyCardData[]>([]);

  // Update board image
  useEffect(() => {
    let active = true;
    const loadFromDB = async () => {
      try {
        const blob = await getBoardImage(boardType);
        if (blob && active) {
          setLocalImageUrl(URL.createObjectURL(blob));
          return;
        }
      } catch (err) {
        console.error("Error loading image from DB:", err);
      }
      if (active) setLocalImageUrl(null);
    };
    loadFromDB();
    return () => {
      active = false;
    };
  }, [boardType]);

  const saveToLocal = (newDb: WorldDatabase) => {
    setDb(newDb);
    saveWorldDb(newDb);
    triggerValidation(newDb);
    updateLastSavedTime();
  };

  const updateLastSavedTime = () => {
    const now = new Date();
    setLastSaved(now.toTimeString().split(" ")[0]);
  };

  // Run validation checks
  const triggerValidation = (currentDb: WorldDatabase) => {
    const errors: ValidationError[] = [];
    const regionsList = Object.values(currentDb.regions) as WorldRegion[];
    const playableZonesList = Object.values(currentDb.playableZones) as PlayableZone[];

    // 1. Validate World Regions
    regionsList.forEach((r) => {
      if (!r.id || !r.id.trim()) {
        errors.push({
          type: "error",
          msg: `World Region has empty ID`,
          itemId: r.id,
          itemType: "region",
          boardId: r.boardId,
        });
      }
      if (!r.name || !r.name.trim()) {
        errors.push({
          type: "error",
          msg: `World Region "${r.id}" has empty Name`,
          itemId: r.id,
          itemType: "region",
          boardId: r.boardId,
        });
      }
      if (r.id && !/^[a-z0-9_]+$/.test(r.id)) {
        errors.push({
          type: "warning",
          msg: `World Region ID "${r.id}" is not clean snake_case`,
          itemId: r.id,
          itemType: "region",
          boardId: r.boardId,
        });
      }
    });

    // 2. Validate Playable Zones
    playableZonesList.forEach((pz) => {
      if (!pz.id || !pz.id.trim()) {
        errors.push({
          type: "error",
          msg: `Playable Zone has empty ID`,
          itemId: pz.id,
          itemType: "playableZone",
          boardId: pz.boardId,
        });
      }
      if (!pz.name || !pz.name.trim()) {
        errors.push({
          type: "error",
          msg: `Playable Zone "${pz.id}" has empty Name`,
          itemId: pz.id,
          itemType: "playableZone",
          boardId: pz.boardId,
        });
      }
      if (pz.id && !/^[a-z0-9_]+$/.test(pz.id)) {
        errors.push({
          type: "warning",
          msg: `Playable Zone ID "${pz.id}" is not clean snake_case`,
          itemId: pz.id,
          itemType: "playableZone",
          boardId: pz.boardId,
        });
      }

      // PlayableZone no tiene WorldRegion padre.
      if (!pz.worldRegionId) {
        errors.push({
          type: "error",
          msg: `Playable Zone "${pz.name}" has no Parent World Region`,
          itemId: pz.id,
          itemType: "playableZone",
          boardId: pz.boardId,
        });
      } else {
        const parentRegion = currentDb.regions[pz.worldRegionId];
        if (!parentRegion) {
          errors.push({
            type: "error",
            msg: `Playable Zone "${pz.name}" references non-existent World Region ID "${pz.worldRegionId}"`,
            itemId: pz.id,
            itemType: "playableZone",
            boardId: pz.boardId,
          });
        }
      }

      // Connections
      const uniqueTargets = new Set<string>();
      (pz.connections || []).forEach((conn) => {
        // Connection apunta a WorldRegion?
        const isTargetWorldRegion = !!currentDb.regions[conn.targetPlayableZoneId];
        if (isTargetWorldRegion) {
          errors.push({
            type: "error",
            msg: `Playable Zone "${pz.name}" connects to a World Region ID "${conn.targetPlayableZoneId}" instead of a Playable Zone!`,
            itemId: pz.id,
            itemType: "playableZone",
            boardId: pz.boardId,
          });
          return;
        }

        const target = currentDb.playableZones[conn.targetPlayableZoneId];
        if (!target) {
          errors.push({
            type: "error",
            msg: `Playable Zone "${pz.name}" connects to non-existent Playable Zone ID "${conn.targetPlayableZoneId}"`,
            itemId: pz.id,
            itemType: "playableZone",
            boardId: pz.boardId,
          });
          return;
        }

        if (uniqueTargets.has(conn.targetPlayableZoneId)) {
          errors.push({
            type: "warning",
            msg: `Playable Zone "${pz.name}" has duplicate connection to "${target.name}"`,
            itemId: pz.id,
            itemType: "playableZone",
            boardId: pz.boardId,
          });
        }
        uniqueTargets.add(conn.targetPlayableZoneId);

        // Bidirectional walk check
        if (conn.type === "normal") {
          const reverseConn = (target.connections || []).find(
            (c) => c.targetPlayableZoneId === pz.id && c.type === "normal"
          );
          if (!reverseConn) {
            errors.push({
              type: "warning",
              msg: `Walk path is not bidirectional: "${pz.name}" connects to "${target.name}", but target has no return walk path`,
              itemId: pz.id,
              itemType: "playableZone",
              boardId: pz.boardId,
            });
          }
        }
      });
    });

    setValidationErrors(errors);
  };

  // Helper to get monsters in a zone
  // Centering on map percent coordinates
  const centerOnPercent = (x: number, y: number) => {
    if (!imageRef.current || !containerRef.current || !transformWrapperRef.current) return;
    const img = imageRef.current;
    const container = containerRef.current;
    const scale = 1.0;
    const targetX = (x / 100) * img.clientWidth;
    const targetY = (y / 100) * img.clientHeight;
    const left = container.clientWidth / 2 - targetX * scale;
    const top = container.clientHeight / 2 - targetY * scale;
    transformWrapperRef.current.setTransform(left, top, scale);
  };

  // Map Click
  const handleMapClick = (e: ReactMouseEvent<HTMLDivElement>) => {
    if (!imageRef.current || mode !== "add_playable_zone") return;

    const rect = imageRef.current.getBoundingClientRect();
    const xPercent = ((e.clientX - rect.left) / rect.width) * 100;
    const yPercent = ((e.clientY - rect.top) / rect.height) * 100;

    // Suggest selected world region
    setCreationParentRegionId(selectedWorldRegionId || "");
    setCreationModal({
      type: "playable_zone",
      x: xPercent,
      y: yPercent,
    });
    setCreationName("");
    setCreationId("");
  };

  // Creation confirmed
  const handleConfirmCreation = () => {
    if (!creationModal) return;
    const name = creationName.trim();
    const id = creationId.trim();

    if (!name || !id) {
      alert("Name and ID are required!");
      return;
    }

    if (!/^[a-z0-9_]+$/.test(id)) {
      alert("ID must contain only lowercase letters, numbers, and underscores.");
      return;
    }

    const newDb = { ...db };

    if (creationModal.type === "world_region") {
      if (newDb.regions[id]) {
        alert("A World Region with this ID already exists!");
        return;
      }
      newDb.regions[id] = {
        id,
        name,
        boardId: boardType,
        aliases: [],
        notes: "",
        playableZoneIds: [],
      };
      setSelectedWorldRegionId(id);
      setSelectedPlayableZoneId(null);
      setActiveTab("editor");
    } else {
      if (!creationParentRegionId) {
        alert("Parent World Region is required for a Playable Zone!");
        return;
      }
      if (newDb.playableZones[id]) {
        alert("A Playable Zone with this ID already exists!");
        return;
      }
      newDb.playableZones[id] = {
        id,
        name,
        boardId: boardType,
        worldRegionId: creationParentRegionId,
        coordinatesPercent: { x: creationModal.x!, y: creationModal.y! },
        faction: "neutral",
        type: "normal",
        features: {
          city: false,
          graveyard: false,
          flight_path: false,
          dungeon: false,
          dark_portal: false,
        },
        aliases: [],
        notes: "",
        connections: [],
      };

      // Add to parent region
      const region = newDb.regions[creationParentRegionId];
      if (region) {
        if (!region.playableZoneIds) region.playableZoneIds = [];
        if (!region.playableZoneIds.includes(id)) {
          region.playableZoneIds.push(id);
        }
      }

      setSelectedPlayableZoneId(id);
      setSelectedWorldRegionId(creationParentRegionId);
      setActiveTab("editor");
    }

    saveToLocal(newDb);
    setCreationModal(null);
    setMode("select");
  };

  // Click on Marker
  const handlePlayableZoneClick = (e: ReactMouseEvent, id: string) => {
    e.stopPropagation();
    if (mode === "select") {
      setSelectedPlayableZoneId(id);
      const pz = db.playableZones[id];
      if (pz) {
        setSelectedWorldRegionId(pz.worldRegionId);
      }
      setActiveTab("editor");
    } else if (mode === "connect") {
      if (!connectionSourceId) {
        setConnectionSourceId(id);
      } else {
        if (connectionSourceId !== id) {
          const newDb = { ...db };
          const source = newDb.playableZones[connectionSourceId];
          const target = newDb.playableZones[id];

          if (source && target) {
            // Bidirectional connect
            if (!source.connections) source.connections = [];
            if (!source.connections.find((c) => c.targetPlayableZoneId === id)) {
              source.connections.push({ targetPlayableZoneId: id, type: "normal" });
            }

            if (!target.connections) target.connections = [];
            if (!target.connections.find((c) => c.targetPlayableZoneId === connectionSourceId)) {
              target.connections.push({ targetPlayableZoneId: connectionSourceId, type: "normal" });
            }

            saveToLocal(newDb);
          }
        }
        setConnectionSourceId(null);
        setMode("select");
      }
    }
  };

  // Update region
  const updateSelectedWorldRegion = (updates: Partial<WorldRegion>) => {
    if (!selectedWorldRegionId) return;
    const newDb = { ...db };
    const oldRegion = newDb.regions[selectedWorldRegionId];
    if (!oldRegion) return;

    const updatedRegion = { ...oldRegion, ...updates };

    if (updates.id && updates.id !== selectedWorldRegionId) {
      const newId = updates.id;
      if (newDb.regions[newId]) {
        alert("This World Region ID already exists!");
        return;
      }

      delete newDb.regions[selectedWorldRegionId];
      newDb.regions[newId] = updatedRegion;

      // Update parentWorldRegionId in children
      (Object.values(newDb.playableZones) as PlayableZone[]).forEach((pz) => {
        if (pz.worldRegionId === selectedWorldRegionId) {
          pz.worldRegionId = newId;
        }
      });

      setSelectedWorldRegionId(newId);
    } else {
      newDb.regions[selectedWorldRegionId] = updatedRegion;
    }

    saveToLocal(newDb);
  };

  // Update playable zone
  const updateSelectedPlayableZone = (updates: Partial<PlayableZone>) => {
    if (!selectedPlayableZoneId) return;
    const newDb = { ...db };
    const oldPz = newDb.playableZones[selectedPlayableZoneId];
    if (!oldPz) return;

    const updatedPz = { ...oldPz, ...updates };

    if (updates.id && updates.id !== selectedPlayableZoneId) {
      const newId = updates.id;
      if (newDb.playableZones[newId]) {
        alert("This Playable Zone ID already exists!");
        return;
      }

      delete newDb.playableZones[selectedPlayableZoneId];
      newDb.playableZones[newId] = updatedPz;

      // Update parent list
      const parentRegion = newDb.regions[oldPz.worldRegionId];
      if (parentRegion && parentRegion.playableZoneIds) {
        parentRegion.playableZoneIds = parentRegion.playableZoneIds.map((pzid) =>
          pzid === selectedPlayableZoneId ? newId : pzid
        );
      }

      // Update references in connections
      (Object.values(newDb.playableZones) as PlayableZone[]).forEach((pz) => {
        if (pz.connections) {
          pz.connections.forEach((c) => {
            if (c.targetPlayableZoneId === selectedPlayableZoneId) {
              c.targetPlayableZoneId = newId;
            }
          });
        }
      });

      setSelectedPlayableZoneId(newId);
    } else {
      // If parent region changed
      if (updates.worldRegionId && updates.worldRegionId !== oldPz.worldRegionId) {
        // Remove from old
        const oldRegion = newDb.regions[oldPz.worldRegionId];
        if (oldRegion && oldRegion.playableZoneIds) {
          oldRegion.playableZoneIds = oldRegion.playableZoneIds.filter(
            (pzid) => pzid !== selectedPlayableZoneId
          );
        }

        // Add to new
        const newRegion = newDb.regions[updates.worldRegionId];
        if (newRegion) {
          if (!newRegion.playableZoneIds) newRegion.playableZoneIds = [];
          if (!newRegion.playableZoneIds.includes(selectedPlayableZoneId)) {
            newRegion.playableZoneIds.push(selectedPlayableZoneId);
          }
        }
      }

      newDb.playableZones[selectedPlayableZoneId] = updatedPz;
    }

    saveToLocal(newDb);
  };

  const cloneWorldDb = (source: WorldDatabase): WorldDatabase => {
    if (typeof structuredClone === "function") {
      return structuredClone(source);
    }
    return JSON.parse(JSON.stringify(source));
  };

  // Deletions
  const removeWorldRegion = (id: string) => {
    const region = db.regions[id];
    if (!region) return;

    const childIdsFromRegion = region.playableZoneIds || [];
    const childIdsFromZones = Object.values(db.playableZones)
      .filter((pz: any) => pz.worldRegionId === id)
      .map((pz: any) => pz.id);

    const playableZoneIdsToDelete = Array.from(
      new Set([...childIdsFromRegion, ...childIdsFromZones])
    );

    const confirmMessage =
      `¿Seguro que querés eliminar la región "${region.name}"?\n\n` +
      `También se eliminarán ${playableZoneIdsToDelete.length} zonas jugables y todas sus conexiones.`;

    if (!confirm(confirmMessage)) return;

    const newDb = cloneWorldDb(db);

    delete newDb.regions[id];

    playableZoneIdsToDelete.forEach((pzid) => {
      delete newDb.playableZones[pzid];
    });

    Object.values(newDb.regions).forEach((r) => {
      r.playableZoneIds = (r.playableZoneIds || []).filter(
        (pzid) => !playableZoneIdsToDelete.includes(pzid)
      );
    });

    Object.values(newDb.playableZones).forEach((pz) => {
      pz.connections = (pz.connections || []).filter(
        (c) => !playableZoneIdsToDelete.includes(c.targetPlayableZoneId)
      );
    });

    setSelectedWorldRegionId(null);
    setSelectedPlayableZoneId(null);
    setConnectionSourceId(null);
    setActiveTab("database");

    saveToLocal(newDb);
  };

  const removePlayableZone = (zoneKey: string) => {
    const pz = db.playableZones[zoneKey];
    if (!pz) return;

    if (!confirm(`¿Seguro que querés eliminar la zona "${pz.name}"?`)) return;

    const idsToDelete = new Set([zoneKey, pz.id]);

    const newDb = cloneWorldDb(db);

    // Borrar por key o pz.id
    Object.keys(newDb.playableZones).forEach((key) => {
      const zone = newDb.playableZones[key];
      if (idsToDelete.has(key) || idsToDelete.has(zone.id)) {
        delete newDb.playableZones[key];
      }
    });

    Object.values(newDb.regions).forEach((region) => {
      region.playableZoneIds = (region.playableZoneIds || []).filter(
        (id) => !idsToDelete.has(id)
      );
    });

    Object.values(newDb.playableZones).forEach((zone) => {
      zone.connections = (zone.connections || []).filter(
        (conn) => !idsToDelete.has(conn.targetPlayableZoneId)
      );
    });

    setSelectedPlayableZoneId(null);
    setConnectionSourceId(null);
    setActiveTab("database");

    saveToLocal(newDb);
  };

  const currentPlayableKey = selectedPlayableZoneId;
  const currentPlayable = currentPlayableKey ? db.playableZones[currentPlayableKey] : null;

  // Import JSON File
  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        const importedRegions: Record<string, WorldRegion> = {};
        const importedPlayableZones: Record<string, PlayableZone> = {};

        const rawRegions = data.worldRegions || data.regions || {};
        const rawPlayables = data.playableZones || data.worldZones || data.zones || {};

        if (Array.isArray(rawRegions)) {
          rawRegions.forEach((r: any) => {
            importedRegions[r.id] = {
              id: r.id,
              name: r.name,
              boardId: r.boardId || boardType,
              aliases: r.aliases || [],
              notes: r.notes || "",
              playableZoneIds: r.playableZoneIds || r.regionIds || [],
            };
          });
        } else {
          Object.keys(rawRegions).forEach((id) => {
            const r = rawRegions[id];
            importedRegions[id] = {
              id: r.id,
              name: r.name,
              boardId: r.boardId || boardType,
              aliases: r.aliases || [],
              notes: r.notes || "",
              playableZoneIds: r.playableZoneIds || r.regionIds || [],
            };
          });
        }

        if (Array.isArray(rawPlayables)) {
          rawPlayables.forEach((pz: any) => {
            importedPlayableZones[pz.id] = {
              id: pz.id,
              name: pz.name,
              boardId: pz.boardId || boardType,
              worldRegionId: pz.worldRegionId || pz.parentZoneId || "",
              coordinatesPercent: pz.coordinatesPercent || { x: 50, y: 50 },
              faction: pz.faction || "neutral",
              type: pz.type || "normal",
              features: pz.features || {
                city: pz.city || false,
                graveyard: pz.graveyard || false,
                flight_path: pz.flight_path || false,
                dungeon: pz.dungeon || false,
                dark_portal: pz.dark_portal || false,
              },
              aliases: pz.aliases || [],
              notes: pz.notes || "",
              connections: (pz.connections || []).map((c: any) => ({
                targetPlayableZoneId: c.targetPlayableZoneId || c.targetRegionId || "",
                type: c.type || "normal",
                isImpassable: c.isImpassable || false,
              })),
            };
          });
        } else {
          Object.keys(rawPlayables).forEach((id) => {
            const pz = rawPlayables[id];
            importedPlayableZones[id] = {
              id: pz.id,
              name: pz.name,
              boardId: pz.boardId || boardType,
              worldRegionId: pz.worldRegionId || pz.parentZoneId || "",
              coordinatesPercent: pz.coordinatesPercent || { x: 50, y: 50 },
              faction: pz.faction || "neutral",
              type: pz.type || "normal",
              features: pz.features || {
                city: pz.city || false,
                graveyard: pz.graveyard || false,
                flight_path: pz.flight_path || false,
                dungeon: pz.dungeon || false,
                dark_portal: pz.dark_portal || false,
              },
              aliases: pz.aliases || [],
              notes: pz.notes || "",
              connections: (pz.connections || []).map((c: any) => ({
                targetPlayableZoneId: c.targetPlayableZoneId || c.targetRegionId || "",
                type: c.type || "normal",
                isImpassable: c.isImpassable || false,
              })),
            };
          });
        }

        // Clean parent references in World Regions
        Object.values(importedPlayableZones).forEach((pz) => {
          if (pz.worldRegionId) {
            const region = importedRegions[pz.worldRegionId];
            if (region) {
              if (!region.playableZoneIds) region.playableZoneIds = [];
              if (!region.playableZoneIds.includes(pz.id)) {
                region.playableZoneIds.push(pz.id);
              }
            }
          }
        });

        const newDb: WorldDatabase = {
          regions: importedRegions,
          playableZones: importedPlayableZones,
        };

        saveToLocal(newDb);
        alert(`Successfully imported ${Object.keys(importedRegions).length} World Regions and ${Object.keys(importedPlayableZones).length} Playable Zones.`);
      } catch (err) {
        alert("Error parsing JSON database file. Make sure it matches WorldDatabase layout.");
        console.error(err);
      }
    };
    reader.readAsText(file);
  };

  const handleClearLocalDb = () => {
    if (confirm("CRITICAL WARNING:\n\nThis will completely wipe your local World Database from this browser!\n\nThis action cannot be undone unless you exported a JSON backup first. Continue?")) {
      const resetDb: WorldDatabase = { regions: {}, playableZones: {} };
      saveToLocal(resetDb);
      setSelectedWorldRegionId(null);
      setSelectedPlayableZoneId(null);
      alert("Local World Database cleared.");
    }
  };

  const removeEmptyNewZones = () => {
    const newDb = { ...db };
    let removedCount = 0;
    Object.keys(newDb.regions).forEach((id) => {
      const region = newDb.regions[id];
      if (region) {
        const childCount = (region.playableZoneIds || []).length;
        const isNewName = region.name.trim() === "New Zone" || region.name.trim() === "New World Region";
        if (isNewName && childCount === 0) {
          console.log(`Deleting empty New World Region: ${id}`);
          delete newDb.regions[id];
          removedCount++;
        }
      }
    });

    if (removedCount > 0) {
      saveToLocal(newDb);
      setSelectedWorldRegionId(null);
      setSelectedPlayableZoneId(null);
      alert(`Deleted ${removedCount} empty "New World Region" / "New Zone" entries.`);
    } else {
      alert("No empty \"New Zone\" or \"New World Region\" entries found.");
    }
  };

  // Connections lines
  const renderConnections = () => {
    if (!showConnections) return null;
    const lines: React.ReactNode[] = [];
    const drawn = new Set<string>();

    (Object.values(db.playableZones) as PlayableZone[]).forEach((pz) => {
      if (pz.boardId !== boardType) return;

      (pz.connections || []).forEach((conn) => {
        const target = db.playableZones[conn.targetPlayableZoneId];
        if (!target || target.boardId !== boardType) return;

        const pairId = [pz.id, target.id].sort().join("-");
        if (drawn.has(pairId)) return;
        drawn.add(pairId);

        let strokeColor = "rgba(156, 163, 175, 0.6)"; // Normal grey
        let dashStyle = "none";
        if (conn.type === "flight") {
          strokeColor = "rgba(59, 130, 246, 0.85)"; // Blue
          dashStyle = "6 4";
        } else if (conn.type === "portal") {
          strokeColor = "rgba(168, 85, 247, 0.9)"; // Purple
          dashStyle = "2 3";
        }

        lines.push(
          <line
            key={pairId}
            x1={`${pz.coordinatesPercent.x}%`}
            y1={`${pz.coordinatesPercent.y}%`}
            x2={`${target.coordinatesPercent.x}%`}
            y2={`${target.coordinatesPercent.y}%`}
            stroke={strokeColor}
            strokeWidth="3"
            strokeDasharray={dashStyle}
          />
        );
      });
    });

    return (
      <svg className="absolute inset-0 w-full h-full pointer-events-none z-[11]">
        {lines}
      </svg>
    );
  };

  // Connection count on board
  const countConnectionsOnBoard = () => {
    let count = 0;
    const drawn = new Set<string>();
    (Object.values(db.playableZones) as PlayableZone[]).forEach((pz) => {
      if (pz.boardId !== boardType) return;
      (pz.connections || []).forEach((c) => {
        const target = db.playableZones[c.targetPlayableZoneId];
        if (target && target.boardId === boardType) {
          const pairId = [pz.id, target.id].sort().join("-");
          if (!drawn.has(pairId)) {
            drawn.add(pairId);
            count++;
          }
        }
      });
    });
    return count;
  };

  // Selected values
  const currentRegion = selectedWorldRegionId ? db.regions[selectedWorldRegionId] : null;

  // Group regions by board for lists
  const regionsListFiltered = (Object.values(db.regions) as WorldRegion[]).filter(
    (r) => r.boardId === boardType
  );
  const playablesListFiltered = (Object.values(db.playableZones) as PlayableZone[]).filter(
    (pz) => pz.boardId === boardType
  );

  return (
    <div className="fixed inset-0 z-50 flex bg-neutral-950 text-white font-sans text-sm select-none">
      {/* SIDEBAR */}
      <div
        className={`bg-neutral-900 border-r border-neutral-800 flex flex-col h-full overflow-hidden transition-all duration-300 relative shrink-0 ${
          isSidebarOpen ? "w-96" : "w-0 border-none"
        }`}
      >
        <div className="w-96 flex flex-col h-full bg-neutral-900">
          {/* HEADER */}
          <div className="p-4 border-b border-neutral-800 flex justify-between items-center bg-neutral-950">
            <h2 className="font-bold flex items-center gap-2 whitespace-nowrap text-base">
              <MapPin className="w-5 h-5 text-yellow-500 animate-pulse" /> World Mapper
              <span className="text-xs bg-neutral-800 text-neutral-400 px-1.5 py-0.5 rounded uppercase tracking-wider font-mono">
                Prod Tool
              </span>
            </h2>
            <button
              onClick={onClose}
              className="p-1 hover:bg-neutral-800 rounded transition-colors cursor-pointer"
            >
              <X className="w-5 h-5 text-neutral-400 hover:text-white" />
            </button>
          </div>

          {/* TABS SELECTOR */}
          <div className="flex border-b border-neutral-800 bg-neutral-900 text-xs font-bold tracking-wide uppercase">
            <button
              onClick={() => setActiveTab("database")}
              className={`flex-1 py-3 text-center border-b-2 flex justify-center items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === "database"
                  ? "border-blue-500 text-blue-400 bg-neutral-950/35"
                  : "border-transparent text-neutral-400 hover:text-neutral-200"
              }`}
            >
              <Database className="w-4 h-4" /> Database
            </button>
            <button
              onClick={() => setActiveTab("editor")}
              className={`flex-1 py-3 text-center border-b-2 flex justify-center items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === "editor"
                  ? "border-yellow-500 text-yellow-400 bg-neutral-950/35"
                  : "border-transparent text-neutral-400 hover:text-neutral-200"
              }`}
            >
              <Edit className="w-4 h-4" /> Editor
            </button>
            <button
              onClick={() => setActiveTab("validation")}
              className={`flex-1 py-3 text-center border-b-2 flex justify-center items-center gap-1.5 transition-all relative cursor-pointer ${
                activeTab === "validation"
                  ? "border-purple-500 text-purple-400 bg-neutral-950/35"
                  : "border-transparent text-neutral-400 hover:text-neutral-200"
              }`}
            >
              <Settings className="w-4 h-4" /> Validation
              {validationErrors.length > 0 && (
                <span className="absolute top-2 right-2 flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                </span>
              )}
            </button>
          </div>

          {/* BOARD SELECTOR & MODES */}
          <div className="p-4 bg-neutral-950/50 border-b border-neutral-800 flex flex-col gap-3">
            <div className="flex gap-2 items-center">
              <span className="text-xs text-neutral-400 font-bold uppercase tracking-wider">Board:</span>
              <select
                value={boardType}
                onChange={(e) => {
                  setBoardType(e.target.value as BoardId);
                  setSelectedPlayableZoneId(null);
                  setSelectedWorldRegionId(null);
                }}
                className="flex-1 bg-neutral-900 border border-neutral-700 rounded p-1.5 text-xs text-white focus:outline-none focus:border-blue-500 cursor-pointer"
              >
                <option value="lordaeron">Lordaeron (Base Game)</option>
                <option value="outland">Outland (Burning Crusade)</option>
              </select>
            </div>

            {/* CREATION TOOLBAR */}
            <div className="grid grid-cols-4 gap-1.5 text-center">
              <button
                onClick={() => setMode("select")}
                className={`py-1.5 px-1 text-[11px] font-bold rounded border transition-all cursor-pointer ${
                  mode === "select"
                    ? "bg-neutral-700 border-neutral-500 text-white"
                    : "bg-neutral-800 border-neutral-700/60 text-neutral-400 hover:text-white"
                }`}
              >
                <Crosshair className="w-3.5 h-3.5 mx-auto mb-1" />
                Select
              </button>
              <button
                onClick={() => {
                  setCreationModal({ type: "world_region" });
                  setCreationName("");
                  setCreationId("");
                }}
                className="py-1.5 px-1 text-[11px] font-bold rounded border transition-all bg-neutral-800 border-neutral-700/60 text-neutral-400 hover:text-white cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 mx-auto mb-1 text-blue-400" />
                + Region
              </button>
              <button
                onClick={() => setMode(mode === "add_playable_zone" ? "select" : "add_playable_zone")}
                className={`py-1.5 px-1 text-[11px] font-bold rounded border transition-all cursor-pointer ${
                  mode === "add_playable_zone"
                    ? "bg-yellow-900 border-yellow-500 text-yellow-200"
                    : "bg-neutral-800 border-neutral-700/60 text-neutral-400 hover:text-white"
                }`}
              >
                <Plus className="w-3.5 h-3.5 mx-auto mb-1 text-yellow-400" />
                + Playable
              </button>
              <button
                onClick={() => setMode(mode === "connect" ? "select" : "connect")}
                className={`py-1.5 px-1 text-[11px] font-bold rounded border transition-all cursor-pointer ${
                  mode === "connect"
                    ? "bg-purple-900 border-purple-500 text-purple-200"
                    : "bg-neutral-800 border-neutral-700/60 text-neutral-400 hover:text-white"
                }`}
              >
                <Network className="w-3.5 h-3.5 mx-auto mb-1 text-purple-400" />
                Connect
              </button>
            </div>

            {/* STATUS NOTICES */}
            {mode === "add_playable_zone" && (
              <div className="text-xs text-yellow-400 bg-yellow-950/40 p-2 rounded border border-yellow-900/60 flex flex-col gap-1">
                <div className="flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5" />
                  <span className="font-bold">Add Playable Zone:</span>
                </div>
                <span>
                  {selectedWorldRegionId ? (
                    <>
                      Click on map to place a Playable Zone inside World Region{" "}
                      <strong className="text-white">"{db.regions[selectedWorldRegionId]?.name}"</strong>.
                    </>
                  ) : (
                    "Please select a World Region in the sidebar tree first, then click on the map to add Playable Zones inside it!"
                  )}
                </span>
              </div>
            )}
            {mode === "connect" && (
              <div className="text-xs text-purple-400 bg-purple-950/40 p-2 rounded border border-purple-900/60 flex flex-col gap-1">
                <div className="flex items-center gap-1.5">
                  <Network className="w-3.5 h-3.5" />
                  <span className="font-bold">Selecciona dos Playable Zones:</span>
                </div>
                <span>
                  {!connectionSourceId ? (
                    "Select FIRST Playable Zone marker on the map."
                  ) : (
                    <>
                      First: <strong className="text-white">"{db.playableZones[connectionSourceId]?.name}"</strong>.
                      Now click the SECOND Playable Zone to link them bidirectionally!
                    </>
                  )}
                </span>
              </div>
            )}
          </div>

          {/* TAB CONTENT */}
          <div className="flex-1 overflow-y-auto">
            {/* TAB 1: DATABASE TREE */}
            {activeTab === "database" && (
              <div className="flex flex-col h-full">
                {/* BACKUP & RESTORE ROW */}
                <div className="p-3 bg-neutral-950 border-b border-neutral-800 flex flex-col gap-2">
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => exportWorldDb(db)}
                      className="flex-1 py-1 px-2.5 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 rounded text-xs font-bold text-green-400 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      title="Export Entire Database as world_db.json"
                    >
                      <Download className="w-3.5 h-3.5" /> Export DB
                    </button>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="flex-1 py-1 px-2.5 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 rounded text-xs font-bold text-blue-400 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      title="Import and Merge/Replace World DB from JSON file"
                    >
                      <Upload className="w-3.5 h-3.5" /> Import JSON
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".json"
                      onChange={handleImportFile}
                      className="hidden"
                    />
                  </div>

                  <div className="flex justify-between items-center text-[10px] text-neutral-500 font-mono mt-1 px-1">
                    <span>Last Saved: {lastSaved || "Never"}</span>
                    <div className="flex gap-2.5">
                      <button
                        onClick={removeEmptyNewZones}
                        className="text-yellow-500 hover:text-yellow-400 underline cursor-pointer"
                        title="Eliminar todas las New Zone vacías"
                      >
                        Clean New Zones
                      </button>
                      <button
                        onClick={handleClearLocalDb}
                        className="text-red-500 hover:text-red-400 underline cursor-pointer"
                      >
                        Wipe DB
                      </button>
                    </div>
                  </div>
                </div>

                {/* DB TREE VIEW */}
                <div className="p-4 flex-1">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-bold text-neutral-400 uppercase text-xs tracking-wider">
                      World Hierarchy (Tree)
                    </h3>
                    <span className="text-[10px] text-neutral-500 bg-neutral-950 px-2 py-0.5 rounded border border-neutral-800">
                      WorldRegions: {regionsListFiltered.length} | Playables: {playablesListFiltered.length} | Conns: {countConnectionsOnBoard()}
                    </span>
                  </div>

                  {regionsListFiltered.length === 0 ? (
                    <div className="text-center py-8 text-neutral-500 text-xs">
                      No World Regions created on this board yet.<br />
                      Click <strong className="text-blue-400">+ Region</strong> above to start!
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {regionsListFiltered.map((region) => {
                        const isRegionSelected = region.id === selectedWorldRegionId;
                        const childPlayables = playablesListFiltered.filter(
                          (pz) => pz.worldRegionId === region.id
                        );

                        return (
                          <div
                            key={region.id}
                            className={`rounded border transition-all overflow-hidden ${
                              isRegionSelected
                                ? "bg-blue-950/20 border-blue-800 shadow-sm"
                                : "bg-neutral-900 border-neutral-800"
                            }`}
                          >
                            {/* Region Folder Row */}
                            <div className="flex justify-between items-center p-2.5 bg-neutral-950/40 hover:bg-neutral-950/80 transition-colors">
                              <div
                                onClick={() => {
                                  setSelectedWorldRegionId(region.id);
                                  setSelectedPlayableZoneId(null);
                                }}
                                className="flex items-center gap-1.5 cursor-pointer flex-1 min-w-0"
                              >
                                <Folder className="w-4 h-4 text-blue-400 shrink-0" />
                                <div className="truncate">
                                  <span className="font-bold text-neutral-200">
                                    {region.name}
                                  </span>
                                  <span className="block text-[9px] font-mono text-neutral-500 truncate">
                                    {region.id}
                                  </span>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 shrink-0 ml-1">
                                <span className="text-[10px] bg-neutral-800 text-neutral-400 font-mono px-1.5 py-0.5 rounded-full">
                                  {childPlayables.length}z
                                </span>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    e.preventDefault();
                                    setSelectedWorldRegionId(region.id);
                                    setSelectedPlayableZoneId(null);
                                    setActiveTab("editor");
                                  }}
                                  className="p-1 text-blue-400 hover:bg-neutral-800 rounded cursor-pointer"
                                  title="Edit World Region Details"
                                >
                                  <Edit className="w-3.5 h-3.5" />
                                </button>
                                
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                  removeWorldRegion(region.id);
                                }}
                                className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded font-bold text-[9px] shrink-0 cursor-pointer"
                                  title="Delete World Region"
                                >
                                  DEL REGION
                                </button>
                              </div>
                            </div>

                            {/* Playable Zones list */}
                            {childPlayables.length > 0 && (
                              <div className="border-t border-neutral-800/40 divide-y divide-neutral-800/20 pl-4 bg-neutral-900/60">
                                {childPlayables.map((pz) => {
                                  const isPzSelected = pz.id === selectedPlayableZoneId;
                                  const connCount = pz.connections?.length || 0;

                                  return (
                                    <div
                                      key={pz.id}
                                      className={`flex justify-between items-center p-2 hover:bg-neutral-800/30 transition-all ${
                                        isPzSelected ? "bg-yellow-950/25 border-l-2 border-yellow-500 pl-3.5" : ""
                                      }`}
                                    >
                                      <div
                                        onClick={() => {
                                          setSelectedPlayableZoneId(pz.id);
                                          setSelectedWorldRegionId(region.id);
                                          centerOnPercent(
                                            pz.coordinatesPercent.x,
                                            pz.coordinatesPercent.y
                                          );
                                        }}
                                        className="cursor-pointer flex-1 min-w-0"
                                      >
                                        <div className="truncate font-medium text-neutral-300 text-xs">
                                          {pz.name}
                                        </div>
                                        <span className="block text-[8px] font-mono text-neutral-500 truncate">
                                          {pz.id}
                                        </span>
                                      </div>

                                      <div className="flex items-center gap-2 shrink-0 ml-1">
                                        <span className="text-[9px] text-purple-400 font-mono" title="Connections count">
                                          🔗{connCount}
                                        </span>
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            e.preventDefault();
                                            setSelectedPlayableZoneId(pz.id);
                                            setSelectedWorldRegionId(region.id);
                                            setActiveTab("editor");
                                          }}
                                          className="p-1 text-yellow-500 hover:bg-neutral-800 rounded cursor-pointer"
                                          title="Edit Playable Zone Details"
                                        >
                                          <Edit className="w-3 h-3" />
                                        </button>
                                        
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            removePlayableZone(pz.id);
                                          }}
                                          className="px-2 py-1 bg-red-500 hover:bg-red-600 text-white rounded font-bold text-[9px] shrink-0 cursor-pointer"
                                          title="Delete Playable Zone"
                                        >
                                          DEL ZONE
                                        </button>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 2: ACTIVE EDITOR */}
            {activeTab === "editor" && (
              <div className="p-4">
                {/* 1. WORLD REGION EDITOR */}
                {currentRegion && !currentPlayable && (
                  <div className="flex flex-col gap-4">
                    <div className="border-b border-neutral-800 pb-2">
                      <span className="text-[10px] text-blue-400 uppercase tracking-wider font-bold">Active Editor</span>
                      <h3 className="font-bold text-neutral-200 text-sm flex items-center gap-1.5 mt-0.5">
                        <Folder className="w-4 h-4 text-blue-400" /> World Region
                      </h3>
                    </div>

                    <label className="text-xs flex flex-col gap-1 text-neutral-400">
                      Display Name
                      <input
                        className="bg-neutral-950 border border-neutral-700 p-2 rounded text-xs text-white"
                        value={currentRegion.name}
                        onChange={(e) => updateSelectedWorldRegion({ name: e.target.value })}
                      />
                    </label>

                    <label className="text-xs flex flex-col gap-1 text-neutral-400">
                      Region ID (snake_case)
                      <input
                        className="bg-neutral-950 border border-neutral-700 p-2 rounded font-mono text-xs text-white"
                        value={currentRegion.id}
                        onChange={(e) =>
                          updateSelectedWorldRegion({
                            id: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "_"),
                          })
                        }
                      />
                    </label>

                    <label className="text-xs flex flex-col gap-1 text-neutral-400">
                      Notes
                      <textarea
                        className="bg-neutral-950 border border-neutral-700 p-2 rounded text-xs text-white h-20 resize-none"
                        value={currentRegion.notes || ""}
                        onChange={(e) => updateSelectedWorldRegion({ notes: e.target.value })}
                        placeholder="Add regional lore/rules notes..."
                      />
                    </label>

                    <div className="border-t border-neutral-800 pt-4 mt-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          console.log("CLICK DELETE ZONE", currentRegion.id);
                          alert("CLICK DELETE ZONE " + currentRegion.id);
                          removeWorldRegion(currentRegion.id);
                        }}
                        className="w-full py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded text-xs transition-colors cursor-pointer flex justify-center items-center gap-1"
                      >
                        DEL REGION
                      </button>
                    </div>
                  </div>
                )}

                {/* 2. PLAYABLE ZONE EDITOR */}
                {currentPlayable && (
                  <div className="flex flex-col gap-3.5">
                    <div className="border-b border-neutral-800 pb-2 flex justify-between items-start">
                      <div>
                        <span className="text-[10px] text-yellow-400 uppercase tracking-wider font-bold">Active Editor</span>
                        <h3 className="font-bold text-neutral-200 text-sm flex items-center gap-1.5 mt-0.5">
                          <MapPin className="w-4 h-4 text-yellow-500" /> Playable Zone
                        </h3>
                      </div>
                      <button
                        onClick={() => setSelectedPlayableZoneId(null)}
                        className="text-xs text-neutral-500 hover:text-neutral-300 underline cursor-pointer"
                      >
                        Back to Region
                      </button>
                    </div>

                    <label className="text-xs flex flex-col gap-1 text-neutral-400">
                      Display Name
                      <input
                        className="bg-neutral-950 border border-neutral-700 p-2 rounded text-xs text-white focus:outline-none focus:border-blue-500"
                        value={currentPlayable.name}
                        onChange={(e) => updateSelectedPlayableZone({ name: e.target.value })}
                      />
                    </label>

                    <label className="text-xs flex flex-col gap-1 text-neutral-400">
                      Zone ID (snake_case)
                      <input
                        className="bg-neutral-950 border border-neutral-700 p-2 rounded font-mono text-xs text-white focus:outline-none focus:border-blue-500"
                        value={currentPlayable.id}
                        onChange={(e) =>
                          updateSelectedPlayableZone({
                            id: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "_"),
                          })
                        }
                      />
                    </label>

                    <label className="text-xs flex flex-col gap-1 text-neutral-400">
                      Parent World Region
                      <select
                        className="bg-neutral-950 border border-neutral-700 p-2 rounded text-xs text-white focus:outline-none cursor-pointer"
                        value={currentPlayable.worldRegionId}
                        onChange={(e) => updateSelectedPlayableZone({ worldRegionId: e.target.value })}
                      >
                        <option value="">No Region Selected</option>
                        {regionsListFiltered.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.name}
                          </option>
                        ))}
                      </select>
                    </label>

                    {/* Faction & Type */}
                    <div className="grid grid-cols-2 gap-2">
                      <label className="text-xs flex flex-col gap-1 text-neutral-400">
                        Faction Control
                        <select
                          className="bg-neutral-950 border border-neutral-700 p-1.5 rounded text-xs text-white focus:outline-none cursor-pointer"
                          value={currentPlayable.faction || "neutral"}
                          onChange={(e) => updateSelectedPlayableZone({ faction: e.target.value as any })}
                        >
                          <option value="alliance">Alliance</option>
                          <option value="horde">Horde</option>
                          <option value="neutral">Neutral</option>
                          <option value="contested">Contested</option>
                        </select>
                      </label>

                      <label className="text-xs flex flex-col gap-1 text-neutral-400">
                        Type
                        <select
                          className="bg-neutral-950 border border-neutral-700 p-1.5 rounded text-xs text-white focus:outline-none cursor-pointer"
                          value={currentPlayable.type || "normal"}
                          onChange={(e) => updateSelectedPlayableZone({ type: e.target.value as any })}
                        >
                          <option value="normal">Normal</option>
                          <option value="city">City</option>
                          <option value="secluded">Secluded</option>
                        </select>
                      </label>
                    </div>

                    {/* Features (city/cem/flight/dungeon/portal) */}
                    <div className="bg-neutral-950 p-2.5 rounded border border-neutral-800 flex flex-col gap-2">
                      <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">Features / POIs:</span>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <label className="flex items-center gap-1.5 cursor-pointer text-neutral-300 hover:text-white">
                          <input
                            type="checkbox"
                            checked={currentPlayable.features?.city || false}
                            onChange={(e) =>
                              updateSelectedPlayableZone({
                                features: { ...(currentPlayable.features || {}), city: e.target.checked } as any,
                              })
                            }
                          />
                          City Hub
                        </label>
                        <label className="flex items-center gap-1.5 cursor-pointer text-neutral-300 hover:text-white">
                          <input
                            type="checkbox"
                            checked={currentPlayable.features?.graveyard || false}
                            onChange={(e) =>
                              updateSelectedPlayableZone({
                                features: { ...(currentPlayable.features || {}), graveyard: e.target.checked } as any,
                              })
                            }
                          />
                          Graveyard
                        </label>
                        {currentPlayable.features?.city && (
                          <label className="flex flex-col gap-1 text-neutral-400 text-xs">
                            City Faction
                            <select
                              className="bg-neutral-950 border border-neutral-700 p-2 rounded text-xs text-white cursor-pointer"
                              value={currentPlayable.cityFaction || "neutral"}
                              onChange={(e) =>
                                updateSelectedPlayableZone({
                                  cityFaction: e.target.value as any,
                                })
                              }
                            >
                              <option value="alliance">Alliance</option>
                              <option value="horde">Horde</option>
                              <option value="neutral">Neutral</option>
                              <option value="both">Both</option>
                            </select>
                          </label>
                        )}
                        <label className="flex items-center gap-1.5 cursor-pointer text-neutral-300 hover:text-white">
                          <input
                            type="checkbox"
                            checked={currentPlayable.features?.flight_path || false}
                            onChange={(e) =>
                              updateSelectedPlayableZone({
                                features: { ...(currentPlayable.features || {}), flight_path: e.target.checked } as any,
                              })
                            }
                          />
                          Flight Path
                        </label>
                        {currentPlayable.features?.flight_path && (
                          <label className="flex flex-col gap-1 text-neutral-400 text-xs">
                            Flight Path Faction
                            <select
                              className="bg-neutral-950 border border-neutral-700 p-2 rounded text-xs text-white cursor-pointer"
                              value={currentPlayable.flightPathFaction || "neutral"}
                              onChange={(e) =>
                                updateSelectedPlayableZone({
                                  flightPathFaction: e.target.value as any,
                                })
                              }
                            >
                              <option value="alliance">Alliance</option>
                              <option value="horde">Horde</option>
                              <option value="neutral">Neutral</option>
                              <option value="both">Both</option>
                            </select>
                          </label>
                        )}
                        <label className="flex items-center gap-1.5 cursor-pointer text-neutral-300 hover:text-white">
                          <input
                            type="checkbox"
                            checked={currentPlayable.features?.dungeon || false}
                            onChange={(e) =>
                              updateSelectedPlayableZone({
                                features: { ...(currentPlayable.features || {}), dungeon: e.target.checked } as any,
                              })
                            }
                          />
                          Dungeon
                        </label>
                        <label className="flex items-center gap-1.5 cursor-pointer text-neutral-300 hover:text-white col-span-2">
                          <input
                            type="checkbox"
                            checked={currentPlayable.features?.dark_portal || false}
                            onChange={(e) =>
                              updateSelectedPlayableZone({
                                features: { ...(currentPlayable.features || {}), dark_portal: e.target.checked } as any,
                              })
                            }
                          />
                          Dark Portal / Expansion Hub
                        </label>
                      </div>
                    </div>

                    <label className="text-xs flex flex-col gap-1 text-neutral-400">
                      Notes
                      <textarea
                        className="bg-neutral-950 border border-neutral-700 p-2 rounded text-xs text-white h-16 resize-none focus:outline-none focus:border-blue-500"
                        value={currentPlayable.notes || ""}
                        onChange={(e) => updateSelectedPlayableZone({ notes: e.target.value })}
                        placeholder="Add notes..."
                      />
                    </label>

                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          if (currentPlayable.coordinatesPercent) {
                            centerOnPercent(
                              currentPlayable.coordinatesPercent.x,
                              currentPlayable.coordinatesPercent.y
                            );
                          }
                        }}
                        className="flex-1 py-1.5 px-3 bg-neutral-800 border border-neutral-700 text-neutral-200 text-xs font-bold rounded hover:bg-neutral-700 transition-colors cursor-pointer"
                      >
                        Center on Map
                      </button>
                    </div>

                    {/* CONNECTIONS LIST */}
                    <div className="border-t border-neutral-800 pt-3 mt-1">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-bold text-purple-400 uppercase tracking-wider">
                          Connections ({currentPlayable.connections?.length || 0})
                        </span>
                        <button
                          onClick={() => {
                            setMode("connect");
                            setConnectionSourceId(currentPlayable.id);
                          }}
                          className="text-[10px] bg-purple-950 text-purple-300 border border-purple-800 px-2 py-0.5 rounded-full hover:bg-purple-900 transition-colors cursor-pointer"
                        >
                          + Draw on Map
                        </button>
                      </div>

                      {/* Manual Link selector */}
                      <div className="bg-neutral-950 p-2.5 rounded border border-neutral-800 flex flex-col gap-2 mb-2">
                        <div className="text-[10px] text-neutral-400 uppercase font-bold">Manual Link:</div>
                        <div className="flex gap-1">
                          <select
                            id="manual_conn_target"
                            className="flex-1 bg-neutral-900 border border-neutral-700 p-1 rounded text-[11px] text-white focus:outline-none cursor-pointer"
                          >
                            <option value="">-- Choose Target --</option>
                            {playablesListFiltered
                              .filter((pz) => pz.id !== currentPlayable.id)
                              .map((pz) => (
                                <option key={pz.id} value={pz.id}>
                                  {pz.name} ({db.regions[pz.worldRegionId]?.name || "No Region"})
                                </option>
                              ))}
                          </select>
                          <select
                            id="manual_conn_type"
                            className="bg-neutral-900 border border-neutral-700 p-1 rounded text-[11px] text-white focus:outline-none w-20 cursor-pointer"
                          >
                            <option value="normal">Walk</option>
                            <option value="flight">Flight</option>
                            <option value="portal">Portal</option>
                          </select>
                          <button
                            onClick={() => {
                              const targetEl = document.getElementById("manual_conn_target") as HTMLSelectElement;
                              const typeEl = document.getElementById("manual_conn_type") as HTMLSelectElement;
                              const targetId = targetEl?.value;
                              const connType = typeEl?.value as any;

                              if (!targetId) {
                                alert("Please select a target playable zone first!");
                                return;
                              }

                              const newDb = { ...db };
                              const source = newDb.playableZones[currentPlayable.id];
                              const target = newDb.playableZones[targetId];

                              if (source && target) {
                                if (!source.connections) source.connections = [];
                                if (!source.connections.find((c) => c.targetPlayableZoneId === targetId)) {
                                  source.connections.push({ targetPlayableZoneId: targetId, type: connType });
                                }

                                // Bidirectional for normal walk connections
                                if (connType === "normal") {
                                  if (!target.connections) target.connections = [];
                                  if (!target.connections.find((c) => c.targetPlayableZoneId === currentPlayable.id)) {
                                    target.connections.push({ targetPlayableZoneId: currentPlayable.id, type: "normal" });
                                  }
                                }

                                saveToLocal(newDb);
                                targetEl.value = "";
                              }
                            }}
                            className="px-2 bg-purple-700 hover:bg-purple-600 rounded text-xs font-bold cursor-pointer"
                          >
                            Add
                          </button>
                        </div>
                      </div>

                      {/* Connections items list */}
                      {(!currentPlayable.connections || currentPlayable.connections.length === 0) ? (
                        <div className="text-[11px] text-neutral-500 italic py-2 text-center">
                          No paths connected yet.
                        </div>
                      ) : (
                        <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto pr-1">
                          {currentPlayable.connections.map((conn, idx) => {
                            const target = db.playableZones[conn.targetPlayableZoneId];
                            const targetRegion = target ? db.regions[target.worldRegionId] : null;

                            return (
                              <div
                                key={idx}
                                className="flex justify-between items-center bg-neutral-950 p-2 rounded border border-neutral-800 text-xs gap-1.5 hover:border-neutral-700 transition-colors"
                              >
                                <div className="truncate flex-1 min-w-0">
                                  <span className="font-bold text-neutral-300 block truncate">
                                    {target ? target.name : `Unknown (${conn.targetPlayableZoneId})`}
                                  </span>
                                  <span className="text-[9px] text-neutral-500 font-mono block truncate">
                                    {targetRegion ? targetRegion.name : "No Region"}
                                  </span>
                                </div>
                                <select
                                  value={conn.type}
                                  onChange={(e) => {
                                    const newDb = { ...db };
                                    const pz = newDb.playableZones[selectedPlayableZoneId];
                                    if (pz && pz.connections) {
                                      pz.connections[idx].type = e.target.value as any;
                                      saveToLocal(newDb);
                                    }
                                  }}
                                  className="bg-neutral-900 border border-neutral-700 text-[10px] p-1 rounded text-neutral-300 font-bold cursor-pointer"
                                >
                                  <option value="normal">Walk</option>
                                  <option value="flight">Flight</option>
                                  <option value="portal">Portal</option>
                                </select>
                                <button
                                  onClick={() => {
                                    const newDb = { ...db };
                                    const pz = newDb.playableZones[selectedPlayableZoneId];
                                    if (pz && pz.connections) {
                                      const removedConn = pz.connections[idx];
                                      pz.connections.splice(idx, 1);

                                      // Auto clear bidirectional walk connection on target
                                      if (removedConn.type === "normal") {
                                        const targetPz = newDb.playableZones[removedConn.targetPlayableZoneId];
                                        if (targetPz && targetPz.connections) {
                                          targetPz.connections = targetPz.connections.filter(
                                            (c) => !(c.targetPlayableZoneId === selectedPlayableZoneId && c.type === "normal")
                                          );
                                        }
                                      }

                                      saveToLocal(newDb);
                                    }
                                  }}
                                  className="text-red-500 hover:bg-red-950 p-1.5 rounded transition-colors cursor-pointer"
                                  title="Delete Link"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    <div className="border-t border-neutral-800 pt-4 mt-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          if (currentPlayableKey) removePlayableZone(currentPlayableKey);
                        }}
                        className="w-full py-2 bg-red-500 hover:bg-red-600 text-white font-bold rounded text-xs transition-colors cursor-pointer flex justify-center items-center gap-1"
                      >
                        DEL ZONE
                      </button>
                    </div>
                  </div>
                )}

                {/* NO SELECTION */}
                {!currentRegion && !currentPlayable && (
                  <div className="text-center py-12 text-neutral-500 flex flex-col items-center gap-3">
                    <MapPin className="w-8 h-8 text-neutral-600 animate-bounce" />
                    <div>
                      <p className="font-bold text-neutral-400 text-xs uppercase tracking-wide">
                        No Item Selected
                      </p>
                      <p className="text-xs text-neutral-500 mt-1 max-w-[240px] mx-auto leading-relaxed">
                        Select an item from the <strong className="text-blue-400">Database tree</strong> or click any marker on the board map.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: VALIDATION & MAP CONTROLS */}
            {activeTab === "validation" && (
              <div className="p-4 flex flex-col gap-4">
                {/* MAP TOGGLES */}
                <div className="bg-neutral-950 p-3 rounded border border-neutral-800">
                  <h4 className="font-bold text-xs text-neutral-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Settings className="w-4 h-4 text-neutral-400" /> Map Overlays
                  </h4>
                  <div className="flex flex-col gap-2.5 text-xs text-neutral-300">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={showPlayables}
                        onChange={(e) => setShowPlayables(e.target.checked)}
                      />
                      Show Playable Zone Markers (Gold / Red)
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={showLabels}
                        onChange={(e) => setShowLabels(e.target.checked)}
                      />
                      Show Playable Zone Text Labels
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={showConnections}
                        onChange={(e) => setShowConnections(e.target.checked)}
                      />
                      Show Connection lines (Walk/Flight/Portal)
                    </label>
                  </div>
                </div>

                {/* VALIDATION MESSAGES */}
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between items-center">
                    <h4 className="font-bold text-xs text-neutral-400 uppercase tracking-wider">
                      Validation Diagnostics
                    </h4>
                    <button
                      onClick={() => triggerValidation(db)}
                      className="p-1 px-2.5 bg-neutral-800 hover:bg-neutral-700 text-[10px] text-purple-400 border border-neutral-700 rounded flex items-center gap-1 transition-all cursor-pointer"
                    >
                      <RefreshCw className="w-3 h-3" /> Run Clean
                    </button>
                  </div>

                  {validationErrors.length === 0 ? (
                    <div className="bg-green-950/20 border border-green-900/60 p-3 rounded flex items-start gap-2.5">
                      <CheckCircle className="w-5 h-5 text-green-500 shrink-0" />
                      <div>
                        <span className="font-bold text-green-400 block text-xs">No errors found!</span>
                        <span className="text-[10px] text-green-500/80 mt-0.5 block">
                          World database is complete and clean for production.
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-1.5 max-h-[350px] overflow-y-auto pr-1">
                      {validationErrors.map((err, idx) => (
                        <div
                          key={idx}
                          onClick={() => {
                            if (err.itemId) {
                              if (err.itemType === "region") {
                                setSelectedWorldRegionId(err.itemId);
                                setSelectedPlayableZoneId(null);
                              } else {
                                setSelectedPlayableZoneId(err.itemId);
                                const pz = db.playableZones[err.itemId];
                                if (pz) {
                                  setSelectedWorldRegionId(pz.worldRegionId);
                                  centerOnPercent(pz.coordinatesPercent.x, pz.coordinatesPercent.y);
                                }
                              }
                              setActiveTab("editor");
                            }
                          }}
                          className={`p-2.5 rounded border text-[11px] leading-relaxed flex items-start gap-2 cursor-pointer hover:bg-neutral-800/30 transition-all ${
                            err.type === "error"
                              ? "bg-red-950/10 border-red-900/60 hover:border-red-700"
                              : "bg-yellow-950/10 border-yellow-900/60 hover:border-yellow-700"
                          }`}
                        >
                          {err.type === "error" ? (
                            <X className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                          ) : (
                            <AlertTriangle className="w-4 h-4 text-yellow-500 shrink-0 mt-0.5" />
                          )}
                          <div>
                            <span className="font-bold text-neutral-300 block">
                              {err.type.toUpperCase()}:
                            </span>
                            <span className="text-neutral-400 block mt-0.5">{err.msg}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MAP VIEWPORT CONTAINER */}
      <div className="flex-1 relative bg-neutral-950 overflow-hidden" ref={containerRef}>
        {/* COLLAPSE SIDEBAR TOGGLE BUTTON */}
        <div className="absolute top-4 left-4 z-40 flex gap-2">
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2.5 bg-neutral-900/90 border border-neutral-700 hover:bg-neutral-800 rounded shadow-lg transition-colors text-neutral-300 hover:text-white backdrop-blur-sm flex items-center justify-center cursor-pointer"
            title={isSidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
          >
            {isSidebarOpen ? <ChevronLeft className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
          </button>
        </div>

        {/* MAP STATUS STATS HUD */}
        <div className="absolute top-4 right-4 z-30 bg-neutral-900/80 border border-neutral-800 px-3 py-1.5 rounded-md text-xs font-mono text-neutral-400 flex items-center gap-3 backdrop-blur-sm shadow-md pointer-events-none">
          <div>BOARD: <span className="text-white font-bold uppercase">{boardType}</span></div>
          <div className="h-3 w-[1px] bg-neutral-800"></div>
          <div>MODE: <span className="text-yellow-400 font-bold uppercase">{mode}</span></div>
        </div>

        {/* INTERACTIVE TRANSFORM ENGINE */}
        <TransformWrapper
          ref={transformWrapperRef}
          initialScale={0.4}
          minScale={0.15}
          maxScale={4}
          centerOnInit={true}
          doubleClick={{ disabled: true }}
          panning={{ disabled: mode !== "select" }}
        >
          {() => (
            <TransformComponent wrapperClass="!w-full !h-full" contentClass="relative">
              <div
                className={`relative ${mode !== "select" ? "cursor-crosshair" : "cursor-grab active:cursor-grabbing"}`}
                onClick={handleMapClick}
              >
                <img
                  ref={imageRef}
                  src={imageUrl}
                  alt="Board Background Map"
                  draggable={false}
                  className="max-w-none shadow-[0_0_50px_rgba(0,0,0,0.8)] border border-neutral-900"
                  style={{ display: "block" }}
                />

                {/* Connections Lines SVG overlay */}
                {renderConnections()}

                {/* PLAYABLE ZONE MARKERS */}
                {showPlayables &&
                  playablesListFiltered.map((pz) => {
                    const isSelected = pz.id === selectedPlayableZoneId;
                    const isSource = pz.id === connectionSourceId;
                    const isChildOfSelectedRegion = pz.worldRegionId === selectedWorldRegionId;
                    const isCityHub = pz.features?.city === true;
                    const isFlightPath = pz.features?.flight_path === true;
                    const flightFaction = pz.flightPathFaction || 'neutral';
                    
                    const flightColor = {
                      alliance: "bg-blue-600/90 border-blue-950 text-blue-100",
                      horde: "bg-red-600/90 border-red-950 text-red-100",
                      neutral: "bg-yellow-600/90 border-yellow-950 text-yellow-100",
                      both: "bg-purple-600/90 border-purple-950 text-purple-100"
                    }[flightFaction] || "bg-yellow-600/90 border-yellow-950";

                    return (
                      <div
                        key={pz.id}
                        className={`absolute -ml-2.5 -mt-2.5 rounded-full border-2 transition-all cursor-pointer flex items-center justify-center
                          ${
                            isFlightPath
                              ? `${flightColor} w-6 h-6 -ml-3 -mt-3 text-[10px] font-black`
                              : isCityHub
                              ? "w-6 h-6 -ml-3 -mt-3 bg-yellow-600/95 border-yellow-300 font-black text-[9px] text-yellow-100 shadow-[0_0_10px_rgba(234,179,8,0.6)]"
                              : "w-5 h-5 bg-red-600/90 border-red-950 text-[8px] font-bold text-red-100"
                          }
                          ${
                            isSelected
                              ? "bg-yellow-500 border-white scale-135 z-[30] shadow-[0_0_15px_rgba(234,179,8,0.9)] ring-4 ring-yellow-500/40 text-yellow-950"
                              : isChildOfSelectedRegion
                              ? "z-[20] shadow-[0_0_8px_rgba(234,179,8,0.5)] scale-110 animate-pulse border-yellow-400"
                              : "z-[12] hover:scale-125 hover:bg-yellow-500 hover:border-yellow-900"
                          }
                          ${isSource ? "ring-4 ring-purple-500 animate-bounce scale-135 z-[35]" : ""}
                        `}
                        style={{
                          left: `${pz.coordinatesPercent.x}%`,
                          top: `${pz.coordinatesPercent.y}%`,
                        }}
                        onClick={(e) => handlePlayableZoneClick(e, pz.id)}
                      >
                        <>{isFlightPath ? "✈" : isCityHub ? "★" : "●"}</>
                        {showLabels && (
                          <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 bg-black/85 px-1 py-0.5 rounded text-[9px] font-semibold text-white border border-neutral-700 pointer-events-none whitespace-nowrap shadow-sm">
                            {pz.name}
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            </TransformComponent>
          )}
        </TransformWrapper>
      </div>

      {/* CREATION MODAL OVERLAY */}
      {creationModal && (
        <div className="fixed inset-0 z-55 bg-black/75 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-5 w-full max-w-sm flex flex-col gap-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-neutral-800 pb-2.5">
              <h3 className="font-bold text-sm uppercase tracking-wide flex items-center gap-1.5 text-white">
                {creationModal.type === "world_region" ? (
                  <>
                    <Folder className="w-4 h-4 text-blue-400" /> Create World Region
                  </>
                ) : (
                  <>
                    <MapPin className="w-4 h-4 text-yellow-400" /> Create Playable Zone
                  </>
                )}
              </h3>
              <button
                onClick={() => setCreationModal(null)}
                className="text-neutral-500 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-col gap-3.5">
              <label className="text-xs flex flex-col gap-1 text-neutral-400">
                Display Name (Human readable)
                <input
                  type="text"
                  placeholder={creationModal.type === "world_region" ? "e.g., Tirisfal Glades" : "e.g., Brill"}
                  value={creationName}
                  onChange={(e) => {
                    const val = e.target.value;
                    setCreationName(val);
                    setCreationId(val.toLowerCase().replace(/[^a-z0-9_]/g, "_").replace(/__+/g, "_"));
                  }}
                  className="bg-neutral-950 border border-neutral-700 p-2 rounded text-xs text-white focus:outline-none focus:border-blue-500"
                  autoFocus
                />
              </label>

              <label className="text-xs flex flex-col gap-1 text-neutral-400">
                Unique ID (snake_case)
                <input
                  type="text"
                  placeholder={creationModal.type === "world_region" ? "e.g., tirisfal_glades" : "e.g., brill"}
                  value={creationId}
                  onChange={(e) => setCreationId(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "_"))}
                  className="bg-neutral-950 border border-neutral-700 p-2 rounded font-mono text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </label>

              {creationModal.type === "playable_zone" && (
                <label className="text-xs flex flex-col gap-1 text-neutral-400">
                  Parent World Region
                  <select
                    value={creationParentRegionId}
                    onChange={(e) => setCreationParentRegionId(e.target.value)}
                    className="bg-neutral-950 border border-neutral-700 p-2 rounded text-xs text-white focus:outline-none focus:border-blue-500 cursor-pointer"
                  >
                    <option value="">-- Select Parent Region --</option>
                    {regionsListFiltered.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </label>
              )}

              {creationModal.type === "playable_zone" && creationModal.x !== undefined && (
                <div className="text-[10px] text-neutral-500 font-mono mt-1">
                  Placed at X: {creationModal.x.toFixed(2)}% | Y: {creationModal.y!.toFixed(2)}%
                </div>
              )}
            </div>

            <div className="flex gap-2 justify-end border-t border-neutral-800 pt-3 mt-1.5">
              <button
                onClick={() => setCreationModal(null)}
                className="px-3.5 py-1.5 bg-neutral-800 hover:bg-neutral-700 rounded text-xs font-bold text-neutral-300 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmCreation}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 rounded text-xs font-bold text-white shadow-md shadow-blue-900/30 cursor-pointer"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
