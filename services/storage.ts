import { Movie } from '../types';

const DB_NAME = 'CineLogDB';
const DB_VERSION = 1;
const STORE_MOVIES = 'movies';
const STORE_ASSETS = 'assets'; // For Avatar, etc.

const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_MOVIES)) {
        db.createObjectStore(STORE_MOVIES, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_ASSETS)) {
        db.createObjectStore(STORE_ASSETS, { keyPath: 'key' });
      }
    };

    request.onsuccess = (event) => {
      resolve((event.target as IDBOpenDBRequest).result);
    };

    request.onerror = (event) => {
      reject((event.target as IDBOpenDBRequest).error);
    };
  });
};

export const storage = {
  async saveMovies(movies: Movie[]) {
    const db = await openDB();
    const tx = db.transaction(STORE_MOVIES, 'readwrite');
    const store = tx.objectStore(STORE_MOVIES);
    
    // Clear old data and put new (simple overwrite strategy for sync)
    // For efficiency with large datasets, we might want diffing, but for this app overwrite is safer to ensure consistency
    await new Promise<void>((resolve, reject) => {
        const clearReq = store.clear();
        clearReq.onsuccess = () => resolve();
        clearReq.onerror = () => reject(clearReq.error);
    });

    const putPromises = movies.map(movie => {
        return new Promise<void>((resolve, reject) => {
            const req = store.put(movie);
            req.onsuccess = () => resolve();
            req.onerror = () => reject(req.error);
        });
    });

    await Promise.all(putPromises);
  },

  async getMovies(): Promise<Movie[]> {
    const db = await openDB();
    const tx = db.transaction(STORE_MOVIES, 'readonly');
    const store = tx.objectStore(STORE_MOVIES);
    
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => {
        resolve(request.result || []);
      };
      request.onerror = () => {
        reject(request.error);
      };
    });
  },

  async saveAvatar(base64Data: string) {
      const db = await openDB();
      const tx = db.transaction(STORE_ASSETS, 'readwrite');
      const store = tx.objectStore(STORE_ASSETS);
      store.put({ key: 'avatar', value: base64Data });
  },

  async getAvatar(): Promise<string | null> {
      const db = await openDB();
      const tx = db.transaction(STORE_ASSETS, 'readonly');
      const store = tx.objectStore(STORE_ASSETS);
      return new Promise((resolve) => {
          const req = store.get('avatar');
          req.onsuccess = () => resolve(req.result ? req.result.value : null);
          req.onerror = () => resolve(null);
      });
  }
};
