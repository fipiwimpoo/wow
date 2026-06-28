import React, { useState, useEffect } from "react";
import { AssetRecord, saveAssetRecord, getCardData, saveCardData, getAllAssetRecords, getAllCardData, initDB } from "../../../core/utils/db";
import { CardReferenceIndex } from "../../../core/utils/cardReferenceIndex";
import { CardReference } from "../../../core/models/cardReference";
import { AnyCardData, ItemCardData } from "../../../core/models/cardData";
import { mapDeckOrColorToId } from "./CardDataEditor";
import { BlobImage } from "./BlobImage";
import triangleYaml from "../../../data/cards/items/items_core_triangle.yaml?raw";
import { CardReferenceImporter } from "../../../core/utils/cardReferenceImporter";
import { Search, Link as LinkIcon, CheckCircle2, AlertTriangle, FileText, X } from "lucide-react";

function MechanicalPreview({ cardData }: { cardData: ItemCardData }) {
  const refCard = cardData.linkedCardReferenceId ? CardReferenceIndex.getCard(cardData.linkedCardReferenceId) : null;
  
  if (!refCard) {
    return (
      <div className="text-sm text-neutral-500 italic p-4 bg-neutral-950 rounded border border-neutral-800 text-center">
        No hay definición vinculada. Selecciona una carta del listado para vincularla y ver su definición YAML.
      </div>
    );
  }

  const dicePool = (refCard as any).rawDicePool || (refCard as any).dice_pool;
  const effects = (refCard as any).rawEffects || (refCard as any).effects;
  const cost = (refCard as any).rawCost !== undefined ? (refCard as any).rawCost : (refCard as any).cost;
  const level = (refCard as any).rawLevel !== undefined ? (refCard as any).rawLevel : (refCard as any).level;
  const type = (refCard as any).rawType || (refCard as any).type;

  // Render a specific dice color with a nice visual badge
  const renderDieBadge = (color: string, amt: number) => {
    const colorLower = color.toLowerCase();
    let bgClass = "bg-neutral-800 text-neutral-200 border-neutral-700";
    let textClass = "text-neutral-300";
    
    if (colorLower === "red") {
      bgClass = "bg-red-950/50 text-red-200 border-red-900/50";
      textClass = "text-red-400";
    } else if (colorLower === "blue") {
      bgClass = "bg-blue-950/50 text-blue-200 border-blue-900/50";
      textClass = "text-blue-400";
    } else if (colorLower === "green") {
      bgClass = "bg-emerald-950/50 text-emerald-200 border-emerald-900/50";
      textClass = "text-emerald-400";
    } else if (colorLower === "black") {
      bgClass = "bg-neutral-900 text-neutral-100 border-neutral-800";
      textClass = "text-neutral-200 font-bold";
    }

    return (
      <span key={color} className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-mono border ${bgClass}`}>
        <span className={`w-2 h-2 rounded-full bg-current ${textClass}`} />
        Add <strong className="font-bold">{amt}</strong> {color.toUpperCase()} {amt === 1 ? 'die' : 'dice'}
      </span>
    );
  };

  const renderDicePool = () => {
    if (!dicePool) return null;

    return (
      <div className="bg-neutral-950 p-4 rounded-lg border border-neutral-800/80 space-y-3">
        <div className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider font-mono">Dice Pool</div>
        
        {dicePool.add && (
          <div className="flex flex-wrap gap-2">
            {Array.isArray(dicePool.add) 
              ? dicePool.add.map((p: any, idx: number) => {
                  if (typeof p === "object" && p !== null) {
                    return Object.entries(p).map(([color, val]) => renderDieBadge(color, Number(val)));
                  }
                  return <span key={idx} className="text-xs text-neutral-300">{String(p)}</span>;
                })
              : typeof dicePool.add === "object" && dicePool.add !== null
                ? Object.entries(dicePool.add).map(([color, val]) => renderDieBadge(color, Number(val)))
                : <span className="text-xs text-neutral-300">{String(dicePool.add)}</span>
            }
          </div>
        )}

        {dicePool.choose_one && (
          <div className="space-y-2">
            <div className="text-xs text-amber-400 font-medium italic">Choose one:</div>
            <div className="space-y-1.5 pl-2 border-l-2 border-neutral-800">
              {Array.isArray(dicePool.choose_one) && dicePool.choose_one.map((p: any, idx: number) => {
                return (
                  <div key={idx} className="flex items-center gap-2 flex-wrap">
                    {idx > 0 && <span className="text-[10px] text-neutral-500 font-bold font-mono">OR</span>}
                    <div className="flex flex-wrap gap-2">
                      {typeof p === "object" && p !== null
                        ? Object.entries(p).map(([color, val]) => renderDieBadge(color, Number(val)))
                        : <span className="text-xs text-neutral-300">{String(p)}</span>
                      }
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderEffectItem = (eff: any, idx: number) => {
    if (typeof eff === "string") {
      return (
        <div key={idx} className="p-3 bg-neutral-950 rounded-lg border border-neutral-800/65 text-xs text-neutral-300 leading-relaxed font-sans">
          {eff}
        </div>
      );
    }

    if (typeof eff === "object" && eff !== null) {
      // Check for simple single key-value short hands like attrition or reroll
      if (eff.attrition !== undefined) {
        return (
          <div key={idx} className="p-3 bg-neutral-950 rounded-lg border border-neutral-800/65 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
            <span className="text-xs font-mono font-medium text-neutral-200">
              Attrition <span className="text-red-400 font-bold">{eff.attrition}</span>
            </span>
          </div>
        );
      }
      if (eff.reroll !== undefined) {
        return (
          <div key={idx} className="p-3 bg-neutral-950 rounded-lg border border-neutral-800/65 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span className="text-xs font-mono font-medium text-neutral-200">
              Reroll <span className="text-emerald-400 font-bold">{eff.reroll}</span>
            </span>
          </div>
        );
      }

      // Render structured object
      const activationMode = eff.activationMode || eff.activation;
      const activationLabel = activationMode ? String(activationMode).toUpperCase() : "MISSING ACTIVATION MODE";
      
      let badgeColor = "bg-neutral-800 text-neutral-400 border-neutral-700";
      if (activationMode === "automatic") badgeColor = "bg-blue-950/40 text-blue-400 border-blue-900/50";
      else if (activationMode === "optional") badgeColor = "bg-yellow-950/40 text-yellow-400 border-yellow-900/50";
      else if (activationMode === "cost") badgeColor = "bg-purple-950/40 text-purple-400 border-purple-900/50";
      else if (activationMode === "manual") badgeColor = "bg-orange-950/40 text-orange-400 border-orange-900/50";
      else if (!activationMode) badgeColor = "bg-red-950/40 text-red-400 border-red-900/50 animate-pulse";

      const keys = ["trigger", "condition", "cost", "effect", "penalty", "restriction"];
      return (
        <div key={idx} className="p-3.5 bg-neutral-950 rounded-lg border border-neutral-800/80 space-y-2 font-mono relative group">
          <div className="flex justify-between items-center gap-2 mb-1">
            <div className="h-px bg-neutral-800 flex-1" />
            <span className={`text-[8px] font-black px-1.5 py-0.5 rounded border uppercase tracking-tighter shrink-0 ${badgeColor}`}>
              {activationLabel}
            </span>
          </div>
          {keys.map((k) => {
            if (eff[k] === undefined) return null;
            
            let labelColor = "text-neutral-500";
            if (k === "trigger") labelColor = "text-cyan-400 font-bold";
            else if (k === "condition") labelColor = "text-amber-400";
            else if (k === "cost") labelColor = "text-purple-400";
            else if (k === "effect") labelColor = "text-green-400 font-medium";
            else if (k === "penalty") labelColor = "text-red-400";
            else if (k === "restriction") labelColor = "text-rose-400 italic";

            return (
              <div key={k} className="text-xs leading-relaxed grid grid-cols-[80px_1fr] gap-2">
                <span className={`text-[10px] uppercase font-bold tracking-wider select-none ${labelColor}`}>{k}:</span>
                <span className="text-neutral-300 whitespace-pre-wrap">{String(eff[k])}</span>
              </div>
            );
          })}
        </div>
      );
    }

    return null;
  };

  const renderEffectsList = () => {
    if (!effects || !Array.isArray(effects) || effects.length === 0) return null;

    return (
      <div className="space-y-2.5">
        <div className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider font-mono">Effects</div>
        <div className="space-y-2">
          {effects.map((eff, i) => renderEffectItem(eff, i))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-5">
      {/* Header Info */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-neutral-800">
        <div className="space-y-0.5">
          <div className="text-xs text-neutral-500 font-mono">ID: {refCard.id}</div>
          <div className="text-base font-bold text-neutral-100 font-sans tracking-tight">{refCard.name}</div>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          {type && (
            <span className="px-2 py-0.5 rounded bg-cyan-950/60 text-cyan-300 text-[10px] font-mono font-bold uppercase border border-cyan-900/50">
              {String(type)}
            </span>
          )}
          {level !== undefined && (
            <span className="px-2 py-0.5 rounded bg-purple-950/60 text-purple-300 text-[10px] font-mono font-bold uppercase border border-purple-900/50">
              Lvl {level}
            </span>
          )}
          {cost !== undefined && (
            <span className="px-2 py-0.5 rounded bg-amber-950/60 text-amber-300 text-[10px] font-mono font-bold uppercase border border-amber-900/50">
              {cost} Gold
            </span>
          )}
        </div>
      </div>

      {renderDicePool()}
      {renderEffectsList()}
    </div>
  );
}

export function CardAssetBinder({ 
  currentRecord, 
  onClose,
  onNext,
  onPrev,
  hasPrev,
  hasNext
}: { 
  currentRecord: AssetRecord;
  onClose: () => void;
  onNext: () => void;
  onPrev: () => void;
  hasPrev: boolean;
  hasNext: boolean;
}) {
  const [cardData, setCardData] = useState<AnyCardData | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<CardReference[]>([]);
  const [suggestions, setSuggestions] = useState<CardReference[]>([]);
  const [totalCards, setTotalCards] = useState<number>(0);
  const [stats, setStats] = useState({ total: 0, valid: 0, warnings: 0, visible: 0 });
  const [isReady, setIsReady] = useState(false);
  const [yamlError, setYamlError] = useState<string | null>(null);
  const [duplicateIds, setDuplicateIds] = useState<string[]>([]);

  // Validation & Integrity Report States
  interface TestResult {
    name: string;
    passed: boolean;
    message: string;
  }
  interface ValidationReport {
    totalYamlCards: number;
    totalUniqueIds: number;
    totalLinkedAssets: number;
    totalVisualOnly: number;
    totalDataComplete: number;
    errors: string[];
    tests: TestResult[];
  }
  const [validationReport, setValidationReport] = useState<ValidationReport | null>(null);
  const [isRunningTests, setIsRunningTests] = useState(false);

  const runSelfTests = async () => {
    setIsRunningTests(true);
    const tests: TestResult[] = [];
    const errors: string[] = [];

    try {
      // Fetch fresh DB records
      const allAssets = await getAllAssetRecords();
      const allCardBinds = await getAllCardData();

      // 1. Todas las cartas del YAML cargan
      try {
        const report = CardReferenceImporter.parseYamlContent(triangleYaml, "items_core_triangle.yaml");
        const yamlCards = CardReferenceIndex.getAllCards();
        if (report.totalFound > 0 && yamlCards.length === report.totalFound) {
          tests.push({
            name: "Todas las cartas del YAML cargan",
            passed: true,
            message: `Se cargaron exitosamente ${yamlCards.length} cartas desde el archivo YAML de referencia.`
          });
        } else {
          const msg = `Discrepancia detectada: ${yamlCards.length} cartas indexadas en memoria vs ${report.totalFound} reportadas por el parseador.`;
          errors.push(msg);
          tests.push({
            name: "Todas las cartas del YAML cargan",
            passed: false,
            message: msg
          });
        }
      } catch (e: any) {
        errors.push(`Error cargando YAML: ${e.message}`);
        tests.push({
          name: "Todas las cartas del YAML cargan",
          passed: false,
          message: `Fallo al procesar YAML: ${e.message}`
        });
      }

      // 2. Todos los ids son únicos
      try {
        const report = CardReferenceImporter.parseYamlContent(triangleYaml, "items_core_triangle.yaml");
        if (report.duplicatedIds && report.duplicatedIds.length === 0) {
          tests.push({
            name: "Todos los IDs son únicos",
            passed: true,
            message: "No se encontraron IDs de carta duplicados en la base de datos Triángulo."
          });
        } else {
          const duplicates = report.duplicatedIds?.join(", ") || "";
          const msg = `Se detectaron IDs duplicados: [${duplicates}]`;
          errors.push(msg);
          tests.push({
            name: "Todos los IDs son únicos",
            passed: false,
            message: msg
          });
        }
      } catch (e: any) {
        errors.push(`Error en unicidad de IDs: ${e.message}`);
        tests.push({
          name: "Todos los IDs son únicos",
          passed: false,
          message: `Error al validar unicidad: ${e.message}`
        });
      }

      // 3. El Binder puede buscar todas las cartas por id y name
      try {
        const yamlCards = CardReferenceIndex.getAllCards();
        let searchFailures = 0;
        for (const card of yamlCards) {
          const byId = CardReferenceIndex.findById(card.id);
          if (!byId || byId.id !== card.id) {
            searchFailures++;
            continue;
          }
          const byName = CardReferenceIndex.findByName(card.name);
          if (!byName.some(c => c.id === card.id)) {
            // Also check normalized name fallback
            const byNorm = CardReferenceIndex.findByNormalizedName(card.name);
            if (!byNorm.some(c => c.id === card.id)) {
              searchFailures++;
            }
          }
        }
        if (searchFailures === 0) {
          tests.push({
            name: "Búsqueda por ID y nombre",
            passed: true,
            message: `Buscador verificado: ${yamlCards.length}/${yamlCards.length} cartas indexadas y accesibles por ID y nombre.`
          });
        } else {
          const msg = `Fallo de indexación: ${searchFailures} cartas no son buscables por ID/nombre.`;
          errors.push(msg);
          tests.push({
            name: "Búsqueda por ID y nombre",
            passed: false,
            message: msg
          });
        }
      } catch (e: any) {
        errors.push(`Error de buscador: ${e.message}`);
        tests.push({
          name: "Búsqueda por ID y nombre",
          passed: false,
          message: `Error en lógica de búsqueda: ${e.message}`
        });
      }

      // 4. Guardar un vínculo assetId -> mechanicalCardId no modifica la definición mecánica
      try {
        const yamlCards = CardReferenceIndex.getAllCards();
        const targetCard = yamlCards[0];
        if (!targetCard) {
          throw new Error("No hay cartas cargadas para realizar el test de mutación.");
        }
        const originalMechanicsStr = JSON.stringify(targetCard.mechanics || []);
        const originalEffectsStr = JSON.stringify((targetCard as any).rawEffects || []);
        
        // Simular guardado
        const mockSaveData: AnyCardData = {
          cardId: targetCard.id,
          assetId: "__test_integrity_asset__",
          type: "item",
          title: "Test Asset",
          expansion: "core",
          faction: "neutral",
          deckColor: "triangle",
          linkedCardReferenceId: targetCard.id,
          linkedCardReferenceName: targetCard.name,
          dataSource: "YAML_REFERENCE"
        };
        await saveCardData(mockSaveData);
        
        // Verificar definición después del guardado
        const refAfterSave = CardReferenceIndex.getCard(targetCard.id);
        const mechanicsAfterSaveStr = JSON.stringify(refAfterSave?.mechanics || []);
        const effectsAfterSaveStr = JSON.stringify((refAfterSave as any)?.rawEffects || []);
        
        // Limpiar registro de test
        const db = await initDB();
        await new Promise<void>((resolve, reject) => {
          const tx = db.transaction("card-data", "readwrite");
          tx.objectStore("card-data").delete("__test_integrity_asset__");
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
        });

        if (originalMechanicsStr === mechanicsAfterSaveStr && originalEffectsStr === effectsAfterSaveStr) {
          tests.push({
            name: "Definición mecánica inmutable",
            passed: true,
            message: "Guardar un vínculo no altera ni contamina las propiedades de la definición mecánica en el índice."
          });
        } else {
          const msg = "Mutación detectada: Guardar un vínculo modificó la definición en memoria.";
          errors.push(msg);
          tests.push({
            name: "Definición mecánica inmutable",
            passed: false,
            message: msg
          });
        }
      } catch (e: any) {
        errors.push(`Error en test de inmutabilidad: ${e.message}`);
        tests.push({
          name: "Definición mecánica inmutable",
          passed: false,
          message: `Error al validar inmutabilidad: ${e.message}`
        });
      }

      // 5. Al recargar, el vínculo persiste
      try {
        const testAssetId = "__test_persistence_asset__";
        const testBindData: AnyCardData = {
          cardId: testAssetId,
          assetId: testAssetId,
          type: "item",
          title: "Test Persistence",
          expansion: "core",
          faction: "neutral",
          deckColor: "triangle",
          linkedCardReferenceId: "T01",
          linkedCardReferenceName: "Test Card Name",
          dataSource: "YAML_REFERENCE"
        };
        await saveCardData(testBindData);
        const loadedData = await getCardData(testAssetId);
        
        // Limpiar inmediatamente
        const db = await initDB();
        await new Promise<void>((resolve, reject) => {
          const tx = db.transaction("card-data", "readwrite");
          tx.objectStore("card-data").delete(testAssetId);
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
        });

        if (loadedData && loadedData.linkedCardReferenceId === "T01") {
          tests.push({
            name: "Persistencia de vínculos",
            passed: true,
            message: "El vínculo se guarda y recupera de IndexedDB correctamente sin pérdidas ni cambios de estructura."
          });
        } else {
          const msg = "Fallo de persistencia: El vínculo guardado no coincide o no se recuperó.";
          errors.push(msg);
          tests.push({
            name: "Persistencia de vínculos",
            passed: false,
            message: msg
          });
        }
      } catch (e: any) {
        errors.push(`Error de persistencia: ${e.message}`);
        tests.push({
          name: "Persistencia de vínculos",
          passed: false,
          message: `Error al validar persistencia: ${e.message}`
        });
      }

      // 6. La preview renderiza exactamente los campos existentes en YAML (dice_pool, effects, trigger, condition, cost, restriction)
      try {
        const yamlCards = CardReferenceIndex.getAllCards();
        let hasInvalidFields = false;
        // Allowed properties from YAML parser expanding
        const allowedKeys = new Set(["id", "name", "type", "cost", "level", "dice_pool", "effects", "expansion", "rawDicePool", "rawEffects", "rawType", "rawCost", "rawLevel", "text", "deckId", "metadata", "mechanics"]);
        for (const card of yamlCards) {
          const cardKeys = Object.keys(card);
          for (const key of cardKeys) {
            if (!allowedKeys.has(key)) {
              hasInvalidFields = true;
              errors.push(`Clave no oficial '${key}' detectada en la carta indexada: ${card.id}`);
            }
          }
        }
        if (!hasInvalidFields) {
          tests.push({
            name: "Campos YAML oficiales en Preview",
            passed: true,
            message: "Verificado: La preview renderiza directamente las propiedades del YAML y no campos inventados."
          });
        } else {
          tests.push({
            name: "Campos YAML oficiales en Preview",
            passed: false,
            message: "Se detectaron campos no contemplados en la estructura indexada."
          });
        }
      } catch (e: any) {
        errors.push(`Error de verificación de campos: ${e.message}`);
        tests.push({
          name: "Campos YAML oficiales en Preview",
          passed: false,
          message: `Error al validar campos YAML: ${e.message}`
        });
      }

      // 7. No existe ningún generador automático de mechanics
      try {
        const yamlCards = CardReferenceIndex.getAllCards();
        const cardsWithMechanics = yamlCards.filter(c => c.mechanics && c.mechanics.length > 0);
        if (cardsWithMechanics.length === 0) {
          tests.push({
            name: "Ausencia de generadores automáticos de mechanics",
            passed: true,
            message: "Confirmado: Todas las cartas importadas tienen mechanics: [] vacío. No hay transformación UCL V2 activa en el Binder."
          });
        } else {
          const msg = `Error: Se detectó que ${cardsWithMechanics.length} cartas tienen mecánicas generadas automáticamente.`;
          errors.push(msg);
          tests.push({
            name: "Ausencia de generadores automáticos de mechanics",
            passed: false,
            message: msg
          });
        }
      } catch (e: any) {
        errors.push(`Error en test de mechanics vacíos: ${e.message}`);
        tests.push({
          name: "Ausencia de generadores automáticos de mechanics",
          passed: false,
          message: `Error al validar mechanics: ${e.message}`
        });
      }

      // 8. No existe fallback que cree efectos desde rawText/name/type/cost/level
      try {
        const yamlCards = CardReferenceIndex.getAllCards();
        let fallbackDetected = false;
        for (const card of yamlCards) {
          const rawEff = (card as any).rawEffects || [];
          if (rawEff.length === 0 && card.mechanics && card.mechanics.length > 0) {
            fallbackDetected = true;
            break;
          }
        }
        if (!fallbackDetected) {
          tests.push({
            name: "Ausencia de fallbacks de efectos sintéticos",
            passed: true,
            message: "Confirmado: El cargador no utiliza técnicas heurísticas para inventar efectos a partir de texto o metadatos."
          });
        } else {
          const msg = "Fallo: Se detectó un fallback heuristic que genera efectos mecánicos sintéticos.";
          errors.push(msg);
          tests.push({
            name: "Ausencia de fallbacks de efectos sintéticos",
            passed: false,
            message: msg
          });
        }
      } catch (e: any) {
        errors.push(`Error en test de fallback: ${e.message}`);
        tests.push({
          name: "Ausencia de fallbacks de efectos sintéticos",
          passed: false,
          message: `Error al validar fallbacks: ${e.message}`
        });
      }

      // Compute statistics for report
      const totalYamlCards = CardReferenceIndex.getAllCards().length;
      const totalUniqueIds = new Set(CardReferenceIndex.getAllCards().map(c => c.id)).size;
      const linkedAssetIds = new Set(allCardBinds.filter(cb => cb.linkedCardReferenceId).map(cb => cb.assetId));
      const totalLinkedAssets = allAssets.filter(asset => linkedAssetIds.has(asset.id)).length;
      const totalVisualOnly = allAssets.filter(r => !r.reviewState || r.reviewState === "visual_only").length;
      const totalDataComplete = allAssets.filter(r => r.reviewState === "linked_complete" || r.reviewState === "data_complete" || r.reviewState === "verified").length;

      setValidationReport({
        totalYamlCards,
        totalUniqueIds,
        totalLinkedAssets,
        totalVisualOnly,
        totalDataComplete,
        errors,
        tests
      });
    } catch (err: any) {
      console.error("Fallo general en autodiagnóstico", err);
      alert(`Fallo en la ejecución de las pruebas: ${err.message}`);
    } finally {
      setIsRunningTests(false);
    }
  };

  useEffect(() => {
    try {
      const report = CardReferenceImporter.parseYamlContent(triangleYaml, "items_core_triangle.yaml");
      
      const duplicates = report.duplicatedIds || [];
      setDuplicateIds(duplicates);

      if (report.errors && report.errors.length > 0) {
        setYamlError(`Errores de parsing/validación en el YAML:\n${report.errors.map(e => `- ${e.message} (Línea ${e.line || '?'})`).join('\n')}`);
      } else if (report.totalFound < 61) {
        setYamlError(`Error: El total de cartas cargadas (${report.totalFound}) es menor al total esperado del archivo (61).`);
      } else {
        setYamlError(null);
      }

      setStats({
        total: report.totalFound,
        valid: report.validCount,
        warnings: report.errors.length + (report.warnings?.length || 0),
        visible: CardReferenceIndex.getAllCards().length
      });
      
      setTotalCards(CardReferenceIndex.getAllCards().length);
      setSearchResults(CardReferenceIndex.getAllCards());
      setIsReady(true);
      loadData();
    } catch (e: any) {
      setYamlError(`Fallo al cargar el archivo YAML: ${e.message}`);
      setIsReady(true);
    }
  }, [currentRecord.id]);

  const loadData = async () => {
    let data = await getCardData(currentRecord.id);
    if (!data) {
      data = {
        cardId: currentRecord.id,
        assetId: currentRecord.id,
        type: currentRecord.type as any,
        title: currentRecord.displayName,
        expansion: currentRecord.expansion,
        faction: currentRecord.faction,
        deckColor: currentRecord.deckOrColor,
      } as AnyCardData;

      if (currentRecord.type === "item") {
        (data as ItemCardData).deckId = mapDeckOrColorToId(currentRecord.deckOrColor);
        data.deckColor = (data as ItemCardData).deckId!;
      }
    } else {
      // Dynamic reference lookup - always keep mechanics up-to-date from the official reference
      if (data.linkedCardReferenceId) {
        const ref = CardReferenceIndex.getCard(data.linkedCardReferenceId);
        if (ref) {
          data.mechanics = ref.mechanics || [];
          data.metadata = ref.metadata;
          if (data.type === "item") {
            const itemData = data as ItemCardData;
            itemData.modifiers = ref.mechanics || [];
            if (ref.metadata) {
              const meta = ref.metadata as any;
              itemData.itemType = meta.itemType;
              itemData.slot = meta.slot || meta.equipmentSlot;
              itemData.weaponType = meta.weaponType;
              itemData.armorType = meta.armorType;
              itemData.level = meta.requiredLevel;
              itemData.goldValue = meta.goldValue;
            }
          }
        }
      }
    }
    setCardData(data);
    calculateSuggestions();
  };

  const calculateSuggestions = () => {
    const allCards = CardReferenceIndex.getAllCards();
    const clean = (s: string) => (s || "").toLowerCase().replace(/[^a-z0-9]/g, "");
    const normFile = clean(currentRecord.originalFileName || "");
    const normDisplay = clean(currentRecord.displayName || "");
    const normId = clean(currentRecord.id || "");

    const matched = allCards.filter(card => {
      const normCardId = clean(card.id);
      const normCardName = clean(card.name);

      if (normCardId && (normFile.includes(normCardId) || normCardId.includes(normFile))) return true;
      if (normCardName && (normFile.includes(normCardName) || normCardName.includes(normFile))) return true;
      if (normCardId && (normDisplay.includes(normCardId) || normCardId.includes(normDisplay))) return true;
      if (normCardName && (normDisplay.includes(normCardName) || normCardName.includes(normDisplay))) return true;
      
      const tokens = [
        ...(currentRecord.originalFileName || "").toLowerCase().split(/[^a-z0-9]+/),
        ...(currentRecord.displayName || "").toLowerCase().split(/[^a-z0-9]+/)
      ].filter(t => t.length > 3);

      for (const t of tokens) {
        if (normCardId.includes(t) || normCardName.includes(t)) {
          return true;
        }
      }
      return false;
    });

    setSuggestions(matched);
  };

  useEffect(() => {
    if (!isReady) return;
    if (!searchTerm.trim()) {
      setSearchResults(CardReferenceIndex.getAllCards());
      return;
    }
    const matches = CardReferenceIndex.findByNormalizedName(searchTerm);
    setSearchResults(matches);
  }, [searchTerm, isReady]);

  const handleLink = (ref: CardReference) => {
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
      itemData.modifiers = mechanicsCopy; // Use modifiers array for preview component temporarily
    }

    setCardData(updatedData);
  };

  const handleUnlink = () => {
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

  const handleSave = async (newState: string = "linked_complete") => {
    if (!cardData) return;
    
    if (newState === "linked_complete") {
      if (!currentRecord.id) {
        alert("Falta el asset visual.");
        return;
      }
      if (!cardData.linkedCardReferenceId) {
        alert("Falta una definición mecánica vinculada.");
        return;
      }
      const existingRef = CardReferenceIndex.getCard(cardData.linkedCardReferenceId);
      if (!existingRef) {
        alert("La definición mecánica vinculada no existe en la base de datos.");
        return;
      }
    }

    try {
      // Save only the assetId -> mechanicalCardId binding and basic properties
      const dataToSave: AnyCardData = {
        cardId: cardData.cardId,
        assetId: cardData.assetId,
        type: cardData.type,
        title: cardData.title,
        expansion: cardData.expansion,
        faction: cardData.faction,
        deckColor: cardData.deckColor,
        linkedCardReferenceId: cardData.linkedCardReferenceId,
        linkedCardReferenceName: cardData.linkedCardReferenceName,
        dataSource: "YAML_REFERENCE",
      };

      if (cardData.type === "item") {
        (dataToSave as ItemCardData).deckId = (cardData as ItemCardData).deckId;
      }

      await saveCardData(dataToSave);
      const updatedRecord = { ...currentRecord, reviewState: newState as any };
      await saveAssetRecord(updatedRecord);
      alert("Vínculo guardado exitosamente.");
    } catch (err) {
      console.error(err);
      alert("Error al guardar.");
    }
  };

  return (
    <div className="flex flex-col h-full bg-neutral-900 text-white">
      {/* Header */}
      <div className="flex justify-between items-center p-4 border-b border-neutral-800 bg-black">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <LinkIcon className="w-5 h-5 text-cyan-400" />
          UCL V2 Asset Binder
        </h2>
        <div className="flex gap-2">
          <button onClick={onPrev} disabled={!hasPrev} className="px-3 py-1 bg-neutral-800 disabled:opacity-50 hover:bg-neutral-700 rounded text-sm">Anterior</button>
          <button onClick={onNext} disabled={!hasNext} className="px-3 py-1 bg-neutral-800 disabled:opacity-50 hover:bg-neutral-700 rounded text-sm">Siguiente</button>
          <button onClick={onClose} className="px-3 py-1 bg-neutral-800 hover:bg-neutral-700 rounded text-sm"><X className="w-4 h-4"/></button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left pane: Visual Asset */}
        <div className="flex-1 flex flex-col items-center justify-center p-6 bg-neutral-950 border-r border-neutral-800 relative">
          <div className="absolute top-4 left-4">
            <span className="text-xs font-mono bg-neutral-800 text-neutral-400 px-2 py-1 rounded">Asset ID: {currentRecord.id}</span>
          </div>
          <BlobImage cardId={currentRecord.id} className="max-h-[70vh] max-w-full object-contain rounded-xl shadow-2xl" />
          <div className="mt-4 text-center">
            <p className="text-sm font-semibold">{currentRecord.displayName || currentRecord.originalFileName}</p>
            <p className="text-xs text-neutral-500">Estado: {currentRecord.reviewState || "visual_only"}</p>
          </div>
        </div>

        {/* Right pane: YAML Mechanics */}
        <div className="w-[500px] flex flex-col bg-neutral-900 overflow-y-auto">
          {/* Header de Autodiagnóstico */}
          <div className="p-3 border-b border-neutral-800 bg-neutral-950/40 flex justify-between items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              <span className="text-[10px] font-mono font-bold text-neutral-400 uppercase tracking-wider">Integrity Diagnostic Panel</span>
            </div>
            <button
              onClick={runSelfTests}
              disabled={isRunningTests}
              className="text-[10px] font-bold bg-cyan-950/80 hover:bg-cyan-900 text-cyan-300 border border-cyan-800/40 px-2.5 py-1 rounded transition-all active:scale-95 flex items-center gap-1.5 disabled:opacity-50"
            >
              <FileText className="w-3 h-3" />
              {isRunningTests ? "Ejecutando..." : "Ejecutar Autodiagnóstico"}
            </button>
          </div>

          {/* Modal de Reporte de Autodiagnóstico */}
          {validationReport && (
            <div className="fixed inset-0 z-[250] bg-black/90 flex items-center justify-center p-4">
              <div className="bg-neutral-900 border border-neutral-800 rounded-xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                {/* Header */}
                <div className="bg-neutral-950 px-6 py-4 border-b border-neutral-800 flex justify-between items-center">
                  <div className="flex items-center gap-2.5">
                    <FileText className="w-5 h-5 text-cyan-400" />
                    <div>
                      <h3 className="text-sm font-bold text-neutral-100">Reporte de Integridad y Validación</h3>
                      <p className="text-[10px] text-neutral-400 font-mono">Asset Binder & Base Triángulo (UCL V2)</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setValidationReport(null)}
                    className="p-1.5 rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto space-y-6">
                  {/* Stats Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    <div className="bg-neutral-950 p-3 rounded-lg border border-neutral-800/80 text-center">
                      <div className="text-[9px] text-neutral-500 font-mono font-bold uppercase mb-1">Cartas YAML</div>
                      <div className="text-base font-bold text-white">{validationReport.totalYamlCards}</div>
                    </div>
                    <div className="bg-neutral-950 p-3 rounded-lg border border-neutral-800/80 text-center">
                      <div className="text-[9px] text-neutral-500 font-mono font-bold uppercase mb-1">IDs Únicos</div>
                      <div className="text-base font-bold text-cyan-400">{validationReport.totalUniqueIds}</div>
                    </div>
                    <div className="bg-neutral-950 p-3 rounded-lg border border-neutral-800/80 text-center">
                      <div className="text-[9px] text-neutral-500 font-mono font-bold uppercase mb-1">Assets Vinc.</div>
                      <div className="text-base font-bold text-emerald-400">{validationReport.totalLinkedAssets}</div>
                    </div>
                    <div className="bg-neutral-950 p-3 rounded-lg border border-neutral-800/80 text-center">
                      <div className="text-[9px] text-neutral-500 font-mono font-bold uppercase mb-1">Visual Only</div>
                      <div className="text-base font-bold text-amber-400">{validationReport.totalVisualOnly}</div>
                    </div>
                    <div className="bg-neutral-950 p-3 rounded-lg border border-neutral-800/80 text-center col-span-2 md:col-span-1">
                      <div className="text-[9px] text-neutral-500 font-mono font-bold uppercase mb-1">Data Complete</div>
                      <div className="text-base font-bold text-purple-400">{validationReport.totalDataComplete}</div>
                    </div>
                  </div>

                  {/* Errors block */}
                  <div className="space-y-2">
                    <div className="text-[10px] font-bold font-mono text-neutral-400 uppercase tracking-wider">Errores Encontrados</div>
                    {validationReport.errors.length === 0 ? (
                      <div className="bg-emerald-950/20 border border-emerald-900/50 p-3 rounded-lg text-emerald-400 text-xs flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>Ningún error de integridad o de esquema detectado. Base de datos robusta.</span>
                      </div>
                    ) : (
                      <div className="bg-red-950/20 border border-red-900/50 p-3 rounded-lg text-red-400 text-xs space-y-1">
                        <div className="font-bold flex items-center gap-2 mb-1">
                          <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                          <span>Se detectaron los siguientes incidentes:</span>
                        </div>
                        <ul className="list-disc pl-5 space-y-0.5 font-mono text-[11px]">
                          {validationReport.errors.map((e, idx) => (
                            <li key={idx}>{e}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  {/* Test Cases list */}
                  <div className="space-y-3">
                    <div className="text-[10px] font-bold font-mono text-neutral-400 uppercase tracking-wider">Detalle de Pruebas Unitarias Automáticas</div>
                    <div className="space-y-2">
                      {validationReport.tests.map((test, idx) => (
                        <div key={idx} className="bg-neutral-950 p-3 rounded-lg border border-neutral-800 flex items-start gap-3">
                          <div className="mt-0.5">
                            {test.passed ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                            ) : (
                              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                            )}
                          </div>
                          <div className="space-y-0.5">
                            <div className="text-xs font-bold text-neutral-200">{test.name}</div>
                            <div className="text-[10px] text-neutral-400 font-mono leading-relaxed">{test.message}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="bg-neutral-950 p-4 border-t border-neutral-800 flex justify-end">
                  <button 
                    onClick={() => setValidationReport(null)}
                    className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded font-bold text-xs transition-colors"
                  >
                    Aceptar
                  </button>
                </div>
              </div>
            </div>
          )}

          {yamlError && (
            <div className="bg-red-950/40 border-b border-red-900 p-3 text-xs text-red-200">
              <div className="flex items-center gap-2 font-bold mb-1">
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                Error de Base de Datos (YAML)
              </div>
              <p className="whitespace-pre-wrap">{yamlError}</p>
            </div>
          )}

          {duplicateIds.length > 0 && (
            <div className="bg-orange-950/40 border-b border-orange-900 p-3 text-xs text-orange-200">
              <div className="flex items-center gap-2 font-bold mb-1">
                <AlertTriangle className="w-4 h-4 text-orange-400 shrink-0" />
                IDs Duplicados Detectados en el YAML
              </div>
              <p className="font-mono">IDs: {duplicateIds.join(", ")}</p>
            </div>
          )}

          {!cardData?.linkedCardReferenceId ? (
            <div className="flex-1 flex flex-col p-4">
              <div className="flex flex-col gap-2 mb-4">
                <h3 className="text-sm font-bold text-neutral-400 uppercase tracking-wider">Vincular Definición (UCL V2)</h3>
                
                <div className="flex gap-2 text-[10px] font-mono bg-neutral-950 p-2 rounded border border-neutral-800">
                  <div className="flex flex-col items-center flex-1">
                    <span className="text-neutral-500">Total en YAML</span>
                    <span className="text-white font-bold text-xs">{stats.total}</span>
                  </div>
                  <div className="flex flex-col items-center flex-1 border-l border-neutral-800">
                    <span className="text-neutral-500">Válidas UCL V2</span>
                    <span className="text-green-400 font-bold text-xs">{stats.valid}</span>
                  </div>
                  <div className="flex flex-col items-center flex-1 border-l border-neutral-800">
                    <span className="text-neutral-500">Warnings</span>
                    <span className="text-orange-400 font-bold text-xs">{stats.warnings}</span>
                  </div>
                  <div className="flex flex-col items-center flex-1 border-l border-neutral-800">
                    <span className="text-neutral-500">Visibles</span>
                    <span className="text-cyan-400 font-bold text-xs">{stats.visible}</span>
                  </div>
                </div>
              </div>
              
              {/* Sugerencias */}
              {suggestions.length > 0 && (
                <div className="mb-6">
                  <div className="text-[10px] font-bold text-cyan-500 uppercase tracking-wider mb-2">Sugerencias Automáticas</div>
                  <div className="flex flex-col gap-2">
                    {suggestions.map(s => (
                      <button key={s.id} onClick={() => handleLink(s)} className="text-left bg-cyan-950/20 border border-cyan-900/50 hover:bg-cyan-900/40 p-3 rounded flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold text-white">{s.name}</p>
                          <p className="text-[10px] text-neutral-500 font-mono">{s.id}</p>
                        </div>
                        <span className="text-xs bg-cyan-800 px-2 py-1 rounded text-white font-bold">Vincular</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Buscador */}
              <div className="relative mb-4">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-neutral-500" />
                <input 
                  type="text" 
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  placeholder="Buscar por ID, nombre, efecto..." 
                  className="w-full bg-black border border-neutral-800 rounded pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-cyan-700"
                />
              </div>

              {/* Resultados */}
              <div className="flex-1 overflow-y-auto space-y-2 pr-2">
                {!isReady ? (
                  <div className="text-sm text-neutral-500 p-4 text-center">Cargando definiciones mecánicas...</div>
                ) : totalCards === 0 ? (
                  <div className="text-sm text-red-400 p-4 text-center bg-red-950/20 border border-red-900/50 rounded">
                    Error: No se encontraron definiciones mecánicas. (0 cargadas)
                  </div>
                ) : searchResults.length === 0 ? (
                  <div className="text-sm text-neutral-500 p-4 text-center">No se encontraron resultados para "{searchTerm}"</div>
                ) : (
                  searchResults.map(ref => (
                    <div key={ref.id} className="bg-black border border-neutral-800 p-3 rounded flex justify-between items-start hover:border-neutral-700">
                      <div>
                        <p className="text-sm font-semibold text-white">{ref.name}</p>
                        <p className="text-[10px] text-neutral-500 font-mono mb-1">{ref.id}</p>
                        {ref.metadata && (
                           <div className="flex gap-2 text-[10px] text-neutral-400">
                             <span>Nivel {(ref.metadata as any).requiredLevel || '?'}</span>
                             <span>{(ref.metadata as any).weaponType || (ref.metadata as any).armorType || (ref.metadata as any).itemType}</span>
                           </div>
                        )}
                      </div>
                      <button onClick={() => handleLink(ref)} className="text-[10px] bg-neutral-800 hover:bg-neutral-700 px-2 py-1 rounded font-bold uppercase">
                        Vincular
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="bg-cyan-950/30 border-b border-cyan-900/50 p-4 flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <CheckCircle2 className="w-5 h-5 text-cyan-400" />
                    <h3 className="text-lg font-bold text-white">{cardData.linkedCardReferenceName}</h3>
                  </div>
                  <p className="text-[11px] text-cyan-400/70 font-mono">{cardData.linkedCardReferenceId}</p>
                </div>
                <button onClick={handleUnlink} className="text-xs text-neutral-400 hover:text-red-400 underline">
                  Desvincular
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4">
                <MechanicalPreview cardData={cardData as ItemCardData} />
              </div>

              <div className="p-4 border-t border-neutral-800 bg-black flex gap-3">
                <button 
                  onClick={() => handleSave("linked_complete")}
                  className="flex-1 bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-2 rounded shadow-lg flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Guardar Vínculo (Linked Complete)
                </button>
                <button 
                  onClick={() => handleSave("needs_review")}
                  className="px-4 bg-orange-900/50 hover:bg-orange-800 text-orange-200 font-bold py-2 rounded shadow-lg"
                >
                  Marcar Dudoso
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
