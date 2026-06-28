export type BoardId = 'lordaeron' | 'outland';

export interface PointPercent {
  x: number;
  y: number;
}

export interface Connection {
  targetPlayableZoneId: string;
  type: 'normal' | 'flight' | 'portal';
  isImpassable?: boolean;
}

export interface WorldRegion {
  id: string;
  name: string;
  boardId: BoardId;
  aliases?: string[];
  notes?: string;
  playableZoneIds?: string[];
}

export interface PlayableZone {
  id: string;
  name: string;
  boardId: BoardId;
  worldRegionId: string; // references WorldRegion
  coordinatesPercent: PointPercent;
  faction?: 'alliance' | 'horde' | 'neutral' | 'contested';
  flightPathFaction?: 'alliance' | 'horde' | 'neutral' | 'both';
  cityFaction?: 'alliance' | 'horde' | 'neutral' | 'both';
  type?: 'normal' | 'city' | 'secluded';
  features: {
    city: boolean;
    graveyard: boolean;
    flight_path: boolean;
    dungeon: boolean;
    dark_portal?: boolean;
  };
  aliases: string[];
  notes?: string;
  connections: Connection[];
}

export interface WorldDatabase {
  regions: Record<string, WorldRegion>;
  playableZones: Record<string, PlayableZone>;
}

