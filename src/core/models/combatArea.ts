export interface Point {
  x: number;
  y: number;
}

export interface CombatAreaZone {
  id: "damage" | "defense" | "attrition";
  label: string;
  polygon: Point[];
  tokenLayout: "scatter" | "grid";
  tokenSize: number; // percentage of container width
  maxTokens?: number;
}

export interface CombatAreaLayout {
  backgroundAssetId?: string;
  hitTokenAssetId?: string;
  armorTokenAssetId?: string;
  attritionTokenAssetId?: string;
  zones: CombatAreaZone[];
}
