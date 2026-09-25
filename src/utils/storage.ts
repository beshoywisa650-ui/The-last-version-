import {
  Language,
  SalesRow,
  LoadedFileMeta,
  ColumnMapping,
  SavedTerritory,
  SavedAnalysis,
  SavedSheetPreset,
  RecentFileItem,
  SheetAnalysisResult
} from '../types';

const STORAGE_KEYS = {
  LANGUAGE: 'sheet_analyzer_language',
  TERRITORY: 'sheet_analyzer_territory',
  ANALYSES: 'sheet_analyzer_analyses',
  PRESETS: 'sheet_analyzer_presets',
  RECENT_META: 'sheet_analyzer_recent_meta',
  SESSION_STATE: 'sheet_analyzer_session_state',
  TABLE_SETTINGS_PREFIX: 'sheet_analyzer_table_settings_'
};

const DB_NAME = 'SheetAnalyzerDB';
const DB_VERSION = 1;
const STORE_DATASETS = 'datasets';
const STORE_RECENTS = 'recent_files';

/**
 * Open or upgrade IndexedDB instance for persistent offline storage.
 */
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      return reject(new Error('IndexedDB not supported'));
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_DATASETS)) {
        db.createObjectStore(STORE_DATASETS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_RECENTS)) {
        db.createObjectStore(STORE_RECENTS, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Memory fallback cache in case indexedDB is unavailable
let memoryDataset: { rows: SalesRow[]; meta: LoadedFileMeta; mapping: ColumnMapping } | null = null;
const memoryRecents: Map<string, any> = new Map();

/* ==========================================================
 * Current Dataset Storage
 * ========================================================== */

export async function saveDatasetLocally(
  rows: SalesRow[],
  meta: LoadedFileMeta,
  mapping: ColumnMapping
): Promise<void> {
  memoryDataset = { rows, meta, mapping };
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_DATASETS, 'readwrite');
    const store = tx.objectStore(STORE_DATASETS);
    store.put({
      id: 'active_dataset',
      rows,
      meta,
      mapping,
      savedAt: Date.now()
    });
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('[Storage] Could not persist dataset to IndexedDB, fallback in memory', err);
  }
}

export async function loadDatasetLocally(): Promise<{
  rows: SalesRow[];
  meta: LoadedFileMeta;
  mapping: ColumnMapping;
} | null> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_DATASETS, 'readonly');
    const store = tx.objectStore(STORE_DATASETS);
    const req = store.get('active_dataset');

    return new Promise((resolve) => {
      req.onsuccess = () => {
        if (req.result && req.result.rows && req.result.meta && req.result.mapping) {
          resolve({
            rows: req.result.rows,
            meta: req.result.meta,
            mapping: req.result.mapping
          });
        } else {
          resolve(memoryDataset);
        }
      };
      req.onerror = () => resolve(memoryDataset);
    });
  } catch (err) {
    return memoryDataset;
  }
}

export async function clearDatasetLocally(): Promise<void> {
  memoryDataset = null;
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_DATASETS, 'readwrite');
    tx.objectStore(STORE_DATASETS).delete('active_dataset');
  } catch (err) {
    // ignore
  }
}

/* ==========================================================
 * Recent Files Vault (Persistent history of last opened files)
 * ========================================================== */

export function getRecentFilesMetaList(): RecentFileItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.RECENT_META);
    if (!raw) return [];
    const list = JSON.parse(raw);
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export async function saveRecentFileRecord(
  meta: LoadedFileMeta,
  rows: SalesRow[],
  mapping: ColumnMapping,
  sheetAnalysis?: SheetAnalysisResult | null
): Promise<void> {
  const fileId = `${meta.fileName}_${meta.rowCount}_${meta.columnCount}`;
  const now = Date.now();

  const recentItem: RecentFileItem = {
    id: fileId,
    fileName: meta.fileName,
    fileSize: meta.fileSize || 0,
    rowCount: meta.rowCount,
    columnCount: meta.columnCount,
    loadedAt: meta.loadedAt || now,
    lastOpenedAt: now,
    columns: meta.columns || []
  };

  // Update metadata in localStorage (capped to 5 items)
  const currentList = getRecentFilesMetaList();
  const filtered = currentList.filter((item) => item.id !== fileId && item.fileName !== meta.fileName);
  const updatedList = [recentItem, ...filtered].slice(0, 5);

  try {
    localStorage.setItem(STORAGE_KEYS.RECENT_META, JSON.stringify(updatedList));
  } catch (err) {
    console.warn('[Storage] localStorage meta write failed', err);
  }

  // Store actual data payload in IndexedDB
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_RECENTS, 'readwrite');
    tx.objectStore(STORE_RECENTS).put({
      id: fileId,
      meta,
      rows,
      mapping,
      sheetAnalysis,
      updatedAt: now
    });
  } catch (err) {
    memoryRecents.set(fileId, { id: fileId, meta, rows, mapping, sheetAnalysis });
  }
}

export async function loadRecentFileRecord(
  id: string
): Promise<{
  meta: LoadedFileMeta;
  rows: SalesRow[];
  mapping: ColumnMapping;
  sheetAnalysis?: SheetAnalysisResult | null;
} | null> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_RECENTS, 'readonly');
    const req = tx.objectStore(STORE_RECENTS).get(id);

    return new Promise((resolve) => {
      req.onsuccess = () => {
        if (req.result) {
          resolve(req.result);
        } else if (memoryRecents.has(id)) {
          resolve(memoryRecents.get(id));
        } else {
          resolve(null);
        }
      };
      req.onerror = () => resolve(memoryRecents.get(id) || null);
    });
  } catch {
    return memoryRecents.get(id) || null;
  }
}

export async function deleteRecentFileRecord(id: string): Promise<void> {
  const current = getRecentFilesMetaList().filter((item) => item.id !== id);
  localStorage.setItem(STORAGE_KEYS.RECENT_META, JSON.stringify(current));

  memoryRecents.delete(id);
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_RECENTS, 'readwrite');
    tx.objectStore(STORE_RECENTS).delete(id);
  } catch {
    // ignore
  }
}

/* ==========================================================
 * Language Preferences
 * ========================================================== */

export function getStoredLanguage(): Language {
  try {
    const lang = localStorage.getItem(STORAGE_KEYS.LANGUAGE);
    return lang === 'en' ? 'en' : 'ar';
  } catch {
    return 'ar';
  }
}

export function setStoredLanguage(lang: Language): void {
  try {
    localStorage.setItem(STORAGE_KEYS.LANGUAGE, lang);
  } catch {
    // ignore
  }
}

/* ==========================================================
 * Territory Configuration
 * ========================================================== */

export function getSavedTerritory(): SavedTerritory | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.TERRITORY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveTerritoryConfig(territory: SavedTerritory): void {
  try {
    localStorage.setItem(STORAGE_KEYS.TERRITORY, JSON.stringify(territory));
  } catch {
    // ignore
  }
}

/* ==========================================================
 * Saved Analysis Snapshots
 * ========================================================== */

export function getSavedAnalyses(): SavedAnalysis[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ANALYSES);
    if (!raw) return [];
    const list = JSON.parse(raw);
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export function saveAnalysisConfig(analysis: SavedAnalysis): void {
  const list = getSavedAnalyses();
  const filtered = list.filter((a) => a.id !== analysis.id);
  filtered.unshift(analysis);
  try {
    localStorage.setItem(STORAGE_KEYS.ANALYSES, JSON.stringify(filtered));
  } catch {
    // ignore
  }
}

export function deleteSavedAnalysis(id: string): void {
  const list = getSavedAnalyses().filter((a) => a.id !== id);
  try {
    localStorage.setItem(STORAGE_KEYS.ANALYSES, JSON.stringify(list));
  } catch {
    // ignore
  }
}

/* ==========================================================
 * Sheet Presets (Auto-recognition templates)
 * ========================================================== */

export function getSavedSheetPresets(): SavedSheetPreset[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PRESETS);
    if (!raw) return [];
    const list = JSON.parse(raw);
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export function saveSheetPreset(preset: SavedSheetPreset): void {
  const list = getSavedSheetPresets();
  const filtered = list.filter((p) => p.headersSignature !== preset.headersSignature);
  filtered.unshift(preset);
  try {
    localStorage.setItem(STORAGE_KEYS.PRESETS, JSON.stringify(filtered));
  } catch {
    // ignore
  }
}

/* ==========================================================
 * Active Working Session State
 * ========================================================== */

export function getSavedActiveSessionState(): any {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SESSION_STATE);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveActiveSessionState(state: any): void {
  try {
    localStorage.setItem(STORAGE_KEYS.SESSION_STATE, JSON.stringify(state));
  } catch {
    // ignore
  }
}

export function clearActiveSessionState(): void {
  try {
    localStorage.removeItem(STORAGE_KEYS.SESSION_STATE);
  } catch {
    // ignore
  }
}

/* ==========================================================
 * Table View Settings (per file)
 * ========================================================== */

export function getSavedTableSettings(fileKey: string): any {
  try {
    const raw = localStorage.getItem(`${STORAGE_KEYS.TABLE_SETTINGS_PREFIX}${fileKey}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveTableSettings(fileKey: string, settings: any): void {
  try {
    localStorage.setItem(
      `${STORAGE_KEYS.TABLE_SETTINGS_PREFIX}${fileKey}`,
      JSON.stringify(settings)
    );
  } catch {
    // ignore
  }
}
