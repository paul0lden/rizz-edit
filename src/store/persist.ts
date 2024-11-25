import { DB_FILE_STORE, DB_NAME } from "@/globals";
import { Clip } from "@/types";

type PersistedClip = Omit<Clip, 'demuxer' | 'texture'>

export class FileStorage {
  private dbName: string;
  private storeName: string;
  private db: IDBDatabase | null;

  constructor(dbName = DB_NAME, storeName = DB_FILE_STORE) {
    this.dbName = dbName;
    this.storeName = storeName;
    this.db = null;
  }

  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve(true);
      };

      request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
        const db = (event.target as IDBOpenDBRequest)?.result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName, {
            keyPath: "id",
            autoIncrement: true,
          });
        }
      };
    });
  }

  async saveVideoClip(clips: Clip[]) {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      if (!this.db) {
        return reject();
      }
      const transaction = this.db.transaction([this.storeName], "readwrite");
      const store = transaction.objectStore(this.storeName);

      for (const clip of clips) {
        store.add({
          buffer: clip.buffer,
          width: clip.width,
          height: clip.height,
          transform: { ...clip.transform },
          framerate: clip.framerate,
          id: clip.id,
          startTime: clip.startTime,
          duration: clip.duration,
          name: clip.name,
          effects: { ...clip.effects },
        });
      }

      transaction.oncomplete = () => resolve(true);
      transaction.onerror = reject;
    });
  }

  async getVideoClip(id: string): Promise<PersistedClip> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      if (!this.db) {
        return reject();
      }
      const transaction = this.db.transaction([this.storeName], "readonly");
      const store = transaction.objectStore(this.storeName);
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getAllVideoClips(): Promise<PersistedClip[]> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      if (!this.db) {
        return reject();
      }
      const transaction = this.db.transaction([this.storeName], "readonly");
      const store = transaction.objectStore(this.storeName);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result as unknown as PersistedClip[]);
      request.onerror = () => reject(request.error);
    });
  }

  async deleteVideoClip(id: string) {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      if (!this.db) {
        return reject();
      }
      const transaction = this.db.transaction([this.storeName], "readwrite");
      const store = transaction.objectStore(this.storeName);
      const request = store.delete(id);

      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  }
}
