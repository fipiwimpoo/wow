import * as yaml from "js-yaml";
import { ZodError } from "zod";
import { zCardReference, CardReference, ItemCardReference } from "../models/cardReference";
import { ItemCardData, AnyCardData } from "../models/cardData";
import { CardReferenceIndex } from "./cardReferenceIndex";

export interface ImportError {
  file: string;
  cardId?: string;
  field?: string;
  message: string;
  receivedValue?: any;
  expectedType?: string;
  line?: number;
}

export interface ImportReport {
  totalFound: number;
  validCount: number;
  invalidCount: number;
  validCards: CardReference[];
  errors: ImportError[];
  warnings: ImportError[];
  duplicatedIds?: string[];
}

export class CardReferenceImporter {
  /**
   * Helper to find line numbers of fields in raw YAML string
   */
  static findLineNumber(yamlString: string, key: string, cardId?: string): number | undefined {
    try {
      const lines = yamlString.split("\n");
      let startIdx = 0;
      if (cardId) {
        const cardIdPattern = new RegExp(`id:\\s*["']?${cardId}["']?`, "i");
        const foundIdx = lines.findIndex(line => cardIdPattern.test(line));
        if (foundIdx !== -1) {
          startIdx = foundIdx;
        }
      }
      
      const keyPattern = new RegExp(`\\b${key}\\b`, "i");
      for (let i = startIdx; i < lines.length; i++) {
        if (keyPattern.test(lines[i])) {
          return i + 1;
        }
      }
    } catch {
      // Ignore errors
    }
    return undefined;
  }

  /**
   * Parse a YAML string and validate it against the CardReference schema.
   * Assumes the YAML represents an array of cards or a single card.
   */
  static parseYamlContent(yamlString: string, filename: string = "unknown.yaml"): ImportReport {
    const report: ImportReport = {
      totalFound: 0,
      validCount: 0,
      invalidCount: 0,
      validCards: [],
      errors: [],
      warnings: [],
      duplicatedIds: [],
    };

    let rawData: any;
    try {
      rawData = yaml.load(yamlString);
    } catch (e: any) {
      const line = e.mark?.line !== undefined ? e.mark.line + 1 : undefined;
      report.errors.push({
        file: filename,
        message: `YAML Parsing Error: ${e.message}`,
        line,
      });
      return report;
    }

    if (!rawData) {
      return report;
    }

    let cardsToProcess: any[] = [];
    if (rawData && typeof rawData === "object" && Array.isArray((rawData as any).cards)) {
      cardsToProcess = (rawData as any).cards;
    } else if (Array.isArray(rawData)) {
      cardsToProcess = rawData;
    } else if (rawData) {
      cardsToProcess = [rawData];
    }
    
    report.totalFound = cardsToProcess.length;

    const seenIdsInFile = new Set<string>();
    const duplicatedIdsInFile = new Set<string>();

    for (let i = 0; i < cardsToProcess.length; i++) {
      const rawCard = cardsToProcess[i];
      const cardId = rawCard?.id || `Unknown (Index ${i})`;

      // Track duplicate IDs
      if (rawCard && typeof rawCard === "object" && rawCard.id) {
        const idStr = String(rawCard.id);
        if (seenIdsInFile.has(idStr)) {
          duplicatedIdsInFile.add(idStr);
          console.warn(`[CardReferenceImporter] DUPLICATE ID DETECTED: "${idStr}" in file "${filename}"`);
          report.warnings.push({
            file: filename,
            cardId: idStr,
            message: `Duplicate card ID "${idStr}" detected in the same file. One will override the other in the index map.`,
          });
        } else {
          seenIdsInFile.add(idStr);
        }
      }

      // Expand templates here if exist
      const expandedCard = this.expandTemplates(rawCard);

      // Preprocess/Sync deckId and cardShape
      if (expandedCard && expandedCard.type === "ITEM" && expandedCard.metadata) {
        if (expandedCard.metadata.deckId && !expandedCard.deckId) {
          expandedCard.deckId = expandedCard.metadata.deckId;
        }
        if (expandedCard.metadata.deckId && !expandedCard.metadata.cardShape) {
          expandedCard.metadata.cardShape = expandedCard.metadata.deckId;
        }
      }
      
      // Validate with Zod
      let isValid = true;
      try {
        zCardReference.parse(expandedCard);
        report.validCards.push(expandedCard as CardReference);
        report.validCount++;
      } catch (e: any) {
          isValid = false;
          report.invalidCount++;
          
          if (e instanceof ZodError) {
            for (const issue of e.issues) {
              const fieldPath = issue.path.join(".");
              const line = this.findLineNumber(yamlString, issue.path[issue.path.length - 1] as string || "id", rawCard?.id);
              report.errors.push({
                file: filename,
                cardId: cardId,
                field: fieldPath,
                message: issue.message,
                expectedType: (issue as any).expected,
                receivedValue: (issue as any).received || rawCard?.[issue.path[0]],
                line,
              });
            }
          } else {
            report.errors.push({
              file: filename,
              cardId: cardId,
              message: `Unknown validation error: ${e.message}`,
            });
          }
        }

        // Automatically register to the CardReferenceIndex regardless of validation errors!
        // We ensure it has at least id and name so it doesn't break UI.
        if (expandedCard.id) {
           if (!expandedCard.name) expandedCard.name = expandedCard.id;
           CardReferenceIndex.registerCard(expandedCard as CardReference);
        }
    }

    report.duplicatedIds = Array.from(duplicatedIdsInFile);
    return report;
  }

  /**
   * Preprocesses raw card data to transform it into the structured CardReference format
   * without creating or inventing mechanics (mechanics are strictly left empty).
   */
  private static expandTemplates(rawCard: any): any {
    if (!rawCard || typeof rawCard !== "object") return rawCard;

    // Check if this card is in the raw/unstructured format from items_core_triangle_FULL_UCL_V2.yaml
    if (
      !rawCard.metadata && 
      (rawCard.cost !== undefined || rawCard.level !== undefined || rawCard.dice_pool !== undefined || rawCard.effects !== undefined)
    ) {
      const originalType = String(rawCard.type || "Trinket").trim();
      let itemType: "WEAPON" | "ARMOR" | "TRINKET" | "CONSUMABLE" = "TRINKET";
      let weaponType: any = undefined;
      let armorType: any = undefined;
      let equipmentSlot = originalType.toUpperCase();

      const typeLower = originalType.toLowerCase();
      if (["wand", "sword", "mace", "staff", "bow", "gun"].some(t => typeLower.includes(t))) {
        itemType = "WEAPON";
        if (typeLower.includes("wand")) weaponType = "WAND";
        else if (typeLower.includes("sword")) weaponType = "SWORD";
        else if (typeLower.includes("mace")) weaponType = "MACE";
        else if (typeLower.includes("staff")) weaponType = "STAFF";
        else if (typeLower.includes("bow")) weaponType = "BOW";
        else if (typeLower.includes("gun")) weaponType = "GUN";
      } else if (["cloth", "leather", "mail", "plate", "shield", "helmet", "gauntlet", "costume"].some(t => typeLower.includes(t))) {
        itemType = "ARMOR";
        if (typeLower.includes("cloth")) armorType = "CLOTH";
        else if (typeLower.includes("leather")) armorType = "LEATHER";
        else if (typeLower.includes("mail")) armorType = "MAIL";
        else if (typeLower.includes("plate")) armorType = "PLATE";
        else if (typeLower.includes("shield")) armorType = "SHIELD";
        else armorType = "NONE";
      } else if (["potion", "food", "scroll"].some(t => typeLower.includes(t))) {
        itemType = "CONSUMABLE";
      }

      // Convert effects array to clean human-readable text
      let text = "";
      if (Array.isArray(rawCard.effects)) {
        text = rawCard.effects
          .map((e: any) => {
            if (typeof e === "string") return e;
            return JSON.stringify(e);
          })
          .join("\n");
      }

      // Convert dice_pool to descriptive text if present
      if (rawCard.dice_pool) {
        let diceText = "";
        if (rawCard.dice_pool.add) {
          const addPool = Array.isArray(rawCard.dice_pool.add) ? rawCard.dice_pool.add : [rawCard.dice_pool.add];
          const tokens = addPool.map((p: any) => {
            if (typeof p === "object") {
              return Object.entries(p).map(([color, amt]) => `${amt} ${color}`).join(", ");
            }
            return String(p);
          }).join(", ");
          diceText = `Dado(s) agregados: ${tokens}`;
        } else if (rawCard.dice_pool.choose_one) {
          const optPool = Array.isArray(rawCard.dice_pool.choose_one) ? rawCard.dice_pool.choose_one : [rawCard.dice_pool.choose_one];
          const options = optPool.map((p: any) => {
            if (typeof p === "object") {
              return Object.entries(p).map(([color, amt]) => `${amt} ${color}`).join(", ");
            }
            return String(p);
          }).join(" o ");
          diceText = `Elegir un pool: ${options}`;
        }
        if (diceText) {
          text = text ? `${diceText}\n\nEfectos:\n${text}` : diceText;
        }
      }

      const mappedCard: any = {
        id: rawCard.id,
        name: rawCard.name || rawCard.id,
        type: "ITEM",
        expansion: rawCard.expansion || "core",
        text: text,
        deckId: "triangle",
        metadata: {
          deckId: "triangle",
          itemType: itemType,
          equipmentSlot: equipmentSlot,
          weaponType: weaponType || "NONE",
          armorType: armorType || "NONE",
          requiredLevel: rawCard.level !== undefined ? Number(rawCard.level) : 1,
          goldValue: rawCard.cost !== undefined ? Number(rawCard.cost) : 0,
          slot: itemType === "WEAPON" ? "MAIN_HAND" : (itemType === "ARMOR" ? "ARMOR" : (itemType === "TRINKET" ? "TRINKET" : "CONSUMABLE"))
        },
        mechanics: [] // Absolutely empty mechanics. Never auto-generated!
      };

      // Expose raw properties on the mapped card for searching or debugging
      mappedCard.rawEffects = rawCard.effects;
      mappedCard.rawDicePool = rawCard.dice_pool;
      mappedCard.rawType = originalType;
      mappedCard.rawCost = rawCard.cost;
      mappedCard.rawLevel = rawCard.level;

      return mappedCard;
    }

    return rawCard;
  }

  /**
   * Convert a validated CardReference back into a YAML string for exporting.
   */
  static exportToYaml(cards: CardReference | CardReference[]): string {
    return yaml.dump(cards, {
      indent: 2,
      skipInvalid: true,
    });
  }

  /**
   * Converts a Universal Card Reference into the internal editor's CardData format.
   */
  static convertReferenceToCardData(ref: CardReference): Partial<AnyCardData> {
    const base = {
      cardId: ref.id,
      title: ref.name,
      expansion: ref.expansion,
      faction: "neutral",
      deckColor: ref.type === "ITEM" ? (ref as ItemCardReference).deckId : "neutral",
    };

    if (ref.type === "ITEM") {
      const itemRef = ref as ItemCardReference;
      return {
        ...base,
        type: "item",
        itemType: itemRef.metadata.itemType,
        slot: itemRef.metadata.slot,
        weaponType: itemRef.metadata.weaponType,
        armorType: itemRef.metadata.armorType,
        level: itemRef.metadata.requiredLevel,
        goldValue: itemRef.metadata.goldValue,
        modifiers: itemRef.mechanics,
        deckId: itemRef.deckId,
      } as Partial<ItemCardData>;
    }
    
    return base as Partial<AnyCardData>;
  }

  /**
   * Full compiler process that takes a list of YAML files, validates them,
   * registers valid references in the index, and produces a complete report.
   */
  static validateCardReferences(files: { filename: string; content: string }[]): ImportReport {
    const finalReport: ImportReport = {
      totalFound: 0,
      validCount: 0,
      invalidCount: 0,
      validCards: [],
      errors: [],
      warnings: [],
      duplicatedIds: [],
    };

    for (const file of files) {
      const fileReport = this.parseYamlContent(file.content, file.filename);
      finalReport.totalFound += fileReport.totalFound;
      finalReport.validCount += fileReport.validCount;
      finalReport.invalidCount += fileReport.invalidCount;
      finalReport.validCards.push(...fileReport.validCards);
      finalReport.errors.push(...fileReport.errors);
      finalReport.warnings.push(...fileReport.warnings);
      if (fileReport.duplicatedIds) {
        finalReport.duplicatedIds.push(...fileReport.duplicatedIds);
      }
    }

    return finalReport;
  }
}

/**
 * Standalone validateCardReferences helper function
 */
export function validateCardReferences(files: { filename: string; content: string }[]): ImportReport {
  return CardReferenceImporter.validateCardReferences(files);
}
