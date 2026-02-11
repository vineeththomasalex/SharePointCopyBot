import { DriveItem } from '../api/sitesApi';
import { fetchInitialFiles, fetchChangedFiles } from './deltaQuery';
import { detectChanges, driveItemsToSnapshots, SyncPlan } from './changeDetector';
import { copyMultipleFiles, CopyProgressCallback } from './fileCopier';
import { clearFolderCache, getUniqueFolderPaths } from './folderManager';
import { dbHelpers, SyncConfig } from '../db/schema';
import { buildFilePath } from './deltaQuery';

export interface SyncOptions {
  onProgress?: (current: number, total: number, fileName: string) => void;
  onFileProgress?: CopyProgressCallback;
  onPhaseChange?: (phase: SyncPhase) => void;
}

export type SyncPhase =
  | 'initializing'
  | 'fetching_files'
  | 'detecting_changes'
  | 'creating_folders'
  | 'copying_files'
  | 'updating_database'
  | 'completed'
  | 'failed';

export interface SyncResult {
  success: boolean;
  filesAdded: number;
  filesModified: number;
  filesDeleted: number;
  filesFailed: number;
  filesSkipped: number;
  duration: number;
  error?: string;
  errors?: Array<{ file: string; error: string }>;
}

/**
 * Main sync orchestrator
 * Coordinates the entire sync process
 */
export class SyncOrchestrator {
  private config: SyncConfig | null = null;
  private startTime: number = 0;

  /**
   * Execute sync operation
   */
  async sync(options: SyncOptions = {}): Promise<SyncResult> {
    this.startTime = Date.now();

    try {
      // Phase 1: Initialize
      options.onPhaseChange?.('initializing');
      await this.initialize();

      if (!this.config) {
        throw new Error('Sync configuration not found. Please configure sync settings first.');
      }

      // Validate configuration
      this.validateConfig();

      // Log sync start
      await dbHelpers.addSyncHistory({
        timestamp: new Date(),
        action: 'sync_started',
        filesAdded: 0,
        filesModified: 0,
        filesDeleted: 0,
        filesFailed: 0,
        filesSkipped: 0,
        duration: 0,
        syncConfigId: this.config.id
      });

      // Phase 2: Fetch files
      options.onPhaseChange?.('fetching_files');
      const { files, deltaToken } = await this.fetchFiles();

      // Phase 3: Detect changes
      options.onPhaseChange?.('detecting_changes');
      const syncPlan = await this.detectChanges(files);

      console.log('Sync plan:', {
        new: syncPlan.newFiles.length,
        modified: syncPlan.modifiedFiles.length,
        deleted: syncPlan.deletedFiles.length,
        unchanged: syncPlan.unchangedFiles.length
      });

      // If no changes, complete early
      if (syncPlan.totalChanges === 0) {
        console.log('No changes detected. Sync completed.');

        const duration = Date.now() - this.startTime;
        const result: SyncResult = {
          success: true,
          filesAdded: 0,
          filesModified: 0,
          filesDeleted: 0,
          filesFailed: 0,
          filesSkipped: syncPlan.unchangedFiles.length,
          duration
        };

        // Update sync history
        await dbHelpers.addSyncHistory({
          timestamp: new Date(),
          action: 'sync_completed',
          ...result,
          syncConfigId: this.config.id
        });

        // Update delta token
        await dbHelpers.updateDeltaToken(deltaToken);

        options.onPhaseChange?.('completed');
        return result;
      }

      // Phase 4: Create folder structure
      options.onPhaseChange?.('creating_folders');
      await this.createFolderStructure(syncPlan);

      // Phase 5: Copy files
      options.onPhaseChange?.('copying_files');
      const copyResult = await this.copyFiles(syncPlan, options);

      // Phase 6: Update database
      options.onPhaseChange?.('updating_database');
      await this.updateDatabase(files, syncPlan, deltaToken);

      // Calculate final result
      const duration = Date.now() - this.startTime;
      const result: SyncResult = {
        success: true,
        filesAdded: syncPlan.newFiles.length,
        filesModified: syncPlan.modifiedFiles.length,
        filesDeleted: syncPlan.deletedFiles.length,
        filesFailed: copyResult.failed,
        filesSkipped: syncPlan.unchangedFiles.length,
        duration,
        errors: copyResult.errors
      };

      // Update sync history
      await dbHelpers.addSyncHistory({
        timestamp: new Date(),
        action: 'sync_completed',
        ...result,
        syncConfigId: this.config.id
      });

      options.onPhaseChange?.('completed');
      console.log('Sync completed successfully:', result);

      return result;
    } catch (error: any) {
      console.error('Sync failed:', error);

      const duration = Date.now() - this.startTime;
      const result: SyncResult = {
        success: false,
        filesAdded: 0,
        filesModified: 0,
        filesDeleted: 0,
        filesFailed: 0,
        filesSkipped: 0,
        duration,
        error: error.message || 'Unknown error'
      };

      // Update sync history
      if (this.config) {
        await dbHelpers.addSyncHistory({
          timestamp: new Date(),
          action: 'sync_failed',
          ...result,
          syncConfigId: this.config.id
        });
      }

      options.onPhaseChange?.('failed');
      return result;
    }
  }

  /**
   * Initialize sync configuration
   */
  private async initialize(): Promise<void> {
    const config = await dbHelpers.getSyncConfig();
    this.config = config || null;
    clearFolderCache(); // Clear folder cache at start of sync
  }

  /**
   * Validate configuration
   */
  private validateConfig(): void {
    if (!this.config) {
      throw new Error('Configuration is null');
    }

    if (!this.config.sourceSiteId || !this.config.sourceLibraryId) {
      throw new Error('Source site and library must be configured');
    }

    if (!this.config.destSiteId || !this.config.destLibraryId) {
      throw new Error('Destination site and library must be configured');
    }
  }

  /**
   * Fetch files from source
   */
  private async fetchFiles(): Promise<{ files: DriveItem[]; deltaToken: string }> {
    if (!this.config) throw new Error('Configuration is null');

    const isInitialSync = !this.config.deltaToken;

    if (isInitialSync) {
      console.log('Performing initial sync...');
      const result = await fetchInitialFiles(
        this.config.sourceSiteId!,
        this.config.sourceLibraryId!
      );
      return { files: result.files, deltaToken: result.deltaToken };
    } else {
      console.log('Performing incremental sync...');
      const result = await fetchChangedFiles(
        this.config.sourceSiteId!,
        this.config.sourceLibraryId!,
        this.config.deltaToken || ''
      );
      return { files: result.files, deltaToken: result.deltaToken };
    }
  }

  /**
   * Detect changes
   */
  private async detectChanges(currentFiles: DriveItem[]): Promise<SyncPlan> {
    const previousSnapshots = await dbHelpers.getAllFileSnapshots();
    return detectChanges(currentFiles, previousSnapshots);
  }

  /**
   * Create folder structure in destination
   */
  private async createFolderStructure(syncPlan: SyncPlan): Promise<void> {
    if (!this.config) throw new Error('Configuration is null');

    // Get all files that need to be copied
    const filesToCopy = [...syncPlan.newFiles, ...syncPlan.modifiedFiles];

    // Extract unique folder paths
    const filePaths = filesToCopy.map(f => buildFilePath(f));
    const folderPaths = getUniqueFolderPaths(filePaths);

    console.log(`Creating ${folderPaths.length} folder(s) in destination...`);

    // Create folders sequentially (they're sorted by depth)
    for (const folderPath of folderPaths) {
      try {
        // This will create the folder if it doesn't exist
        // The function caches folder IDs to avoid redundant calls
        await import('./folderManager').then(m =>
          m.ensureFolderPath(
            this.config!.destSiteId!,
            this.config!.destLibraryId!,
            folderPath
          )
        );
      } catch (error) {
        console.warn(`Failed to create folder ${folderPath}:`, error);
        // Continue with other folders
      }
    }

    console.log('Folder structure created');
  }

  /**
   * Copy files to destination
   */
  private async copyFiles(
    syncPlan: SyncPlan,
    options: SyncOptions
  ): Promise<{ successful: number; failed: number; errors: Array<{ file: string; error: string }> }> {
    if (!this.config) throw new Error('Configuration is null');

    const filesToCopy = [...syncPlan.newFiles, ...syncPlan.modifiedFiles];

    if (filesToCopy.length === 0) {
      return { successful: 0, failed: 0, errors: [] };
    }

    console.log(`Copying ${filesToCopy.length} file(s)...`);

    return await copyMultipleFiles(
      filesToCopy,
      this.config.sourceSiteId!,
      this.config.sourceLibraryId!,
      this.config.destSiteId!,
      this.config.destLibraryId!,
      options.onProgress,
      options.onFileProgress
    );
  }

  /**
   * Update database with new snapshots and delta token
   */
  private async updateDatabase(
    files: DriveItem[],
    syncPlan: SyncPlan,
    deltaToken: string
  ): Promise<void> {
    if (!this.config) throw new Error('Configuration is null');

    // Convert all current files to snapshots
    const newSnapshots = driveItemsToSnapshots(files, this.config.id);

    // Mark copied files
    const copiedIds = new Set([
      ...syncPlan.newFiles.map(f => f.id),
      ...syncPlan.modifiedFiles.map(f => f.id)
    ]);

    for (const snapshot of newSnapshots) {
      if (copiedIds.has(snapshot.id)) {
        snapshot.isCopied = true;
        snapshot.lastCopiedTime = new Date();
      }
    }

    // Mark deleted files
    const deletedIds = new Set(syncPlan.deletedFiles);
    for (const snapshot of newSnapshots) {
      if (deletedIds.has(snapshot.id)) {
        snapshot.isDeleted = true;
      }
    }

    // Save snapshots to database
    await dbHelpers.saveFileSnapshots(newSnapshots);

    // Update delta token and last sync time
    await dbHelpers.updateDeltaToken(deltaToken);

    console.log('Database updated');
  }
}

/**
 * Create and execute a sync operation
 */
export async function executeSync(options: SyncOptions = {}): Promise<SyncResult> {
  const orchestrator = new SyncOrchestrator();
  return await orchestrator.sync(options);
}
