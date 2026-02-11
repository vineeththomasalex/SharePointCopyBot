import Dexie, { Table } from 'dexie';

// Interface definitions
export interface AuthConfig {
  id: string; // '1' (singleton)
  clientId?: string; // Custom client ID (if user configures their own)
  tenantId?: string; // Custom tenant ID (if user configures their own)
  useCustomAuth: boolean; // true if using custom credentials
  updatedAt: Date;
}

export interface SyncConfig {
  id: string; // '1' (singleton)
  sourceSiteId?: string;
  sourceSiteUrl?: string;
  sourceLibraryId?: string;
  sourceLibraryName?: string;
  destSiteId?: string;
  destSiteUrl?: string;
  destLibraryId?: string;
  destLibraryName?: string;
  lastSyncTime: Date | null;
  deltaToken: string | null; // For Graph API delta queries
  updatedAt: Date;
}

export interface FileSnapshot {
  id: string; // Graph API file ID
  name: string;
  path: string;
  lastModifiedDateTime: string;
  size: number;
  hash?: string; // quickXorHash from Graph
  parentId?: string;
  isCopied: boolean; // Tracked locally
  lastCopiedTime?: Date;
  isDeleted: boolean; // Flag for deleted source files
  syncConfigId: string; // Reference to sync config (always '1' for now)
}

export interface SyncHistory {
  id?: number; // Auto-increment
  timestamp: Date;
  action: 'sync_started' | 'sync_completed' | 'sync_failed';
  filesAdded: number;
  filesModified: number;
  filesDeleted: number;
  filesFailed: number;
  filesSkipped: number;
  duration: number; // in milliseconds
  error?: string;
  syncConfigId: string;
}

// Dexie database class
export class SharePointBotDB extends Dexie {
  authConfig!: Table<AuthConfig>;
  syncConfig!: Table<SyncConfig>;
  fileSnapshots!: Table<FileSnapshot>;
  syncHistory!: Table<SyncHistory>;

  constructor() {
    super('SharePointBotDB');

    this.version(1).stores({
      authConfig: 'id',
      syncConfig: 'id',
      fileSnapshots: 'id, syncConfigId, path, isDeleted, isCopied',
      syncHistory: '++id, timestamp, syncConfigId'
    });
  }
}

// Export singleton instance
export const db = new SharePointBotDB();

// Helper functions for common queries
export const dbHelpers = {
  // Auth Config
  async getAuthConfig(): Promise<AuthConfig | undefined> {
    return await db.authConfig.get('1');
  },

  async saveAuthConfig(config: Omit<AuthConfig, 'id' | 'updatedAt'>): Promise<void> {
    await db.authConfig.put({
      id: '1',
      ...config,
      updatedAt: new Date()
    });
  },

  async clearAuthConfig(): Promise<void> {
    await db.authConfig.delete('1');
  },

  // Sync Config
  async getSyncConfig(): Promise<SyncConfig | undefined> {
    return await db.syncConfig.get('1');
  },

  async saveSyncConfig(config: Omit<SyncConfig, 'id' | 'updatedAt'>): Promise<void> {
    await db.syncConfig.put({
      id: '1',
      ...config,
      updatedAt: new Date()
    });
  },

  async updateDeltaToken(token: string): Promise<void> {
    const config = await db.syncConfig.get('1');
    if (config) {
      await db.syncConfig.update('1', {
        deltaToken: token,
        lastSyncTime: new Date(),
        updatedAt: new Date()
      });
    }
  },

  // File Snapshots
  async getFileSnapshot(id: string): Promise<FileSnapshot | undefined> {
    return await db.fileSnapshots.get(id);
  },

  async getAllFileSnapshots(syncConfigId: string = '1'): Promise<FileSnapshot[]> {
    return await db.fileSnapshots
      .where('syncConfigId')
      .equals(syncConfigId)
      .toArray();
  },

  async getActivFileSnapshots(syncConfigId: string = '1'): Promise<FileSnapshot[]> {
    return await db.fileSnapshots
      .where('syncConfigId')
      .equals(syncConfigId)
      .and(file => !file.isDeleted)
      .toArray();
  },

  async getDeletedFileSnapshots(syncConfigId: string = '1'): Promise<FileSnapshot[]> {
    return await db.fileSnapshots
      .where('syncConfigId')
      .equals(syncConfigId)
      .and(file => file.isDeleted)
      .toArray();
  },

  async saveFileSnapshot(file: FileSnapshot): Promise<void> {
    await db.fileSnapshots.put(file);
  },

  async saveFileSnapshots(files: FileSnapshot[]): Promise<void> {
    await db.fileSnapshots.bulkPut(files);
  },

  async markFileCopied(id: string): Promise<void> {
    await db.fileSnapshots.update(id, {
      isCopied: true,
      lastCopiedTime: new Date()
    });
  },

  async markFileDeleted(id: string): Promise<void> {
    await db.fileSnapshots.update(id, {
      isDeleted: true
    });
  },

  async clearFileSnapshots(syncConfigId: string = '1'): Promise<void> {
    await db.fileSnapshots
      .where('syncConfigId')
      .equals(syncConfigId)
      .delete();
  },

  // Sync History
  async addSyncHistory(history: Omit<SyncHistory, 'id'>): Promise<number> {
    return await db.syncHistory.add(history);
  },

  async getSyncHistory(limit: number = 50): Promise<SyncHistory[]> {
    return await db.syncHistory
      .orderBy('timestamp')
      .reverse()
      .limit(limit)
      .toArray();
  },

  async getLastSync(syncConfigId: string = '1'): Promise<SyncHistory | undefined> {
    return await db.syncHistory
      .where('syncConfigId')
      .equals(syncConfigId)
      .and(h => h.action === 'sync_completed')
      .last();
  },

  // Utility
  async clearAllData(): Promise<void> {
    await db.authConfig.clear();
    await db.syncConfig.clear();
    await db.fileSnapshots.clear();
    await db.syncHistory.clear();
  }
};
