import React, { useState, useEffect } from "react";
import {
  AssetRecord,
  getCardData,
  saveCardData,
  saveAssetRecord,
  getAllMonsters,
} from "../../../core/utils/db";
import {
  AnyCardData,
  QuestCardData,
  ReviewState,
  SpawnRule,
  ItemReward,
} from "../../../core/models/cardData";
import { MonsterData } from "../../../core/models/monsterData";
import { ItemCardData } from "../../../core/models/cardData";
import { ItemSlot, ItemType, WeaponType, ArmorType } from "../../../core/models/ucl";
import { MonsterPicker } from "./MonsterPicker";
import { extractCardDataFromImage } from "../../../core/services/aiCardExtractor";
import { BlobImage } from "./BlobImage";
import { GeminiConfigPanel } from "./GeminiConfigPanel";
import { PlayableZonePicker } from "./PlayableZonePicker";
import { loadWorldDb } from "../../../core/utils/worldDb";
import { useAppStore, SpawnedCreaturePreview } from "../../../core/state/store";
import {
  X,
  Save,
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  Wand2,
  Plus,
  Trash2,
  AlertTriangle,
  Upload,
  Download,
} from "lucide-react";
import { CardReferenceImporter } from "../../../core/utils/cardReferenceImporter";
import { ItemCardReference, CardReference } from "../../../core/models/cardReference";
import triangleYaml from "../../../data/cards/items/items_core_triangle.yaml?raw";
import { CardReferenceIndex } from "../../../core/utils/cardReferenceIndex";
import { Link, Unlink, FileText, CheckCircle2 } from "lucide-react";

export const getSpawnOwnership = (questFaction: string, variantColor: string): "alliance" | "horde" | "neutral" => {
  const faction = (questFaction || "").toLowerCase();
  const color = (variantColor || "green").toLowerCase();
  if (faction === "alliance") {
    return (color === "green" || color === "red" || color === "purple") ? "alliance" : "neutral";
  } else if (faction === "horde") {
    return (color === "green" || color === "red" || color === "purple") ? "horde" : "neutral";
  }
  return "neutral";
};

export const mapDeckOrColorToId = (deckOrColor: string): "triangle" | "square" | "circle" | "hexagon" | "trophy" => {
  const norm = (deckOrColor || "").toLowerCase().trim();
  if (norm.includes("triang") || norm.includes("triangle")) return "triangle";
  if (norm.includes("cuadr") || norm.includes("square")) return "square";
  if (norm.includes("circ") || norm.includes("circle")) return "circle";
  if (norm.includes("hex") || norm.includes("hexagon")) return "hexagon";
  if (norm.includes("trof") || norm.includes("trophy")) return "trophy";
  return "triangle";
};

export const getValidationErrors = (data: AnyCardData | null, monsters?: MonsterData[]): string[] => {
  if (!data) return [];
  
  const errors: string[] = [];

  if (data.type === "item") {
    const item = data as ItemCardData;
    if (item.level === undefined || item.level <= 0) {
      errors.push("Missing required data: Required Level (must be > 0).");
    }
    if (item.goldValue === undefined || item.goldValue < 0) {
      errors.push("Missing required data: Gold Value (must be >= 0).");
    }
    if (!item.itemType) {
      errors.push("Missing required data: Item Type.");
    }
    if (!item.slot || item.slot === "NONE") {
      errors.push("Missing required data: Equipment Slot.");
    }
    if (item.itemType === "WEAPON" && (!item.weaponType || item.weaponType === "NONE")) {
      errors.push("Missing required data: Weapon Type.");
    }
    if (item.itemType === "ARMOR" && (!item.armorType || item.armorType === "NONE")) {
      errors.push("Missing required data: Armor Type.");
    }
    return errors;
  }

  if (data.type !== "quest") return [];
  
  const qd = data as QuestCardData;
  const worldDb = loadWorldDb();

  // Basic fields missing
  if (!qd.faction) errors.push("Falta la facción (Faction) de la carta.");
  if (!qd.deckColor) errors.push("Falta el color del mazo (Deck Color) de la carta.");
  if (qd.questLevel === undefined || qd.questLevel === null || qd.questLevel <= 0) {
    errors.push("El nivel de misión (Quest Level) debe ser mayor que 0.");
  }
  if (!qd.title) {
    errors.push("Falta el título de la carta.");
  }

  // Reward validations
  if (!qd.rewards) {
    errors.push("Falta la estructura de recompensas (Rewards).");
  } else {
    const r = qd.rewards;
    const hasRewards = r.xp > 0 || r.gold > 0 || (r.itemRewards && r.itemRewards.length > 0) || (r.specialItems && r.specialItems.length > 0);
    if (!hasRewards) {
      errors.push("Recompensa incompleta o vacía: debe otorgar al menos XP, oro, ítems o ítems especiales.");
    }
    // Deep check for itemRewards
    if (r.itemRewards) {
      r.itemRewards.forEach((item, i) => {
        if (!item.itemDeck) {
          errors.push(`Item Reward #${i + 1} tiene el mazo vacío.`);
        }
        if (item.drawCount <= 0) {
          errors.push(`Item Reward #${i + 1} tiene un drawCount inválido (${item.drawCount}).`);
        }
      });
    }
  }

  const validateSpawnRule = (rule: SpawnRule, idx: number, isTarget: boolean) => {
    const prefix = `${isTarget ? "Target" : "Independent Spawn"} #${idx + 1} (${rule.monsterName || rule.creatureType || "sin nombre"})`;
    
    // Check count
    if (rule.count === undefined || rule.count === null || rule.count <= 0) {
      errors.push(`${prefix}: La cantidad (Count) debe ser mayor que 0.`);
    }

    // Check Playable Zone existence
    if (!rule.spawnPlayableZoneId) {
      errors.push(`${prefix}: No tiene zona de spawn (spawnPlayableZoneId).`);
    } else {
      const pzExists = worldDb.playableZones[rule.spawnPlayableZoneId];
      if (!pzExists) {
        errors.push(`${prefix}: spawnPlayableZoneId '${rule.spawnPlayableZoneId}' no existe en World Database.`);
      }
    }

    // FASE 5.0 Monster database existence checks
    if (!rule.monsterId) {
      errors.push(`${prefix}: No se ha seleccionado un Monstruo (monsterId).`);
    } else if (monsters) {
      const foundMonster = monsters.find(m => m.id === rule.monsterId);
      if (!foundMonster) {
        errors.push(`${prefix}: El monsterId '${rule.monsterId}' no existe en la base de datos de monstruos.`);
      } else {
        // Check variant Color
        const color = rule.variantColor || rule.creatureColor;
        if (!color) {
          errors.push(`${prefix}: No se ha seleccionado un color de variante.`);
        } else {
          const colorLower = color.toLowerCase();
          if (colorLower !== "green" && colorLower !== "red" && colorLower !== "purple" && colorLower !== "blue") {
            errors.push(`${prefix}: Variante de color '${color}' inválida. Debe ser: green, red, purple, blue.`);
          } else {
            const variantExists = foundMonster.variants[colorLower as "green" | "red" | "purple" | "blue"];
            if (!variantExists) {
              errors.push(`${prefix}: La variante de color '${color}' no está definida para el monstruo '${foundMonster.name}'.`);
            }
          }
        }
      }
    }

    // Validate ownership
    const ownership = rule.questOwnership;
    if (!ownership) {
      errors.push(`${prefix}: No tiene facción propietaria (questOwnership).`);
    } else {
      const ownershipLower = ownership.toLowerCase();
      if (ownershipLower !== "alliance" && ownershipLower !== "horde" && ownershipLower !== "neutral") {
        errors.push(`${prefix}: Facción propietaria '${ownership}' inválida. Debe ser: alliance, horde, neutral.`);
      }
    }

    // Validate source
    const source = rule.spawnSource;
    if (!source) {
      errors.push(`${prefix}: No tiene origen del spawn (spawnSource).`);
    } else {
      const sourceLower = source.toLowerCase();
      if (
        sourceLower !== "quest_target" &&
        sourceLower !== "quest_elite" &&
        sourceLower !== "quest_boss" &&
        sourceLower !== "world_spawn"
      ) {
        errors.push(`${prefix}: Origen de spawn '${source}' inválido. Debe ser: quest_target, quest_elite, quest_boss, world_spawn.`);
      }
    }
  };

  // Target creatures validation
  if (!qd.targetCreatures || qd.targetCreatures.length === 0) {
    errors.push("Debe haber al menos una criatura objetivo (Quest Target) definida.");
  } else {
    qd.targetCreatures.forEach((rule, idx) => {
      validateSpawnRule(rule, idx, true);
    });
  }

  // Independent spawns validation
  if (qd.independentCreatures) {
    qd.independentCreatures.forEach((rule, idx) => {
      validateSpawnRule(rule, idx, false);
    });
  }

  return errors;
};

export interface AuditResult {
  passed: boolean;
  errors: string[];
}

export function auditPilotLinkedCards(cardData: any): AuditResult {
  const errors: string[] = [];
  if (!cardData || !cardData.linkedCardReferenceId) {
    return { passed: true, errors: [] };
  }

  const original = CardReferenceIndex.getCard(cardData.linkedCardReferenceId);
  if (!original) {
    errors.push(`Definición original '${cardData.linkedCardReferenceId}' no encontrada en el CardReferenceIndex.`);
    return { passed: false, errors };
  }

  // 1. Compare expansion, id, name, text, tags, etc.
  if (original.expansion && cardData.expansion !== original.expansion) {
    errors.push(`Mapeo de expansión no coincide: '${cardData.expansion}' vs original '${original.expansion}'`);
  }

  // 2. Compare metadata
  if (original.metadata) {
    const assetMeta = cardData.metadata || {};
    for (const [key, val] of Object.entries(original.metadata)) {
      const assetVal = assetMeta[key];
      if (assetVal === undefined) {
        errors.push(`Falta el campo de metadatos '${key}' en el asset.`);
      } else if (JSON.stringify(assetVal) !== JSON.stringify(val)) {
        errors.push(`Metadatos '${key}' no coinciden: '${JSON.stringify(assetVal)}' vs original '${JSON.stringify(val)}'`);
      }
    }
  }

  // 3. Compare mechanics / modifiers
  const originalMechanics = original.mechanics || [];
  const assetMechanics = cardData.mechanics || cardData.modifiers || [];

  if (originalMechanics.length !== assetMechanics.length) {
    errors.push(`Número de mecánicas no coincide: ${assetMechanics.length} en asset vs ${originalMechanics.length} en original.`);
  } else {
    for (let i = 0; i < originalMechanics.length; i++) {
      const origMech = originalMechanics[i];
      const assetMech = assetMechanics[i];

      if (origMech.trigger !== assetMech.trigger) {
        errors.push(`Mecánica #${i + 1}: el disparador (trigger) no coincide ('${assetMech.trigger}' vs '${origMech.trigger}').`);
      }
      if (origMech.activation !== assetMech.activation) {
        errors.push(`Mecánica #${i + 1}: la activación no coincide ('${assetMech.activation}' vs '${origMech.activation}').`);
      }

      // Compare conditions
      const origConds = origMech.conditions || [];
      const assetConds = assetMech.conditions || [];
      if (origConds.length !== assetConds.length) {
        errors.push(`Mecánica #${i + 1}: el número de condiciones no coincide.`);
      } else {
        for (let j = 0; j < origConds.length; j++) {
          const origC = origConds[j];
          const assetC = assetConds[j];
          if (origC.type !== assetC.type) {
            errors.push(`Mecánica #${i + 1}, Condición #${j + 1}: el tipo no coincide ('${assetC.type}' vs '${origC.type}').`);
          } else {
            for (const [ckey, cvalue] of Object.entries(origC)) {
              if (ckey === 'type') continue;
              const assetCvalue = assetC[ckey];
              if (JSON.stringify(assetCvalue) !== JSON.stringify(cvalue)) {
                errors.push(`Mecánica #${i + 1}, Condición #${j + 1}: el parámetro '${ckey}' no coincide (${JSON.stringify(assetCvalue)} vs original ${JSON.stringify(cvalue)}).`);
              }
            }
          }
        }
      }

      // Compare costs
      const origCosts = origMech.costs || [];
      const assetCosts = assetMech.costs || [];
      if (origCosts.length !== assetCosts.length) {
        errors.push(`Mecánica #${i + 1}: el número de costes no coincide.`);
      } else {
        for (let j = 0; j < origCosts.length; j++) {
          const origCo = origCosts[j];
          const assetCo = assetCosts[j];
          if (origCo.type !== assetCo.type) {
            errors.push(`Mecánica #${i + 1}, Coste #${j + 1}: el tipo no coincide ('${assetCo.type}' vs '${origCo.type}').`);
          } else {
            for (const [cokey, covalue] of Object.entries(origCo)) {
              if (cokey === 'type') continue;
              const assetCovalue = assetCo[cokey];
              if (JSON.stringify(assetCovalue) !== JSON.stringify(covalue)) {
                errors.push(`Mecánica #${i + 1}, Coste #${j + 1}: el parámetro '${cokey}' no coincide (${JSON.stringify(assetCovalue)} vs original ${JSON.stringify(covalue)}).`);
              }
            }
          }
        }
      }

      // Compare effects
      const origEffects = origMech.effects || [];
      const assetEffects = assetMech.effects || [];
      if (origEffects.length !== assetEffects.length) {
        errors.push(`Mecánica #${i + 1}: el número de efectos no coincide (${assetEffects.length} vs ${origEffects.length}).`);
      } else {
        for (let j = 0; j < origEffects.length; j++) {
          const origEff = origEffects[j];
          const assetEff = assetEffects[j];
          
          if (origEff.type !== assetEff.type) {
            errors.push(`Mecánica #${i + 1}, Efecto #${j + 1}: el tipo no coincide ('${assetEff.type}' vs '${origEff.type}').`);
          } else {
            for (const [ekey, evalue] of Object.entries(origEff)) {
              if (ekey === 'type') continue;
              const assetEvalue = assetEff[ekey];
              if (assetEvalue === undefined) {
                errors.push(`Mecánica #${i + 1}, Efecto #${j + 1}: falta el parámetro '${ekey}' en el asset.`);
              } else if (JSON.stringify(assetEvalue) !== JSON.stringify(evalue)) {
                errors.push(`Mecánica #${i + 1}, Efecto #${j + 1}: el parámetro '${ekey}' no coincide (${JSON.stringify(assetEvalue)} vs original ${JSON.stringify(evalue)}).`);
              }
            }
          }
        }
      }
    }
  }

  return {
    passed: errors.length === 0,
    errors,
  };
}

interface CardDataEditorProps {
  initialRecord: AssetRecord;
  records: AssetRecord[];
  onClose: () => void;
}

export function CardDataEditor({
  initialRecord,
  records,
  onClose,
}: CardDataEditorProps) {
  const [currentRecord, setCurrentRecord] =
    useState<AssetRecord>(initialRecord);
  const [cardData, setCardData] = useState<AnyCardData | null>(null);
  const [monsters, setMonsters] = useState<MonsterData[]>([]);
  const [loading, setLoading] = useState(true);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiProgressMsg, setAiProgressMsg] = useState("Analizando con IA...");
  const [aiPreviewData, setAiPreviewData] = useState<
    (AnyCardData & { confidence?: number }) | null
  >(null);

  const [linkSearch, setLinkSearch] = useState("");
  const [linkSuggestions, setLinkSuggestions] = useState<CardReference[]>([]);
  const [searchMatches, setSearchMatches] = useState<CardReference[]>([]);

  // Automatically pre-populate index with triangle YAML on mount if empty
  useEffect(() => {
    if (CardReferenceIndex.getAllCards().length === 0) {
      console.log("[CardDataEditor] Pre-populating CardReferenceIndex with triangle cards...");
      CardReferenceImporter.parseYamlContent(triangleYaml);
    }
  }, []);

  // Suggestion matcher using tokens and filenames
  const getSuggestedMatches = (fileName: string, displayName: string, recordId: string): CardReference[] => {
    const allCards = CardReferenceIndex.getAllCards();
    const clean = (s: string) => (s || "").toLowerCase().replace(/[^a-z0-9]/g, "");
    
    const normFile = clean(fileName);
    const normDisplay = clean(displayName);
    const normId = clean(recordId);

    return allCards.filter(card => {
      const normCardId = clean(card.id);
      const normCardName = clean(card.name);

      // 1. Direct or partial matches
      if (normCardId && (normFile.includes(normCardId) || normCardId.includes(normFile))) return true;
      if (normCardName && (normFile.includes(normCardName) || normCardName.includes(normFile))) return true;
      if (normCardId && (normDisplay.includes(normCardId) || normCardId.includes(normDisplay))) return true;
      if (normCardName && (normDisplay.includes(normCardName) || normCardName.includes(normDisplay))) return true;
      if (normCardId && (normId.includes(normCardId) || normCardId.includes(normId))) return true;

      // 2. Token matches
      const tokens = [
        ...fileName.toLowerCase().split(/[^a-z0-9]+/),
        ...displayName.toLowerCase().split(/[^a-z0-9]+/),
        ...recordId.toLowerCase().split(/[^a-z0-9]+/)
      ].filter(t => t.length > 3);

      for (const t of tokens) {
        if (normCardId.includes(t) || normCardName.includes(t)) {
          return true;
        }
      }
      return false;
    });
  };

  // Calculate suggestions when record/all cards change
  useEffect(() => {
    const suggestions = getSuggestedMatches(
      currentRecord.originalFileName || "",
      currentRecord.displayName || "",
      currentRecord.id || ""
    );
    setLinkSuggestions(suggestions);
  }, [currentRecord, CardReferenceIndex.getAllCards()]);

  // Query matching for manual search
  useEffect(() => {
    if (!linkSearch.trim()) {
      setSearchMatches([]);
      return;
    }
    const matches = CardReferenceIndex.findByNormalizedName(linkSearch);
    setSearchMatches(matches);
  }, [linkSearch]);

  const handleLinkReference = (ref: CardReference) => {
    if (!cardData) return;

    const deckId = (ref as any).deckId || (ref.metadata as any)?.deckId || "triangle";

    const mechanicsCopy = ref.mechanics ? JSON.parse(JSON.stringify(ref.mechanics)) : [];
    const metadataCopy = ref.metadata ? JSON.parse(JSON.stringify(ref.metadata)) : {};

    const updatedData: AnyCardData = {
      ...cardData,
      linkedCardReferenceId: ref.id,
      linkedCardReferenceName: ref.name,
      dataSource: "YAML_REFERENCE",
      deckColor: deckId,
      mechanics: mechanicsCopy,
      metadata: metadataCopy,
    };

    // If item card, populate relevant item fields
    if (updatedData.type === "item" && ref.metadata) {
      const itemData = updatedData as ItemCardData;
      const meta = ref.metadata as any;
      itemData.itemType = meta.itemType;
      itemData.slot = meta.slot || meta.equipmentSlot;
      itemData.weaponType = meta.weaponType;
      itemData.armorType = meta.armorType;
      itemData.level = meta.requiredLevel;
      itemData.goldValue = meta.goldValue;
      itemData.deckId = deckId;
      itemData.modifiers = mechanicsCopy;
    }

    setCardData(updatedData);
  };

  const handleUnlinkReference = () => {
    if (!cardData) return;
    const updatedData = { ...cardData };
    delete updatedData.linkedCardReferenceId;
    delete updatedData.linkedCardReferenceName;
    delete updatedData.dataSource;
    delete updatedData.mechanics;
    delete updatedData.metadata;
    if (updatedData.type === "item") {
      delete (updatedData as ItemCardData).modifiers;
    }
    setCardData(updatedData);
  };

  // Computed index for next/prev
  const currentIndex = records.findIndex((r) => r.id === currentRecord.id);

  const loadData = async (record: AssetRecord) => {
    setLoading(true);
    setAiPreviewData(null);
    try {
      const monsterList = await getAllMonsters();
      setMonsters(monsterList);

      let data = await getCardData(record.id);
      if (!data) {
        // Initialize default data based on type
        data = {
          cardId: record.id,
          assetId: record.id,
          type: record.type as any,
          title: record.displayName,
          expansion: record.expansion,
          faction: record.faction,
          deckColor: record.deckOrColor,
        } as AnyCardData;

        if (record.type === "item") {
          (data as ItemCardData).deckId = mapDeckOrColorToId(record.deckOrColor);
          data.deckColor = (data as ItemCardData).deckId!;
        }

        if (record.type === "quest") {
          (data as QuestCardData).questLevel = 1;
          (data as QuestCardData).questArea = "";
          (data as QuestCardData).primaryRegion = "";
          (data as QuestCardData).objectiveText = "";
          (data as QuestCardData).flavorText = "";
          (data as QuestCardData).fullRulesText = "";
          (data as QuestCardData).notes = "";
          (data as QuestCardData).targetCreatures = [];
          (data as QuestCardData).independentCreatures = [];
          (data as QuestCardData).spawnRegions = [];
          (data as QuestCardData).rewards = {
            xp: 0,
            gold: 0,
            itemRewards: [],
            specialItems: [],
          };
        }
      } else {
        if (data.type === "item" && !(data as ItemCardData).deckId) {
          (data as ItemCardData).deckId = mapDeckOrColorToId(data.deckColor);
        }
      }
      setCardData(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData(currentRecord);
  }, [currentRecord.id]);

  const handleSaveData = async (
    newState: ReviewState = currentRecord.reviewState || "incomplete_data",
  ) => {
    if (!cardData) return;

    if (newState === "verified" || newState === "data_complete") {
      const errors = getValidationErrors(cardData, monsters);
      if (errors.length > 0) {
        alert(
          `No se puede marcar como ${newState} debido a los siguientes errores de validación:\n\n` +
          errors.map(err => `• ${err}`).join("\n")
        );
        return;
      }
    }

    try {
      await saveCardData(cardData);
      const updatedRecord = { ...currentRecord, reviewState: newState };
      await saveAssetRecord(updatedRecord);
      setCurrentRecord(updatedRecord);
      // We don't close, just show success or move next
    } catch (err) {
      console.error(err);
      alert("Error saving data");
    }
  };

  const handleNext = () => {
    if (currentIndex < records.length - 1) {
      setCurrentRecord(records[currentIndex + 1]);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentRecord(records[currentIndex - 1]);
    }
  };

  const handleDuplicateFromPrev = async () => {
    if (currentIndex > 0) {
      const prevRecord = records[currentIndex - 1];
      const prevData = await getCardData(prevRecord.id);
      if (prevData) {
        setCardData({
          ...prevData,
          cardId: currentRecord.id,
          assetId: currentRecord.id,
        });
      } else {
        alert("La carta anterior no tiene datos guardados.");
      }
    } else {
      alert("No hay carta anterior.");
    }
  };

  const handleAnalyzeWithAI = async () => {
    console.log(
      `[CardDataEditor] handleAnalyzeWithAI called for asset: ${currentRecord.id}`,
    );
    setAiLoading(true);
    setAiProgressMsg("Analizando carta...");
    setAiPreviewData(null);
    try {
      const apiKey = localStorage.getItem("gemini_api_key") || undefined;
      const initialModel =
        localStorage.getItem("gemini_model") || "gemini-2.5-flash";
      console.log(
        `[CardDataEditor] Retrieved API key from localStorage: ${apiKey ? "Yes" : "No"}, Model: ${initialModel}`,
      );
      const extractedData = await extractCardDataFromImage(
        currentRecord.id,
        apiKey,
        initialModel,
        (msg) => setAiProgressMsg(msg),
      );
      console.log(
        `[CardDataEditor] Extracted data received successfully:`,
        extractedData,
      );
      setAiPreviewData(extractedData);
    } catch (err: any) {
      console.error(`[CardDataEditor] Error analyzing card with AI:`, err);
      alert("Error analizando carta con IA: " + err.message);
    } finally {
      console.log(`[CardDataEditor] handleAnalyzeWithAI finished.`);
      setAiLoading(false);
      setAiProgressMsg("Analizando con IA...");
    }
  };

  const applyAiData = async () => {
    console.log(`Applying AI Data`, aiPreviewData);
    console.log(`BEFORE APPLY`, cardData);

    if (!aiPreviewData) {
      console.warn(
        `[CardDataEditor] applyAiData aborted because aiPreviewData is null.`,
      );
      return;
    }
    const { confidence, ...aiData } = aiPreviewData;

    // Helper to clean null-ish string values from AI
    const cleanNulls = (val: any) => {
      if (
        typeof val === "string" &&
        ["null", "undefined", "unknown", ""].includes(val.toLowerCase().trim())
      ) {
        return undefined;
      }
      return val;
    };

    // Clean AI data
    const cleanedAiData = Object.fromEntries(
      Object.entries(aiData).map(([k, v]) => [k, cleanNulls(v)]),
    );

    // Ensure array fields are not null
    if (!cleanedAiData.targetCreatures) cleanedAiData.targetCreatures = [];
    if (!cleanedAiData.independentCreatures)
      cleanedAiData.independentCreatures = [];
    if (!cleanedAiData.spawnRegions) cleanedAiData.spawnRegions = [];
    if (cleanedAiData.rewards && !cleanedAiData.rewards.itemRewards) {
      cleanedAiData.rewards.itemRewards = [];
    }
    if (cleanedAiData.rewards && !cleanedAiData.rewards.specialItems) {
      cleanedAiData.rewards.specialItems = [];
    }

    // Derive batch metadata
    const meta = {
      faction: undefined as string | undefined,
      deckColor: undefined as string | undefined,
      expansion: undefined as string | undefined,
    };
    const textToSearch = (
      (currentRecord.originalFileName || "") +
      " " +
      (currentRecord.batchId || "")
    ).toLowerCase();
    if (textToSearch.includes("alliance")) meta.faction = "alliance";
    if (textToSearch.includes("horde")) meta.faction = "horde";
    if (textToSearch.includes("tier 1")) meta.deckColor = "gray";
    if (textToSearch.includes("tier 2")) meta.deckColor = "green";
    if (textToSearch.includes("tier 3")) meta.deckColor = "yellow";
    if (textToSearch.includes("tier 4")) meta.deckColor = "red";
    if (textToSearch.includes("tier 5")) {
      meta.deckColor = "purple";
      meta.expansion = "burning_crusade";
    }

    // Smart merge
    const finalData = {
      ...cleanedAiData,
      faction:
        cleanNulls(currentRecord.faction) ??
        cleanNulls(cardData?.faction) ??
        meta.faction ??
        cleanedAiData.faction,
      deckColor:
        cleanNulls(currentRecord.deckOrColor) ??
        cleanNulls(cardData?.deckColor) ??
        meta.deckColor ??
        cleanedAiData.deckColor,
      expansion:
        cleanNulls(currentRecord.expansion) ??
        cleanNulls(cardData?.expansion) ??
        meta.expansion ??
        cleanedAiData.expansion,
    };

    console.log(`AFTER APPLY`, finalData);
    setCardData(finalData as AnyCardData);
    setAiPreviewData(null);

    // Auto-mark as incomplete_data after applying
    console.log(
      `[CardDataEditor] Updating record reviewState to 'incomplete_data'`,
    );
    const updatedRecord = {
      ...currentRecord,
      reviewState: "incomplete_data" as ReviewState,
    };
    await saveAssetRecord(updatedRecord);
    setCurrentRecord(updatedRecord);
    console.log(`[CardDataEditor] applyAiData completed.`);
  };

  const updateQuestField = (field: keyof QuestCardData, value: any) => {
    setCardData((prev) => (prev ? { ...prev, [field]: value } : prev));
  };

  const addTargetCreature = () => {
    if (cardData?.type !== "quest") return;
    const newRule: SpawnRule = {
      monsterId: "",
      monsterName: "",
      variantColor: "green",
      creatureType: "",
      creatureColor: "green",
      count: 1,
      spawnPlayableZoneId: "",
      spawnPlayableZoneName: "",
      spawnWorldRegionId: "",
      spawnWorldRegionName: "",
      regionName: "",
      regionId: "",
      questOwnership: getSpawnOwnership(cardData.faction || "neutral", "green"),
      spawnSource: "quest_target",
      isRequiredForCompletion: true,
      creatureAssetId: ""
    };
    updateQuestField("targetCreatures", [...cardData.targetCreatures, newRule]);
  };

  const updateTargetCreature = (index: number, rule: Partial<SpawnRule>) => {
    if (cardData?.type !== "quest") return;
    const newList = [...cardData.targetCreatures];
    const updatedRule = { ...newList[index], ...rule };
    const faction = cardData.faction || "neutral";
    const color = updatedRule.variantColor || updatedRule.creatureColor || "green";
    updatedRule.questOwnership = getSpawnOwnership(faction, color);
    newList[index] = updatedRule;
    updateQuestField("targetCreatures", newList);
  };

  const removeTargetCreature = (index: number) => {
    if (cardData?.type !== "quest") return;
    updateQuestField(
      "targetCreatures",
      cardData.targetCreatures.filter((_, i) => i !== index),
    );
  };

  const addIndependentCreature = () => {
    if (cardData?.type !== "quest") return;
    const newRule: SpawnRule = {
      monsterId: "",
      monsterName: "",
      variantColor: "green",
      creatureType: "",
      creatureColor: "green",
      count: 1,
      spawnPlayableZoneId: "",
      spawnPlayableZoneName: "",
      spawnWorldRegionId: "",
      spawnWorldRegionName: "",
      regionName: "",
      regionId: "",
      questOwnership: getSpawnOwnership(cardData.faction || "neutral", "green"),
      spawnSource: "world_spawn",
      isRequiredForCompletion: false,
      creatureAssetId: ""
    };
    updateQuestField("independentCreatures", [
      ...cardData.independentCreatures,
      newRule,
    ]);
  };

  const updateIndependentCreature = (
    index: number,
    rule: Partial<SpawnRule>,
  ) => {
    if (cardData?.type !== "quest") return;
    const newList = [...cardData.independentCreatures];
    const updatedRule = { ...newList[index], ...rule };
    const faction = cardData.faction || "neutral";
    const color = updatedRule.variantColor || updatedRule.creatureColor || "green";
    updatedRule.questOwnership = getSpawnOwnership(faction, color);
    newList[index] = updatedRule;
    updateQuestField("independentCreatures", newList);
  };

  const removeIndependentCreature = (index: number) => {
    if (cardData?.type !== "quest") return;
    updateQuestField(
      "independentCreatures",
      cardData.independentCreatures.filter((_, i) => i !== index),
    );
  };

  const addItemReward = () => {
    if (cardData?.type !== "quest") return;
    const newReward: ItemReward = { itemDeck: "", drawCount: 1, keepCount: 1 };
    updateQuestField("rewards", {
      ...cardData.rewards,
      itemRewards: [...cardData.rewards.itemRewards, newReward],
    });
  };

  const updateItemReward = (index: number, reward: Partial<ItemReward>) => {
    if (cardData?.type !== "quest") return;
    const newList = [...cardData.rewards.itemRewards];
    newList[index] = { ...newList[index], ...reward };
    updateQuestField("rewards", { ...cardData.rewards, itemRewards: newList });
  };

  const removeItemReward = (index: number) => {
    if (cardData?.type !== "quest") return;
    updateQuestField("rewards", {
      ...cardData.rewards,
      itemRewards: cardData.rewards.itemRewards.filter((_, i) => i !== index),
    });
  };

  const handleExportYaml = () => {
    if (!cardData) return;
    if (cardData.type === "item") {
      const item = cardData as ItemCardData;
      const itemRef: ItemCardReference = {
        id: item.cardId,
        name: item.title,
        type: "ITEM",
        deckId: item.deckId || "triangle",
        expansion: item.expansion || "CORE",
        tags: [],
        draft: false,
        metadata: {
          deckId: item.deckId || "triangle",
          itemType: item.itemType || "QUEST_ITEM",
          slot: item.slot || "NONE",
          weaponType: item.weaponType === "NONE" ? undefined : item.weaponType,
          armorType: item.armorType === "NONE" ? undefined : item.armorType,
          requiredLevel: item.level || 0,
          goldValue: item.goldValue || 0,
          tags: [],
        },
        mechanics: (item.modifiers || []) as any,
      };
      const yamlStr = CardReferenceImporter.exportToYaml(itemRef);
      navigator.clipboard.writeText(yamlStr).then(() => {
        alert("YAML copiado al portapapeles");
      });
    } else {
      alert("La exportación a YAML actualmente solo está implementada para Items.");
    }
  };

  const handleImportYaml = () => {
    const yamlStr = prompt("Pega el YAML de la carta aquí:");
    if (!yamlStr) return;
    const report = CardReferenceImporter.parseYamlContent(yamlStr);
    if (report.validCount > 0 && report.validCards[0]) {
      const converted = CardReferenceImporter.convertReferenceToCardData(report.validCards[0]);
      setCardData({ ...cardData, ...converted } as AnyCardData);
      alert(`YAML importado correctamente.`);
    } else {
      console.error(report.errors);
      alert(`Error al importar YAML: ${report.errors.map(e => e.message).join(", ")}`);
    }
  };

  if (loading || !cardData) {
    return (
      <div className="fixed inset-0 z-[400] bg-black/95 flex items-center justify-center text-white">
        Cargando...
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[400] bg-neutral-950 flex flex-col md:flex-row overflow-hidden font-sans text-neutral-200">
      {/* Header Mobile / Close */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 p-2 bg-neutral-900 rounded-full hover:bg-neutral-800 transition-colors"
      >
        <X className="w-6 h-6" />
      </button>

      {/* Left: Image */}
      <div className="flex-1 bg-black flex flex-col items-center justify-center p-8 relative">
        <div className="absolute top-4 left-4 flex items-center gap-2">
          <button
            onClick={handlePrev}
            disabled={currentIndex === 0}
            className="p-2 bg-neutral-900 rounded hover:bg-neutral-800 disabled:opacity-50"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="text-neutral-500 text-sm">
            {currentIndex + 1} / {records.length}
          </span>
          <button
            onClick={handleNext}
            disabled={currentIndex === records.length - 1}
            className="p-2 bg-neutral-900 rounded hover:bg-neutral-800 disabled:opacity-50"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {aiLoading && (
          <div className="absolute inset-0 bg-black/80 z-20 flex flex-col items-center justify-center text-blue-400">
            <Wand2 className="w-12 h-12 mb-4 animate-bounce" />
            <p className="font-bold">{aiProgressMsg}</p>
          </div>
        )}

        <BlobImage
          cardId={currentRecord.id}
          className="max-h-[80vh] max-w-full object-contain rounded-xl shadow-2xl"
        />

        <div className="mt-6 flex gap-4">
          <span
            className={`px-3 py-1 rounded text-xs font-bold uppercase tracking-wider ${
              currentRecord.reviewState === "verified"
                ? "bg-green-900/50 text-green-400 border border-green-800"
                : currentRecord.reviewState === "data_complete"
                  ? "bg-blue-900/50 text-blue-400 border border-blue-800"
                  : currentRecord.reviewState === "incomplete_data"
                    ? "bg-yellow-900/50 text-yellow-400 border border-yellow-800"
                    : "bg-neutral-800 text-neutral-400 border border-neutral-700"
            }`}
          >
            Estado: {currentRecord.reviewState || "visual_only"}
          </span>
        </div>
      </div>

      {/* Right: Form */}
      <div className="w-full md:w-[500px] lg:w-[600px] bg-neutral-900 border-l border-neutral-800 flex flex-col h-full">
        <div className="p-4 border-b border-neutral-800 bg-neutral-950 flex items-center justify-between shrink-0">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            Card Data Editor
          </h2>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleAnalyzeWithAI}
              disabled={aiLoading}
              className="bg-indigo-700 hover:bg-indigo-600 disabled:opacity-50 text-white p-2 rounded text-sm transition-colors mr-2 flex items-center gap-1"
              title="Analizar carta con IA"
            >
              <Wand2 className="w-4 h-4" />
              <span className="hidden sm:inline">Analizar con IA</span>
            </button>
            <button
              type="button"
              onClick={handleDuplicateFromPrev}
              className="bg-neutral-800 hover:bg-neutral-700 text-neutral-400 p-2 rounded text-sm transition-colors mr-2"
              title="Duplicar datos desde carta anterior"
            >
              <Copy className="w-4 h-4" />
            </button>
            <div className="flex gap-1 mr-2 border-r border-neutral-700 pr-2">
              <button
                onClick={handleImportYaml}
                className="bg-neutral-800 hover:bg-neutral-700 text-cyan-400 p-2 rounded text-sm transition-colors"
                title="Importar YAML"
              >
                <Download className="w-4 h-4" />
              </button>
              <button
                onClick={handleExportYaml}
                className="bg-neutral-800 hover:bg-neutral-700 text-cyan-400 p-2 rounded text-sm transition-colors"
                title="Exportar YAML (Portapapeles)"
              >
                <Upload className="w-4 h-4" />
              </button>
            </div>
            <button
              onClick={() => handleSaveData("incomplete_data")}
              className="bg-neutral-800 hover:bg-neutral-700 text-white p-2 rounded text-sm transition-colors"
              title="Guardar como incompleto"
            >
              <Save className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleSaveData("data_complete")}
              disabled={!cardData || getValidationErrors(cardData, monsters).length > 0}
              className="bg-blue-700 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white p-2 rounded text-sm transition-colors"
              title="Marcar como revisada"
            >
              <Check className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <GeminiConfigPanel />

          {aiPreviewData && (
            <div className="bg-indigo-900/30 border border-indigo-700/50 rounded-lg p-4 mb-6 shadow-lg">
              <h3 className="text-indigo-300 font-bold mb-2 flex items-center gap-2">
                <Wand2 className="w-4 h-4" />
                Datos detectados por IA
              </h3>

              {aiPreviewData.confidence !== undefined &&
                aiPreviewData.confidence < 0.75 && (
                  <div className="bg-yellow-900/30 text-yellow-400 p-2 rounded text-xs flex items-center gap-2 mb-3">
                    <AlertTriangle className="w-4 h-4" />
                    Revisar manualmente: la IA no está segura de algunos campos.
                  </div>
                )}

              <div className="text-xs text-neutral-300 mb-4 max-h-32 overflow-y-auto bg-black/30 p-2 rounded font-mono">
                {JSON.stringify(aiPreviewData, null, 2)}
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={applyAiData}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded text-sm font-bold flex-1 transition-colors"
                >
                  Aplicar al editor
                </button>
                <button
                  type="button"
                  onClick={() => setAiPreviewData(null)}
                  className="bg-neutral-800 hover:bg-neutral-700 text-neutral-300 px-4 py-2 rounded text-sm transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {/* Link Mechanical Definition Section */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
              <h3 className="text-sm font-bold text-neutral-300 flex items-center gap-2">
                <Link className="w-4 h-4 text-cyan-400" />
                Vincular Definición Mecánica
              </h3>
              {cardData?.linkedCardReferenceId ? (
                <span className="bg-cyan-900/40 text-cyan-400 text-xs px-2.5 py-1 rounded font-medium flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Vinculado
                </span>
              ) : (
                <span className="bg-neutral-800 text-neutral-400 text-xs px-2.5 py-1 rounded font-medium">
                  Sin Vincular
                </span>
              )}
            </div>

            {/* Current Link Status */}
            {cardData?.linkedCardReferenceId ? (
              <div className="bg-neutral-950 p-3 rounded border border-neutral-800/60 flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="text-xs text-neutral-400">Referencia Asociada</div>
                  <div className="text-sm font-bold text-white flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-cyan-400" />
                    {cardData.linkedCardReferenceName}
                    <span className="text-xs text-neutral-500 font-normal">({cardData.linkedCardReferenceId})</span>
                  </div>
                  <div className="text-[11px] text-neutral-500 flex flex-wrap gap-x-3 gap-y-1 mt-1 font-mono">
                    <span>Mazo: {cardData.deckColor || 'N/A'}</span>
                    <span>Modificadores: {cardData.mechanics?.length || 0}</span>
                    <span>Origen: {cardData.dataSource}</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleUnlinkReference}
                  className="text-neutral-500 hover:text-red-400 p-1.5 rounded bg-neutral-900 hover:bg-neutral-900/50 border border-neutral-800 transition-colors shrink-0"
                  title="Desvincular definición"
                >
                  <Unlink className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <p className="text-xs text-neutral-400 leading-relaxed">
                Este asset no tiene vinculada ninguna definición mecánica YAML. Puedes buscar una abajo o usar las sugerencias automáticas.
              </p>
            )}

            {/* Audit Status */}
            {cardData?.linkedCardReferenceId && (
              (() => {
                const auditResult = auditPilotLinkedCards(cardData);
                return auditResult.passed ? (
                  <div className="bg-emerald-950/30 border border-emerald-900/60 p-3 rounded-md flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                    <div className="space-y-0.5">
                      <div className="text-xs font-bold text-emerald-400">Auditoría Exitosa</div>
                      <div className="text-[11px] text-emerald-300/80 leading-relaxed">
                        Todas las mecánicas, efectos y metadatos coinciden perfectamente con la definición YAML original.
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-red-950/30 border border-red-900/60 p-3 rounded-md flex items-start gap-2.5">
                    <span className="w-2 h-2 rounded-full bg-red-500 mt-1.5 shrink-0 animate-pulse"></span>
                    <div className="space-y-1.5 w-full">
                      <div className="text-xs font-bold text-red-400 flex items-center justify-between">
                        <span>Discrepancia detectada en Auditoría</span>
                        <span className="text-[10px] bg-red-900/30 text-red-400 px-1.5 py-0.5 rounded font-mono font-normal">
                          {auditResult.errors.length} {auditResult.errors.length === 1 ? 'error' : 'errores'}
                        </span>
                      </div>
                      <div className="text-[11px] text-red-300/80 leading-relaxed">
                        El asset actual difiere de la definición original del archivo YAML:
                      </div>
                      <ul className="list-disc pl-4 text-[10px] text-red-400 space-y-1 bg-black/20 p-2 rounded max-h-40 overflow-y-auto font-mono">
                        {auditResult.errors.map((err, i) => (
                          <li key={i}>{err}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                );
              })()
            )}

            {/* Auto Suggestions */}
            {!cardData?.linkedCardReferenceId && linkSuggestions.length > 0 && (
              <div className="space-y-1.5">
                <div className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider">Sugerencias Automáticas</div>
                <div className="grid grid-cols-1 gap-1.5">
                  {linkSuggestions.map(ref => (
                    <button
                      key={ref.id}
                      type="button"
                      onClick={() => handleLinkReference(ref)}
                      className="w-full text-left bg-neutral-950 hover:bg-cyan-950/20 hover:border-cyan-800/50 border border-neutral-800/80 p-2.5 rounded transition-all flex items-center justify-between group"
                    >
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-cyan-400" />
                        <div>
                          <div className="text-xs font-semibold text-white group-hover:text-cyan-300 transition-colors">
                            {ref.name} <span className="text-[10px] text-neutral-500 font-mono">({ref.id})</span>
                          </div>
                          <div className="text-[10px] text-neutral-400 truncate max-w-[340px]">
                            {ref.text || "Sin texto de reglas"}
                          </div>
                        </div>
                      </div>
                      <span className="text-[10px] text-cyan-400 bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-900 opacity-0 group-hover:opacity-100 transition-opacity">
                        Vincular
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Search Tool */}
            <div className="space-y-2 pt-2 border-t border-neutral-800/50">
              <label className="block text-xs font-bold text-neutral-400">
                Buscar Definición Mecánica
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Ej: Skycaller, Shadow Wand..."
                  value={linkSearch}
                  onChange={(e) => setLinkSearch(e.target.value)}
                  className="flex-1 bg-neutral-950 border border-neutral-800 rounded px-3 py-1.5 text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-cyan-800 transition-colors"
                />
                {linkSearch && (
                  <button
                    type="button"
                    onClick={() => setLinkSearch("")}
                    className="text-xs text-neutral-400 hover:text-white px-2"
                  >
                    Limpiar
                  </button>
                )}
              </div>

              {/* Search Results */}
              {linkSearch && (
                <div className="bg-neutral-950 border border-neutral-800 rounded max-h-48 overflow-y-auto divide-y divide-neutral-900 mt-1">
                  {searchMatches.length > 0 ? (
                    searchMatches.map(ref => (
                      <div
                        key={ref.id}
                        className="p-2.5 flex items-center justify-between hover:bg-neutral-900/60 transition-colors"
                      >
                        <div className="space-y-0.5 pr-2">
                          <div className="text-xs font-semibold text-white flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
                            {ref.name}
                            <span className="text-[10px] text-neutral-500 font-mono">({ref.id})</span>
                          </div>
                          <div className="text-[10px] text-neutral-400">
                            {ref.text || "Sin descripción"}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            handleLinkReference(ref);
                            setLinkSearch("");
                          }}
                          className="bg-cyan-800 hover:bg-cyan-700 text-white text-[10px] font-bold px-2.5 py-1 rounded transition-colors shrink-0"
                        >
                          Vincular
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className="text-[11px] text-neutral-500 text-center py-4">
                      No se encontraron coincidencias para "{linkSearch}"
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Base Data */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-neutral-500 uppercase tracking-wider">
              Identificación
            </h3>

            <div>
              <label className="block text-xs text-neutral-400 mb-1">
                Título
              </label>
              <input
                type="text"
                value={cardData.title}
                onChange={(e) =>
                  setCardData({ ...cardData, title: e.target.value })
                }
                className="w-full bg-neutral-950 border border-neutral-800 rounded px-3 py-2 text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-neutral-400 mb-1">
                  Tipo
                </label>
                <input
                  type="text"
                  value={cardData.type}
                  disabled
                  className="w-full bg-neutral-950/50 border border-neutral-800 rounded px-3 py-2 text-neutral-500"
                />
              </div>
              <div>
                <label className="block text-xs text-neutral-400 mb-1">
                  Expansión
                </label>
                <input
                  type="text"
                  value={cardData.expansion}
                  onChange={(e) =>
                    setCardData({ ...cardData, expansion: e.target.value })
                  }
                  className="w-full bg-neutral-950 border border-neutral-800 rounded px-3 py-2 text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-neutral-400 mb-1 font-black uppercase text-yellow-500/90 tracking-wider font-mono">
                  Quest Faction / Facción
                </label>
                {cardData.type === "quest" ? (
                  <select
                    value={cardData.faction || "neutral"}
                    onChange={(e) => {
                      const newFaction = e.target.value;
                      const lowerFaction = newFaction.toLowerCase() as "alliance" | "horde" | "neutral";
                      
                      const updatedTargets = (cardData.targetCreatures || []).map((tc) => ({
                        ...tc,
                        questOwnership: getSpawnOwnership(lowerFaction, tc.variantColor || tc.creatureColor || "green")
                      }));
                      
                      const updatedIndependent = (cardData.independentCreatures || []).map((ic) => ({
                        ...ic,
                        questOwnership: getSpawnOwnership(lowerFaction, ic.variantColor || ic.creatureColor || "green")
                      }));

                      setCardData({
                        ...cardData,
                        faction: lowerFaction,
                        targetCreatures: updatedTargets,
                        independentCreatures: updatedIndependent
                      });
                    }}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded px-3 py-2 text-white text-xs font-bold font-sans"
                  >
                    <option value="alliance">Alliance</option>
                    <option value="horde">Horde</option>
                    <option value="neutral">Neutral</option>
                  </select>
                ) : (
                  <input
                    type="text"
                    value={cardData.faction}
                    onChange={(e) =>
                      setCardData({ ...cardData, faction: e.target.value })
                    }
                    className="w-full bg-neutral-950 border border-neutral-800 rounded px-3 py-2 text-white"
                  />
                )}
              </div>
              <div>
                <label className="block text-xs text-neutral-400 mb-1">
                  {cardData.type === "item" ? "Deck (Mazo)" : "Mazo / Color"}
                </label>
                {cardData.type === "item" ? (
                  <select
                    value={(cardData as ItemCardData).deckId || "triangle"}
                    onChange={(e) => {
                      const selectedDeck = e.target.value as "triangle" | "square" | "circle" | "hexagon" | "trophy";
                      setCardData({
                        ...cardData,
                        deckId: selectedDeck,
                        deckColor: selectedDeck,
                      } as ItemCardData);
                    }}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded px-3 py-2 text-white"
                  >
                    <option value="triangle">Triángulo</option>
                    <option value="square">Cuadrado</option>
                    <option value="circle">Círculo</option>
                    <option value="hexagon">Hexágono</option>
                    <option value="trophy">Trofeo</option>
                  </select>
                ) : (
                  <input
                    type="text"
                    value={cardData.deckColor}
                    onChange={(e) =>
                      setCardData({ ...cardData, deckColor: e.target.value })
                    }
                    className="w-full bg-neutral-950 border border-neutral-800 rounded px-3 py-2 text-white"
                  />
                )}
              </div>
            </div>
          </div>

          {/* Quest Data */}
          {cardData.type === "quest" && (
            <div className="space-y-6 border-t border-neutral-800 pt-6">
              <div>
                <h3 className="text-sm font-bold text-neutral-500 uppercase tracking-wider mb-4">
                  Location Data
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-neutral-400 mb-1">
                      Quest Area
                    </label>
                    <input
                      type="text"
                      value={(cardData as QuestCardData).questArea}
                      onChange={(e) =>
                        updateQuestField("questArea", e.target.value)
                      }
                      className="w-full bg-neutral-950 border border-neutral-800 rounded px-3 py-2 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-neutral-400 mb-1">
                      Primary Region
                    </label>
                    <input
                      type="text"
                      value={(cardData as QuestCardData).primaryRegion}
                      onChange={(e) =>
                        updateQuestField("primaryRegion", e.target.value)
                      }
                      className="w-full bg-neutral-950 border border-neutral-800 rounded px-3 py-2 text-white"
                    />
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-bold text-neutral-500 uppercase tracking-wider mb-4">
                  Quest Targets (Objectives)
                </h3>
                {(cardData as QuestCardData).targetCreatures.map(
                  (rule, idx) => (
                    <div
                      key={idx}
                      className="bg-neutral-950 border border-neutral-800 p-3 rounded mb-3 flex flex-col gap-2 relative"
                    >
                      <button
                        onClick={() => removeTargetCreature(idx)}
                        className="absolute top-2 right-2 text-neutral-500 hover:text-red-500"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <div className="grid grid-cols-3 gap-2 pr-6">
                        <div className="col-span-2">
                          <label className="block text-xs text-neutral-500 mb-1">
                            Monster & Variant (Database)
                          </label>
                          <MonsterPicker
                            selectedMonsterId={rule.monsterId || ""}
                            selectedVariantColor={rule.variantColor || rule.creatureColor || "green"}
                            onSelect={(monsterId, monsterName, variantColor, imageAssetId) => {
                              updateTargetCreature(idx, {
                                monsterId,
                                monsterName,
                                variantColor,
                                creatureType: monsterName,
                                creatureColor: variantColor,
                                creatureAssetId: imageAssetId
                              });
                            }}
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-neutral-500 mb-1">
                            Count
                          </label>
                          <input
                            type="number"
                            min="1"
                            value={rule.count}
                            onChange={(e) =>
                              updateTargetCreature(idx, {
                                count: Number(e.target.value),
                              })
                            }
                            className="w-full bg-neutral-900 border border-neutral-800 rounded px-2.5 py-1.5 text-xs text-white"
                          />
                        </div>
                        <div className="col-span-3">
                          <label className="block text-xs text-neutral-500 mb-1">
                            Spawn Playable Zone (World Database)
                          </label>
                          <PlayableZonePicker
                            valuePlayableZoneId={rule.spawnPlayableZoneId}
                            onChange={(updates) => {
                              if (updates) {
                                updateTargetCreature(idx, {
                                  spawnPlayableZoneId: updates.spawnPlayableZoneId,
                                  spawnPlayableZoneName: updates.spawnPlayableZoneName,
                                  spawnWorldRegionId: updates.spawnWorldRegionId,
                                  spawnWorldRegionName: updates.spawnWorldRegionName,
                                  regionName: updates.spawnPlayableZoneName,
                                  regionId: updates.spawnPlayableZoneId,
                                });
                              } else {
                                updateTargetCreature(idx, {
                                  spawnPlayableZoneId: "",
                                  spawnPlayableZoneName: "",
                                  spawnWorldRegionId: "",
                                  spawnWorldRegionName: "",
                                  regionName: "",
                                  regionId: "",
                                });
                              }
                            }}
                          />
                        </div>
                        <div className="col-span-2">
                          <label className="block text-xs text-neutral-500 mb-1 font-mono">
                            Source / Origen
                          </label>
                          <select
                            value={rule.spawnSource || "quest_target"}
                            onChange={(e) =>
                              updateTargetCreature(idx, {
                                spawnSource: e.target.value as any,
                              })
                            }
                            className="w-full bg-neutral-900 border border-neutral-800 rounded px-2.5 py-1.5 text-xs text-white"
                          >
                            <option value="quest_target">Quest Target</option>
                            <option value="quest_elite">Quest Elite</option>
                            <option value="quest_boss">Quest Boss</option>
                            <option value="world_spawn">World Spawn</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs text-neutral-500 mb-1 font-mono">
                            Ownership (Auto)
                          </label>
                          <div className="w-full bg-neutral-900 border border-neutral-800 rounded px-2.5 py-1.5 text-xs font-bold capitalize text-neutral-300 flex items-center justify-between">
                            <span>{rule.questOwnership || "neutral"}</span>
                            <span className={`w-2 h-2 rounded-full ${
                              rule.questOwnership === "alliance" ? "bg-blue-500" :
                              rule.questOwnership === "horde" ? "bg-red-500" : "bg-neutral-500"
                            }`} />
                          </div>
                        </div>
                      </div>
                    </div>
                  ),
                )}
                <button
                  onClick={addTargetCreature}
                  className="flex items-center gap-1 text-sm text-blue-400 hover:text-blue-300"
                >
                  <Plus className="w-4 h-4" /> Añadir objetivo
                </button>
              </div>

              <div>
                <h3 className="text-sm font-bold text-neutral-500 uppercase tracking-wider mb-4">
                  Independent Spawns
                </h3>
                {(cardData as QuestCardData).independentCreatures.map(
                  (rule, idx) => (
                    <div
                      key={idx}
                      className="bg-neutral-950 border border-neutral-800 p-3 rounded mb-3 flex flex-col gap-2 relative"
                    >
                      <button
                        onClick={() => removeIndependentCreature(idx)}
                        className="absolute top-2 right-2 text-neutral-500 hover:text-red-500"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <div className="grid grid-cols-3 gap-2 pr-6">
                        <div className="col-span-2">
                          <label className="block text-xs text-neutral-500 mb-1">
                            Monster & Variant (Database)
                          </label>
                          <MonsterPicker
                            selectedMonsterId={rule.monsterId || ""}
                            selectedVariantColor={rule.variantColor || rule.creatureColor || "green"}
                            onSelect={(monsterId, monsterName, variantColor, imageAssetId) => {
                              updateIndependentCreature(idx, {
                                monsterId,
                                monsterName,
                                variantColor,
                                creatureType: monsterName,
                                creatureColor: variantColor,
                                creatureAssetId: imageAssetId
                              });
                            }}
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-neutral-500 mb-1">
                            Count
                          </label>
                          <input
                            type="number"
                            min="1"
                            value={rule.count}
                            onChange={(e) =>
                              updateIndependentCreature(idx, {
                                count: Number(e.target.value),
                              })
                            }
                            className="w-full bg-neutral-900 border border-neutral-800 rounded px-2.5 py-1.5 text-xs text-white"
                          />
                        </div>
                        <div className="col-span-3">
                          <label className="block text-xs text-neutral-500 mb-1">
                            Spawn Playable Zone (World Database)
                          </label>
                          <PlayableZonePicker
                            valuePlayableZoneId={rule.spawnPlayableZoneId}
                            onChange={(updates) => {
                              if (updates) {
                                updateIndependentCreature(idx, {
                                  spawnPlayableZoneId: updates.spawnPlayableZoneId,
                                  spawnPlayableZoneName: updates.spawnPlayableZoneName,
                                  spawnWorldRegionId: updates.spawnWorldRegionId,
                                  spawnWorldRegionName: updates.spawnWorldRegionName,
                                  regionName: updates.spawnPlayableZoneName,
                                  regionId: updates.spawnPlayableZoneId,
                                });
                              } else {
                                updateIndependentCreature(idx, {
                                  spawnPlayableZoneId: "",
                                  spawnPlayableZoneName: "",
                                  spawnWorldRegionId: "",
                                  spawnWorldRegionName: "",
                                  regionName: "",
                                  regionId: "",
                                });
                              }
                            }}
                          />
                        </div>
                        <div className="col-span-2">
                          <label className="block text-xs text-neutral-500 mb-1 font-mono">
                            Source / Origen
                          </label>
                          <select
                            value={rule.spawnSource || "world_spawn"}
                            onChange={(e) =>
                              updateIndependentCreature(idx, {
                                spawnSource: e.target.value as any,
                              })
                            }
                            className="w-full bg-neutral-900 border border-neutral-800 rounded px-2.5 py-1.5 text-xs text-white"
                          >
                            <option value="quest_target">Quest Target</option>
                            <option value="quest_elite">Quest Elite</option>
                            <option value="quest_boss">Quest Boss</option>
                            <option value="world_spawn">World Spawn</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs text-neutral-500 mb-1 font-mono">
                            Ownership (Auto)
                          </label>
                          <div className="w-full bg-neutral-900 border border-neutral-800 rounded px-2.5 py-1.5 text-xs font-bold capitalize text-neutral-300 flex items-center justify-between">
                            <span>{rule.questOwnership || "neutral"}</span>
                            <span className={`w-2 h-2 rounded-full ${
                              rule.questOwnership === "alliance" ? "bg-blue-500" :
                              rule.questOwnership === "horde" ? "bg-red-500" : "bg-neutral-500"
                            }`} />
                          </div>
                        </div>
                      </div>
                    </div>
                  ),
                )}
                <button
                  onClick={addIndependentCreature}
                  className="flex items-center gap-1 text-sm text-blue-400 hover:text-blue-300"
                >
                  <Plus className="w-4 h-4" /> Añadir spawn independiente
                </button>
              </div>

              {/* Quest Spawn Intelligence Center & Summary */}
              <div className="border border-indigo-900 bg-indigo-950/20 rounded-lg p-4 space-y-4">
                <h3 className="text-sm font-bold text-indigo-400 uppercase tracking-wider font-mono flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-indigo-400" /> Quest Spawn Intelligence
                </h3>

                {/* 3. Panel de Información de Spawn */}
                <div className="space-y-2">
                  <span className="text-xs text-neutral-400 block font-semibold font-mono">Active Spawns Detailed List</span>
                  {(() => {
                    const allSpawns = [
                      ...(cardData as QuestCardData).targetCreatures.map(s => ({ ...s, isTarget: true })),
                      ...((cardData as QuestCardData).independentCreatures || []).map(s => ({ ...s, isTarget: false }))
                    ].filter(s => s.monsterId);

                    if (allSpawns.length === 0) {
                      return <p className="text-xs text-neutral-500 italic">No spawns configured yet.</p>;
                    }

                    return (
                      <div className="overflow-x-auto border border-neutral-800 rounded bg-neutral-950">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="bg-neutral-900 border-b border-neutral-800 text-neutral-400">
                              <th className="p-2 font-mono">Monster</th>
                              <th className="p-2 font-mono">Variant</th>
                              <th className="p-2 font-mono">Qty</th>
                              <th className="p-2 font-mono">Zone</th>
                              <th className="p-2 font-mono">Ownership</th>
                              <th className="p-2 font-mono">Source</th>
                            </tr>
                          </thead>
                          <tbody>
                            {allSpawns.map((s, idx) => {
                              const foundMonster = monsters?.find(m => m.id === s.monsterId);
                              const variantData = foundMonster?.variants[(s.variantColor || "green").toLowerCase() as any];
                              const portraitUrl = variantData?.portraitUrl || "";

                              return (
                                <tr key={idx} className="border-b border-neutral-900 hover:bg-neutral-900/40">
                                  <td className="p-2 font-medium flex items-center gap-2">
                                    {portraitUrl ? (
                                      <img
                                        src={portraitUrl}
                                        alt={s.monsterName}
                                        className="w-6 h-6 rounded-full border border-neutral-800 object-cover"
                                        referrerPolicy="no-referrer"
                                      />
                                    ) : (
                                      <div className="w-6 h-6 rounded-full bg-neutral-800 border border-neutral-700 flex items-center justify-center text-[8px] font-bold text-neutral-400">
                                        M
                                      </div>
                                    )}
                                    <span>{s.monsterName || "Unnamed Monster"}</span>
                                  </td>
                                  <td className="p-2">
                                    <span className="capitalize px-1.5 py-0.5 rounded text-[10px] bg-neutral-800 text-neutral-300 font-mono border border-neutral-700">
                                      {s.variantColor || "green"}
                                    </span>
                                  </td>
                                  <td className="p-2 font-bold text-yellow-500">x{s.count}</td>
                                  <td className="p-2 text-neutral-300 max-w-[120px] truncate" title={s.spawnPlayableZoneName || "Not assigned"}>
                                    {s.spawnPlayableZoneName || <span className="text-red-500 italic">Not set</span>}
                                  </td>
                                  <td className="p-2">
                                    <span className={`inline-flex items-center gap-1 font-bold text-[10px] capitalize px-1.5 py-0.5 rounded ${
                                      s.questOwnership === "alliance" ? "bg-blue-900/40 text-blue-400 border border-blue-800" :
                                      s.questOwnership === "horde" ? "bg-red-900/40 text-red-400 border border-red-800" :
                                      "bg-neutral-900 text-neutral-400 border border-neutral-800"
                                    }`}>
                                      <span className={`w-1 h-1 rounded-full ${
                                        s.questOwnership === "alliance" ? "bg-blue-400" :
                                        s.questOwnership === "horde" ? "bg-red-400" : "bg-neutral-400"
                                      }`} />
                                      {s.questOwnership || "neutral"}
                                    </span>
                                  </td>
                                  <td className="p-2 capitalize text-neutral-400 font-mono text-[10px]">
                                    {(s.spawnSource || "").replace("_", " ")}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    );
                  })()}
                </div>

                {/* 4. Visual Preview Dentro del Editor */}
                <div className="bg-neutral-950 border border-neutral-800 rounded p-3 space-y-3">
                  <span className="text-xs text-neutral-400 block font-semibold uppercase tracking-wider font-mono border-b border-neutral-800 pb-1.5">
                    Quest Spawn Summary
                  </span>
                  {(() => {
                    const allSpawns = [
                      ...(cardData as QuestCardData).targetCreatures,
                      ...((cardData as QuestCardData).independentCreatures || [])
                    ].filter(s => s.monsterId);

                    const allianceSpawns = allSpawns.filter(s => s.questOwnership === "alliance");
                    const hordeSpawns = allSpawns.filter(s => s.questOwnership === "horde");
                    const neutralSpawns = allSpawns.filter(s => s.questOwnership === "neutral" || !s.questOwnership);

                    if (allSpawns.length === 0) {
                      return <p className="text-xs text-neutral-500 italic">No spawns to summarize yet.</p>;
                    }

                    return (
                      <div className="grid grid-cols-3 gap-3">
                        {/* Alliance Column */}
                        <div className="space-y-1.5">
                          <span className="text-[10px] font-black uppercase text-blue-400 tracking-wider flex items-center gap-1 border-b border-blue-950 pb-1 font-mono">
                            Alliance Monsters
                          </span>
                          {allianceSpawns.length > 0 ? (
                            <ul className="text-xs space-y-1 text-neutral-300 font-mono">
                              {allianceSpawns.map((s, idx) => (
                                <li key={idx} className="flex items-center gap-1.5">
                                  <span className="text-blue-500">•</span>
                                  <span className="capitalize text-neutral-400">{s.variantColor || "green"}</span>
                                  <span className="font-sans font-medium text-white">{s.monsterName}</span>
                                  <span className="text-yellow-500 font-bold">x{s.count}</span>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <span className="text-[10px] text-neutral-600 italic block font-mono">None</span>
                          )}
                        </div>

                        {/* Horde Column */}
                        <div className="space-y-1.5">
                          <span className="text-[10px] font-black uppercase text-red-400 tracking-wider flex items-center gap-1 border-b border-red-950 pb-1 font-mono">
                            Horde Monsters
                          </span>
                          {hordeSpawns.length > 0 ? (
                            <ul className="text-xs space-y-1 text-neutral-300 font-mono">
                              {hordeSpawns.map((s, idx) => (
                                <li key={idx} className="flex items-center gap-1.5">
                                  <span className="text-red-500">•</span>
                                  <span className="capitalize text-neutral-400">{s.variantColor || "green"}</span>
                                  <span className="font-sans font-medium text-white">{s.monsterName}</span>
                                  <span className="text-yellow-500 font-bold">x{s.count}</span>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <span className="text-[10px] text-neutral-600 italic block font-mono">None</span>
                          )}
                        </div>

                        {/* Neutral Column */}
                        <div className="space-y-1.5">
                          <span className="text-[10px] font-black uppercase text-neutral-400 tracking-wider flex items-center gap-1 border-b border-neutral-900 pb-1 font-mono">
                            Neutral Monsters
                          </span>
                          {neutralSpawns.length > 0 ? (
                            <ul className="text-xs space-y-1 text-neutral-300 font-mono">
                              {neutralSpawns.map((s, idx) => (
                                <li key={idx} className="flex items-center gap-1.5">
                                  <span className="text-neutral-500">•</span>
                                  <span className="capitalize text-neutral-400">{s.variantColor || "green"}</span>
                                  <span className="font-sans font-medium text-white">{s.monsterName}</span>
                                  <span className="text-yellow-500 font-bold">x{s.count}</span>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <span className="text-[10px] text-neutral-600 italic block font-mono">None</span>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-bold text-neutral-500 uppercase tracking-wider mb-4">
                  Rewards
                </h3>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-xs text-neutral-400 mb-1">
                      XP
                    </label>
                    <input
                      type="number"
                      value={(cardData as QuestCardData).rewards.xp}
                      onChange={(e) =>
                        updateQuestField("rewards", {
                          ...(cardData as QuestCardData).rewards,
                          xp: Number(e.target.value),
                        })
                      }
                      className="w-full bg-neutral-950 border border-neutral-800 rounded px-3 py-2 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-neutral-400 mb-1">
                      Gold
                    </label>
                    <input
                      type="number"
                      value={(cardData as QuestCardData).rewards.gold}
                      onChange={(e) =>
                        updateQuestField("rewards", {
                          ...(cardData as QuestCardData).rewards,
                          gold: Number(e.target.value),
                        })
                      }
                      className="w-full bg-neutral-950 border border-neutral-800 rounded px-3 py-2 text-white"
                    />
                  </div>
                </div>

                <label className="block text-xs text-neutral-400 mb-2">
                  Item Rewards
                </label>
                {(cardData as QuestCardData).rewards.itemRewards.map(
                  (rew, idx) => (
                    <div
                      key={idx}
                      className="grid grid-cols-4 gap-2 mb-2 items-center"
                    >
                      <div className="col-span-2">
                        <input
                          type="text"
                          placeholder="Deck (e.g. Triangle)"
                          value={rew.itemDeck}
                          onChange={(e) =>
                            updateItemReward(idx, { itemDeck: e.target.value })
                          }
                          className="w-full bg-neutral-950 border border-neutral-800 rounded px-2 py-1 text-sm text-white"
                        />
                      </div>
                      <div>
                        <input
                          type="number"
                          placeholder="Draw"
                          value={rew.drawCount}
                          onChange={(e) =>
                            updateItemReward(idx, {
                              drawCount: Number(e.target.value),
                            })
                          }
                          className="w-full bg-neutral-950 border border-neutral-800 rounded px-2 py-1 text-sm text-white"
                          title="Draw Count"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          placeholder="Keep"
                          value={rew.keepCount}
                          onChange={(e) =>
                            updateItemReward(idx, {
                              keepCount: Number(e.target.value),
                            })
                          }
                          className="w-full bg-neutral-950 border border-neutral-800 rounded px-2 py-1 text-sm text-white"
                          title="Keep Count"
                        />
                        <button
                          onClick={() => removeItemReward(idx)}
                          className="text-neutral-500 hover:text-red-500"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ),
                )}
                <button
                  onClick={addItemReward}
                  className="flex items-center gap-1 text-sm text-blue-400 hover:text-blue-300"
                >
                  <Plus className="w-4 h-4" /> Añadir Item Reward
                </button>
              </div>

              <div>
                <h3 className="text-sm font-bold text-neutral-500 uppercase tracking-wider mb-4">
                  Card Text
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs text-neutral-400 mb-1">
                      Objective Text (Summary)
                    </label>
                    <textarea
                      rows={2}
                      value={(cardData as QuestCardData).objectiveText}
                      onChange={(e) =>
                        updateQuestField("objectiveText", e.target.value)
                      }
                      className="w-full bg-neutral-950 border border-neutral-800 rounded px-3 py-2 text-white resize-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-neutral-400 mb-1">
                      Flavor Text
                    </label>
                    <textarea
                      rows={3}
                      value={(cardData as QuestCardData).flavorText}
                      onChange={(e) =>
                        updateQuestField("flavorText", e.target.value)
                      }
                      className="w-full bg-neutral-950 border border-neutral-800 rounded px-3 py-2 text-white resize-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-neutral-400 mb-1">
                      Full Rules Text
                    </label>
                    <textarea
                      rows={3}
                      value={(cardData as QuestCardData).fullRulesText}
                      onChange={(e) =>
                        updateQuestField("fullRulesText", e.target.value)
                      }
                      className="w-full bg-neutral-950 border border-neutral-800 rounded px-3 py-2 text-white resize-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-neutral-400 mb-1">
                      Notes
                    </label>
                    <textarea
                      rows={2}
                      value={(cardData as QuestCardData).notes}
                      onChange={(e) =>
                        updateQuestField("notes", e.target.value)
                      }
                      className="w-full bg-neutral-950 border border-neutral-800 rounded px-3 py-2 text-white resize-none"
                    />
                  </div>
                </div>
              </div>

              {/* Quest Testing & Preview Section */}
              <div className="bg-neutral-900 border border-neutral-800 p-4 rounded-lg flex flex-col gap-3 mt-6">
                <div className="flex items-center gap-2">
                  <Wand2 className="w-5 h-5 text-yellow-500" />
                  <h3 className="font-bold text-white text-sm uppercase tracking-wider">
                    Quest Board Testing & Spawn Simulation
                  </h3>
                </div>
                <p className="text-xs text-neutral-400 leading-relaxed">
                  Prueba visualmente el spawn de criaturas de esta carta de misión en el tablero de juego sin alterar el estado real del juego.
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const qd = cardData as QuestCardData;
                      const spawned: SpawnedCreaturePreview[] = [];
                      
                      qd.targetCreatures.forEach((tc) => {
                        if (tc.spawnPlayableZoneId) {
                          spawned.push({
                            creatureType: tc.creatureType || "Criatura",
                            creatureColor: tc.creatureColor || "Gris",
                            count: tc.count || 1,
                            playableZoneId: tc.spawnPlayableZoneId,
                            creatureAssetId: tc.creatureAssetId || "",
                            monsterId: tc.monsterId || "",
                            variantColor: tc.variantColor || tc.creatureColor || "green",
                            monsterName: tc.monsterName || tc.creatureType,
                            spawnPlayableZoneName: tc.spawnPlayableZoneName,
                            spawnWorldRegionId: tc.spawnWorldRegionId,
                            spawnWorldRegionName: tc.spawnWorldRegionName,
                            questOwnership: tc.questOwnership || "neutral",
                            spawnSource: tc.spawnSource || "quest_target",
                            isRequiredForCompletion: tc.isRequiredForCompletion,
                          });
                        }
                      });

                      if (qd.independentCreatures) {
                        qd.independentCreatures.forEach((ic) => {
                          if (ic.spawnPlayableZoneId) {
                            spawned.push({
                              creatureType: ic.creatureType || "Criatura",
                              creatureColor: ic.creatureColor || "Gris",
                              count: ic.count || 1,
                              playableZoneId: ic.spawnPlayableZoneId,
                              creatureAssetId: ic.creatureAssetId || "",
                              monsterId: ic.monsterId || "",
                              variantColor: ic.variantColor || ic.creatureColor || "green",
                              monsterName: ic.monsterName || ic.creatureType,
                              spawnPlayableZoneName: ic.spawnPlayableZoneName,
                              spawnWorldRegionId: ic.spawnWorldRegionId,
                              spawnWorldRegionName: ic.spawnWorldRegionName,
                              questOwnership: ic.questOwnership || "neutral",
                              spawnSource: ic.spawnSource || "world_spawn",
                              isRequiredForCompletion: ic.isRequiredForCompletion,
                            });
                          }
                        });
                      }

                      if (spawned.length === 0) {
                        alert("No hay zonas de spawn seleccionadas en los objetivos o spawns independientes de esta misión.");
                        return;
                      }

                      // Detect correct board
                      const worldDb = loadWorldDb();
                      let targetBoard: "lordaeron" | "outland" = "lordaeron";
                      for (const s of spawned) {
                        const pz = worldDb.playableZones[s.playableZoneId];
                        if (pz) {
                          targetBoard = pz.boardId;
                          break;
                        }
                      }

                      // Trigger store actions
                      useAppStore.getState().setActiveBoard(targetBoard);
                      useAppStore.getState().setQuestSpawnPreview({
                        questId: qd.cardId || qd.assetId || "temp-quest",
                        spawnedCreatures: spawned,
                      });

                      alert(`¡Spawn simulado para "${qd.title || "Misión sin título"}"!\n` +
                            `Hemos cambiado al tablero ${targetBoard.toUpperCase()}.\n\n` +
                            `Cerrando el editor de assets para visualizar los spawns interactivos.`);
                      onClose(); // Automatically close editor so they can see the map centered!
                    }}
                    className="flex-1 min-w-[200px] bg-yellow-600 hover:bg-yellow-500 text-white font-bold py-2.5 px-3 rounded text-xs transition-colors flex items-center justify-center gap-1.5 shadow-md border border-yellow-500/30"
                  >
                    <Wand2 className="w-4 h-4" />
                    Preview Quest on Board / Test Quest Spawn
                  </button>

                  {useAppStore.getState().questSpawnPreview && (
                    <button
                      type="button"
                      onClick={() => {
                        useAppStore.getState().setQuestSpawnPreview(null);
                        alert("Vista previa de spawn borrada del tablero.");
                      }}
                      className="bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-neutral-700 font-medium py-2.5 px-3 rounded text-xs transition-colors"
                    >
                      Clear Quest Preview
                    </button>
                  )}
                </div>
              </div>

              {/* Real-time Validation Status Panel */}
              {(() => {
                const errors = getValidationErrors(cardData, monsters);
                return (
                  <div className={`p-4 rounded-lg border mt-4 ${errors.length > 0 ? "bg-red-950/20 border-red-900/60 text-red-300" : "bg-green-950/20 border-green-900/60 text-green-300"}`}>
                    <div className="flex items-center gap-2 font-bold mb-2">
                      <AlertTriangle className={`w-5 h-5 ${errors.length > 0 ? "text-red-400" : "text-green-400"}`} />
                      <span>Estado de Validación ({errors.length === 0 ? "Válida para Verificación" : `${errors.length} error(es) detectado(s)`})</span>
                    </div>
                    {errors.length > 0 ? (
                      <ul className="list-disc list-inside text-xs space-y-1 text-neutral-300">
                        {errors.map((err, i) => (
                          <li key={i}>{err}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-xs text-neutral-300">Todos los campos requeridos y zonas de spawn son válidas. Esta carta está lista para ser verificada.</p>
                    )}
                  </div>
                );
              })()}
            </div>
          )}

          {/* Item Data */}
          {cardData.type === "item" && (
            <div className="space-y-6 border-t border-neutral-800 pt-6">
              <h3 className="text-sm font-bold text-neutral-500 uppercase tracking-wider mb-4">
                Item Properties
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-neutral-400 mb-1">Item Type</label>
                  <select
                    value={(cardData as ItemCardData).itemType || "NONE"}
                    onChange={(e) => setCardData({ ...cardData, itemType: e.target.value as ItemType })}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded px-3 py-2 text-white text-sm"
                  >
                    <option value="NONE">None</option>
                    <option value="WEAPON">Weapon</option>
                    <option value="ARMOR">Armor</option>
                    <option value="TRINKET">Trinket</option>
                    <option value="CONSUMABLE">Consumable</option>
                    <option value="QUEST_ITEM">Quest Item</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-neutral-400 mb-1">Equipment Slot</label>
                  <select
                    value={(cardData as ItemCardData).slot || "NONE"}
                    onChange={(e) => setCardData({ ...cardData, slot: e.target.value as ItemSlot })}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded px-3 py-2 text-white text-sm"
                  >
                    <option value="NONE">None</option>
                    <option value="MAIN_HAND">Main Hand</option>
                    <option value="OFF_HAND">Off Hand</option>
                    <option value="TWO_HAND">Two Hand</option>
                    <option value="ARMOR">Armor</option>
                    <option value="TRINKET">Trinket</option>
                    <option value="CONSUMABLE">Consumable</option>
                  </select>
                </div>
                {(cardData as ItemCardData).itemType === "WEAPON" && (
                  <div>
                    <label className="block text-xs text-neutral-400 mb-1">Weapon Type</label>
                    <select
                      value={(cardData as ItemCardData).weaponType || "NONE"}
                      onChange={(e) => setCardData({ ...cardData, weaponType: e.target.value as WeaponType })}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded px-3 py-2 text-white text-sm"
                    >
                      <option value="NONE">None</option>
                      <option value="SWORD">Sword</option>
                      <option value="MACE">Mace</option>
                      <option value="AXE">Axe</option>
                      <option value="DAGGER">Dagger</option>
                      <option value="STAFF">Staff</option>
                      <option value="WAND">Wand</option>
                      <option value="BOW">Bow</option>
                      <option value="GUN">Gun</option>
                    </select>
                  </div>
                )}
                {(cardData as ItemCardData).itemType === "ARMOR" && (
                  <div>
                    <label className="block text-xs text-neutral-400 mb-1">Armor Type</label>
                    <select
                      value={(cardData as ItemCardData).armorType || "NONE"}
                      onChange={(e) => setCardData({ ...cardData, armorType: e.target.value as ArmorType })}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded px-3 py-2 text-white text-sm"
                    >
                      <option value="NONE">None</option>
                      <option value="CLOTH">Cloth</option>
                      <option value="LEATHER">Leather</option>
                      <option value="MAIL">Mail</option>
                      <option value="PLATE">Plate</option>
                      <option value="SHIELD">Shield</option>
                    </select>
                  </div>
                )}
                <div>
                  <label className="block text-xs text-neutral-400 mb-1">Required Level</label>
                  <input
                    type="number"
                    value={(cardData as ItemCardData).level || 0}
                    onChange={(e) => setCardData({ ...cardData, level: Number(e.target.value) })}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded px-3 py-2 text-white text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-neutral-400 mb-1">Gold Value</label>
                  <input
                    type="number"
                    value={(cardData as ItemCardData).goldValue ?? 0}
                    onChange={(e) => setCardData({ ...cardData, goldValue: Number(e.target.value) })}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded px-3 py-2 text-white text-sm"
                  />
                </div>
              </div>

              <div className="mt-8">
                <h3 className="text-sm font-bold text-neutral-500 uppercase tracking-wider mb-4">
                  Item Modifiers
                </h3>
                <div className="text-xs text-neutral-500 p-4 border border-neutral-800 rounded bg-neutral-900/50 text-center">
                  Editing modifiers manually is disabled. All mechanical data is strictly managed by UCL V2 in the YAML definitions. Use the "Link Reference" tool above.
                </div>
              </div>
            </div>
          )}

          {/* Placeholder for other types */}
          {cardData.type !== "quest" && cardData.type !== "item" && (
            <div className="border-t border-neutral-800 pt-6 text-neutral-500 text-sm">
              Formulario para tipo '{cardData.type}' no implementado aún. Puedes
              guardar los datos base.
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-neutral-800 bg-neutral-950 flex flex-col gap-2 shrink-0">
          <div className="flex gap-2">
            <button
              onClick={() => handleSaveData("verified")}
              disabled={!cardData || getValidationErrors(cardData, monsters).length > 0}
              className="flex-1 bg-green-700 hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 rounded transition-colors shadow-lg flex items-center justify-center gap-2"
            >
              <Check className="w-5 h-5" />
              Guardar y Verificar
            </button>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => handleSaveData("data_complete")}
              disabled={!cardData || getValidationErrors(cardData, monsters).length > 0}
              className="flex-1 bg-blue-700 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white py-2 rounded transition-colors text-sm"
            >
              Guardar como Data Complete
            </button>
            <button
              onClick={() => {
                handleSaveData(currentRecord.reviewState).then(() =>
                  handleNext(),
                );
              }}
              className="bg-neutral-800 hover:bg-neutral-700 text-white px-4 py-2 rounded transition-colors text-sm"
            >
              Guardar y Siguiente
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
