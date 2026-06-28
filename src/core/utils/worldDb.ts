import { WorldDatabase } from '../types/world';

const WORLD_DB_KEY = 'wow_board_world_db';
const SCHEMA_VERSION_KEY = 'world_mapper_schema_version';
const CURRENT_SCHEMA_VERSION = 'playable_zone_model_v1';

const defaultDb: WorldDatabase = {
  regions: {},
  playableZones: {},
};

export function loadWorldDb(): WorldDatabase {
  try {
    const version = localStorage.getItem(SCHEMA_VERSION_KEY);
    if (version !== CURRENT_SCHEMA_VERSION) {
      console.log('World Mapper database reset due to schema migration.');
      localStorage.setItem(SCHEMA_VERSION_KEY, CURRENT_SCHEMA_VERSION);
      localStorage.setItem(WORLD_DB_KEY, JSON.stringify(defaultDb));
      if (typeof window !== 'undefined') {
        setTimeout(() => {
          alert("World Mapper database reset due to schema migration.");
        }, 100);
      }
      return defaultDb;
    }

    const data = localStorage.getItem(WORLD_DB_KEY);
    if (data) {
      return JSON.parse(data);
    }
  } catch (err) {
    console.error('Error loading world db:', err);
  }
  return defaultDb;
}

export function saveWorldDb(db: WorldDatabase): void {
  try {
    localStorage.setItem(WORLD_DB_KEY, JSON.stringify(db));
    localStorage.setItem(SCHEMA_VERSION_KEY, CURRENT_SCHEMA_VERSION);
  } catch (err) {
    console.error('Error saving world db:', err);
  }
}

export function exportWorldDb(db: WorldDatabase): void {
  const exportFormat = {
    worldRegions: Object.values(db.regions),
    playableZones: Object.values(db.playableZones),
  };
  const jsonString = JSON.stringify(exportFormat, null, 2);
  const blob = new Blob([jsonString], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement("a");
  a.href = url;
  a.download = "world_db.json";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
