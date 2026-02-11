import { DriveItem } from '../api/sitesApi';
import { copyFile, getCopyStatus, downloadFile, uploadFile } from '../api/filesApi';
import { ensureFolderPath, extractFolderPath } from './folderManager';
import { buildFilePath } from './deltaQuery';
import { withRetry } from '../utils/retryHandler';

export interface CopyProgress {
  fileName: string;
  status: 'pending' | 'copying' | 'completed' | 'failed';
  error?: string;
}

export type CopyProgressCallback = (progress: CopyProgress) => void;

/**
 * Copy a single file from source to destination
 */
export async function copySingleFile(
  sourceFile: DriveItem,
  sourceSiteId: string,
  sourceDriveId: string,
  destSiteId: string,
  destDriveId: string,
  onProgress?: CopyProgressCallback
): Promise<void> {
  const filePath = buildFilePath(sourceFile);
  const folderPath = extractFolderPath(filePath);

  try {
    // Report pending status
    onProgress?.({
      fileName: sourceFile.name,
      status: 'pending'
    });

    // Ensure destination folder exists
    const destFolderId = await withRetry(() =>
      ensureFolderPath(destSiteId, destDriveId, folderPath)
    );

    // Report copying status
    onProgress?.({
      fileName: sourceFile.name,
      status: 'copying'
    });

    // Try Graph copy API first (preferred - faster and preserves metadata)
    try {
      await copyFileWithGraphAPI(
        sourceSiteId,
        sourceDriveId,
        sourceFile.id,
        destSiteId,
        destDriveId,
        destFolderId,
        sourceFile.name
      );
    } catch (copyError) {
      console.warn(`Graph copy failed for ${sourceFile.name}, trying download/upload method:`, copyError);

      // Fallback to download/upload method
      await copyFileWithDownloadUpload(
        sourceFile,
        sourceSiteId,
        sourceDriveId,
        destSiteId,
        destDriveId,
        destFolderId
      );
    }

    // Report completed status
    onProgress?.({
      fileName: sourceFile.name,
      status: 'completed'
    });
  } catch (error: any) {
    console.error(`Failed to copy file ${sourceFile.name}:`, error);

    // Report failed status
    onProgress?.({
      fileName: sourceFile.name,
      status: 'failed',
      error: error.message || 'Unknown error'
    });

    throw error;
  }
}

/**
 * Copy file using Graph API copy operation
 */
async function copyFileWithGraphAPI(
  sourceSiteId: string,
  sourceDriveId: string,
  sourceItemId: string,
  destSiteId: string,
  destDriveId: string,
  destFolderId: string,
  fileName: string
): Promise<void> {
  // Initiate copy operation
  const monitorUrl = await withRetry(() =>
    copyFile(
      sourceSiteId,
      sourceDriveId,
      sourceItemId,
      destSiteId,
      destDriveId,
      destFolderId,
      fileName
    )
  );

  if (!monitorUrl) {
    throw new Error('No monitor URL returned from copy operation');
  }

  // Monitor copy operation until complete
  let attempts = 0;
  const maxAttempts = 60; // 5 minutes max (5s intervals)

  while (attempts < maxAttempts) {
    await sleep(5000); // Wait 5 seconds

    const status = await getCopyStatus(monitorUrl);

    if (status.status === 'completed') {
      console.log(`Copy completed: ${fileName}`);
      return;
    } else if (status.status === 'failed') {
      throw new Error(`Copy operation failed: ${fileName}`);
    }

    // Log progress
    if (status.percentComplete) {
      console.log(`Copy progress: ${fileName} - ${status.percentComplete}%`);
    }

    attempts++;
  }

  throw new Error(`Copy operation timed out: ${fileName}`);
}

/**
 * Copy file using download/upload method (fallback)
 */
async function copyFileWithDownloadUpload(
  sourceFile: DriveItem,
  sourceSiteId: string,
  sourceDriveId: string,
  destSiteId: string,
  destDriveId: string,
  destFolderId: string
): Promise<void> {
  console.log(`Using download/upload method for: ${sourceFile.name}`);

  // Download file
  const content = await withRetry(() =>
    downloadFile(sourceSiteId, sourceDriveId, sourceFile.id)
  );

  // Upload to destination
  await withRetry(() =>
    uploadFile(destSiteId, destDriveId, destFolderId, sourceFile.name, content)
  );

  console.log(`Upload completed: ${sourceFile.name}`);
}

/**
 * Copy multiple files with progress tracking
 */
export async function copyMultipleFiles(
  files: DriveItem[],
  sourceSiteId: string,
  sourceDriveId: string,
  destSiteId: string,
  destDriveId: string,
  onProgress?: (current: number, total: number, fileName: string) => void,
  onFileProgress?: CopyProgressCallback
): Promise<{ successful: number; failed: number; errors: Array<{ file: string; error: string }> }> {
  let successful = 0;
  let failed = 0;
  const errors: Array<{ file: string; error: string }> = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];

    try {
      onProgress?.(i + 1, files.length, file.name);

      await copySingleFile(
        file,
        sourceSiteId,
        sourceDriveId,
        destSiteId,
        destDriveId,
        onFileProgress
      );

      successful++;
    } catch (error: any) {
      failed++;
      errors.push({
        file: file.name,
        error: error.message || 'Unknown error'
      });
    }
  }

  return { successful, failed, errors };
}

/**
 * Sleep utility
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
