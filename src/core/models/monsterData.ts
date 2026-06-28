export interface MonsterVariant {
  threat: number;
  attack: number;
  health: number;
}

export interface MonsterData {
  id: string; // Unico, ej "ghoul"
  name: string;
  expansion: string;
  aliases?: string[];
  imageAssetId: string; // ID de la imagen en Asset Library
  rulesText: string;
  notes?: string;
  variants: {
    green?: MonsterVariant;
    red?: MonsterVariant;
    purple?: MonsterVariant;
    blue?: MonsterVariant;
  };
}
