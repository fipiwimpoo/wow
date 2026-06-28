import { CardReference, ItemCardReference } from "../models/cardReference";
import { ItemDeck, OFFICIAL_DECKS } from "../models/itemDeck";

export class CardReferenceIndex {
  private static cards: Map<string, CardReference> = new Map();

  /**
   * Register a card reference in the index
   */
  static registerCard(card: CardReference) {
    this.cards.set(card.id, card);
  }

  /**
   * Clear all registered cards
   */
  static clear() {
    this.cards.clear();
  }

  /**
   * Get a card by its ID
   */
  static getCard(id: string): CardReference | undefined {
    return this.cards.get(id);
  }

  /**
   * Return all registered cards
   */
  static getAllCards(): CardReference[] {
    return Array.from(this.cards.values());
  }

  /**
   * Find a card by ID (wrapper for getCard)
   */
  static findById(id: string): CardReference | undefined {
    return this.getCard(id);
  }

  /**
   * Find cards by name matching (case insensitive, partial match)
   */
  static findByName(name: string): CardReference[] {
    const query = name.toLowerCase().trim();
    if (!query) return [];
    return Array.from(this.cards.values()).filter(
      card => card.name.toLowerCase().includes(query)
    );
  }

  /**
   * Find cards by normalized name (stripping special chars, spaces, underscores, case insensitive)
   */
  static findByNormalizedName(normalizedName: string): CardReference[] {
    const clean = (s: string) => (s || "").toLowerCase().replace(/[^a-z0-9\s]/g, "");
    const rawQuery = (normalizedName || "").toLowerCase();
    
    // Split the query by spaces or underscores to allow partial multi-word matching
    const queryTokens = rawQuery.split(/[\s_]+/).filter(t => t.length > 0).map(t => t.replace(/[^a-z0-9]/g, ""));
    if (queryTokens.length === 0) return [];

    const cleanForMatch = (s: string) => (s || "").toLowerCase().replace(/[^a-z0-9]/g, "");

    return Array.from(this.cards.values()).filter(card => {
      const cardName = cleanForMatch(card.name);
      const cardId = cleanForMatch(card.id);
      const cardText = card.text ? cleanForMatch(card.text) : "";
      
      let metaStr = "";
      if (card.metadata) {
        const meta = card.metadata as any;
        if (meta.itemType) metaStr += cleanForMatch(meta.itemType);
        if (meta.weaponType) metaStr += cleanForMatch(meta.weaponType);
        if (meta.armorType) metaStr += cleanForMatch(meta.armorType);
        if (meta.requiredLevel) metaStr += cleanForMatch(meta.requiredLevel.toString());
        if (meta.goldValue) metaStr += cleanForMatch(meta.goldValue.toString());
      }

      // All tokens must match AT LEAST ONE of the fields
      return queryTokens.every(token => 
        cardName.includes(token) || 
        cardId.includes(token) || 
        cardText.includes(token) ||
        metaStr.includes(token)
      );
    });
  }

  /**
   * Find cards by deckId (specifically for ITEM cards)
   */
  static findCardsByDeck(deckId: "triangle" | "square" | "circle" | "hexagon" | "trophy" | string): ItemCardReference[] {
    const results: ItemCardReference[] = [];
    for (const card of this.cards.values()) {
      if (card.type === "ITEM") {
        const item = card as ItemCardReference;
        if (item.deckId === deckId || item.metadata?.deckId === deckId) {
          results.push(item);
        }
      }
    }
    return results;
  }

  /**
   * Find cards by itemType (specifically for ITEM cards, case insensitive)
   */
  static findByItemType(itemType: string): ItemCardReference[] {
    const results: ItemCardReference[] = [];
    const query = itemType.toUpperCase().trim();
    if (!query) return [];
    for (const card of this.cards.values()) {
      if (card.type === "ITEM" && (card as ItemCardReference).metadata?.itemType === query) {
        results.push(card as ItemCardReference);
      }
    }
    return results;
  }

  /**
   * Find cards by equipmentSlot (specifically for ITEM cards, case insensitive)
   */
  static findByEquipmentSlot(equipmentSlot: string): ItemCardReference[] {
    const results: ItemCardReference[] = [];
    const query = equipmentSlot.toUpperCase().trim();
    if (!query) return [];
    for (const card of this.cards.values()) {
      if (card.type === "ITEM") {
        const item = card as ItemCardReference;
        const slot = (item.metadata?.equipmentSlot || item.metadata?.slot || "").toUpperCase();
        if (slot === query) {
          results.push(item);
        }
      }
    }
    return results;
  }

  /**
   * Get an ItemDeck entity populated with its cards
   */
  static getItemDeck(deckId: "triangle" | "square" | "circle" | "hexagon" | "trophy"): ItemDeck | undefined {
    const officialDeck = OFFICIAL_DECKS[deckId];
    if (!officialDeck) return undefined;

    const cards = this.findCardsByDeck(deckId);
    return {
      ...officialDeck,
      cards: cards,
    };
  }

  /**
   * Return all ItemDecks populated with their respective cards
   */
  static getAllItemDecks(): ItemDeck[] {
    const deckIds: ("triangle" | "square" | "circle" | "hexagon" | "trophy")[] = [
      "triangle",
      "square",
      "circle",
      "hexagon",
      "trophy"
    ];
    return deckIds.map(id => this.getItemDeck(id)!);
  }
}
