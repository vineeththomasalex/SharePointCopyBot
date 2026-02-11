import { getInitialFiles, getChangedFiles, DeltaResponse } from '../api/filesApi';
import { DriveItem } from '../api/sitesApi';

/**
 * Fetch all files from source library (initial sync)
 */
export async function fetchInitialFiles(
  siteId: string,
  driveId: string,
  folderPath?: string
): Promise<DeltaResponse> {
  const location = folderPath ? `folder: ${folderPath}` : 'entire library';
  console.log(`Fetching initial files from source ${location}...`);
  const result = await getInitialFiles(siteId, driveId, folderPath);
  console.log(`Fetched ${result.files.length} items, delta token: ${result.deltaToken}`);
  return result;
}

/**
 * Fetch only changed files since last sync (incremental sync)
 */
export async function fetchChangedFiles(
  siteId: string,
  driveId: string,
  deltaToken: string,
  folderPath?: string
): Promise<DeltaResponse> {
  const location = folderPath ? `folder: ${folderPath}` : 'entire library';
  console.log(`Fetching changed files from ${location} using delta token...`);
  const result = await getChangedFiles(siteId, driveId, deltaToken, folderPath);
  console.log(`Fetched ${result.files.length} changed items, new delta token: ${result.deltaToken}`);
  return result;
}

/**
 * Filter out folders, keep only files
 */
export function filterFiles(items: DriveItem[]): DriveItem[] {
  return items.filter(item => item.file !== undefined);
}

/**
 * Filter only folders
 */
export function filterFolders(items: DriveItem[]): DriveItem[] {
  return items.filter(item => item.folder !== undefined);
}

/**
 * Check if item is deleted
 */
export function isDeleted(item: any): boolean {
  return item.deleted !== undefined;
}

/**
 * Build file path from parent reference
 */
export function buildFilePath(item: DriveItem): string {
  if (!item.parentReference?.path) {
    return item.name;
  }

  // Parent path format: "/drive/root:/path/to/folder"
  const pathParts = item.parentReference.path.split(':');
  const folderPath = pathParts.length > 1 ? pathParts[1] : '';

  if (folderPath === '' || folderPath === '/') {
    return item.name;
  }

  // Remove leading slash
  const cleanPath = folderPath.startsWith('/') ? folderPath.substring(1) : folderPath;
  return `${cleanPath}/${item.name}`;
}
