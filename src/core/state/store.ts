import { create } from 'zustand';

export interface SpawnedCreaturePreview {
  creatureType: string;
  creatureColor: string;
  count: number;
  playableZoneId: string;
  creatureAssetId?: string;
  monsterId?: string;
  variantColor?: string;
  monsterName?: string;
  spawnPlayableZoneName?: string;
  spawnWorldRegionId?: string;
  spawnWorldRegionName?: string;
  questOwnership?: "alliance" | "horde" | "neutral";
  spawnSource?: "quest_target" | "quest_elite" | "quest_boss" | "world_spawn";
  isRequiredForCompletion?: boolean;
}

export interface QuestSpawnPreview {
  questId: string;
  spawnedCreatures: SpawnedCreaturePreview[];
}

interface AppState {
  currentScreen: 'home' | 'expansions' | 'players' | 'classes' | 'game';
  setScreen: (screen: AppState['currentScreen']) => void;
  selectedExpansions: string[];
  setExpansions: (expansions: string[]) => void;
  playerCount: number;
  setPlayerCount: (count: number) => void;
  selectedClasses: string[];
  setClasses: (classes: string[]) => void;
  boardUrls: { lordaeron: string | null; outland: string | null };
  setBoardUrl: (board: 'lordaeron' | 'outland', url: string | null) => void;
  
  // Shared Active Board & Camera/Preview states
  activeBoard: 'lordaeron' | 'outland';
  setActiveBoard: (board: 'lordaeron' | 'outland') => void;
  questSpawnPreview: QuestSpawnPreview | null;
  setQuestSpawnPreview: (preview: QuestSpawnPreview | null) => void;
  cameraCenterZoneIds: string[];
  setCameraCenterZoneIds: (zoneIds: string[]) => void;
  accessibilityIndicators: boolean;
  setAccessibilityIndicators: (val: boolean) => void;
  boardStackingMode: 'compact' | 'expanded';
  setBoardStackingMode: (mode: 'compact' | 'expanded') => void;
}

export const useAppStore = create<AppState>((set) => ({
  currentScreen: 'home',
  setScreen: (screen) => set({ currentScreen: screen }),
  selectedExpansions: ['base_game'],
  setExpansions: (expansions) => set({ selectedExpansions: expansions }),
  playerCount: 2,
  setPlayerCount: (count) => set({ playerCount: count }),
  selectedClasses: [],
  setClasses: (classes) => set({ selectedClasses: classes }),
  boardUrls: { lordaeron: null, outland: null },
  setBoardUrl: (board, url) => set((state) => ({ 
    boardUrls: { ...state.boardUrls, [board]: url } 
  })),
  
  // Defaults
  activeBoard: 'lordaeron',
  setActiveBoard: (board) => set({ activeBoard: board }),
  questSpawnPreview: null,
  setQuestSpawnPreview: (preview) => set({ questSpawnPreview: preview }),
  cameraCenterZoneIds: [],
  setCameraCenterZoneIds: (zoneIds) => set({ cameraCenterZoneIds: zoneIds }),
  accessibilityIndicators: false,
  setAccessibilityIndicators: (val) => set({ accessibilityIndicators: val }),
  boardStackingMode: 'compact',
  setBoardStackingMode: (mode) => set({ boardStackingMode: mode }),
}));
