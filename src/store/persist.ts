import { DB_FILE_STORE, DB_NAME } from "@/globals";
import { VideoClip } from "@/types";

interface StoredVideoClip extends Omit<VideoClip, "file" | "texture"> {
  blob: Blob;
  lastModified: number;
}

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

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName, {
            keyPath: "id",
            autoIncrement: true,
          });
        }
      };
    });
  }

  async saveVideoClip(clips: VideoClip[]) {
    if (!this.db) await this.init();

    return new Promise(async (resolve, reject) => {
      if (!this.db) {
        return reject();
      }
      const transaction = this.db.transaction([this.storeName], "readwrite");
      const store = transaction.objectStore(this.storeName);

      for (const clip of clips) {
        const buffer = await clip?.file.arrayBuffer();

        const storedClip: StoredVideoClip = {
          id: clip?.id,
          duration: clip?.duration,
          transform: clip?.transform,
          startTime: clip?.startTime,
          type: clip?.type,
          fileName: clip?.fileName,
          width: clip?.width,
          height: clip?.height,
          effects: clip?.effects,
          buffer: buffer,
          lastModified: clip?.file?.lastModified,
        };

        const request = store.add(storedClip);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      }

    });
  }

  async getVideoClip(id: string): Promise<StoredVideoClip> {
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

  async getAllVideoClips() {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      if (!this.db) {
        return reject();
      }
      const transaction = this.db.transaction([this.storeName], "readonly");
      const store = transaction.objectStore(this.storeName);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
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
