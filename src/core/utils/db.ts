const DB_NAME = 'wow-board-game-db';
const STORE_NAME = 'board-images';
const STORE_CARDS = 'card-images';
const STORE_REGISTRY = 'asset-registry';
const STORE_CARD_DATA = 'card-data';
const STORE_MONSTERS = 'monster-db';
const STORE_SHEETS = 'custom-sheets';
const DB_VERSION = 5;

export async function initDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
      if (!db.objectStoreNames.contains(STORE_CARDS)) {
        db.createObjectStore(STORE_CARDS);
      }
      if (!db.objectStoreNames.contains(STORE_REGISTRY)) {
        db.createObjectStore(STORE_REGISTRY, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_CARD_DATA)) {
        db.createObjectStore(STORE_CARD_DATA, { keyPath: 'assetId' });
      }
      if (!db.objectStoreNames.contains(STORE_MONSTERS)) {
        db.createObjectStore(STORE_MONSTERS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_SHEETS)) {
        db.createObjectStore(STORE_SHEETS);
      }
    };
  });
}

export async function saveBoardImage(boardId: string, blob: Blob): Promise<void> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.put(blob, boardId);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function getBoardImage(boardId: string): Promise<Blob | null> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.get(boardId);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

export async function deleteBoardImage(boardId: string): Promise<void> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.delete(boardId);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// Sheets
export async function saveSheetImage(sheetId: string, blob: Blob): Promise<void> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_SHEETS, 'readwrite');
    const store = tx.objectStore(STORE_SHEETS);
    const request = store.put(blob, sheetId);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function getSheetImage(sheetId: string): Promise<Blob | null> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_SHEETS, 'readonly');
    const store = tx.objectStore(STORE_SHEETS);
    const request = store.get(sheetId);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

export async function deleteSheetImage(sheetId: string): Promise<void> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_SHEETS, 'readwrite');
    const store = tx.objectStore(STORE_SHEETS);
    const request = store.delete(sheetId);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function clearSheetStore(): Promise<void> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_SHEETS, 'readwrite');
    const store = tx.objectStore(STORE_SHEETS);
    const request = store.clear();
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// Cards
export async function saveCardImage(cardId: string, blob: Blob): Promise<void> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_CARDS, 'readwrite');
    const store = tx.objectStore(STORE_CARDS);
    const request = store.put(blob, cardId);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function getCardImage(cardId: string): Promise<Blob | null> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_CARDS, 'readonly');
    const store = tx.objectStore(STORE_CARDS);
    const request = store.get(cardId);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

// Registry
export type ReviewState = 'visual_only' | 'mechanics_only' | 'linked_complete' | 'needs_review' | 'incomplete_data' | 'data_pending' | 'data_complete' | 'verified';

export interface AssetRecord {
  id: string;
  displayName: string;
  originalFileName: string;
  batchId: string;
  type: string;
  expansion: string;
  faction: string;
  deckOrColor: string;
  index: number;
  timestamp: number;
  preset?: string;
  presetName?: string;
  isCustomSize?: boolean;
  rows?: number;
  columns?: number;
  cardWidth?: number;
  cardHeight?: number;
  gapX?: number;
  gapY?: number;
  offsetX?: number;
  offsetY?: number;
  reviewState?: ReviewState;
  createdAt?: number;
  updatedAt?: number;
  portraitVersion?: number;
}

export async function getAssetRecord(id: string): Promise<AssetRecord | null> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_REGISTRY, 'readonly');
    const store = tx.objectStore(STORE_REGISTRY);
    const request = store.get(id);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

export async function saveAssetRecord(record: AssetRecord): Promise<void> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_REGISTRY, 'readwrite');
    const store = tx.objectStore(STORE_REGISTRY);
    const request = store.put(record);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function getAllAssetRecords(): Promise<AssetRecord[]> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_REGISTRY, 'readonly');
    const store = tx.objectStore(STORE_REGISTRY);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function deleteAssetRecord(id: string): Promise<void> {
  console.log(`Deleting asset: ${id}`);
  console.log(`Deleting cardData for asset: ${id}`);
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_REGISTRY, STORE_CARDS, STORE_CARD_DATA], 'readwrite');
    tx.objectStore(STORE_REGISTRY).delete(id);
    tx.objectStore(STORE_CARDS).delete(id);
    tx.objectStore(STORE_CARD_DATA).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function deleteBatch(batchId: string): Promise<void> {
  console.log(`Deleting batch: ${batchId}`);
  const db = await initDB();
  const records = await getAllAssetRecords();
  const batchRecords = records.filter(r => r.batchId === batchId);
  
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_REGISTRY, STORE_CARDS, STORE_CARD_DATA], 'readwrite');
    for (const record of batchRecords) {
      console.log(`Deleting asset: ${record.id}`);
      console.log(`Deleting cardData for asset: ${record.id}`);
      tx.objectStore(STORE_REGISTRY).delete(record.id);
      tx.objectStore(STORE_CARDS).delete(record.id);
      tx.objectStore(STORE_CARD_DATA).delete(record.id);
    }
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

import { AnyCardData } from '../models/cardData';
import { MonsterData } from '../models/monsterData';
export async function saveCardData(data: AnyCardData): Promise<void> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_CARD_DATA, 'readwrite');
    tx.objectStore(STORE_CARD_DATA).put(data);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function clearAllStores(): Promise<void> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_NAME, STORE_CARDS, STORE_REGISTRY, STORE_CARD_DATA, STORE_MONSTERS, STORE_SHEETS], 'readwrite');
    tx.objectStore(STORE_NAME).clear();
    tx.objectStore(STORE_CARDS).clear();
    tx.objectStore(STORE_REGISTRY).clear();
    tx.objectStore(STORE_CARD_DATA).clear();
    tx.objectStore(STORE_MONSTERS).clear();
    tx.objectStore(STORE_SHEETS).clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getCardData(assetId: string): Promise<AnyCardData | null> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_CARD_DATA, 'readonly');
    const request = tx.objectStore(STORE_CARD_DATA).get(assetId);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

export async function getAllCardData(): Promise<AnyCardData[]> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_CARD_DATA, 'readonly');
    const request = tx.objectStore(STORE_CARD_DATA).getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

export async function saveMonster(monster: MonsterData): Promise<void> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_MONSTERS, 'readwrite');
    tx.objectStore(STORE_MONSTERS).put(monster);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getMonster(id: string): Promise<MonsterData | null> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_MONSTERS, 'readonly');
    const request = tx.objectStore(STORE_MONSTERS).get(id);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

export async function getAllMonsters(): Promise<MonsterData[]> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_MONSTERS, 'readonly');
    const request = tx.objectStore(STORE_MONSTERS).getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

export async function deleteMonster(id: string): Promise<void> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_MONSTERS, 'readwrite');
    const request = tx.objectStore(STORE_MONSTERS).delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}
