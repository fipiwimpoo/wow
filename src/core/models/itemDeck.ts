import { z } from "zod";
import { zCardReference } from "./cardReference";

export const zItemDeck = z.object({
  id: z.enum(["triangle", "square", "circle", "hexagon", "trophy"]),
  displayName: z.string(),
  description: z.string(),
  cardBackId: z.string(),
  assetBackImage: z.string().optional(),
  cards: z.array(zCardReference).default([]),
  enabled: z.boolean().default(true),
  expansion: z.string().default("CORE"),
});

export type ItemDeck = z.infer<typeof zItemDeck>;

export const OFFICIAL_DECKS: Record<string, Omit<ItemDeck, "cards">> = {
  triangle: {
    id: "triangle",
    displayName: "Triángulo",
    description: "Mazo de cartas de Triángulo",
    cardBackId: "triangle",
    enabled: true,
    expansion: "CORE",
  },
  square: {
    id: "square",
    displayName: "Cuadrado",
    description: "Mazo de cartas de Cuadrado",
    cardBackId: "square",
    enabled: true,
    expansion: "CORE",
  },
  circle: {
    id: "circle",
    displayName: "Círculo",
    description: "Mazo de cartas de Círculo",
    cardBackId: "circle",
    enabled: true,
    expansion: "CORE",
  },
  hexagon: {
    id: "hexagon",
    displayName: "Hexágono",
    description: "Mazo de cartas de Hexágono",
    cardBackId: "hexagon",
    enabled: true,
    expansion: "CORE",
  },
  trophy: {
    id: "trophy",
    displayName: "Trofeo",
    description: "Mazo de cartas de Trofeo",
    cardBackId: "trophy",
    enabled: true,
    expansion: "CORE",
  },
};
